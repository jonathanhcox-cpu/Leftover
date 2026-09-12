const fs=require('node:fs');
const p='dist/index.html';
if(!fs.existsSync(p)) throw new Error('dist/index.html missing before traffic finalize');
let html=fs.readFileSync(p,'utf8');
if(html.includes('traffic-growth-links')){
  const old=/<section class="related seo-priority-links" id="popular-calculators">[\s\S]*?<\/section>\s*/;
  html=html.replace(old,'');
}
const count=(html.match(/id="popular-calculators"/g)||[]).length;
if(count!==1) throw new Error('Expected exactly one popular-calculators hub, found '+count);
fs.writeFileSync(p,html);
console.log('Traffic finalize: homepage calculator hub deduplicated.');
