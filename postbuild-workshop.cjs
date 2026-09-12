const fs = require('node:fs');

const featurePath = 'dist/features.js';
if (!fs.existsSync(featurePath)) throw new Error('dist/features.js was not produced by build.cjs');

let features = fs.readFileSync(featurePath, 'utf8');

const groupedWorkshopSteps = `function workshopSteps(result){
  const m=app.getCurrent(),steps=[];
  if(result.kind==='linear'){
    const kerf=Number($('kerf')?.value||0)/12;
    result.bins.forEach((b,bi)=>{let remaining=b.len;b.cuts.forEach((cut,ci)=>{const loss=Math.abs(remaining-cut)<EPS?0:kerf;remaining-=cut+loss;steps.push({title:\`${'${'}b.source==='buy'?'New':b.source==='owned'?'Owned':'Offcut'} stock ${'${'}bi+1}\`,main:\`Cut ${'${'}cut} ft\`,sub:\`Estimated remaining after kerf: ${'${'}Math.max(0,remaining).toFixed(3)} ft\`});});});
  }else if(result.kind==='rect'){
    const placements=[...result.placements].sort((a,b)=>a.req.r-b.req.r||a.req.c-b.req.c);
    const groupRows=['tile','flooring','decking'].includes(m);
    if(groupRows){
      const groups=[];
      const byKey=new Map();
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
          steps.push({
            title:g.source+' pieces · row '+g.row,
            main:'Place '+g.items.length+' × '+g.w.toFixed(3)+' × '+g.h.toFixed(3)+' in',
            sub:'Layout row '+g.row+', columns '+colText+(g.rotated?' · rotate 90°':'')
          });
        }else{
          const x=g.items[0];
          steps.push({title:g.source+' piece '+x.id,main:'Prepare '+x.req.w.toFixed(3)+' × '+x.req.h.toFixed(3)+' in',sub:'Layout row '+(x.req.r+1)+', column '+(x.req.c+1)+(x.rotated?' · rotated 90°':'')});
        }
      });
    }else{
      placements.forEach(x=>steps.push({title:\`${'${'}x.source==='buy'?'New':x.source==='owned'?'Owned':'Offcut'} piece ${'${'}x.id}\`,main:\`Prepare ${'${'}x.req.w.toFixed(3)} × ${'${'}x.req.h.toFixed(3)} in\`,sub:\`Layout row ${'${'}x.req.r+1}, column ${'${'}x.req.c+1}${'${'}x.rotated?' · rotated 90°':''}\`}));
    }
  }
  return steps;
}
function ensureWorkshopButton`;

const pattern = /function workshopSteps\(result\)\{[\s\S]*?\n\}\nfunction ensureWorkshopButton/;
if (!pattern.test(features)) throw new Error('Workshop Mode block was not found after build.cjs');
features = features.replace(pattern, groupedWorkshopSteps);
fs.writeFileSync(featurePath, features);

console.log('Workshop Mode postbuild: grouped repetitive tile/flooring/decking placements by row.');
