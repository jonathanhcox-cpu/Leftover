// End-to-end user workflow QA for Leftover's primary mobile journeys.
const { chromium } = require('playwright');
const assert = require('assert');
const base = process.env.QA_BASE_URL || 'https://www.buildwithleftovers.com';

(async()=>{
  const browser = await chromium.launch({headless:true});
  const context = await browser.newContext({viewport:{width:390,height:844}});
  const page = await context.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push('pageerror: '+String(e)));
  page.on('console',m=>{if(m.type()==='error' && !m.text().includes('adsbygoogle')) errors.push('console: '+m.text());});

  console.log('FLOW 1: homepage -> material chooser -> tile plan -> Workshop Mode');
  let r = await page.goto(base,{waitUntil:'domcontentloaded',timeout:30000});
  assert(r && r.ok(),'homepage failed HTTP');
  await page.waitForSelector('#materials');
  assert(await page.locator('.hero-actions .text-link').isVisible(),'Choose a material entry point is not visible');
  await page.locator('.hero-actions .text-link').click();
  assert((await page.evaluate(()=>location.hash))==='#materials','Choose a material did not target #materials');
  await page.waitForFunction(()=>{
    const el=document.querySelector('#materials'); if(!el) return false;
    const x=el.getBoundingClientRect(); return x.top < innerHeight*.55 && x.bottom>0;
  },null,{timeout:4000});

  const tileButton=page.locator('#materials .material[data-mat="tile"]');
  assert(await tileButton.isVisible(),'Tile material option is not visible');
  await tileButton.click();
  await page.waitForFunction(()=>document.querySelector('#plannerKicker')?.textContent.includes('TILE'));
  await page.waitForFunction(()=>{
    const el=document.querySelector('#planner'); if(!el) return false;
    const x=el.getBoundingClientRect(); return x.top < innerHeight*.7 && x.bottom>0;
  },null,{timeout:4000});

  const preset=page.locator('#presets button').first();
  assert(await preset.count(),'Tile presets are missing');
  await preset.click();
  await page.waitForFunction(()=>document.querySelector('#result .status')?.textContent!=='READY');
  assert((await page.locator('#result .status').textContent()).trim()!=='CHECK INPUTS','Tile preset calculation failed');
  for(const id of ['need','have','delta']) assert((await page.locator('#'+id).textContent()).trim()!=='—',`Tile result ${id} was not populated`);
  assert(!(await page.locator('#sharePlan').isDisabled()),'Share plan is disabled after a valid result');
  assert(!(await page.locator('#printPlan').isDisabled()),'Print plan is disabled after a valid result');

  const workshop=page.locator('#workshopMode');
  assert(await workshop.count(),'Workshop Mode button is missing');
  assert(!(await workshop.isDisabled()),'Workshop Mode is disabled after a valid tile calculation');
  await workshop.click();
  await page.waitForSelector('#workshopModal:not([hidden])');
  assert((await page.locator('#workshopTitle').textContent()).includes('Workshop checklist'),'Workshop Mode did not open in checklist view');
  const checks=page.locator('[data-workshop-step]');
  const stepCount=await checks.count();
  assert(stepCount>0,'Workshop checklist has no steps');
  assert(await page.locator('#workshopSelectAll').isVisible(),'Mark all complete is missing');
  assert(await page.locator('#workshopClearAll').isVisible(),'Clear all is missing');
  assert(await page.locator('#workshopClearAll').isDisabled(),'Clear all should start disabled');

  await page.locator('#workshopSelectAll').click();
  assert((await page.locator('#workshopProgressText').textContent()).trim()===`${stepCount} of ${stepCount} complete`,'Mark all complete did not complete the checklist');
  assert((await page.locator('#workshopProgressPct').textContent()).trim()==='100%','Mark all complete did not set progress to 100%');
  assert(await page.locator('#workshopComplete').isVisible(),'Completion summary did not appear after Mark all complete');
  assert(await page.locator('#workshopSelectAll').isDisabled(),'Mark all complete should disable at 100%');
  assert(!(await page.locator('#workshopClearAll').isDisabled()),'Clear all should enable after completion');

  await page.locator('#workshopClearAll').click();
  assert((await page.locator('#workshopProgressText').textContent()).trim()===`0 of ${stepCount} complete`,'Clear all did not reset checklist progress');
  assert((await page.locator('#workshopProgressPct').textContent()).trim()==='0%','Clear all did not reset progress to 0%');
  assert(await page.locator('#workshopComplete').isHidden(),'Completion summary should hide after Clear all');
  assert(!(await page.locator('#workshopSelectAll').isDisabled()),'Mark all complete should re-enable after Clear all');

  await page.locator('#workshopGuidedToggle').click();
  assert(await page.locator('#workshopGuided').isVisible(),'Optional Guided mode did not open');
  await page.locator('#workshopGuidedToggle').click();
  assert(await page.locator('#workshopChecklist').isVisible(),'Checklist view did not restore from Guided mode');
  await page.locator('#workshopSelectAll').click();
  await page.locator('#workshopClose').click();
  assert(await page.locator('#workshopModal').isHidden(),'Workshop Mode did not close');

  console.log('FLOW 2: What can I make -> Find DIY projects -> visible ranked results');
  r = await page.goto(base+'/what-can-i-make',{waitUntil:'domcontentloaded',timeout:30000});
  assert(r && r.ok(),'What can I make page failed HTTP');
  await page.waitForSelector('#findIdeas');
  await page.locator('#findIdeas').click();
  await page.waitForFunction(()=>document.querySelectorAll('#ideaResults .idea-match').length>0,null,{timeout:5000});
  const ideaCount=await page.locator('#ideaResults .idea-match').count();
  assert(ideaCount>0,'Find DIY projects returned no project matches');
  await page.waitForFunction(()=>{
    const el=document.querySelector('.finder-results'); if(!el)return false;
    const r=el.getBoundingClientRect(); return r.top<innerHeight && r.bottom>0;
  },null,{timeout:4000});
  assert(!(await page.locator('#shareFinder').isDisabled()),'Share results stayed disabled after project matching');

  console.log('FLOW 3: lumber cut list -> calculate -> Workshop Mode bulk completion');
  r = await page.goto(base+'/lumber',{waitUntil:'domcontentloaded',timeout:30000});
  assert(r && r.ok(),'Lumber page failed HTTP');
  await page.waitForSelector('#addCut');
  await page.locator('#addCut').click();
  await page.locator('#cutRows input[data-key="len"]').first().fill('3');
  await page.locator('#cutRows input[data-key="qty"]').first().fill('3');
  await page.locator('#run').click();
  await page.waitForFunction(()=>document.querySelector('#result .status')?.textContent!=='READY');
  assert((await page.locator('#result .status').textContent()).trim()!=='CHECK INPUTS','Lumber cut-list calculation failed');
  await page.locator('#workshopMode').click();
  await page.waitForSelector('#workshopModal:not([hidden])');
  const lumberSteps=await page.locator('[data-workshop-step]').count();
  assert(lumberSteps>0,'Lumber Workshop Mode has no cut steps');
  await page.locator('#workshopSelectAll').click();
  assert((await page.locator('#workshopProgressPct').textContent()).trim()==='100%','Lumber Mark all complete failed');
  await page.locator('#workshopClose').click();

  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  assert(overflow<3,`Mobile horizontal overflow detected: ${overflow}px`);
  assert(errors.length===0,'Browser errors: '+errors.join(' | '));

  console.log(`USER WORKFLOW QA PASSED: primary project flow, Workshop Mode bulk controls, project finder, lumber cut-list flow, mobile viewport.`);
  await browser.close();
})().catch(async e=>{console.error(e.stack||e);process.exit(1);});
