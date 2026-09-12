const { chromium } = require('playwright');
const assert = require('assert');
const base = process.env.QA_BASE_URL || 'https://www.buildwithleftovers.com';

(async()=>{
  const browser=await chromium.launch({headless:true});

  const mobile=await browser.newContext({viewport:{width:390,height:844}});
  const page=await mobile.newPage();
  let r=await page.goto(base,{waitUntil:'domcontentloaded',timeout:30000});
  assert(r&&r.ok(),'homepage failed HTTP');
  await page.waitForSelector('.mobile-nav-toggle');
  assert(await page.locator('.mobile-nav-toggle').isVisible(),'mobile menu button is not visible');
  assert(await page.locator('.desktop-nav').isHidden(),'desktop nav should be hidden on mobile');
  await page.locator('.mobile-nav-toggle').click();
  assert(await page.locator('#mobileNav').isVisible(),'mobile menu did not open');
  assert((await page.locator('#mobileNav a').count())>=6,'mobile menu is missing destinations');
  await page.locator('.mobile-nav-toggle').click();
  assert(await page.locator('#mobileNav').isHidden(),'mobile menu did not close');
  assert(await page.locator('.ux-mobile-tool-dock').isVisible(),'mobile next-action dock is missing');

  await page.goto(base+'/tile',{waitUntil:'domcontentloaded',timeout:30000});
  assert((await page.locator('.guide-breadcrumb').count())===1,'tile should have one breadcrumb');
  assert((await page.locator('.breadcrumbs').count())===0,'legacy duplicate breadcrumb still renders');
  assert(await page.locator('.ux-measurement-tip').isVisible(),'material measurement tip is missing');
  assert(await page.locator('.ux-guidance-toggle').isVisible(),'mobile planning-guidance toggle is missing');

  await page.goto(base+'/deck-board-calculator',{waitUntil:'domcontentloaded',timeout:30000});
  assert(await page.locator('.ux-measurement-sketch').isVisible(),'deck measurement diagram is missing');

  await page.goto(base+'/contact',{waitUntil:'domcontentloaded',timeout:30000});
  assert(await page.locator('[data-copy-email]').isVisible(),'copy email control is missing');

  await mobile.close();

  const desktop=await browser.newContext({viewport:{width:1365,height:900}});
  const d=await desktop.newPage();
  r=await d.goto(base,{waitUntil:'domcontentloaded',timeout:30000});
  assert(r&&r.ok(),'desktop homepage failed HTTP');
  assert(await d.locator('.desktop-nav').isVisible(),'desktop nav is not visible');
  assert((await d.locator('.ux-task-card').count())===3,'homepage should expose exactly three primary task paths');
  assert((await d.locator('#calculator-directory').count())===0,'duplicate calculator directory remains on homepage');
  const inv=d.locator('.ux-inventory-disclosure');
  assert(await inv.isVisible(),'advanced inventory disclosure is missing');
  assert(!(await inv.evaluate(el=>el.open)),'advanced inventory should be collapsed by default');

  await browser.close();
  console.log('UX NAVIGATION QA PASSED: mobile menu, homepage task paths, breadcrumb cleanup, measurement helpers, mobile guidance, contact copy action.');
})().catch(e=>{console.error(e.stack||e);process.exit(1)});
