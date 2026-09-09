const fs = require('node:fs');
const path = require('node:path');
fs.rmSync('dist', { recursive: true, force: true });
fs.cpSync('public', 'dist', { recursive: true });
if (fs.existsSync('public/mobile-fixes.css')) {
  fs.appendFileSync('dist/style.css', '\n' + fs.readFileSync('public/mobile-fixes.css', 'utf8'));
}

const clusterLinks = {
  'lumber.html': '<section class="related seo-cluster-links"><span class="eyebrow">2×4 PROJECT QUESTIONS</span><h2>Start with the 2×4s you already have.</h2><div class="related-grid"><a href="/what-can-i-make-with-leftover-2x4s"><b>What can I make with leftover 2×4s?</b><span>Match project ideas to real board lengths →</span></a><a href="/what-can-i-make-with-5-leftover-2x4s"><b>What can five leftover 2×4s make?</b><span>See a quantity-first 8-foot-board example →</span></a></div></section>',
  'flooring.html': '<section class="related seo-cluster-links"><span class="eyebrow">FLOORING PROJECT QUESTIONS</span><h2>Make more use of the planks you saved.</h2><div class="related-grid"><a href="/what-can-i-make-with-leftover-flooring"><b>What can I make with leftover flooring?</b><span>Match projects and repairs to real plank dimensions →</span></a><a href="/how-many-square-feet-10-flooring-planks"><b>How much do 10 flooring planks cover?</b><span>See the 7.5 × 48-inch worked example →</span></a></div></section>',
  'trim.html': '<section class="related seo-cluster-links"><span class="eyebrow">TRIM PROJECT QUESTIONS</span><h2>Plan around the trim you already have.</h2><div class="related-grid"><a href="/what-can-i-make-with-leftover-trim"><b>What can I make with leftover trim?</b><span>Match baseboard and casing offcuts to useful projects →</span></a><a href="/how-much-baseboard-12x12-room"><b>How much baseboard for a 12×12 room?</b><span>See the 48-foot perimeter worked example →</span></a></div></section>',
  'wallpaper.html': '<section class="related seo-cluster-links"><span class="eyebrow">WALLPAPER PROJECT QUESTIONS</span><h2>Get more from the rolls and remnants you saved.</h2><div class="related-grid"><a href="/what-can-i-make-with-leftover-wallpaper"><b>What can I make with leftover wallpaper?</b><span>Match remnants to small walls, panels and repairs →</span></a><a href="/how-much-wallpaper-one-roll-cover"><b>How much wall does one roll cover?</b><span>See why drops and pattern repeat matter →</span></a></div></section>'
};

for (const file of fs.readdirSync('dist')) {
  if (!file.endsWith('.html')) continue;
  const p = path.join('dist', file);
  let html = fs.readFileSync(p, 'utf8');
  if (clusterLinks[file] && !html.includes('seo-cluster-links')) html = html.replace('</main>', clusterLinks[file] + '\n</main>');
  let addedAuthor = false;
  html = html.replace(/(<script\b[^>]*type=["']application\/ld\+json["'][^>]*>)([\s\S]*?)(<\/script>)/gi, (_, start, json, end) => {
    const schema = JSON.parse(json);
    const normalize = node => {
      if (!node || typeof node !== 'object') return;
      if (Array.isArray(node)) { node.forEach(normalize); return; }
      const types = [].concat(node['@type'] || []);
      if (types.includes('Organization') && node.name === 'Leftover') {
        node.logo ||= { '@type': 'ImageObject', url: 'https://www.buildwithleftovers.com/logo.svg' };
      }
      if (types.some(type => ['Article', 'BlogPosting', 'NewsArticle'].includes(type))) {
        if (!node.author) {
          node.author = { '@type': 'Organization', name: 'Leftover', url: 'https://www.buildwithleftovers.com/about' };
          addedAuthor = true;
        }
        node.publisher ||= { '@type': 'Organization', name: 'Leftover', url: 'https://www.buildwithleftovers.com/' };
        const publishers = [].concat(node.publisher);
        for (const publisher of publishers) {
          if (publisher.name === 'Leftover') publisher.logo ||= { '@type': 'ImageObject', url: 'https://www.buildwithleftovers.com/logo.svg' };
        }
        // A brand logo is not a representative article image. Keep actual editorial images.
        if (node.image === 'https://www.buildwithleftovers.com/logo.svg') delete node.image;
        // Publication dates belong to the source article; never invent them at build time.
      }
      Object.values(node).forEach(normalize);
    };
    normalize(schema);
    return start + JSON.stringify(schema) + end;
  });
  if (addedAuthor && !html.includes('By Leftover')) {
    html = html.replace(/<\/h1>/i, '</h1><p class="guide-updated">By <a href="/about">Leftover</a></p>');
  }
  if (!html.includes('/a11y.css')) html = html.replace('</head>', '<link rel="stylesheet" href="/a11y.css?v=20260909-a11y2"/>\n</head>');
  fs.writeFileSync(p, html);
}
console.log('Built Leftover static website');
