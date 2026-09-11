const fs = require('node:fs');
const path = require('node:path');
fs.rmSync('dist', { recursive: true, force: true });
fs.cpSync('public', 'dist', { recursive: true });
if (fs.existsSync('public/mobile-fixes.css')) {
  fs.appendFileSync('dist/style.css', '\n' + fs.readFileSync('public/mobile-fixes.css', 'utf8'));
}

const clusterLinks = {
  'tile.html': '<section class="related seo-cluster-links"><span class="eyebrow">TILE PROJECT QUESTIONS</span><h2>Plan around the tile you already have.</h2><div class="related-grid"><a href="/how-many-square-feet-20-12x12-tiles"><b>How much do 20 12×12 tiles cover?</b><span>See the exact square-foot calculation →</span></a><a href="/leftover-tile-backsplash"><b>Can leftover tile cover a backsplash?</b><span>Plan a small backsplash around saved tile →</span></a><a href="/leftover-tile-bathroom"><b>Use leftover tile in a bathroom</b><span>Check practical small-area reuse ideas →</span></a></div></section>',
  'lumber.html': '<section class="related seo-cluster-links"><span class="eyebrow">2×4 PROJECT QUESTIONS</span><h2>Start with the 2×4s you already have.</h2><div class="related-grid"><a href="/what-can-i-make-with-leftover-2x4s"><b>What can I make with leftover 2×4s?</b><span>Match project ideas to real board lengths →</span></a><a href="/what-can-i-make-with-5-leftover-2x4s"><b>What can five leftover 2×4s make?</b><span>See a quantity-first 8-foot-board example →</span></a><a href="/lumber-small-repair"><b>Can leftover lumber handle a small repair?</b><span>Plan short repair cuts from usable offcuts →</span></a></div></section>',
  'flooring.html': '<section class="related seo-cluster-links"><span class="eyebrow">FLOORING PROJECT QUESTIONS</span><h2>Make more use of the planks you saved.</h2><div class="related-grid"><a href="/what-can-i-make-with-leftover-flooring"><b>What can I make with leftover flooring?</b><span>Match projects and repairs to real plank dimensions →</span></a><a href="/how-many-square-feet-10-flooring-planks"><b>How much do 10 flooring planks cover?</b><span>See the 7.5 × 48-inch worked example →</span></a><a href="/leftover-flooring-closet"><b>Can leftover flooring finish a closet?</b><span>Check a compact-room reuse scenario →</span></a></div></section>',
  'plywood.html': '<section class="related seo-cluster-links"><span class="eyebrow">PLYWOOD CUTTING & REUSE</span><h2>Get more useful cuts from leftover plywood.</h2><div class="related-grid"><a href="/plywood-cut-calculator"><b>Plywood cut calculator</b><span>Plan panels and offcuts before cutting a sheet →</span></a><a href="/what-can-i-make-with-leftover-plywood"><b>What can I make with leftover plywood?</b><span>Match useful projects to the pieces you saved →</span></a><a href="/plywood-offcuts-project"><b>Plan a project from plywood offcuts</b><span>Use smaller remnants intentionally →</span></a></div></section>',
  'trim.html': '<section class="related seo-cluster-links"><span class="eyebrow">TRIM PROJECT QUESTIONS</span><h2>Plan around the trim you already have.</h2><div class="related-grid"><a href="/what-can-i-make-with-leftover-trim"><b>What can I make with leftover trim?</b><span>Match baseboard and casing offcuts to useful projects →</span></a><a href="/how-much-baseboard-12x12-room"><b>How much baseboard for a 12×12 room?</b><span>See the 48-foot perimeter worked example →</span></a><a href="/trim-leftovers-room"><b>Can leftover trim finish a room?</b><span>Compare saved lengths with real wall runs →</span></a></div></section>',
  'wallpaper.html': '<section class="related seo-cluster-links"><span class="eyebrow">WALLPAPER PROJECT QUESTIONS</span><h2>Get more from the rolls and remnants you saved.</h2><div class="related-grid"><a href="/what-can-i-make-with-leftover-wallpaper"><b>What can I make with leftover wallpaper?</b><span>Match remnants to small walls, panels and repairs →</span></a><a href="/how-much-wallpaper-one-roll-cover"><b>How much wall does one roll cover?</b><span>See why drops and pattern repeat matter →</span></a><a href="/wallpaper-accent-wall-leftovers"><b>Can leftovers cover an accent wall?</b><span>Plan a focused wall from remaining material →</span></a></div></section>',
  'decking.html': '<section class="related seo-cluster-links"><span class="eyebrow">DECKING CALCULATORS & REPAIRS</span><h2>Plan around the deck boards you already have.</h2><div class="related-grid"><a href="/deck-board-calculator"><b>Deck board calculator</b><span>Estimate board coverage and the purchase gap →</span></a><a href="/decking-leftover-repair"><b>Use leftover deck boards for repairs</b><span>Match saved boards to damaged sections →</span></a><a href="/decking-small-area"><b>How much decking covers a small area?</b><span>Plan compact sections before buying more →</span></a></div></section>'
};

const homepagePriorityLinks = '<section class="related seo-priority-links" id="popular-calculators"><span class="eyebrow">POPULAR CALCULATORS & ANSWERS</span><h2>Start with the project people measure most.</h2><p>These focused tools answer common material questions with a calculator or worked example. They are also the fastest path into Leftover if you already know what you need to measure.</p><div class="related-grid"><a href="/how-many-square-feet-20-12x12-tiles"><b>20 12×12 tiles: square-foot coverage</b><span>Calculate exactly how much area twenty tiles cover →</span></a><a href="/plywood-cut-calculator"><b>Plywood cut calculator</b><span>Plan sheet cuts and reusable offcuts before sawing →</span></a><a href="/how-much-baseboard-12x12-room"><b>Baseboard for a 12×12 room</b><span>Work from perimeter, openings and waste allowance →</span></a><a href="/deck-board-calculator"><b>Deck board calculator</b><span>Estimate boards for repairs and small deck areas →</span></a><a href="/how-much-wallpaper-one-roll-cover"><b>How much wall does one wallpaper roll cover?</b><span>Account for usable drops and pattern repeat →</span></a><a href="/trim"><b>Leftover trim calculator</b><span>Compare full lengths and offcuts with room runs →</span></a><a href="/decking"><b>Leftover decking calculator</b><span>Check saved deck boards before another store trip →</span></a><a href="/what-can-i-make"><b>What can I make with my leftovers?</b><span>Start from the material you already own →</span></a></div></section>';

for (const file of fs.readdirSync('dist')) {
  if (!file.endsWith('.html')) continue;
  const p = path.join('dist', file);
  let html = fs.readFileSync(p, 'utf8');
  if (file === 'index.html' && !html.includes('seo-priority-links')) {
    html = html.replace('<section class="inventory-lab" id="inventory">', homepagePriorityLinks + '\n<section class="inventory-lab" id="inventory">');
  }
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