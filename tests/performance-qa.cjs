const fs = require('node:fs');
const assert = require('node:assert');
const reports = process.argv.slice(2);
if (!reports.length) throw new Error('No Lighthouse reports provided');
let failed = false;
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
