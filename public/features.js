(function(){
'use strict';

const app=window.LeftoverApp,E=window.LeftoverEngine;
if(!app||!E)return;
const esc=s=>String(s).replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
const $=id=>document.getElementById(id);
const materialName=m=>app.configs[m]?.name||m;

const RECIPES={
  tile:[
    {name:'Small tile repair',project:{pw:3,ph:2},reserve:5,desc:'A compact floor or wall repair area.'},
    {name:'Backsplash strip',project:{pw:6,ph:2},reserve:10,desc:'A short kitchen or utility backsplash.'},
    {name:'Hearth surround',project:{pw:4,ph:2.5},reserve:10,desc:'A small rectangular accent surface.'},
    {name:'Entry landing',project:{pw:5,ph:4},reserve:10,desc:'A small entry or mudroom landing.'}
  ],
  flooring:[
    {name:'Floor repair',project:{pw:4,ph:3},reserve:5,desc:'A localized damaged-floor replacement.'},
    {name:'Closet floor',project:{pw:6,ph:4},reserve:8,desc:'A typical reach-in closet floor.'},
    {name:'Short hallway',project:{pw:8,ph:3},reserve:8,desc:'A narrow hallway section.'},
    {name:'Small landing',project:{pw:6,ph:5},reserve:8,desc:'A small landing or utility space.'}
  ],
  plywood:[
    {name:'Workbench top',project:{pw:6,ph:3},reserve:3,desc:'A rectangular work surface.'},
    {name:'Shelf-panel project',project:{pw:3,ph:2},reserve:3,desc:'Panel area for a small shelving project.'},
    {name:'Utility panel',project:{pw:4,ph:4},reserve:3,desc:'A square utility or backing panel.'},
    {name:'Storage top',project:{pw:4,ph:2},reserve:3,desc:'A compact cabinet or storage top.'}
  ],
  decking:[
    {name:'Deck repair patch',project:{pw:4,ph:3},reserve:5,desc:'A localized deck-board replacement area.'},
    {name:'Small landing',project:{pw:6,ph:4},reserve:8,desc:'A small outdoor landing.'},
    {name:'Step platform',project:{pw:4,ph:2},reserve:5,desc:'A compact platform or step surface.'},
    {name:'Bench deck surface',project:{pw:5,ph:1.5},reserve:5,desc:'Surface material for a simple outdoor bench.'}
  ],
  wallpaper:[
    {name:'Accent panel',project:{pw:4,ph:8},reserve:0,desc:'A narrow decorative wall panel.'},
    {name:'Closet wall',project:{pw:6,ph:8},reserve:5,desc:'A single small closet wall.'},
    {name:'Small wall',project:{pw:8,ph:8},reserve:8,desc:'A compact feature wall.'},
    {name:'Wide accent wall',project:{pw:12,ph:8},reserve:10,desc:'A larger feature-wall check.'}
  ],
  lumber:[
    {name:'Three wall shelves',cuts:[{len:3,qty:3}],reserve:3,desc:'Three 3-ft shelf-length cuts.'},
    {name:'Simple bench frame',cuts:[{len:4,qty:2},{len:1.5,qty:4}],reserve:5,desc:'Two long rails plus four short legs/supports.'},
    {name:'Small planter frame',cuts:[{len:2,qty:8}],reserve:5,desc:'Eight 2-ft frame pieces.'},
    {name:'Repair blocking set',cuts:[{len:1.5,qty:6}],reserve:3,desc:'Six short repair/blocking pieces.'}
  ],
  trim:[
    {name:'Door casing',cuts:[{len:7,qty:2},{len:3,qty:1}],reserve:5,desc:'Two sides and one head piece.'},
    {name:'Window casing',cuts:[{len:5,qty:2},{len:3,qty:2}],reserve:5,desc:'Four casing pieces for a small window.'},
    {name:'Closet base trim',cuts:[{len:6,qty:2},{len:4,qty:2}],reserve:5,desc:'A compact four-wall baseboard run.'},
    {name:'Repair trim set',cuts:[{len:2,qty:4}],reserve:3,desc:'Four short replacement pieces.'}
  ]
};

function recipeResult(batch,recipe){
  const m=String(batch.material).toLowerCase(),c=app.configs[m];
  try{
    if(c.mode==='areaPiece'){
      const p=E.rect({pw:recipe.project.pw,ph:recipe.project.ph,uw:batch.w,uh:batch.h,full:batch.qty,waste:recipe.reserve||0},[],{rotate:true,kerf:0});
      return{p,coverage:Math.max(0,Math.min(1,(p.need-p.buy)/Math.max(1,p.need)))};
    }
    if(c.mode==='linear'){
      const piece=batch.h/12;
      const p=E.linear({piece,full:batch.qty,waste:recipe.reserve||0,kerf:.125},[],recipe.cuts||[]);
      return{p,coverage:Math.max(0,Math.min(1,p.reusedLength/Math.max(.0001,p.plannedLength)))};
    }
    const p=E.wallpaper({pw:recipe.project.pw,ph:recipe.project.ph,rollw:batch.w,coverage:batch.w*batch.h/144,full:batch.qty,waste:recipe.reserve||0,repeat:0,trim:0},[]);
    return{p,coverage:Math.max(0,Math.min(1,(p.need-p.buy)/Math.max(1,p.need)))};
  }catch{return null;}
}

function usefulness(batch){
  const rs=(RECIPES[String(batch.material).toLowerCase()]||[]).map(r=>recipeResult(batch,r)).filter(Boolean);
  if(!rs.length)return{score:0,ready:0,label:'NICHE'};
  const coverage=rs.map(x=>x.coverage).sort((a,b)=>b-a),best=coverage[0]||0,avg=coverage.slice(0,3).reduce((a,b)=>a+b,0)/Math.min(3,coverage.length),ready=rs.filter(x=>x.p.buy===0).length;
  const score=Math.round(100*(best*.65+avg*.35));
  return{score,ready,label:score>=78?'KEEP':score>=45?'USEFUL':'NICHE'};
}

function startRecipe(batchIndex,recipe){
  const inv=app.inventory(),batch=inv[batchIndex];if(!batch)return;
  const m=String(batch.material).toLowerCase();
  app.importInventory(batchIndex);
  if(app.configs[m].mode==='linear'){
    app.setCuts(recipe.cuts||[]);
    app.setProjectValues({waste:recipe.reserve||0});
  }else app.setProjectValues({...recipe.project,waste:recipe.reserve||0});
  app.calculate();
}

function runQuickExample(recipeIndex=1){
  const recipe=RECIPES.lumber[recipeIndex]||RECIPES.lumber[1];
  app.render('lumber',false);
  app.clearInventorySource?.();
  app.setCuts(recipe.cuts||[]);
  app.setProjectValues({piece:8,full:12,waste:recipe.reserve||0,kerf:.125});
  app.calculate(false);
  const status=$('quickDemoStatus');
  if(status)status.textContent='Loaded: 12 standard 8-ft boards → '+recipe.name+'. The live plan below shows the cut allocation and purchase gap.';
  requestAnimationFrame(()=>$('planner')?.scrollIntoView({behavior:'smooth',block:'start'}));
}
function wireQuickDemo(){
  const main=$('tryExample');
  if(main)main.onclick=()=>runQuickExample(1);
  document.querySelectorAll('[data-demo-recipe]').forEach(btn=>{
    btn.onclick=()=>runQuickExample(Number(btn.dataset.demoRecipe)||0);
  });
}

function refreshDiscovery(){
  const box=$('projectSuggestions');if(!box)return;
  const inv=app.inventory(),matches=[];
  inv.forEach((batch,batchIndex)=>{
    const recipes=RECIPES[String(batch.material).toLowerCase()]||[];
    recipes.forEach(recipe=>{const rr=recipeResult(batch,recipe);if(rr)matches.push({batch,batchIndex,recipe,...rr});});
  });
  matches.sort((a,b)=>(a.p.buy===0?0:1)-(b.p.buy===0?0:1)||b.coverage-a.coverage||a.p.buy-b.p.buy);
  box.innerHTML=matches.length?matches.slice(0,8).map((x,i)=>{
    const pct=Math.round(x.coverage*100),status=x.p.buy===0?'READY WITH THIS BATCH':pct+'% COVERED';
    const gap=x.p.buy===0?'No additional '+app.configs[String(x.batch.material).toLowerCase()].plural+' estimated':'Estimated gap: '+x.p.buy+' '+app.configs[String(x.batch.material).toLowerCase()].plural;
    return `<button class="suggestion recipe-suggestion" type="button" data-match="${i}"><span class="recipe-status ${x.p.buy===0?'ready':''}">${status}</span><b>${esc(x.recipe.name)}</b><span>${esc(x.batch.material)} · ${x.batch.qty} × ${x.batch.w} × ${x.batch.h} in</span><small>${esc(gap)} →</small></button>`;
  }).join(''):'<p>Add material to see project recipes ranked by what your saved leftovers can actually cover.</p>';
  box.querySelectorAll('[data-match]').forEach(b=>b.onclick=()=>startRecipe(matches[+b.dataset.match].batchIndex,matches[+b.dataset.match].recipe));

  document.querySelectorAll('.inventory-item').forEach((el,i)=>{
    const b=inv[i];if(!b)return;const u=usefulness(b),info=el.querySelector('div');
    if(info&&!info.querySelector('.usefulness'))info.insertAdjacentHTML('beforeend',`<span class="usefulness ${u.label.toLowerCase()}"><b>${u.score}/100</b> ${u.label} · ${u.ready} recipe${u.ready===1?'':'s'} fully covered</span>`);
    if(info&&!info.querySelector('[data-label]')){const btn=document.createElement('button');btn.type='button';btn.dataset.label=String(i);btn.className='label-link';btn.textContent='Print QR label';btn.onclick=e=>{e.stopPropagation();openLabel(b)};info.append(btn);}
  });
}

function base64urlEncode(obj){return btoa(unescape(encodeURIComponent(JSON.stringify(obj)))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
function base64urlDecode(s){s=s.replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';return JSON.parse(decodeURIComponent(escape(atob(s))));}
function stockURL(batch){const base=location.origin&&location.origin!=='null'?location.origin:'https://www.buildwithleftovers.com';const u=new URL('/',base);u.hash=new URLSearchParams({stock:base64urlEncode({m:batch.material,q:batch.qty,w:batch.w,h:batch.h})}).toString();return u.href;}

function ensureModal(id,html){let m=$(id);if(m)return m;m=document.createElement('div');m.id=id;m.className='feature-modal';m.hidden=true;m.innerHTML=html;document.body.append(m);return m;}
function closeModal(m){m.hidden=true;document.body.classList.remove('printing-label');}

function openLabel(batch){
  const m=ensureModal('labelModal',`<div class="feature-modal-card label-card" role="dialog" aria-modal="true" aria-labelledby="labelTitle"><button class="modal-x" type="button" aria-label="Close">×</button><span class="eyebrow">GARAGE LABEL</span><h2 id="labelTitle">Leftover material</h2><div id="labelQR" class="label-qr"></div><div id="labelDetails"></div><p class="label-help">Scan later to reopen this exact batch in Leftover. The dimensions are encoded in the URL fragment, which browsers do not send with the page request. No inventory account or server database is required.</p><div class="modal-actions"><button id="printLabel" type="button">Print label</button><button id="closeLabel" type="button">Close</button></div></div>`);
  m.hidden=false;m.querySelector('.modal-x').onclick=()=>closeModal(m);$('closeLabel').onclick=()=>closeModal(m);
  $('labelDetails').innerHTML=`<strong>${esc(batch.material)}</strong><span>${batch.qty} piece${batch.qty===1?'':'s'}</span><b>${batch.w} × ${batch.h} in</b><small>Leftover · Plan Smart. Waste Less.</small>`;
  const qr=$('labelQR');qr.innerHTML='';const url=stockURL(batch);
  if(window.QRCode)new QRCode(qr,{text:url,width:190,height:190,correctLevel:QRCode.CorrectLevel.M});
  else qr.innerHTML='<p>QR generator unavailable.</p><textarea readonly>'+esc(url)+'</textarea>';
  $('printLabel').onclick=()=>{document.body.classList.add('printing-label');window.print();};
  window.addEventListener('afterprint',()=>document.body.classList.remove('printing-label'),{once:true});
}

function handleStockLink(){
  const q=new URLSearchParams(location.search),h=new URLSearchParams(location.hash.slice(1)),raw=h.get('stock')||q.get('stock');if(!raw)return;
  const cleanURL=()=>{try{const u=new URL(location.href);u.searchParams.delete('stock');u.hash='';history.replaceState(null,'',u.pathname+u.search);}catch{}};
  try{
    const x=base64urlDecode(raw),m=String(x.m||'');
    if(!app.configs[m.toLowerCase()])throw Error('Unknown material');
    const batch={id:app.batchId(),material:app.configs[m.toLowerCase()].name,qty:E.count(Number(x.q),'Quantity'),w:E.positive(Number(x.w),'Width'),h:E.positive(Number(x.h),'Length')};
    if(!batch.qty)throw Error('Quantity must be at least one.');
    const banner=document.createElement('section');banner.className='scan-banner';banner.innerHTML=`<div><span class="eyebrow">QR LABEL SCANNED</span><b>${esc(batch.material)} · ${batch.qty} piece${batch.qty===1?'':'s'} · ${batch.w} × ${batch.h} in</b><small>Review the physical material before relying on the saved dimensions.</small></div><button type="button">Add to this device</button>`;
    const main=document.querySelector('main');main?.prepend(banner);banner.querySelector('button').onclick=()=>{const inv=app.inventory();if(inv.length>=100){banner.querySelector('small').textContent='Inventory is full. Remove a saved batch first.';return;}inv.push(batch);if(app.writeStore('leftover-inventory',inv)){banner.querySelector('button').disabled=true;banner.querySelector('button').textContent='Saved';app.drawInventory();app.drawInventoryImport();cleanURL();}else banner.querySelector('small').textContent='Browser storage is unavailable.';};
  }catch{cleanURL();}
}

function formatRemnant(r,m){return m==='lumber'||m==='trim'?`${(r.h/12).toFixed(2)} ft`:`${r.w.toFixed(2)} × ${r.h.toFixed(2)} in`;}
function groupRemnants(result,m,sourceOnly){
  const out=[];
  if(result.kind==='rect'&&Array.isArray(result.remainingBins)){
    result.remainingBins.filter(b=>!sourceOnly||b.source==='owned').forEach(b=>{if(b.w>=1-EPS&&b.h>=1-EPS&&b.w*b.h>=4)out.push({w:b.w,h:b.h});});
  }else if(result.kind==='linear'&&Array.isArray(result.remainingBins)){
    const sourceBatch=app.inventory().find(x=>x.id===app.getInventorySourceId()),width=sourceBatch?.w||1;
    result.remainingBins.filter(b=>(!sourceOnly||b.source==='owned')&&b.remaining>=.25).forEach(b=>out.push({w:width,h:b.remaining*12}));
  }
  const groups=[];
  out.forEach(r=>{const key=`${Math.round(r.w*100)/100}|${Math.round(r.h*100)/100}`,g=groups.find(x=>x.key===key);if(g)g.qty++;else groups.push({key,w:r.w,h:r.h,qty:1});});
  return groups.sort((a,b)=>b.w*b.h-a.w*a.h);
}
const EPS=1e-7;

function saveRemnants(groups,replaceSource){
  const inv=app.inventory(),sourceId=app.getInventorySourceId(),m=app.getCurrent(),name=materialName(m);
  let next=[...inv];
  if(replaceSource&&sourceId)next=next.filter(x=>x.id!==sourceId);
  for(const g of groups){if(next.length>=100)break;next.push({id:app.batchId(),material:name,qty:g.qty,w:Number(g.w.toFixed(3)),h:Number(g.h.toFixed(3))});}
  if(!app.writeStore('leftover-inventory',next))return false;
  app.drawInventory();app.drawInventoryImport();return true;
}

function renderLeftoverLoop(result){
  let box=$('leftoverLoop');if(!box){box=document.createElement('section');box.id='leftoverLoop';box.className='feature-card';$('result')?.append(box);}
  const m=app.getCurrent(),sourceId=app.getInventorySourceId(),groups=groupRemnants(result,m,Boolean(sourceId));
  if(!['rect','linear'].includes(result.kind)){box.hidden=true;return;}
  box.hidden=false;
  const source=sourceId?'This plan started from a saved inventory batch. Replace that batch after you finish the project to keep your inventory closed-loop.':'Save the estimated remaining owned material as a new inventory snapshot after you finish the project.';
  box.innerHTML=`<div class="feature-head"><div><span class="eyebrow">MATERIAL RELAY</span><h4>Carry the remnants into your next project.</h4></div><span class="feature-chip">${groups.reduce((n,g)=>n+g.qty,0)} usable remnants</span></div><p>${esc(source)}</p>${groups.length?`<div class="remnant-list">${groups.slice(0,8).map(g=>`<span><b>${g.qty}×</b> ${formatRemnant(g,m)}</span>`).join('')}</div>`:'<p class="muted-note">No owned remnants above the suggested minimum size remain in this plan.</p>'}<button class="feature-primary" id="saveRemnants" type="button">${sourceId?'Replace saved batch with these remnants':'Save these remnants to inventory'}</button><small>Planning estimate only. Verify the pieces you actually have after cutting. Very small remnants are intentionally omitted.</small>`;
  $('saveRemnants').onclick=()=>{const ok=saveRemnants(groups,Boolean(sourceId));$('saveRemnants').textContent=ok?'Inventory updated':'Could not save inventory';$('saveRemnants').disabled=ok;};
}

function renderLayoutLab(result){
  let box=$('layoutLab');if(!box){box=document.createElement('section');box.id='layoutLab';box.className='feature-card';$('result')?.append(box);}
  const m=app.getCurrent(),c=app.configs[m];if(c.mode!=='areaPiece'){box.hidden=true;return;}
  try{
    const lab=E.layoutLab(app.getValues(),app.getScraps(),{rotate:$('rotate')?.checked!==false,kerf:Number($('kerf')?.value||0),stagger:m!=='plywood'}),best=lab.candidates[0];
    box.hidden=false;box.innerHTML=`<div class="feature-head"><div><span class="eyebrow">BEST LAYOUT LAB</span><h4>${esc(best.name)} is the current leader.</h4></div><span class="feature-chip">Buy ${best.buy}</span></div><p>Compares start position, rotation${m==='plywood'?'':' and a 50% row stagger'} using the same measured stock and offcuts.</p><div class="layout-lab-table">${lab.candidates.map((x,i)=>`<div class="${i===0?'winner':''}"><b>${i===0?'★ ':''}${esc(x.name)}</b><span>${x.buy} to buy${x.optimal?' · verified':' · estimate'}</span><span>smallest edge ≈ ${x.minEdge.toFixed(2)} in</span></div>`).join('')}</div><small>${lab.candidates.every(x=>x.optimal)?'Minimum new-piece count was verified for each compared layout.':'One or more larger layouts used a bounded packing estimate, so the absolute minimum purchase is not guaranteed.'} Confirm grout/gaps, fastening, pattern direction, structural rules and manufacturer instructions before installation.</small>`;
  }catch(e){box.hidden=false;box.innerHTML=`<span class="eyebrow">BEST LAYOUT LAB</span><p>${esc(e.message)}</p>`;}
}

function defaultOffers(m){return[{label:'Single unit',units:1,price:''},{label:'Package / bundle',units:'',price:''},{label:'Bulk package',units:'',price:''}];}
function getOffers(m){const all=app.readStore('leftover-price-options-v1',{}),rows=Array.isArray(all[m])?all[m]:defaultOffers(m);return rows.slice(0,3);}
function saveOffers(m,rows){const all=app.readStore('leftover-price-options-v1',{});all[m]=rows;app.writeStore('leftover-price-options-v1',all);}
function renderPurchasePlan(result){
  let box=$('purchasePlan');if(!box){box=document.createElement('section');box.id='purchasePlan';box.className='feature-card';$('result')?.append(box);}
  const m=app.getCurrent(),c=app.configs[m],required=Math.max(0,Math.ceil(result.buy||0)),rows=getOffers(m);
  box.hidden=false;box.innerHTML=`<div class="feature-head"><div><span class="eyebrow">CHEAPEST PURCHASE PLAN</span><h4>${required?`Price the ${required} ${required===1?c.unit:c.plural} you still need.`:'No purchase gap right now.'}</h4></div><span class="feature-chip">Manual prices</span></div><p>Enter package sizes and prices for the exact material/stock size in this plan. Leftover finds the lowest-cost combination without a retailer connection.</p><div class="price-options">${rows.map((r,i)=>`<div><input aria-label="Purchase option ${i+1} label" data-price-i="${i}" data-price-k="label" value="${esc(r.label||'')}"><label>Units<input type="number" min="1" step="1" data-price-i="${i}" data-price-k="units" value="${r.units||''}"></label><label>Price $<input type="number" min="0" step="0.01" data-price-i="${i}" data-price-k="price" value="${r.price||''}"></label></div>`).join('')}</div><div id="priceAnswer" class="price-answer"></div><small>Prices stay in this browser. Taxes, delivery, store minimums, availability and mismatched product specifications are not included.</small>`;
  const update=()=>{
    const next=rows.map((_,i)=>({label:document.querySelector(`[data-price-i="${i}"][data-price-k="label"]`)?.value||'',units:document.querySelector(`[data-price-i="${i}"][data-price-k="units"]`)?.value||'',price:document.querySelector(`[data-price-i="${i}"][data-price-k="price"]`)?.value||''}));saveOffers(m,next);
    if(!required){$('priceAnswer').innerHTML='<b>$0.00 estimated purchase</b><span>Your current plan shows no additional units needed.</span>';return;}
    const valid=next.filter(x=>Number(x.units)>0&&Number(x.price)>0);
    if(!valid.length){$('priceAnswer').innerHTML='<span>Add at least one package size and price to calculate the cheapest combination.</span>';return;}
    try{const plan=E.packagePlan(required,valid);$('priceAnswer').innerHTML=`<b>$${plan.cost.toFixed(2)} estimated</b><span>${plan.combo.map(x=>`${x.qty} × ${esc(x.label)} (${x.units} each)`).join(' + ')}${plan.overbuy?` · ${plan.overbuy} extra unit${plan.overbuy===1?'':'s'}`:''}</span>`;}catch(e){$('priceAnswer').textContent=e.message;}
  };
  box.querySelectorAll('input').forEach(x=>x.addEventListener('input',update));update();
}

function workshopSteps(result){
  const m=app.getCurrent(),steps=[];
  if(result.kind==='linear'){
    const kerf=Number($('kerf')?.value||0)/12;
    result.bins.forEach((b,bi)=>{let remaining=b.len;b.cuts.forEach((cut,ci)=>{const loss=Math.abs(remaining-cut)<EPS?0:kerf;remaining-=cut+loss;steps.push({title:`${b.source==='buy'?'New':b.source==='owned'?'Owned':'Offcut'} stock ${bi+1}`,main:`Cut ${cut} ft`,sub:`Estimated remaining after kerf: ${Math.max(0,remaining).toFixed(3)} ft`});});});
  }else if(result.kind==='rect'){
    [...result.placements].sort((a,b)=>a.req.r-b.req.r||a.req.c-b.req.c).forEach((x,i)=>steps.push({title:`${x.source==='buy'?'New':x.source==='owned'?'Owned':'Offcut'} piece ${x.id}`,main:`Prepare ${x.req.w.toFixed(3)} × ${x.req.h.toFixed(3)} in`,sub:`Layout row ${x.req.r+1}, column ${x.req.c+1}${x.rotated?' · rotated 90°':''}`}));
  }
  return steps;
}
function ensureWorkshopButton(){const actions=document.querySelector('.result-actions');if(!actions||$('workshopMode'))return;const b=document.createElement('button');b.id='workshopMode';b.type='button';b.textContent='Workshop mode';b.disabled=true;actions.append(b);b.onclick=openWorkshop;}
function openWorkshop(){
  const result=app.getResult(),steps=workshopSteps(result||{});if(!steps.length)return;
  const m=ensureModal('workshopModal',`<div class="feature-modal-card workshop-card" role="dialog" aria-modal="true" aria-labelledby="workshopTitle"><button class="modal-x" type="button" aria-label="Close">×</button><span class="eyebrow">WORKSHOP MODE</span><h2 id="workshopTitle">Step-by-step cut guide</h2><div class="workshop-progress"><i></i></div><div id="workshopStep"></div><div class="modal-actions"><button id="workshopPrev" type="button">Previous</button><button id="workshopNext" type="button">Next</button><button id="workshopClose" type="button">Close</button></div><small>Planning guide only. Measure twice and confirm the actual stock, blade/kerf, joints and installation requirements before every cut.</small></div>`);m.hidden=false;let i=0;
  const draw=()=>{const s=steps[i];$('workshopStep').innerHTML=`<span>${i+1} of ${steps.length}</span><b>${esc(s.title)}</b><strong>${esc(s.main)}</strong><p>${esc(s.sub)}</p>`;m.querySelector('.workshop-progress i').style.width=((i+1)/steps.length*100)+'%';$('workshopPrev').disabled=i===0;$('workshopNext').textContent=i===steps.length-1?'Done':'Next';};
  $('workshopPrev').onclick=()=>{if(i>0){i--;draw();}};$('workshopNext').onclick=()=>{if(i<steps.length-1){i++;draw();}else closeModal(m);};$('workshopClose').onclick=()=>closeModal(m);m.querySelector('.modal-x').onclick=()=>closeModal(m);draw();
}

function onCalculated(e){const result=e.detail?.result||app.getResult();if(!result)return;ensureWorkshopButton();const wb=$('workshopMode');if(wb)wb.disabled=!['rect','linear'].includes(result.kind);renderLayoutLab(result);renderPurchasePlan(result);renderLeftoverLoop(result);}
function onCleared(){['layoutLab','purchasePlan','leftoverLoop'].forEach(id=>{if($(id))$(id).hidden=true;});if($('workshopMode'))$('workshopMode').disabled=true;}

window.addEventListener('leftover:calculated',onCalculated);
window.addEventListener('leftover:cleared',onCleared);
window.LeftoverFeatures={refreshDiscovery};
wireQuickDemo();
ensureWorkshopButton();
refreshDiscovery();
handleStockLink();
if(app.getResult())onCalculated({detail:{result:app.getResult()}});
})();
