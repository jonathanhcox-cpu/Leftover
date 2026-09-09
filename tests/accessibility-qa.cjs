const { chromium } = require('playwright');
const AxeBuilder = require('@axe-core/playwright').default;
const assert = require('node:assert');

const base = 'https://www.buildwithleftovers.com';
const pages = ['/', '/tile', '/flooring', '/plywood', '/lumber', '/wallpaper', '/decking', '/trim', '/what-can-i-make'];

(async()=>{
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const failures = [];
  let scanned = 0;

  for (const path of pages) {
    const response = await page.goto(base + path, { waitUntil: 'networkidle', timeout: 30000 });
    assert(response && response.ok(), `${path} failed HTTP`);

    const results = await new AxeBuilder({ page }).analyze();
    const serious = results.violations.filter(v => ['serious','critical'].includes(v.impact));
    for (const v of serious) failures.push(`${path}: ${v.id} (${v.impact}) — ${v.help}; nodes=${v.nodes.length}`);

    const unnamed = await page.locator('button, a[href], input, select, textarea').evaluateAll(els => els.filter(el => {
      const aria = el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || '';
      const text = (el.innerText || el.value || el.getAttribute('alt') || el.getAttribute('title') || '').trim();
      return !aria.trim() && !text;
    }).map(el => `${el.tagName.toLowerCase()}#${el.id || ''}.${el.className || ''}`).slice(0,10));
    if (unnamed.length) failures.push(`${path}: unnamed interactive controls: ${unnamed.join(', ')}`);

    const tinyTargets = await page.locator('button, a[href], input, select').evaluateAll(els => els.filter(el => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      if (s.display === 'none' || s.visibility === 'hidden' || r.width === 0 || r.height === 0) return false;
      return (r.width < 24 || r.height < 24);
    }).map(el => ({tag:el.tagName,id:el.id,text:(el.innerText||el.getAttribute('aria-label')||'').trim().slice(0,40),w:Math.round(el.getBoundingClientRect().width),h:Math.round(el.getBoundingClientRect().height)})).slice(0,12));
    if (tinyTargets.length) failures.push(`${path}: targets under 24px: ${JSON.stringify(tinyTargets)}`);

    scanned++;
  }

  await context.close();
  await browser.close();
  if (failures.length) {
    console.error(failures.join('\n'));
    process.exit(1);
  }
  console.log(`Accessibility QA passed: ${scanned} production pages; no serious/critical axe violations, unnamed controls, or sub-24px interactive targets.`);
})().catch(e => { console.error(e.stack || e); process.exit(1); });
