const {chromium}=require('playwright');
const assert=require('assert');
const base=process.env.QA_BASE_URL||'https://www.buildwithleftovers.com';
const canonicalOrigin='https://www.buildwithleftovers.com';
const tools=[
 ['/lumber-cut-calculator','Lumber Cut Calculator','3'],
 ['/flooring-plank-calculator','Flooring Plank Calculator','52'],
 ['/tile-coverage-calculator','Tile Coverage Calculator','53'],
 ['/wallpaper-roll-calculator','Wallpaper Roll Calculator','22'],
 ['/trim-cut-calculator','Trim Cut Calculator','4']
];
(async()=>{
 const browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:390,height:844}});
 const errors=[];
 page.on('pageerror',e=>errors.push(String(e)));
 page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('adsbygoogle'))errors.push(m.text())});
 for(const [slug,title,r1] of tools){
  console.log('TRAFFIC QA',slug);
  const resp=await page.goto(base+slug,{waitUntil:'domcontentloaded',timeout:30000});
  assert(resp&&resp.ok(),slug+' failed HTTP');
  await page.waitForSelector('#trafficRun');
  await page.waitForFunction(()=>document.querySelector('#r1')?.textContent!=='—');
  assert((await page.title()).includes(title),slug+' title mismatch');
  assert((await page.locator('link[rel="canonical"]').getAttribute('href'))===canonicalOrigin+slug,slug+' canonical mismatch');
  assert((await page.locator('#r1').textContent()).trim()===r1,slug+' default primary calculation changed');
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  assert(overflow<3,slug+' mobile horizontal overflow '+overflow+'px');
 }
 for(const slug of ['/pressure-treated-deck-board-spacing','/composite-deck-board-spacing']){
  const resp=await page.goto(base+slug,{waitUntil:'domcontentloaded',timeout:30000});
  assert(resp&&resp.ok(),slug+' failed HTTP');
  assert(await page.locator('a[href="/deck-board-calculator"]').count(),slug+' missing deck calculator link');
 }
 await page.goto(base,{waitUntil:'domcontentloaded'});
 assert(await page.locator('#popular-calculators').count(),'homepage priority calculator hub missing');
 for(const slug of tools.map(x=>x[0])) assert(await page.locator(`#popular-calculators a[href="${slug}"]`).count(),'homepage missing '+slug);
 assert(errors.length===0,'browser errors: '+errors.join(' | '));
 console.log('TRAFFIC QA PASSED: 5 calculators, 2 deck-spacing guides, homepage hub, canonicals, mobile layout.');
 await browser.close();
})().catch(e=>{console.error(e.stack||e);process.exit(1)});
