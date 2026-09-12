// Browser QA for the exact built commit. Override QA_BASE_URL for production smoke checks.
const { chromium } = require('playwright');
const assert = require('assert');
const base=process.env.QA_BASE_URL||'https://www.buildwithleftovers.com';
const materialPages=['tile','flooring','plywood','lumber','wallpaper','decking','trim'];
let passed=0;
(async()=>{
 const browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:390,height:844}});
 const errors=[];
 page.on('pageerror',e=>errors.push(String(e)));
 page.on('console',m=>{if(m.type()==='error' && !m.text().includes('adsbygoogle')) errors.push(m.text());});
 for(const slug of materialPages){
   console.log(`QA ${slug}: opening`);
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
     console.log('QA lumber: Workshop Mode with cut list');
     await page.locator('#addCut').click();
     await page.locator('#cutRows input[data-key="len"]').first().fill('3');
     await page.locator('#cutRows input[data-key="qty"]').first().fill('3');
     await page.locator('#run').click();
     await page.waitForTimeout(100);
     const workshop=page.locator('#workshopMode');
     assert(await workshop.count(),'Workshop Mode button missing');
     assert(!(await workshop.isDisabled()),'Workshop Mode disabled after valid cut-list calculation');
     await workshop.click();
     await page.waitForSelector('#workshopModal:not([hidden])');
     assert((await page.locator('#workshopTitle').textContent()).includes('Step-by-step build guide'),'Workshop title did not explain mode');
     let guard=0;
     while(guard++<200){
       const next=page.locator('#workshopNext');
       if(await next.isHidden())break;
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

 console.log('QA deck-board-calculator: spacing helper, math, SEO metadata, mobile layout');
 {
   const r=await page.goto(`${base}/deck-board-calculator`,{waitUntil:'domcontentloaded',timeout:30000});
   assert(r && r.ok(),'deck-board-calculator failed HTTP');
   await page.waitForSelector('#deckSpacingForm',{timeout:10000});
   assert((await page.title()).includes('Deck Spacing Calculator'),'deck spacing title missing primary query');
   const description=await page.locator('meta[name="description"]').getAttribute('content');
   assert(description && description.toLowerCase().includes('determine a planning gap'),'deck spacing meta description should explain gap determination');
   assert((await page.locator('link[rel="canonical"]').getAttribute('href'))==='https://www.buildwithleftovers.com/deck-board-calculator','deck spacing canonical mismatch');
   const diag=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth}));
   assert(diag.overflow<3,`deck-board-calculator horizontal overflow ${diag.overflow}px`);

   assert((await page.locator('#spacingPreset').inputValue())==='wood-dry','spacing helper should default to dry/acclimated wood');
   assert((await page.locator('#recommendedGap').textContent()).includes('1/8 in'),'dry wood recommendation should show 1/8 inch');
   assert((await page.locator('#boardGap').inputValue())==='0.125','dry wood helper should apply 0.125-inch gap');
   assert((await page.locator('#activeGap').textContent()).trim()==='1/8 in','result should show active 1/8-inch gap');
   assert((await page.locator('#rowCount').textContent()).trim()==='26','default deck spacing row count should be 26');
   assert((await page.locator('#gapCount').textContent()).trim()==='25','default deck spacing gap count should be 25');
   assert((await page.locator('#linearFeet').textContent()).trim()==='260 ft','default deck spacing linear feet should be 260 ft');
   assert((await page.locator('#stockBoards').textContent()).trim()==='29','12-ft stock must preserve 26 continuous 10-ft rows plus reserve');

   await page.locator('#spacingPreset').selectOption('wood-wet');
   await page.waitForTimeout(50);
   assert((await page.locator('#boardGap').inputValue())==='0','wet pressure-treated helper should apply tight initial spacing');
   assert((await page.locator('#activeGap').textContent()).trim()==='0 in','result should show zero initial gap for wet wood preset');
   assert((await page.locator('#rowCount').textContent()).trim()==='27','tight wet-wood spacing should update row count');

   await page.locator('#spacingPreset').selectOption('trex');
   await page.waitForTimeout(50);
   assert((await page.locator('#boardGap').inputValue())==='0.1875','Trex helper should apply 3/16-inch width-to-width gap');
   assert((await page.locator('#recommendedGap').textContent()).includes('3/16 in'),'Trex helper should display 3/16 inch');

   await page.locator('#spacingPreset').selectOption('timbertech-pvc');
   await page.waitForTimeout(50);
   assert((await page.locator('#recommendedGap').textContent()).includes('1/8 in'),'TimberTech PVC helper should display 1/8-inch minimum planning gap');
   assert((await page.locator('#spacingGuidance').textContent()).includes('1/8 to 1/4 inch'),'TimberTech PVC guidance should expose manufacturer range');

   await page.locator('#spacingPreset').selectOption('manual');
   await page.locator('#boardGap').fill('0.25');
   await page.waitForTimeout(50);
   assert((await page.locator('#recommendedGap').textContent()).includes('Enter product gap'),'manual product helper should not invent a recommendation');
   assert((await page.locator('#activeGap').textContent()).trim()==='1/4 in','manual 1/4-inch gap should feed layout result');

   await page.locator('#spacingPreset').selectOption('wood-dry');
   await page.locator('#stockLength').fill('20');
   await page.locator('#reservePct').fill('0');
   await page.waitForTimeout(50);
   assert((await page.locator('#stockBoards').textContent()).trim()==='13','20-ft stock should supply two 10-ft runs per board');

   await page.locator('#stockLength').fill('8');
   await page.waitForTimeout(50);
   assert((await page.locator('#stockBoards').textContent()).trim()==='33','8-ft stock should report the 260/8 linear-footage minimum');
   assert((await page.locator('#stockNote').textContent()).includes('linear-footage minimum'),'short-stock caveat missing');

   await page.locator('#deckWidth').fill(String(11.125/12));
   await page.locator('#stockLength').fill('12');
   await page.waitForTimeout(50);
   assert((await page.locator('#rowCount').textContent()).trim()==='2','exact two-row coverage boundary should not round up to three rows');
   passed++;
 }

 console.log('QA project finder: primary action renders and reveals matches');
 await page.goto(`${base}/what-can-i-make`,{waitUntil:'domcontentloaded'});
 await page.locator('#findIdeas').click();
 await page.waitForFunction(()=>document.querySelectorAll('#ideaResults .idea-match').length>0);
 assert((await page.locator('#ideaResults').textContent()).trim().length>20,'project finder returned no results');
 assert(!(await page.locator('#shareFinder').isDisabled()),'project finder share stayed disabled');
 await page.waitForTimeout(400);
 const finderPosition=await page.locator('.finder-results').evaluate(el=>({top:el.getBoundingClientRect().top,height:window.innerHeight}));
 assert(finderPosition.top<finderPosition.height,'project finder results were not brought into view after the main action');
 passed++;

 console.log('QA homepage: Start a project routes through material chooser');
 await page.goto(base,{waitUntil:'domcontentloaded'});
 await page.evaluate(()=>localStorage.setItem('leftover-plan-v2',JSON.stringify({current:'decking',drafts:{}})));
 await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForSelector('#materials');
 assert((await page.locator('header a.pill').getAttribute('href'))==='#materials','header Start a project must target the material chooser');
 assert((await page.locator('.hero-actions .text-link').getAttribute('href'))==='#materials','hero project entry must target the material chooser');
 assert((await page.locator('.hero-actions .text-link').textContent()).trim()==='Choose a material','hero project entry should clearly describe the next step');
 assert(await page.locator('#materials .material').count()===7,'material chooser should expose all seven material options');
 const visibleProjectEntry=page.locator('.hero-actions .text-link');
 assert(await visibleProjectEntry.isVisible(),'mobile project entry should remain visible');
 await visibleProjectEntry.click();
 await page.waitForTimeout(50);
 assert((await page.evaluate(()=>location.hash))==='#materials','project entry should land on #materials even when decking was last used');
 const materialTop=await page.locator('#materials').evaluate(el=>el.getBoundingClientRect().top);
 assert(materialTop<250,'material chooser should be brought into view after choosing a material');
 passed++;

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
 console.log(`Browser QA passed: ${passed} scenario groups, ${materialPages.length} reuse calculators, deck spacing helper + regression checks, project-entry material chooser flow, Workshop Mode completion, project finder, mobile overflow, and internal links.`);
 await browser.close();
})().catch(e=>{console.error(e.stack||e);process.exit(1);});
