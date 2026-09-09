const fs = require('node:fs');
const path = require('node:path');
fs.rmSync('dist', { recursive: true, force: true });
fs.cpSync('public', 'dist', { recursive: true });
if (fs.existsSync('public/mobile-fixes.css')) {
  fs.appendFileSync('dist/style.css', '\n' + fs.readFileSync('public/mobile-fixes.css', 'utf8'));
}

const clusterLinks = {
  'lumber.html': '<section class="related seo-cluster-links"><span class="eyebrow">2×4 PROJECT QUESTIONS</span><h2>Start with the 2×4s you already have.</h2><div class="related-grid"><a href="/what-can-i-make-with-leftover-2x4s"><b>What can I make with leftover 2×4s?</b><span>Match project ideas to real board lengths →</span></a><a href="/what-can-i-make-with-5-leftover-2x4s"><b>What can five leftover 2×4s make?</b><span>See a quantity-first 8-foot-board example →</span></a></div></section>',
  'flooring.html': '<section class="related seo-cluster-links"><span class="eyebrow">FLOORING PROJECT QUESTIONS</span><h2>Make more use of the planks you saved.</h2><div class="related-grid"><a href="/what-can-i-make-with-leftover-flooring"><b>What can I make with leftover flooring?</b><span>Match projects and repairs to real plank dimensions →</span></a><a href="/how-many-square-feet-10-flooring-planks"><b>How much do 10 flooring planks cover?</b><span>See the 7.5 × 48-inch worked example →</span></a></div></section>'
};

for (const file of fs.readdirSync('dist')) {
  if (!file.endsWith('.html')) continue;
  const p = path.join('dist', file);
  let html = fs.readFileSync(p, 'utf8');
  if (clusterLinks[file] && !html.includes('seo-cluster-links')) html = html.replace('</main>', clusterLinks[file] + '\n</main>');
  if (!html.includes('/a11y.css')) html = html.replace('</head>', '<link rel="stylesheet" href="/a11y.css?v=20260909-a11y"/>\n</head>');
  fs.writeFileSync(p, html);
}
console.log('Built Leftover static website');
