const fs=require('node:fs');
const path=require('node:path');
const out='dist';
if(!fs.existsSync(out)) throw new Error('dist must exist before UX postbuild');

const version='20260912-ux1';
const header=`<header class="site-header ux-header"><a class="brand" href="/"><img src="/logo.svg" alt="Leftover — Plan Smart. Waste Less."><span class="brand-word">Leftover<small>PLAN SMART. WASTE LESS.</small></span></a><nav class="desktop-nav" aria-label="Primary"><a href="/what-can-i-make">Project finder</a><a href="/#popular-calculators">Calculators</a><a href="/#materials">Materials</a><a href="/#guide-directory">Guides</a><a href="/about">About</a></nav><a class="pill ux-start-cta" href="/what-can-i-make">Start with leftovers</a><button class="mobile-nav-toggle" type="button" aria-expanded="false" aria-controls="mobileNav" aria-label="Open menu"><span></span><span></span><span></span></button><nav class="mobile-nav" id="mobileNav" aria-label="Mobile navigation" hidden><a href="/what-can-i-make">Project finder</a><a href="/#popular-calculators">Calculators</a><a href="/#materials">Materials</a><a href="/#guide-directory">Guides</a><a href="/about">About</a><a href="/contact">Contact</a><a class="mobile-primary" href="/what-can-i-make">Start with leftovers →</a></nav></header>`;

const taskChooser=`<section class="ux-task-chooser" id="ux-start" aria-labelledby="uxStartTitle"><div class="section-title"><span class="eyebrow">START HERE</span><h2 id="uxStartTitle">What are you trying to do?</h2><p>Pick the path that matches the question in your head. You can switch tools at any time.</p></div><div class="ux-task-grid"><a class="ux-task-card ux-task-primary" href="/what-can-i-make"><span>01</span><b>I have leftover material</b><p>Tell us what you have and get project ideas matched to the actual pieces.</p><strong>Show me what I can make →</strong></a><a class="ux-task-card" href="#materials"><span>02</span><b>I already know my project</b><p>Choose the material, enter the project, and see whether your leftovers are enough.</p><strong>Check my leftovers →</strong></a><a class="ux-task-card" href="#popular-calculators"><span>03</span><b>I just need a calculator</b><p>Jump to focused tools for decking, lumber, flooring, tile, wallpaper and trim.</p><strong>Browse calculators →</strong></a></div></section>`;

const deckSketch=`<div class="ux-measurement-sketch" aria-label="Diagram showing deck length, deck width, board direction and board gap"><div class="ux-deck-shape"><i></i><i></i><i></i><i></i><i></i><span class="ux-dim ux-dim-width">Deck width ↔</span><span class="ux-dim ux-dim-length">Deck length ↕</span><span class="ux-board-direction">Boards run this direction →</span><span class="ux-gap-label">Gap is measured side-to-side</span></div><p><b>Measurement tip:</b> “Boards run along” means the direction each board travels. The other deck dimension determines how many rows you need.</p></div>`;

const materialTip=`<div class="ux-measurement-tip"><b>Measure the real material.</b><span>Use actual piece dimensions and only count material you would really install. Nominal sizes can differ from measured sizes.</span></div>`;

function addBodyClass(html, cls){
  return html.replace(/<body(\s[^>]*)?>/i,(m,attrs='')=>{
    if(/class=["'][^"']*["']/i.test(attrs)) return `<body${attrs.replace(/class=(["'])([^"']*)\1/i,(_,q,c)=>`class=${q}${c} ${cls}${q}`)}>`;
    return `<body${attrs} class="${cls}">`;
  });
}
function injectAsset(html){
  if(!html.includes('/ux.css')) html=html.replace('</head>',`<link rel="stylesheet" href="/ux.css?v=${version}"></head>`);
  if(!html.includes('/ux.js')) html=html.replace('</body>',`<script src="/ux.js?v=${version}" defer></script></body>`);
  return html;
}

for(const file of fs.readdirSync(out)){
  if(!file.endsWith('.html')) continue;
  const p=path.join(out,file);
  let html=fs.readFileSync(p,'utf8');

  html=html.replace(/<header\b[^>]*>[\s\S]*?<\/header>/i,header);
  if(html.includes('guide-breadcrumb')) html=html.replace(/<div class="breadcrumbs">[\s\S]*?<\/div>\s*/i,'');

  if(file==='index.html'){
    html=addBodyClass(html,'ux-home');
    if(!html.includes('ux-task-chooser')) html=html.replace('<section class="quick-discovery"',`${taskChooser}\n<section class="quick-discovery"`);
    html=html.replace(/<section class="related" id="calculator-directory">[\s\S]*?<\/section>\s*/i,'');
    if(!html.includes('ux-inventory-disclosure') && html.includes('<section class="inventory-lab" id="inventory">')){
      html=html.replace('<section class="inventory-lab" id="inventory">','<details class="ux-inventory-disclosure"><summary><b>Advanced: save an inventory of leftovers</b><span>Keep batches on this device and reuse them across projects.</span></summary><section class="inventory-lab" id="inventory">');
      html=html.replace('<section class="planner" id="planner">','</details><section class="planner" id="planner">');
    }
  }

  if(/window\.LEFTOVER_MATERIAL=/.test(html) && !html.includes('ux-measurement-tip')){
    html=html.replace(/(<section class="planner" id="planner"><div class="planner-head">[\s\S]*?<\/div>)/i,`$1${materialTip}`);
  }

  if(file==='deck-board-calculator.html' && !html.includes('ux-measurement-sketch')){
    html=html.replace(/(<h2 id="spacingTitle">[\s\S]*?<\/h2>)/i,`$1${deckSketch}`);
  }

  if(file==='contact.html' && !html.includes('data-copy-email')){
    html=html.replace(/(<p><a class="cta" href="mailto:support@buildwithleftovers\.com[^>]*>Email us<\/a><\/p>)/i,`$1<p><button class="ux-copy-email" type="button" data-copy-email="support@buildwithleftovers.com">Copy email address</button><span class="ux-copy-status" role="status" aria-live="polite"></span></p>`);
  }

  html=injectAsset(html);
  fs.writeFileSync(p,html);
}
console.log('UX postbuild complete: unified navigation, homepage paths, breadcrumb cleanup, mobile guidance, measurement helpers.');
