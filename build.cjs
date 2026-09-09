const fs = require('node:fs');
fs.rmSync('dist', { recursive: true, force: true });
fs.cpSync('public', 'dist', { recursive: true });
for (const css of ['public/mobile-fixes.css','public/a11y.css']) {
  if (fs.existsSync(css)) fs.appendFileSync('dist/style.css', '\n' + fs.readFileSync(css, 'utf8'));
}
console.log('Built Leftover static website');
