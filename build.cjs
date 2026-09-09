const fs = require('node:fs');
const path = require('node:path');
fs.rmSync('dist', { recursive: true, force: true });
fs.cpSync('public', 'dist', { recursive: true });
if (fs.existsSync('public/mobile-fixes.css')) {
  fs.appendFileSync('dist/style.css', '\n' + fs.readFileSync('public/mobile-fixes.css', 'utf8'));
}
for (const file of fs.readdirSync('dist')) {
  if (!file.endsWith('.html')) continue;
  const p = path.join('dist', file);
  let html = fs.readFileSync(p, 'utf8');
  if (!html.includes('/a11y.css')) html = html.replace('</head>', '<link rel="stylesheet" href="/a11y.css?v=20260909-a11y"/>\n</head>');
  fs.writeFileSync(p, html);
}
console.log('Built Leftover static website');
