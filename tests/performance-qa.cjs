const fs = require('node:fs');
const reports = process.argv.slice(2);
if (!reports.length) throw new Error('No Lighthouse reports provided');

let failed = false;
const groups = new Map();
const compact = x => String(x || '').replace(/\s+/g, ' ').slice(0, 500);
const median = values => {
  const a = [...values].sort((x, y) => x - y);
  const mid = Math.floor(a.length / 2);
  return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
};

for (const file of reports) {
  const r = JSON.parse(fs.readFileSync(file, 'utf8'));
  const path = new URL(r.finalUrl).pathname;
  const run = {
    file,
    r,
    perf: Math.round((r.categories.performance.score || 0) * 100),
    a11y: Math.round((r.categories.accessibility.score || 0) * 100),
    seo: Math.round((r.categories.seo.score || 0) * 100),
    bp: Math.round((r.categories['best-practices'].score || 0) * 100),
    lcp: r.audits['largest-contentful-paint'].numericValue,
    cls: r.audits['cumulative-layout-shift'].numericValue,
    tbt: r.audits['total-blocking-time'].numericValue,
    speed: r.audits['speed-index'].numericValue
  };
  if (!groups.has(path)) groups.set(path, []);
  groups.get(path).push(run);
}

for (const [path, runs] of groups) {
  runs.forEach((x, i) => {
    console.log(`${path} run ${i + 1}/${runs.length}: performance=${x.perf} accessibility=${x.a11y} best-practices=${x.bp} seo=${x.seo} LCP=${Math.round(x.lcp)}ms CLS=${x.cls.toFixed(3)} TBT=${Math.round(x.tbt)}ms SpeedIndex=${Math.round(x.speed)}ms`);
  });

  const m = {
    perf: median(runs.map(x => x.perf)),
    a11y: median(runs.map(x => x.a11y)),
    seo: median(runs.map(x => x.seo)),
    bp: median(runs.map(x => x.bp)),
    lcp: median(runs.map(x => x.lcp)),
    cls: median(runs.map(x => x.cls)),
    tbt: median(runs.map(x => x.tbt)),
    speed: median(runs.map(x => x.speed))
  };

  const label = runs.length > 1 ? 'MEDIAN' : 'RESULT';
  console.log(`${label} ${path}: performance=${Math.round(m.perf)} accessibility=${Math.round(m.a11y)} best-practices=${Math.round(m.bp)} seo=${Math.round(m.seo)} LCP=${Math.round(m.lcp)}ms CLS=${m.cls.toFixed(3)} TBT=${Math.round(m.tbt)}ms SpeedIndex=${Math.round(m.speed)}ms`);

  // Keep diagnostics from the run closest to the median TBT, since TBT is the
  // most runner-sensitive metric in this static site's synthetic audits.
  const representative = [...runs].sort((a, b) => Math.abs(a.tbt - m.tbt) - Math.abs(b.tbt - m.tbt))[0].r;
  const lcpEl = representative.audits['largest-contentful-paint-element'];
  if (lcpEl?.details?.items?.length) console.log(`LCP_ELEMENT ${path}: ${compact(JSON.stringify(lcpEl.details.items[0]))}`);
  const lcpBreak = representative.audits['lcp-breakdown-insight'] || representative.audits['lcp-phases'];
  if (lcpBreak?.details) console.log(`LCP_BREAKDOWN ${path}: ${compact(JSON.stringify(lcpBreak.details))}`);
  const clsSources = representative.audits['layout-shifts'] || representative.audits['cls-culprits-insight'];
  if (clsSources?.details) console.log(`CLS_SOURCES ${path}: ${compact(JSON.stringify(clsSources.details))}`);
  const render = representative.audits['render-blocking-resources'] || representative.audits['render-blocking-insight'];
  if (render?.details) console.log(`RENDER_BLOCKING ${path}: ${compact(JSON.stringify(render.details))}`);

  const problems = [];
  if (m.a11y < 95) problems.push(`accessibility ${Math.round(m.a11y)}<95`);
  if (m.seo < 95) problems.push(`seo ${Math.round(m.seo)}<95`);
  if (m.lcp > 4000) problems.push(`LCP ${Math.round(m.lcp)}ms>4000ms`);
  if (m.cls > 0.25) problems.push(`CLS ${m.cls.toFixed(3)}>0.25`);
  if (m.tbt > 600) problems.push(`TBT ${Math.round(m.tbt)}ms>600ms`);
  if (problems.length) {
    failed = true;
    console.error(`FAIL ${path}: ${problems.join(', ')}`);
  }
}

if (failed) process.exit(1);
console.log(`Performance QA passed ${groups.size} page guardrails using median aggregation where multiple Lighthouse runs were supplied.`);
