// Production browser QA: rerun after mobile layout fixes.
const { chromium } = require('playwright');
const assert = require('assert');
const base='https://www.buildwithleftovers.com';
const materialPages=['tile','flooring','plywood','lumber','wallpaper','decking','trim'];
let passed=0;
(async()=>{
 const browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:390,height:844}});
 const errors=[];
 page.on('pageerror',e=>errors.push(String(e)));
 page.on('console',m=>{if(m.type()==='error' && !m.text().includes('adsbygoogle')) errors.push(m.text());});
 for(const slug of materialPages){
   const r=await page.goto(`${base}/${slug}`,{waitUntil:'domcontentloaded',timeout:30000});
   assert(r && r.ok(),`${slug} failed HTTP`);
   await page.waitForSelector('#run',{timeout:10000});
   const diag=await page.evaluate(()=>{
     const vw=document.documentElement.clientWidth;
     const offenders=[...document.querySelectorAll('body *')].map(el=>{const r=el.getBoundingClientRect();return{tag:el.tagName,id:el.id,cls:String(el.className||'').slice(0,100),left:r.left,right:r.right,width:r.width}}).filter(x=>x.right>vw+2||x.left<-2).sort((a,b)=>b.right-a.right).slice(0,12);
     return{overflow:document.documentElement.scrollWidth-vw,vw,offenders};
   });
   if(diag.overflow>=3) console.log('OVERFLOW',slug,JSON.stringify(diag));
   assert(diag.overflow<3,`${slug} horizontal overflow ${diag.overflow}px`);
   const preset=page.locator('#presets button').first();
   if(await preset.count()) await preset.click();
   await page.locator('#run').click();
   await page.waitForTimeout(100);
   const status=(await page.locator('#result .status').textContent()).trim();
   assert(status!=='CHECK INPUTS',`${slug} default calculation failed`);
   for(const id of ['need','have','delta']) assert((await page.locator('#'+id).textContent()).trim()!=='—',`${slug} ${id} not populated`);
   assert(!(await page.locator('#sharePlan').isDisabled()),`${slug} share disabled after calculation`);
   assert(!(await page.locator('#printPlan').isDisabled()),`${slug} print disabled after calculation`);

   if(slug==='lumber'){
     const workshop=page.locator('#workshopMode');
     assert(await workshop.count(),'Workshop Mode button missing');
     assert(!(await workshop.isDisabled()),'Workshop Mode disabled after valid lumber calculation');
     await workshop.click();
     await page.waitForSelector('#workshopModal:not([hidden])');
     assert((await page.locator('#workshopTitle').textContent()).includes('Step-by-step build guide'),'Workshop title did not explain mode');
     let guard=0;
     while(guard++<200){
       const next=page.locator('#workshopNext');
       const hidden=await next.isHidden();
       if(hidden)break;
       const text=(await next.textContent()).trim();
       await next.click();
       await page.waitForTimeout(10);
       if(text==='Finish build guide')break;
     }
     const complete=(await page.locator('#workshopStep').textContent()).trim();
     assert(complete.includes('BUILD GUIDE COMPLETE'),'Workshop Mode did not reach completion state');
     assert(complete.includes('planned step'),'Workshop completion omitted step summary');
     assert(await page.locator('#workshopPrint').isVisible(),'Workshop completion missing print action');
     assert(await page.locator('#workshopAnother').isVisible(),'Workshop completion missing plan-another-project action');
     await page.locator('#workshopClose').click();
   }
   passed++;
 }
 await page.goto(`${base}/what-can-i-make`,{waitUntil:'domcontentloaded'});
 await page.locator('[data-sample="lumber"]').click();
 await page.waitForTimeout(100);
 assert((await page.locator('#ideaResults').textContent()).trim().length>20,'project finder returned no results');
 assert(!(await page.locator('#shareFinder').isDisabled()),'project finder share stayed disabled');
 passed++;
 await page.goto(base,{waitUntil:'domcontentloaded'});
 const mobileOverflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
 assert(mobileOverflow<3,`homepage horizontal overflow ${mobileOverflow}px`);
 const links=await page.locator('a[href^="/"]').evaluateAll(as=>[...new Set(as.map(a=>a.getAttribute('href')).filter(h=>h&&!h.startsWith('/#')&&!h.includes('#')))]);
 const request=page.request;
 for(const href of links.slice(0,40)){
   const resp=await request.get(base+href,{failOnStatusCode:false});
   assert(resp.status()<400,`broken internal link ${href}: ${resp.status()}`);
 }
 passed++;
 assert(errors.length===0,'browser console/page errors: '+errors.join(' | '));
 console.log(`Browser QA passed: ${passed} scenario groups, ${materialPages.length} calculators, Workshop Mode completion, project finder, mobile overflow, and internal links.`);
 await browser.close();
})().catch(e=>{console.error(e.stack||e);process.exit(1);});
