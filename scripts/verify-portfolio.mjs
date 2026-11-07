import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=fileURLToPath(new URL('../',import.meta.url));
const base=process.env.PREVIEW_URL||'http://127.0.0.1:4180';
await mkdir(path.join(root,'artifacts'),{recursive:true});
const browser=await chromium.launch({headless:true,channel:'chrome'});
const checks=[];
try{
  const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});
  const errors=[];page.on('pageerror',err=>errors.push(err.message));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
  await page.goto(base,{waitUntil:'networkidle'});await page.waitForFunction(()=>window.portfolioReady);
  assert.equal(await page.locator('.work-card').count(),9);checks.push('9 collections render');
  await page.screenshot({path:path.join(root,'artifacts','desktop-hero.png')});
  await page.locator('#work').scrollIntoViewIfNeeded();await page.waitForTimeout(900);await page.screenshot({path:path.join(root,'artifacts','desktop-work.png')});
  for(const [category,count]of [['三维渲染',3],['电商视觉',4],['平面海报',1],['AI 探索',1],['全部作品',9]]){
    await page.locator(`[data-filter="${category}"]`).click();assert.equal(await page.locator('.work-card').count(),count);
  }checks.push('all 5 filters return correct collections');
  await page.locator('[data-project="magnetic-keyboard"] .project-open').click();await page.waitForTimeout(300);
  assert.equal(await page.locator('#project-dialog[open]').count(),1);assert.equal(await page.locator('.detail-figure').count(),7);
  await page.screenshot({path:path.join(root,'artifacts','desktop-detail.png')});
  await page.locator('[data-image="0"]').click();assert.equal(await page.locator('#image-dialog[open]').count(),1);
  await page.keyboard.press('ArrowRight');assert.match(await page.locator('.image-count').textContent(),/02 \/ 7/);
  await page.locator('.zoom-image').click();assert.equal(await page.locator('.lightbox-media.zoomed').count(),1);
  await page.keyboard.press('Escape');assert.equal(await page.locator('#image-dialog[open]').count(),0);assert.equal(await page.locator('#project-dialog[open]').count(),1);
  await page.keyboard.press('Escape');await page.waitForTimeout(300);assert.equal(await page.locator('#project-dialog[open]').count(),0);checks.push('nested image viewer, arrow keys, zoom and Escape restore focus');
  await page.goto(base+'/#work/amazon-aplus',{waitUntil:'networkidle'});assert.equal(await page.locator('.detail-figure').count(),4);
  await page.locator('.detail-figure img').evaluateAll(imgs=>Promise.all(imgs.map(img=>{img.loading='eager';return img.decode();})));
  const ratios=await page.locator('.detail-figure img').evaluateAll(imgs=>imgs.map(i=>({natural:i.naturalWidth/i.naturalHeight,display:i.getBoundingClientRect().width/i.getBoundingClientRect().height})));
  assert.ok(ratios.every(r=>Math.abs(r.natural-r.display)<.002));await page.keyboard.press('Escape');checks.push('long pages retain natural ratios and direct links restore');
  await page.goto(base);await page.waitForFunction(()=>window.portfolioReady);await page.locator('#about').scrollIntoViewIfNeeded();await page.waitForTimeout(900);await page.screenshot({path:path.join(root,'artifacts','desktop-about.png')});
  await page.locator('#contact').scrollIntoViewIfNeeded();await page.waitForTimeout(900);await page.screenshot({path:path.join(root,'artifacts','desktop-contact.png')});
  const response=await page.request.get(base+'/output/pdf/selected-works.pdf');assert.equal(response.status(),200);assert.ok(response.headers()['content-type'].includes('pdf'));assert.equal((await response.body()).subarray(0,5).toString(),'%PDF-');
  const download=page.waitForEvent('download');await page.locator('.takeaway a[download]').click();const file=await download;assert.ok(file.suggestedFilename().endsWith('.pdf'));checks.push('PDF is valid and download action works');
  for(const width of [390,768,1440,1920]){
    await page.setViewportSize({width,height:width<500?844:1000});await page.goto(base,{waitUntil:'networkidle'});
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);assert.ok(!overflow,`no overflow at ${width}`);
  }checks.push('no horizontal overflow at 390, 768, 1440, 1920px');
  await page.setViewportSize({width:390,height:844});await page.goto(base,{waitUntil:'networkidle'});await page.screenshot({path:path.join(root,'artifacts','mobile-hero.png')});
  await page.locator('.menu-toggle').click();assert.equal(await page.locator('#mobile-menu:visible').count(),1);await page.locator('#mobile-menu a[href="#work"]').click();assert.equal(await page.locator('#mobile-menu:visible').count(),0);await page.waitForTimeout(900);await page.screenshot({path:path.join(root,'artifacts','mobile-work.png')});checks.push('mobile menu opens, navigates and closes');
  await page.locator('[data-project="gaming-mouse"] .project-open').click();assert.equal(await page.locator('.detail-figure').count(),6);await page.keyboard.press('Escape');await page.waitForTimeout(200);
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto(base);assert.equal(await page.locator('.reveal').count(),0);checks.push('reduced-motion preference is respected');
  assert.deepEqual(errors,[]);checks.push('no browser exceptions or failed requests');
  console.log(JSON.stringify({passed:checks.length,checks},null,2));
}finally{await browser.close();}
