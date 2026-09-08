(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.LeftoverEngine=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';

const EPS=1e-7,MAX=2000;

function positive(v,name){
  v=Number(v);
  if(!Number.isFinite(v)||v<0.0001||v>100000)throw Error(name+' must be at least 0.0001 and at most 100,000.');
  return v;
}
function count(v,name='Piece count'){
  v=Number(v);
  if(!Number.isInteger(v)||v<0||v>MAX)throw Error(name+' must be a whole number from 0 to '+MAX+'.');
  return v;
}
function nonnegative(v,name,max=100000){
  v=Number(v);
  if(!Number.isFinite(v)||v<0||v>max)throw Error(name+' must be between 0 and '+max+'.');
  return v;
}
function fit(b,r,rotate){
  return b.w+EPS>=r.w&&b.h+EPS>=r.h||rotate&&b.w+EPS>=r.h&&b.h+EPS>=r.w;
}

// Guillotine-style packing used for rectangular material planning.
// Returning the remaining bins allows the app to carry usable remnants forward.
function pack(requests,stock,rotate,kerf){
  let bins=stock.map(b=>({...b})),placements=[],unfilled=[];
  for(const req of [...requests].sort((a,b)=>b.w*b.h-a.w*a.h)){
    let best=-1,waste=Infinity;
    bins.forEach((b,i)=>{
      if(fit(b,req,rotate)&&b.w*b.h-req.w*req.h<waste){best=i;waste=b.w*b.h-req.w*req.h;}
    });
    if(best<0){unfilled.push(req);continue;}
    const bin=bins.splice(best,1)[0];
    let w=req.w,h=req.h,rotated=false;
    if(!(bin.w+EPS>=w&&bin.h+EPS>=h)){[w,h]=[h,w];rotated=true;}
    const variants=[
      [{w:bin.w-w-kerf,h:bin.h},{w,h:bin.h-h-kerf}],
      [{w:bin.w-w-kerf,h},{w:bin.w,h:bin.h-h-kerf}]
    ];
    const pieces=variants.sort((a,b)=>Math.max(...b.map(x=>x.w*x.h))-Math.max(...a.map(x=>x.w*x.h)))[0];
    for(const p of pieces)if(p.w>EPS&&p.h>EPS)bins.push({...bin,...p});
    placements.push({req,source:bin.source,id:bin.id,rotated});
  }
  return{placements,unfilled,bins};
}



function greedyRectPlan(requests,stock,w,h,rotate,kerf,reservePieces){
  const first=pack(requests,stock,rotate,kerf);
  let placements=[...first.placements],remaining=first.unfilled,buy=0,remainingBins=[...first.bins];
  while(remaining.length){
    const next=pack(remaining,[{w,h,source:'buy',id:'b'+buy}],rotate,kerf);
    if(!next.placements.length)throw Error('A required cut does not fit the selected stock orientation.');
    buy++;placements.push(...next.placements);remaining=next.unfilled;remainingBins.push(...next.bins);
    if(buy>MAX)throw Error('Split this project into smaller sections.');
  }
  const ownedIds=new Set(stock.filter(x=>x.source==='owned').map(x=>x.id));
  const usedOwned=new Set(placements.filter(x=>x.source==='owned').map(x=>x.id));
  const spareOwned=Math.max(0,ownedIds.size-usedOwned.size),reserveBuy=Math.max(0,reservePieces-spareOwned);
  return{placements,physicalBuy:buy,reserveBuy,buy:buy+reserveBuy,spareOwned,remainingBins,ownedUsed:usedOwned.size,scrapsUsed:new Set(placements.filter(x=>x.source==='scrap').map(x=>x.id)).size,optimal:false};
}

function rectSplitChoices(bin,req,rotate,kerf){
  const orientations=[[req.w,req.h,false]];
  if(rotate&&Math.abs(req.w-req.h)>EPS)orientations.push([req.h,req.w,true]);
  const out=[],seen=new Set();
  for(const [w,h,rotated] of orientations){
    if(bin.w+EPS<w||bin.h+EPS<h)continue;
    const variants=[
      [{w:bin.w-w-kerf,h:bin.h},{w,h:bin.h-h-kerf}],
      [{w:bin.w-w-kerf,h},{w:bin.w,h:bin.h-h-kerf}]
    ];
    for(const pieces0 of variants){
      const pieces=pieces0.filter(p=>p.w>EPS&&p.h>EPS).map(p=>({...bin,...p}));
      const key=rotated+'|'+pieces.map(p=>p.w.toFixed(7)+'x'+p.h.toFixed(7)).sort().join(',');
      if(seen.has(key))continue;seen.add(key);out.push({rotated,pieces});
    }
  }
  return out;
}

// Bounded exact search for rectangular stock. It minimizes total new stock,
// including reserve purchases, and falls back to the greedy plan if the
// search is too large or exceeds its node/time budget.
function allocateRectExact(requests,stock,w,h,rotate,kerf,reservePieces){
  const heuristic=greedyRectPlan(requests,stock,w,h,rotate,kerf,reservePieces);
  const ordered=[...requests].sort((a,b)=>b.w*b.h-a.w*a.h||Math.max(b.w,b.h)-Math.max(a.w,a.h));
  const ownedIds=[...new Set(stock.filter(x=>x.source==='owned').map(x=>x.id))];
  const totalOwned=ownedIds.length;
  const totalArea=ordered.reduce((n,r)=>n+r.w*r.h,0),stockArea=stock.reduce((n,b)=>n+b.w*b.h,0),unitArea=w*h;
  const physicalLB=Math.max(0,Math.ceil((totalArea-stockArea)/unitArea-EPS));
  const reserveLB=Math.max(0,reservePieces-totalOwned);
  const globalLB=physicalLB+reserveLB;
  if(heuristic.buy<=globalLB)return{...heuristic,optimal:true};
  if(ordered.length>16||stock.length>20)return heuristic;

  let best={...heuristic},bestCost=heuristic.buy,complete=true,nodes=0;
  const deadline=Date.now()+60;
  const free=stock.map(b=>({...b})),placements=[],usedOwned=new Set();

  function visit(i,buyCount){
    if(++nodes>60000||Date.now()>deadline){complete=false;return;}
    const reserveLower=Math.max(0,reservePieces-(totalOwned-usedOwned.size));
    if(buyCount+reserveLower>=bestCost)return;
    if(i===ordered.length){
      const spareOwned=Math.max(0,totalOwned-usedOwned.size),reserveBuy=Math.max(0,reservePieces-spareOwned),cost=buyCount+reserveBuy;
      if(cost<bestCost){
        bestCost=cost;
        best={placements:placements.map(x=>({...x})),physicalBuy:buyCount,reserveBuy,buy:cost,spareOwned,remainingBins:free.map(x=>({...x})),ownedUsed:usedOwned.size,scrapsUsed:new Set(placements.filter(x=>x.source==='scrap').map(x=>x.id)).size,optimal:false};
      }
      return;
    }
    const req=ordered[i],choices=[];
    for(let j=0;j<free.length;j++){
      const b=free[j],splits=rectSplitChoices(b,req,rotate,kerf);
      if(splits.length)choices.push({j,b,splits,waste:b.w*b.h-req.w*req.h});
    }
    choices.sort((a,b)=>a.waste-b.waste);
    const seen=new Set();
    for(const c of choices){
      const b=c.b,usedBefore=b.source==='owned'&&usedOwned.has(b.id);
      const sig=b.source+'|'+(b.source==='owned'?usedBefore:'')+'|'+b.w.toFixed(7)+'x'+b.h.toFixed(7);
      if(seen.has(sig))continue;seen.add(sig);
      for(const sp of c.splits){
        free.splice(c.j,1,...sp.pieces);
        if(b.source==='owned')usedOwned.add(b.id);
        placements.push({req,source:b.source,id:b.id,rotated:sp.rotated});
        visit(i+1,buyCount);
        placements.pop();
        if(b.source==='owned'&&!usedBefore&&!placements.some(x=>x.source==='owned'&&x.id===b.id))usedOwned.delete(b.id);
        free.splice(c.j,sp.pieces.length,b);
        if(!complete)return;
      }
    }
    if(buyCount+1<bestCost){
      const b={w,h,source:'buy',id:'b'+buyCount},splits=rectSplitChoices(b,req,rotate,kerf);
      for(const sp of splits){
        free.push(...sp.pieces);placements.push({req,source:'buy',id:b.id,rotated:sp.rotated});
        visit(i+1,buyCount+1);placements.pop();free.splice(free.length-sp.pieces.length,sp.pieces.length);
        if(!complete)return;
      }
    }
  }
  visit(0,0);
  best.optimal=complete;
  return best;
}

function edgeSegments(total,piece){
  const n=Math.max(1,Math.ceil(total/piece-EPS)),out=[];
  for(let i=0;i<n;i++)out.push(Math.min(piece,total-i*piece));
  return out.filter(x=>x>EPS);
}
function centeredSegments(total,piece){
  const n=Math.max(1,Math.ceil(total/piece-EPS));
  if(n===1)return[total];
  const excess=Math.max(0,n*piece-total),edge=piece-excess/2;
  if(edge<=EPS)return edgeSegments(total,piece);
  return [edge,...Array.from({length:Math.max(0,n-2)},()=>piece),edge];
}
function offsetSegments(total,piece,offset){
  offset=((offset%piece)+piece)%piece;
  if(offset<EPS)return edgeSegments(total,piece);
  const out=[],first=Math.min(total,piece-offset);
  if(first>EPS)out.push(first);
  let used=first;
  while(total-used>EPS){const seg=Math.min(piece,total-used);out.push(seg);used+=seg;}
  return out;
}
function gridFromSegments(W,H,xs,ys){
  const req=[];
  for(let r=0;r<ys.length;r++)for(let c=0;c<xs.length;c++)req.push({r,c,w:xs[c],h:ys[r]});
  if(req.length>MAX)throw Error('This layout exceeds 2,000 placements. Split the project into smaller sections.');
  return{req,cols:xs.length,rows:ys.length,W,H};
}
function staggerLayout(W,H,w,h,offsetFraction=.5){
  const rowCount=Math.max(1,Math.ceil(H/h-EPS)),maxCols=Math.max(1,Math.ceil((W+w*offsetFraction)/w-EPS));
  if(rowCount*maxCols>MAX)throw Error('This layout exceeds 2,000 placements. Split the project into smaller sections.');
  const ys=edgeSegments(H,h),req=[];
  let cols=0;
  ys.forEach((rh,r)=>{
    const xs=offsetSegments(W,w,r%2?w*offsetFraction:0);cols=Math.max(cols,xs.length);
    xs.forEach((cw,c)=>req.push({r,c,w:cw,h:rh}));
  });
  if(req.length>MAX)throw Error('This layout exceeds 2,000 placements. Split the project into smaller sections.');
  return{req,cols,rows:ys.length,W,H};
}
function layout(W,H,w,h){
  const cols=Math.max(1,Math.ceil(W/w-EPS)),rows=Math.max(1,Math.ceil(H/h-EPS));
  if(cols*rows>MAX)throw Error('This layout exceeds 2,000 placements. Split the project into smaller sections.');
  return gridFromSegments(W,H,edgeSegments(W,w),edgeSegments(H,h));
}
function centeredLayout(W,H,w,h){
  const cols=Math.max(1,Math.ceil(W/w-EPS)),rows=Math.max(1,Math.ceil(H/h-EPS));
  if(cols*rows>MAX)throw Error('This layout exceeds 2,000 placements. Split the project into smaller sections.');
  return gridFromSegments(W,H,centeredSegments(W,w),centeredSegments(H,h));
}

function packBaseline(req,w,h,rotate,kerf){
  let remaining=req,n=0;
  while(remaining.length){
    const p=pack(remaining,[{w,h,source:'buy',id:n}],rotate,kerf);
    if(!p.placements.length)throw Error('Cut cannot fit.');
    remaining=p.unfilled;n++;
  }
  return n;
}

function simulateRectLayout(l,w,h,full,extra,rotate,kerf,reservePieces){
  const owned=Array.from({length:full},(_,i)=>({w,h,source:'owned',id:'o'+i}));
  return{...l,...allocateRectExact(l.req,[...owned,...extra],w,h,rotate,kerf,reservePieces)};
}

function rect(v,scraps=[],opts={}){
  const W=positive(v.pw,'Project width')*12,H=positive(v.ph,'Project length')*12,
    w=positive(v.uw,'Piece width'),h=positive(v.uh,'Piece length'),full=count(v.full),
    reserve=nonnegative(v.waste,'Reserve',100),kerf=nonnegative(opts.kerf||0,'Saw kerf',1),rotate=opts.rotate!==false;
  if(scraps.length>MAX)throw Error('Use at most 2,000 offcuts.');
  const extra=scraps.map((s,i)=>({w:positive(s.w,'Offcut width'),h:positive(s.h,'Offcut length'),source:'scrap',id:'s'+i}));
  const reservePieces=Math.ceil(W*H/(w*h)*reserve/100-EPS);
  const candidates=[];
  for(const [tw,th,label] of [[w,h,'standard'],...(rotate&&w!==h?[[h,w,'rotated']]:[])]){
    const p=simulateRectLayout(layout(W,H,tw,th),w,h,full,extra,rotate,kerf,reservePieces);
    p.reservePieces=reservePieces;
    p.surplus=Math.max(0,p.spareOwned-reservePieces);
    p.orientation=label;
    candidates.push(p);
  }
  const p=candidates.sort((a,b)=>a.buy-b.buy||a.physicalBuy-b.physicalBuy)[0];
  const installationBaseline=packBaseline(p.req,w,h,rotate,kerf);
  return{
    ...p,
    need:installationBaseline+reservePieces,
    comparison:candidates.map(x=>({cols:x.cols,rows:x.rows,buy:x.buy,physicalBuy:x.physicalBuy,reserveBuy:x.reserveBuy,orientation:x.orientation,optimal:x.optimal})),
    kind:'rect',full
  };
}

function minVisibleDimension(req,w,h){
  let min=Infinity;
  for(const r of req){
    if(r.w<w-EPS)min=Math.min(min,r.w);
    if(r.h<h-EPS)min=Math.min(min,r.h);
  }
  return Number.isFinite(min)?min:Math.min(w,h);
}

// Layout Lab compares straight, centered and staggered starts using the same
// packing model as the main rectangular calculator. It is a planning comparison,
// not an installer-specific pattern engine.
function layoutLab(v,scraps=[],opts={}){
  const W=positive(v.pw,'Project width')*12,H=positive(v.ph,'Project length')*12,
    w=positive(v.uw,'Piece width'),h=positive(v.uh,'Piece length'),full=count(v.full),
    reserve=nonnegative(v.waste,'Reserve',100),kerf=nonnegative(opts.kerf||0,'Saw kerf',1),rotate=opts.rotate!==false;
  if(scraps.length>MAX)throw Error('Use at most 2,000 offcuts.');
  const extra=scraps.map((s,i)=>({w:positive(s.w,'Offcut width'),h:positive(s.h,'Offcut length'),source:'scrap',id:'s'+i}));
  const reservePieces=Math.ceil(W*H/(w*h)*reserve/100-EPS);
  const specs=[
    ['Straight · edge start',()=>layout(W,H,w,h),w,h,'straight'],
    ['Straight · centered',()=>centeredLayout(W,H,w,h),w,h,'centered']
  ];
  if(opts.stagger!==false)specs.push(['50% stagger · edge start',()=>staggerLayout(W,H,w,h,.5),w,h,'stagger']);
  if(rotate&&w!==h){
    specs.push(['Rotated · edge start',()=>layout(W,H,h,w),h,w,'rotated']);
    specs.push(['Rotated · centered',()=>centeredLayout(W,H,h,w),h,w,'rotated-centered']);
  }
  const candidates=specs.map(([name,make,tw,th,key])=>{
    const l=make(),p=simulateRectLayout(l,w,h,full,extra,rotate,kerf,reservePieces);
    return{name,key,buy:p.buy,physicalBuy:p.physicalBuy,reserveBuy:p.reserveBuy,placements:l.req.length,minEdge:minVisibleDimension(l.req,tw,th),cols:l.cols,rows:l.rows,optimal:p.optimal};
  }).sort((a,b)=>a.buy-b.buy||b.minEdge-a.minEdge||a.placements-b.placements);
  return{kind:'layout-lab',best:candidates[0],candidates};
}

function wallpaper(v,scraps=[]){
  const width=positive(v.pw,'Wall width')*12,height=positive(v.ph,'Wall height')*12,
    rollW=positive(v.rollw,'Roll width'),coverage=positive(v.coverage,'Roll coverage'),full=count(v.full),
    reserve=nonnegative(v.waste,'Reserve',100),repeat=nonnegative(v.repeat||0,'Pattern repeat'),trim=nonnegative(v.trim||0,'Total trimming allowance');
  let drop=height+trim;if(repeat>0)drop=Math.ceil(drop/repeat-EPS)*repeat;
  const perRoll=Math.floor(coverage*144/rollW/drop+EPS);if(perRoll<1)throw Error('A roll is too short for one full drop. Check roll size, height, repeat and trim.');
  const installDrops=Math.max(1,Math.ceil(width/rollW-EPS));if(installDrops>MAX||scraps.length>MAX)throw Error('Split the wall into sections of at most 2,000 strips.');
  const finalWidth=width-(installDrops-1)*rollW,reserveDrops=Math.ceil(installDrops*reserve/100-EPS),neededDrops=installDrops+reserveDrops;
  let offcutDrops=0,narrowAvailable=false;
  for(const s of scraps){
    const sw=positive(s.w,'Strip width'),sh=positive(s.h,'Strip length'),rows=Math.floor(sh/drop+EPS),cols=Math.floor(sw/rollW+EPS);
    offcutDrops+=rows*cols;if(rows>0&&sw-cols*rollW+EPS>=finalWidth)narrowAvailable=true;
  }
  const narrowOffcutDrops=finalWidth<rollW-EPS&&narrowAvailable?1:0;
  const buy=Math.max(0,Math.ceil((neededDrops-full*perRoll-offcutDrops-narrowOffcutDrops)/perRoll-EPS));
  return{kind:'wallpaper',full,need:Math.ceil(neededDrops/perRoll),buy,surplus:Math.floor(Math.max(0,full*perRoll+offcutDrops-Math.max(0,neededDrops-narrowOffcutDrops))/perRoll),installDrops,reserveDrops,offcutDrops,perRoll,drop,finalWidth,narrowOffcutDrops};
}

// Minimize total new boards, including reserves. Exact search is bounded by size, nodes and time.
function allocateLinear(requested,stock,piece,kerf,reservePieces){
  const clone=bs=>bs.map(b=>({...b,cuts:[...b.cuts]}));
  const cost=bs=>bs.filter(b=>b.source==='buy').length+Math.max(0,reservePieces-bs.filter(b=>b.source==='owned'&&!b.cuts.length).length);
  const loss=(b,len)=>Math.abs(b.remaining-len)<EPS?0:kerf;
  const fits=(b,len)=>b.remaining+EPS>=len+loss(b,len);
  const fresh=bs=>({len:piece,remaining:piece,id:'b'+bs.filter(b=>b.source==='buy').length,source:'buy',cuts:[]});
  const ordered=[...requested].sort((a,b)=>b-a);let greedy=clone(stock);
  for(const len of ordered){
    let b=greedy.filter(b=>fits(b,len)).sort((a,b)=>a.remaining-b.remaining)[0];
    if(!b){b=fresh(greedy);if(!fits(b,len))throw Error('A '+len+' ft cut cannot fit a '+piece+' ft board with this kerf. Choose longer stock or an appropriate offcut.');greedy.push(b);}
    b.remaining-=len+loss(b,len);b.cuts.push(len);
  }
  let best=clone(greedy),bestCost=cost(best),complete=true,nodes=0;
  if(ordered.length>24||stock.length>40)return{bins:best,optimal:false};
  const deadline=Date.now()+150,bins=clone(stock);
  function visit(i){
    if(++nodes>150000||Date.now()>deadline){complete=false;return;}
    if(cost(bins)>=bestCost)return;
    if(i===ordered.length){best=clone(bins);bestCost=cost(best);return;}
    const len=ordered[i],seen=new Set();
    for(const b of bins){
      const key=b.source+':'+b.remaining+':'+Boolean(b.cuts.length);
      if(seen.has(key)||!fits(b,len))continue;
      seen.add(key);const rem=b.remaining;b.remaining-=len+loss(b,len);b.cuts.push(len);visit(i+1);b.cuts.pop();b.remaining=rem;if(!complete)return;
    }
    const b=fresh(bins);if(fits(b,len)){b.remaining-=len+loss(b,len);b.cuts.push(len);bins.push(b);visit(i+1);bins.pop();}
  }
  visit(0);return{bins:best,optimal:complete};
}

function linear(v,scraps=[],cuts=[]){
  const piece=positive(v.piece,'Stock length'),full=count(v.full),reserve=nonnegative(v.waste,'Reserve',100),kerf=nonnegative(v.kerf||0,'Saw kerf',1)/12;
  if(scraps.length>MAX)throw Error('Use at most 2,000 offcuts.');
  const stock=scraps.map((s,i)=>({len:positive(s.len,'Offcut length'),id:'s'+i,source:'scrap'}));
  if(!cuts.length){
    const len=positive(v.length,'Required length'),owned=full*piece+stock.reduce((s,x)=>s+x.len,0),total=len*(1+reserve/100);
    return{kind:'linear-estimate',full,need:Math.max(1,Math.ceil(total/piece-EPS)),buy:total>owned?Math.max(1,Math.ceil((total-owned)/piece-EPS)):0,surplus:Math.max(0,Math.floor((owned-total)/piece+EPS)),length:len};
  }
  let requested=[];
  for(const c of cuts){const len=positive(c.len,'Cut length'),qty=count(c.qty,'Cut quantity');if(!qty)throw Error('Cut quantity must be at least 1.');for(let i=0;i<qty;i++)requested.push(len);}
  if(requested.length>MAX)throw Error('Use at most 2,000 cuts.');
  const total=requested.reduce((s,x)=>s+x,0),reservePieces=Math.ceil(total*reserve/100/piece-EPS);
  const stockBins=[...stock,...Array.from({length:full},(_,i)=>({len:piece,id:'o'+i,source:'owned'}))].map(x=>({...x,remaining:x.len,cuts:[]}));
  const allocation=allocateLinear(requested,stockBins,piece,kerf,reservePieces),bins=allocation.bins,
    buy=bins.filter(x=>x.source==='buy').length,unusedOwned=bins.filter(x=>x.source==='owned'&&!x.cuts.length).length,
    reserveBuy=Math.max(0,reservePieces-unusedOwned),used=bins.filter(x=>x.cuts.length);
  const reusedLength=used.filter(b=>b.source!=='buy').reduce((n,b)=>n+b.cuts.reduce((n,l)=>n+l,0),0)+Math.min(unusedOwned,reservePieces)*piece;
  return{kind:'linear',full,need:total/piece+reservePieces,buy:buy+reserveBuy,physicalBuy:buy,reserveBuy,reservePieces,surplus:Math.max(0,unusedOwned-reservePieces),bins:used,remainingBins:bins,sourcePieces:used.length,length:total,reusedLength,plannedLength:total+reservePieces*piece,optimal:allocation.optimal};
}

function packagePlan(required,offers){
  required=count(required,'Required units');
  if(required===0)return{cost:0,purchasedUnits:0,overbuy:0,combo:[]};
  if(!Array.isArray(offers)||!offers.length)throw Error('Add at least one purchase option.');
  const clean=offers.slice(0,20).map((o,i)=>({
    units:count(Number(o.units),'Option '+(i+1)+' units'),
    price:positive(Number(o.price),'Option '+(i+1)+' price'),
    label:String(o.label||('Option '+(i+1))).slice(0,80)
  })).filter(o=>o.units>0);
  if(!clean.length)throw Error('Each purchase option needs at least one unit.');
  const maxUnits=Math.max(...clean.map(o=>o.units)),limit=Math.min(20000,required+maxUnits*2),dp=Array(limit+1).fill(null);
  dp[0]={cost:0,counts:Array(clean.length).fill(0)};
  for(let u=0;u<=limit;u++)if(dp[u])for(let i=0;i<clean.length;i++){
    const nu=Math.min(limit,u+clean[i].units),nc=dp[u].cost+clean[i].price;
    if(!dp[nu]||nc<dp[nu].cost-EPS){const counts=[...dp[u].counts];counts[i]++;dp[nu]={cost:nc,counts};}
  }
  let best=null,bestUnits=0;
  for(let u=required;u<=limit;u++)if(dp[u]&&(!best||dp[u].cost<best.cost-EPS||Math.abs(dp[u].cost-best.cost)<EPS&&u<bestUnits)){best=dp[u];bestUnits=u;}
  if(!best)throw Error('Could not build a purchase plan from these options.');
  return{cost:best.cost,purchasedUnits:bestUnits,overbuy:bestUnits-required,combo:clean.map((o,i)=>({...o,qty:best.counts[i]})).filter(x=>x.qty)};
}

return{rect,layoutLab,wallpaper,linear,packagePlan,positive,count,nonnegative};
});
