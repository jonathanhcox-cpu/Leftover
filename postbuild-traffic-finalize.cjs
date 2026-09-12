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

const jsPath='dist/traffic-calculators.js';
if(!fs.existsSync(jsPath)) throw new Error('dist/traffic-calculators.js missing before traffic finalize');
let js=fs.readFileSync(jsPath,'utf8');
const start=js.indexOf('function parseCuts(txt){');
const end=js.indexOf('function linear(){',start);
if(start<0||end<0) throw new Error('Could not locate generated parseCuts function');
const safeParse=`function parseCuts(txt){const out=[];for(const raw of txt.split(String.fromCharCode(10))){const line=raw.trim();if(!line)continue;const normalized=line.split('×').join('x').split('*').join('x');const parts=normalized.toLowerCase().split('x').map(s=>s.trim());if(parts.length!==2||parts.some(v=>v===''))throw new Error('Use one cut per line as length × quantity, for example: 36 x 4.');const len=Number(parts[0]),qty=Number(parts[1]);if(!(Number.isFinite(len)&&len>0&&Number.isInteger(qty)&&qty>0&&qty<=500))throw new Error('Cut lengths and quantities must be positive, and quantity must be a whole number.');for(let i=0;i<qty;i++)out.push(len);}return out;}\n`;
js=js.slice(0,start)+safeParse+js.slice(end);
fs.writeFileSync(jsPath,js);

console.log('Traffic finalize: homepage calculator hub deduplicated and cut-list parser hardened.');
