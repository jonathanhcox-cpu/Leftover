const fs = require('node:fs');
const reports = process.argv.slice(2);
if (!reports.length) throw new Error('No Lighthouse reports provided');
let failed = false;
function compact(x){return String(x||'').replace(/\s+/g,' ').slice(0,500)}
for (const file of reports) {
  const r = JSON.parse(fs.readFileSync(file,'utf8'));
  const path = new URL(r.finalUrl).pathname;
  const perf = Math.round((r.categories.performance.score || 0) * 100);
  const a11y = Math.round((r.categories.accessibility.score || 0) * 100);
  const seo = Math.round((r.categories.seo.score || 0) * 100);
  const bp = Math.round((r.categories['best-practices'].score || 0) * 100);
  const lcp = r.audits['largest-contentful-paint'].numericValue;
  const cls = r.audits['cumulative-layout-shift'].numericValue;
  const tbt = r.audits['total-blocking-time'].numericValue;
  const speed = r.audits['speed-index'].numericValue;
  console.log(`${path}: performance=${perf} accessibility=${a11y} best-practices=${bp} seo=${seo} LCP=${Math.round(lcp)}ms CLS=${cls.toFixed(3)} TBT=${Math.round(tbt)}ms SpeedIndex=${Math.round(speed)}ms`);

  const lcpEl = r.audits['largest-contentful-paint-element'];
  if (lcpEl?.details?.items?.length) console.log(`LCP_ELEMENT ${path}: ${compact(JSON.stringify(lcpEl.details.items[0]))}`);
  const lcpBreak = r.audits['lcp-breakdown-insight'] || r.audits['lcp-phases'];
  if (lcpBreak?.details) console.log(`LCP_BREAKDOWN ${path}: ${compact(JSON.stringify(lcpBreak.details))}`);
  const clsSources = r.audits['layout-shifts'] || r.audits['cls-culprits-insight'];
  if (clsSources?.details) console.log(`CLS_SOURCES ${path}: ${compact(JSON.stringify(clsSources.details))}`);
  const render = r.audits['render-blocking-resources'] || r.audits['render-blocking-insight'];
  if (render?.details) console.log(`RENDER_BLOCKING ${path}: ${compact(JSON.stringify(render.details))}`);

  const problems = [];
  if (a11y < 95) problems.push(`accessibility ${a11y}<95`);
  if (seo < 95) problems.push(`seo ${seo}<95`);
  if (lcp > 4000) problems.push(`LCP ${Math.round(lcp)}ms>4000ms`);
  if (cls > 0.25) problems.push(`CLS ${cls.toFixed(3)}>0.25`);
  if (tbt > 600) problems.push(`TBT ${Math.round(tbt)}ms>600ms`);
  if (problems.length) { failed = true; console.error(`FAIL ${path}: ${problems.join(', ')}`); }
}
if (failed) process.exit(1);
console.log(`Performance QA passed ${reports.length} Lighthouse mobile audits against guardrail thresholds.`);
