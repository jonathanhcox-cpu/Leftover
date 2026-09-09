const fs = require('node:fs');
fs.rmSync('dist', { recursive: true, force: true });
fs.cpSync('public', 'dist', { recursive: true });
if (fs.existsSync('public/mobile-fixes.css')) {
  fs.appendFileSync('dist/style.css', '\n' + fs.readFileSync('public/mobile-fixes.css', 'utf8'));
}
console.log('Built Leftover static website');
