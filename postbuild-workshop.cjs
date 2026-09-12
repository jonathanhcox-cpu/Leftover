const fs = require('node:fs');

const featurePath = 'dist/features.js';
if (!fs.existsSync(featurePath)) throw new Error('dist/features.js was not produced by build.cjs');

let features = fs.readFileSync(featurePath, 'utf8');

const workshopUpgrade = String.raw`function workshopSteps(result){
  const m=app.getCurrent(),steps=[];
  if(result.kind==='linear'){
    const kerf=Number($('kerf')?.value||0)/12;
    result.bins.forEach((b,bi)=>{let remaining=b.len;b.cuts.forEach(cut=>{const loss=Math.abs(remaining-cut)<EPS?0:kerf;remaining-=cut+loss;steps.push({title:(b.source==='buy'?'New':b.source==='owned'?'Owned':'Offcut')+' stock '+(bi+1),main:'Cut '+cut+' ft',sub:'Estimated remaining after kerf: '+Math.max(0,remaining).toFixed(3)+' ft'});});});
  }else if(result.kind==='rect'){
    const placements=[...result.placements].sort((a,b)=>a.req.r-b.req.r||a.req.c-b.req.c);
    const groupRows=['tile','flooring','decking'].includes(m);
    if(groupRows){
      const groups=[],byKey=new Map();
      placements.forEach(x=>{
        const source=x.source==='buy'?'New':x.source==='owned'?'Owned':'Offcut';
        const row=Number(x.req.r)+1;
        const key=[source,row,x.req.w.toFixed(4),x.req.h.toFixed(4),x.rotated?'r':'n'].join('|');
        let g=byKey.get(key);
        if(!g){g={source,row,w:x.req.w,h:x.req.h,rotated:Boolean(x.rotated),items:[]};byKey.set(key,g);groups.push(g);}
        g.items.push(x);
      });
      groups.forEach(g=>{
        if(g.items.length>1){
          const cols=g.items.map(x=>Number(x.req.c)+1).sort((a,b)=>a-b);
          const colText=cols.length===1?String(cols[0]):cols[0]+'–'+cols[cols.length-1];
          steps.push({title:g.source+' pieces · row '+g.row,main:'Place '+g.items.length+' × '+g.w.toFixed(3)+' × '+g.h.toFixed(3)+' in',sub:'Layout row '+g.row+', columns '+colText+(g.rotated?' · rotate 90°':'')});
        }else{
          const x=g.items[0];
          steps.push({title:g.source+' piece '+x.id,main:'Prepare '+x.req.w.toFixed(3)+' × '+x.req.h.toFixed(3)+' in',sub:'Layout row '+(x.req.r+1)+', column '+(x.req.c+1)+(x.rotated?' · rotated 90°':'')});
        }
      });
    }else{
      placements.forEach(x=>steps.push({title:(x.source==='buy'?'New':x.source==='owned'?'Owned':'Offcut')+' piece '+x.id,main:'Prepare '+x.req.w.toFixed(3)+' × '+x.req.h.toFixed(3)+' in',sub:'Layout row '+(x.req.r+1)+', column '+(x.req.c+1)+(x.rotated?' · rotated 90°':'')}));
    }
  }
  return steps;
}
function ensureWorkshopButton(){const actions=document.querySelector('.result-actions');if(!actions||$('workshopMode'))return;const b=document.createElement('button');b.id='workshopMode';b.type='button';b.textContent='Workshop mode';b.disabled=true;actions.append(b);b.onclick=openWorkshop;}
function openWorkshop(){
  const result=app.getResult(),steps=workshopSteps(result||{});if(!steps.length)return;
  const m=ensureModal('workshopModal','<div class="feature-modal-card workshop-card workshop-checklist-card" role="dialog" aria-modal="true" aria-labelledby="workshopTitle"><button class="modal-x" type="button" aria-label="Close">×</button><span class="eyebrow">WORKSHOP MODE</span><h2 id="workshopTitle">Workshop checklist</h2><p id="workshopIntro">See the entire plan at once and check off work as you complete it. Guided mode is available if you prefer one instruction at a time.</p><div class="workshop-progress-summary" aria-live="polite"><b id="workshopProgressText"></b><span id="workshopProgressPct"></span></div><div class="workshop-progress"><i></i></div><div id="workshopChecklist"></div><div id="workshopGuided" hidden><div id="workshopGuidedStep"></div><div class="modal-actions workshop-guided-actions"><button id="workshopGuidePrev" type="button">Previous</button><button id="workshopGuideDone" type="button">Mark done & next</button></div></div><div id="workshopComplete" class="workshop-complete-panel" hidden></div><div class="modal-actions workshop-main-actions"><button id="workshopGuidedToggle" type="button">Guided mode</button><button id="workshopSave" type="button" hidden>Save remaining material</button><button id="workshopPrint" type="button">Print plan</button><button id="workshopAnother" type="button" hidden>Plan another project</button><button id="workshopClose" type="button">Close</button></div><small id="workshopSafety">Planning guide only. Measure twice and confirm actual stock, blade/kerf, joints and installation requirements before every cut or placement.</small></div>');
  m.hidden=false;
  const material=materialName(app.getCurrent()),sourceId=app.getInventorySourceId(),groups=groupRemnants(result,app.getCurrent(),Boolean(sourceId)),remnantCount=groups.reduce((n,g)=>n+g.qty,0),buy=Math.max(0,Math.ceil(result.buy||0));
  const checklist=$('workshopChecklist');
  checklist.innerHTML='<ol class="workshop-checklist">'+steps.map((s,i)=>'<li><label class="workshop-check-item"><input type="checkbox" data-workshop-step="'+i+'"><span class="workshop-check-number">'+String(i+1).padStart(2,'0')+'</span><span class="workshop-check-copy"><b>'+esc(s.title)+'</b><strong>'+esc(s.main)+'</strong><small>'+esc(s.sub)+'</small></span></label></li>').join('')+'</ol>';
  $('workshopComplete').innerHTML='<span class="eyebrow">BUILD GUIDE COMPLETE</span><h3>Checklist complete.</h3><p>You completed '+steps.length+' planned step'+(steps.length===1?'':'s')+' for '+esc(material)+'.</p><div class="price-answer"><b>'+(buy?buy+' additional '+(buy===1?'unit':'units')+' were included in this plan':'No additional material was required in this plan')+'</b><span>'+(remnantCount?remnantCount+' usable remnant'+(remnantCount===1?'':'s')+' estimated to remain':'No usable owned remnants above the minimum size are estimated to remain')+'</span></div>'+(groups.length?'<div class="remnant-list">'+groups.slice(0,8).map(g=>'<span><b>'+g.qty+'×</b> '+formatRemnant(g,app.getCurrent())+'</span>').join('')+'</div>':'')+'<p><b>Next:</b> verify what is physically left after the real work, then save only the remnants you actually kept.</p>';
  const checks=[...checklist.querySelectorAll('[data-workshop-step]')];
  let guidedIndex=0;
  const updateProgress=()=>{
    const done=checks.filter(x=>x.checked).length,pct=Math.round(done/steps.length*100),complete=done===steps.length;
    $('workshopProgressText').textContent=done+' of '+steps.length+' complete';
    $('workshopProgressPct').textContent=pct+'%';
    m.querySelector('.workshop-progress i').style.width=pct+'%';
    $('workshopComplete').hidden=!complete;
    $('workshopSave').hidden=!complete||!groups.length;
    $('workshopAnother').hidden=!complete;
    $('workshopSafety').textContent=complete?'Completion reflects the calculated plan, not a physical verification. Confirm actual remaining material before saving it to inventory.':'Planning guide only. Measure twice and confirm actual stock, blade/kerf, joints and installation requirements before every cut or placement.';
  };
  const drawGuided=()=>{
    const s=steps[guidedIndex],checked=checks[guidedIndex].checked;
    $('workshopGuidedStep').innerHTML='<span>'+(guidedIndex+1)+' of '+steps.length+'</span><b>'+esc(s.title)+'</b><strong>'+esc(s.main)+'</strong><p>'+esc(s.sub)+'</p><small>'+(checked?'Already checked off in the checklist.':'Not completed yet.')+'</small>';
    $('workshopGuidePrev').disabled=guidedIndex===0;
    $('workshopGuideDone').textContent=checked?(guidedIndex===steps.length-1?'Return to checklist':'Next'):(guidedIndex===steps.length-1?'Mark done & return':'Mark done & next');
  };
  const setGuided=guided=>{
    checklist.hidden=guided;
    $('workshopGuided').hidden=!guided;
    $('workshopGuidedToggle').textContent=guided?'Checklist view':'Guided mode';
    if(guided)drawGuided();
  };
  checks.forEach(x=>x.addEventListener('change',updateProgress));
  $('workshopGuidedToggle').onclick=()=>setGuided($('workshopGuided').hidden);
  $('workshopGuidePrev').onclick=()=>{if(guidedIndex>0){guidedIndex--;drawGuided();}};
  $('workshopGuideDone').onclick=()=>{
    if(!checks[guidedIndex].checked){checks[guidedIndex].checked=true;updateProgress();}
    if(guidedIndex<steps.length-1){guidedIndex++;drawGuided();}else setGuided(false);
  };
  $('workshopSave').onclick=()=>{const ok=saveRemnants(groups,Boolean(sourceId));$('workshopSave').textContent=ok?'Remaining material saved':'Could not save inventory';$('workshopSave').disabled=ok;};
  $('workshopPrint').onclick=()=>window.print();
  $('workshopAnother').onclick=()=>{closeModal(m);requestAnimationFrame(()=>($('planner')||$('inventory'))?.scrollIntoView({behavior:'smooth',block:'start'}));};
  $('workshopClose').onclick=()=>closeModal(m);
  m.querySelector('.modal-x').onclick=()=>closeModal(m);
  setGuided(false);updateProgress();
}

function onCalculated`;

