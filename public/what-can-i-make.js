(function(){
'use strict';

const E=window.LeftoverEngine;
if(!E)return;
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
const CONFIG={
  tile:{name:'Tile',mode:'area',unit:'tile',plural:'tiles',defaults:[18,12,12]},
  flooring:{name:'Flooring',mode:'area',unit:'plank',plural:'planks',defaults:[10,7.5,48]},
  plywood:{name:'Plywood',mode:'area',unit:'piece',plural:'pieces',defaults:[3,24,48]},
  lumber:{name:'Lumber',mode:'linear',unit:'board',plural:'boards',defaults:[12,3.5,96]},
  decking:{name:'Decking',mode:'area',unit:'board',plural:'boards',defaults:[8,5.5,96]},
  trim:{name:'Trim',mode:'linear',unit:'piece',plural:'pieces',defaults:[8,2.25,48]},
  wallpaper:{name:'Wallpaper',mode:'wallpaper',unit:'remnant',plural:'remnants',defaults:[2,20.5,96]}
};

const RECIPES={
  tile:[
    {name:'Shower niche or accent panel',project:{pw:3,ph:2},reserve:5,desc:'A compact tiled feature or repair surface.'},
    {name:'Utility backsplash',project:{pw:4,ph:1.5},reserve:8,desc:'A small sink, laundry or utility backsplash.'},
    {name:'Fireplace or hearth accent',project:{pw:4,ph:3},reserve:10,desc:'A modest rectangular accent surface.'},
    {name:'Kitchen backsplash section',project:{pw:8,ph:1.5},reserve:10,desc:'A typical short backsplash run.'},
    {name:'Entry landing',project:{pw:4,ph:4},reserve:10,desc:'A compact entry or mudroom landing.'},
    {name:'Small powder-room floor',project:{pw:5,ph:5},reserve:12,desc:'A small floor area with extra cutting reserve.'}
  ],
  flooring:[
    {name:'Localized floor repair',project:{pw:3,ph:2},reserve:5,desc:'A small damaged-floor replacement zone.'},
    {name:'Pantry floor',project:{pw:5,ph:3},reserve:8,desc:'A compact pantry or storage-floor area.'},
    {name:'Reach-in closet floor',project:{pw:6,ph:4},reserve:8,desc:'A typical small closet floor.'},
    {name:'Short hallway section',project:{pw:8,ph:3},reserve:8,desc:'A narrow hallway or transition area.'},
    {name:'Laundry nook',project:{pw:6,ph:5},reserve:10,desc:'A modest utility-room floor area.'},
    {name:'Small office or box room',project:{pw:8,ph:8},reserve:10,desc:'A compact room for a larger leftover batch.'}
  ],
  plywood:[
    {name:'Small shelf pair',project:{pw:3,ph:1.5},reserve:3,desc:'Panel area for two compact shelves or utility pieces.'},
    {name:'Cabinet or storage top',project:{pw:4,ph:2},reserve:3,desc:'A simple rectangular top or panel.'},
    {name:'Workbench top',project:{pw:6,ph:2},reserve:3,desc:'A narrow work surface made from saved sheet goods.'},
    {name:'Utility backer panel',project:{pw:4,ph:4},reserve:3,desc:'A square backing or wall-mounted utility panel.'},
    {name:'Bench or storage panels',project:{pw:6,ph:3},reserve:5,desc:'A larger group of rectangular sheet-good cuts.'},
    {name:'Compact cabinet project',project:{pw:6,ph:4},reserve:5,desc:'A rough panel-area check for a small storage build.'}
  ],
  lumber:[
    {name:'Repair blocking set',cuts:[{len:1.5,qty:6}],reserve:3,desc:'Six short blocking or repair pieces.'},
    {name:'Three wall shelves',cuts:[{len:3,qty:3}],reserve:3,desc:'Three 3-foot shelf-length cuts.'},
    {name:'Small planter frame',cuts:[{len:2,qty:8}],reserve:5,desc:'Eight 2-foot frame pieces.'},
    {name:'Simple bench frame',cuts:[{len:4,qty:2},{len:1.5,qty:4}],reserve:5,desc:'Two long rails plus four short supports.'},
    {name:'Utility rack frame',cuts:[{len:5,qty:2},{len:2,qty:6}],reserve:5,desc:'Two long members and six shorter frame pieces.'},
    {name:'Small workbench base',cuts:[{len:6,qty:2},{len:3,qty:4},{len:2.5,qty:4}],reserve:6,desc:'A larger cut-list test for a leftover board pile.'}
  ],
  decking:[
    {name:'Single-board repair zone',project:{pw:4,ph:1},reserve:5,desc:'A very small deck-board replacement area.'},
    {name:'Step or platform surface',project:{pw:4,ph:2},reserve:5,desc:'A compact step or platform surface.'},
    {name:'Deck repair patch',project:{pw:4,ph:3},reserve:5,desc:'A localized board replacement area.'},
    {name:'Outdoor bench surface',project:{pw:5,ph:1.5},reserve:5,desc:'Surface boards for a simple outdoor bench.'},
    {name:'Small landing',project:{pw:6,ph:4},reserve:8,desc:'A small outdoor landing or platform.'},
    {name:'Compact balcony section',project:{pw:6,ph:6},reserve:10,desc:'A larger surface check for a substantial leftover batch.'}
  ],
  trim:[
    {name:'Four short repair pieces',cuts:[{len:2,qty:4}],reserve:3,desc:'Short replacement sections for small trim repairs.'},
    {name:'Small window casing',cuts:[{len:5,qty:2},{len:3,qty:2}],reserve:5,desc:'Two sides plus head and sill-side casing lengths.'},
    {name:'Standard door casing',cuts:[{len:7,qty:2},{len:3,qty:1}],reserve:5,desc:'Two jamb-side casing pieces plus one head piece.'},
    {name:'Closet baseboard run',cuts:[{len:6,qty:2},{len:4,qty:2}],reserve:5,desc:'A four-wall baseboard check for a compact closet.'},
    {name:'Small room accent trim',cuts:[{len:8,qty:2},{len:6,qty:2}],reserve:7,desc:'Four longer runs for a simple room accent.'},
    {name:'Two-door casing set',cuts:[{len:7,qty:4},{len:3,qty:2}],reserve:6,desc:'A larger casing test using repeated long pieces.'}
  ],
  wallpaper:[
    {name:'Decorative panel',project:{pw:3,ph:7},reserve:0,desc:'A narrow decorative panel or inset.'},
    {name:'Closet feature wall',project:{pw:5,ph:8},reserve:5,desc:'A small single wall with a modest reserve.'},
    {name:'Powder-room accent wall',project:{pw:6,ph:8},reserve:8,desc:'A compact feature wall.'},
    {name:'Small bedroom accent wall',project:{pw:8,ph:8},reserve:8,desc:'A medium single-wall project.'},
    {name:'Wide feature wall',project:{pw:10,ph:8},reserve:10,desc:'A larger single-wall check.'},
    {name:'Long accent wall',project:{pw:12,ph:8},reserve:10,desc:'A substantial feature wall for larger remnants or rolls.'}
  ]
};

function values(){
  const m=$('ideaMaterial').value,c=CONFIG[m];
  const qty=E.count(Number($('ideaQty').value),'Quantity');
  if(qty<1)throw Error('Quantity must be at least 1.');
  const w=E.positive(Number($('ideaWidth').value),'Width');
  const h=E.positive(Number($('ideaLength').value),'Length');
  return{m,c,qty,w,h};
}
function coverageFor(m,p){
  if(m==='lumber'||m==='trim')return Math.max(0,Math.min(1,p.reusedLength/Math.max(.0001,p.plannedLength)));
  return Math.max(0,Math.min(1,(p.need-p.buy)/Math.max(1,p.need)));
}
function runRecipe(v,r){
  try{
    let p;
    if(v.c.mode==='linear'){
      p=E.linear({piece:v.h/12,full:v.qty,waste:r.reserve||0,kerf:.125},[],r.cuts||[]);
    }else if(v.c.mode==='wallpaper'){
      p=E.wallpaper({pw:r.project.pw,ph:r.project.ph,rollw:v.w,coverage:v.w*v.h/144,full:v.qty,waste:r.reserve||0,repeat:0,trim:0},[]);
    }else{
      p=E.rect({pw:r.project.pw,ph:r.project.ph,uw:v.w,uh:v.h,full:v.qty,waste:r.reserve||0},[],{rotate:true,kerf:0});
    }
    return{recipe:r,p,coverage:coverageFor(v.m,p)};
  }catch(e){return{recipe:r,error:e.message,coverage:0,p:null};}
}
function recipeNeed(r,m){
  if(m==='lumber'||m==='trim'){
    const n=(r.cuts||[]).reduce((s,x)=>s+x.len*x.qty,0);
    return n.toFixed(n%1?1:0)+' ft of cuts';
  }
  return r.project.pw+' × '+r.project.ph+' ft project';
}
function gapText(x,v){
  if(!x.p)return 'Entered pieces do not fit this recipe';
  if(x.p.buy===0)return 'No additional same-size '+v.c.plural+' estimated';
  return 'Estimated gap: '+x.p.buy+' more '+(x.p.buy===1?v.c.unit:v.c.plural)+' of the entered stock size';
}
function encodeStock(v){
  const raw=JSON.stringify({m:v.c.name,q:v.qty,w:v.w,h:v.h});
  return btoa(unescape(encodeURIComponent(raw))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function calcURL(v){
  return '/'+v.m+'#stock='+encodeStock(v);
}
function applyURL(v){
  const u=new URL(location.href);
  u.searchParams.set('material',v.m);u.searchParams.set('qty',v.qty);u.searchParams.set('w',v.w);u.searchParams.set('h',v.h);
  history.replaceState(null,'',u.pathname+u.search);
}
function render(){
  let v;
  try{v=values();}catch(e){
    $('resultTitle').textContent='Check the material details.';
    $('ideaSummary').innerHTML='<span class="finder-warning">'+esc(e.message)+'</span>';
    $('ideaResults').innerHTML='';$('shareFinder').disabled=true;return;
  }
  const rows=(RECIPES[v.m]||[]).map(r=>runRecipe(v,r));
  rows.sort((a,b)=>(a.p?.buy===0?0:1)-(b.p?.buy===0?0:1)||b.coverage-a.coverage||(a.p?.buy||999)-(b.p?.buy||999));
  const ready=rows.filter(x=>x.p&&x.p.buy===0).length;
  $('resultTitle').textContent=ready?ready+' project '+(ready===1?'match':'matches')+' ready with this batch':'Closest project matches for this batch';
  $('ideaSummary').innerHTML='<b>'+esc(v.c.name)+' · '+v.qty+' × '+v.w+' × '+v.h+' in</b><span>'+ready+' of '+rows.length+' recipes fully covered in the planning model</span>';
  $('ideaResults').innerHTML=rows.map((x,i)=>{
    const pct=Math.round(x.coverage*100);
    const status=x.p&&x.p.buy===0?'READY WITH THIS BATCH':(x.p?pct+'% COVERED':'SIZE MISMATCH');
    return '<article class="idea-match '+(x.p&&x.p.buy===0?'ready':'')+'">'+
      '<div class="idea-rank">'+String(i+1).padStart(2,'0')+'</div>'+
      '<div class="idea-match-copy"><span class="recipe-status '+(x.p&&x.p.buy===0?'ready':'')+'">'+status+'</span><h4>'+esc(x.recipe.name)+'</h4><p>'+esc(x.recipe.desc)+'</p><small>'+esc(recipeNeed(x.recipe,v.m))+' · '+esc(gapText(x,v))+'</small></div>'+
      '<div class="idea-meter" aria-label="'+pct+' percent covered"><i style="width:'+pct+'%"></i><b>'+pct+'%</b></div>'+
      '<a class="idea-open" href="'+calcURL(v)+'">Open '+esc(v.c.name.toLowerCase())+' calculator →</a>'+
      '</article>';
  }).join('');
  $('shareFinder').disabled=false;
  applyURL(v);
}
function setDefaults(m){
  const d=CONFIG[m].defaults;
  $('ideaQty').value=d[0];$('ideaWidth').value=d[1];$('ideaLength').value=d[2];
  const linear=CONFIG[m].mode==='linear';
  $('ideaWidthLabel').textContent=linear?'Piece width':'Piece width';
  $('ideaLengthLabel').textContent=linear?'Board / piece length':'Piece length';
  $('dimensionNote').textContent=linear?'Project matching uses the entered stock length for cut-fit planning. Width is carried with the batch for reference.':'Use the real width and length of the full pieces or remnants you still own.';
}
function share(){
  let v;try{v=values();}catch{return;}
  const u=new URL(location.href);u.searchParams.set('material',v.m);u.searchParams.set('qty',v.qty);u.searchParams.set('w',v.w);u.searchParams.set('h',v.h);
  const data={title:'Leftover project finder',text:'See what this leftover '+v.c.name.toLowerCase()+' batch can make.',url:u.href};
  if(navigator.share){navigator.share(data).catch(()=>{});return;}
  navigator.clipboard?.writeText(u.href).then(()=>{const b=$('shareFinder');const old=b.textContent;b.textContent='Link copied';setTimeout(()=>b.textContent=old,1600);});
}
function loadQuery(){
  const q=new URLSearchParams(location.search),m=q.get('material');
  if(m&&CONFIG[m]){
    $('ideaMaterial').value=m;setDefaults(m);
    if(q.get('qty'))$('ideaQty').value=q.get('qty');
    if(q.get('w'))$('ideaWidth').value=q.get('w');
    if(q.get('h'))$('ideaLength').value=q.get('h');
    render();return;
  }
  setDefaults($('ideaMaterial').value);
}

$('ideaMaterial').addEventListener('change',e=>{setDefaults(e.target.value);render();});
$('findIdeas').addEventListener('click',render);
$('shareFinder').addEventListener('click',share);
document.querySelectorAll('[data-sample]').forEach(b=>b.addEventListener('click',()=>{$('ideaMaterial').value=b.dataset.sample;setDefaults(b.dataset.sample);render();}));
['ideaQty','ideaWidth','ideaLength'].forEach(id=>$(id).addEventListener('keydown',e=>{if(e.key==='Enter')render();}));
loadQuery();
})();