const pattern = /function workshopSteps\(result\)\{[\s\S]*?\n\}\n\nfunction onCalculated/;
if (!pattern.test(features)) throw new Error('Workshop Mode block was not found after build.cjs');
features = features.replace(pattern, workshopUpgrade);
fs.writeFileSync(featurePath, features);

const cssPath='dist/style.css';
if(fs.existsSync(cssPath)){
  fs.appendFileSync(cssPath, String.raw`

/* Workshop Mode checklist-first UX */
.workshop-checklist-card{max-width:820px;max-height:calc(100vh - 40px);overflow:auto}
.workshop-progress-summary{display:flex;justify-content:space-between;gap:16px;align-items:center;margin:18px 0 8px;font-size:14px}
.workshop-checklist{list-style:none;padding:0;margin:22px 0;display:grid;gap:10px}
.workshop-check-item{display:grid;grid-template-columns:28px 42px minmax(0,1fr);gap:12px;align-items:start;padding:16px;border:1px solid #d5ddd8;border-radius:14px;background:#f7faf8;cursor:pointer}
.workshop-check-item:has(input:checked){background:#edf5f0;border-color:#9fb9ab}
.workshop-check-item input{width:22px;height:22px;margin:2px 0 0;accent-color:#174f3e}
.workshop-check-number{font:700 12px/1.8 ui-monospace,SFMono-Regular,Menlo,monospace;color:#65756e}
.workshop-check-copy{display:grid;gap:5px;min-width:0}
.workshop-check-copy b{font-size:14px;color:#315f50}
.workshop-check-copy strong{font-size:22px;line-height:1.18;color:#143f33}
.workshop-check-copy small{font-size:13px;line-height:1.45;color:#5c6964}
.workshop-complete-panel{margin:20px 0;padding:18px;border:1px solid #b9cdc2;border-radius:14px;background:#f0f6f2}
#workshopGuidedStep{margin:22px 0;padding:26px;border-radius:18px;background:#f1f6f3;display:grid;gap:10px;text-align:center}
#workshopGuidedStep>b{color:#315f50}
#workshopGuidedStep>strong{font-size:clamp(28px,6vw,48px);line-height:1.08;color:#143f33}
.workshop-main-actions{position:sticky;bottom:-1px;background:#fff;padding-top:12px;z-index:2}
@media(max-width:600px){.workshop-checklist-card{max-height:calc(100dvh - 18px);padding:24px 18px}.workshop-check-item{grid-template-columns:26px 34px minmax(0,1fr);padding:14px 12px}.workshop-check-copy strong{font-size:19px}.workshop-main-actions{display:grid;grid-template-columns:1fr 1fr}.workshop-main-actions button{width:100%}}
`);
}

console.log('Workshop Mode postbuild: checklist-first view with automatic progress and optional guided mode.');
