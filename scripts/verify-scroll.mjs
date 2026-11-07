import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=fileURLToPath(new URL('../',import.meta.url));
const base=process.env.PREVIEW_URL||'http://127.0.0.1:4180';
await mkdir(path.join(root,'artifacts','v2'),{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const checks=[],errors=[];
try{
  const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
  const screenshot=name=>page.screenshot({path:path.join(root,'artifacts','v2',name+'.png')});
  async function ready(){await page.waitForFunction(()=>window.portfolioReady===true);await page.waitForTimeout(150);}
  async function scrollScene(id,progress){
    const target=await page.locator(`#collection-${id}`).evaluate((el,p)=>{const pin=el.querySelector('.story-pin'),top=parseFloat(getComputedStyle(pin).top)||0;return el.getBoundingClientRect().top+scrollY-top+(el.offsetHeight-pin.offsetHeight)*p;},progress);
    await page.evaluate(y=>scrollTo({top:y,behavior:'instant'}),target);await page.waitForTimeout(160);
  }
  await page.goto(base,{waitUntil:'networkidle'});await ready();
  assert.match(await page.title(),/Yuli Studio/);assert.match(await page.locator('.brand').getAttribute('aria-label'),/Yuli Studio/);
  assert.equal(await page.locator('.scroll-project').count(),9);await screenshot('hero');checks.push('Yuli Studio identity and 9 scrolling project sections');
  await scrollScene('magnetic-keyboard',.03);await screenshot('keyboard-start');
  const before=await page.locator('#collection-magnetic-keyboard .is-current img').getAttribute('src');
  const beforeTop=await page.locator('#collection-magnetic-keyboard .story-pin').evaluate(el=>el.getBoundingClientRect().top);
  const wheelStart=await page.evaluate(()=>scrollY);await page.mouse.move(1000,500);await page.mouse.wheel(0,850);await page.waitForTimeout(200);assert.ok(await page.evaluate(()=>scrollY)>wheelStart+600);
  await scrollScene('magnetic-keyboard',.53);await screenshot('keyboard-middle');
  const after=await page.locator('#collection-magnetic-keyboard .is-current img').getAttribute('src');
  const afterTop=await page.locator('#collection-magnetic-keyboard .story-pin').evaluate(el=>el.getBoundingClientRect().top);
  assert.notEqual(before,after);assert.ok(Math.abs(beforeTop-afterTop)<2);
  await scrollScene('magnetic-keyboard',1);assert.equal(await page.locator('#collection-magnetic-keyboard .story-progress').getAttribute('aria-valuenow'),'100');checks.push('actual scrolling pins the stage, advances artwork and completes progress');
  const ids=await page.locator('.scroll-project').evaluateAll(nodes=>nodes.map(n=>n.dataset.project));
  for(const id of ids){
    await scrollScene(id,.075);
    const art=page.locator(`#collection-${id} .long-art, #collection-${id} .stage-frame.is-current>.stage-art`).first();
    const dimensions=await art.evaluate(async img=>{await img.decode();return {width:img.getBoundingClientRect().width,native:img.naturalWidth,src:img.currentSrc};});
    assert.ok(!dimensions.src.includes('-thumb'));assert.ok(dimensions.native>=dimensions.width*1.95,id+' native resolution');
    await scrollScene(id,1);assert.equal(await page.locator(`#collection-${id} .story-progress`).getAttribute('aria-valuenow'),'100');
  }checks.push('every project scrolls to completion and keeps native-resolution artwork');
  await scrollScene('amazon-aplus',0);await page.locator('#collection-amazon-aplus .long-art').evaluate(img=>img.decode());
  const longStart=await page.locator('#collection-amazon-aplus .long-art').evaluate(el=>getComputedStyle(el).transform);
  await screenshot('amazon-top');await scrollScene('amazon-aplus',.6);await screenshot('amazon-middle');
  const longEnd=await page.locator('#collection-amazon-aplus .long-art').evaluate(el=>getComputedStyle(el).transform);
  assert.notEqual(longStart,longEnd);assert.equal(await page.locator('#collection-amazon-aplus [data-frame-counter]').textContent(),'060%');checks.push('long artworks pan from their real scroll progress');
  await scrollScene('campaign-banners',.05);await screenshot('banner-native');
  const sharp=await page.locator('#collection-campaign-banners .stage-frame.is-current .stage-art').evaluate(async img=>{await img.decode();return {src:img.currentSrc,width:img.getBoundingClientRect().width,native:img.naturalWidth};});
  assert.ok(!sharp.src.includes('-thumb'));assert.ok(sharp.native>=sharp.width*1.95);checks.push('large artwork uses native sources with 2x pixel headroom');
  await page.locator('#collection-campaign-banners .story-open').click();await ready();
  assert.equal(await page.locator('.project-page').count(),1);assert.equal(await page.locator('.project-panel').count(),19);assert.equal(await page.locator('dialog[open]').count(),0);await screenshot('project-page');
  await page.locator('.project-panel').nth(3).scrollIntoViewIfNeeded();assert.ok(await page.evaluate(()=>scrollY)>1000);checks.push('complete projects use document scrolling and include all source artworks');
  await page.locator('.project-panel').nth(3).locator('[data-image]').first().click();assert.equal(await page.locator('#image-dialog[open]').count(),1);
  await page.keyboard.press('ArrowRight');assert.match(await page.locator('.image-count').textContent(),/05 \/ 19/);await page.keyboard.press('Escape');assert.equal(await page.locator('dialog[open]').count(),0);
  await page.goBack();await ready();assert.equal(await page.locator('.scroll-project').count(),9);checks.push('image viewer and browser Back return to the scrolling archive');
  await page.locator('#work').scrollIntoViewIfNeeded();for(const [category,count]of [['三维渲染',3],['电商视觉',4],['平面海报',1],['AI 探索',1],['全部作品',9]]){await page.locator(`[data-filter="${category}"]`).click();assert.equal(await page.locator('.scroll-project').count(),count);}checks.push('filters rebuild scroll scenes and project shortcuts');
  for(const width of [390,768,1440,1920]){await page.setViewportSize({width,height:width<500?844:1000});await page.goto(base,{waitUntil:'networkidle'});await ready();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`no overflow at ${width}`);}checks.push('390 / 768 / 1440 / 1920 responsive layouts');
  await page.setViewportSize({width:390,height:844});await page.goto(base,{waitUntil:'networkidle'});await screenshot('mobile-hero');await scrollScene('magnetic-keyboard',.5);await screenshot('mobile-project-stage');
  const fit=await page.locator('#collection-magnetic-keyboard .story-pin').evaluate(el=>({top:el.getBoundingClientRect().top,bottom:el.getBoundingClientRect().bottom}));assert.ok(fit.top>=70&&fit.bottom<=845);checks.push('mobile project stages fit in the viewport while pinned');
  await page.locator('.menu-toggle').click();await page.locator('#mobile-menu a[href="#about"]').click();await page.waitForTimeout(200);assert.equal(await page.locator('#mobile-menu:visible').count(),0);checks.push('mobile navigation retains normal anchor behavior');
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto(base,{waitUntil:'networkidle'});await ready();const reduced=await page.locator('.story-pin').first().evaluate(el=>getComputedStyle(el).position);assert.equal(reduced,'relative');assert.equal(await page.locator('.motion-reduced').count(),1);checks.push('reduced motion exposes the artwork in normal document flow');
  const response=await page.request.get(base+'/output/pdf/selected-works.pdf');assert.equal(response.status(),200);assert.equal((await response.body()).subarray(0,5).toString(),'%PDF-');
  const download=page.waitForEvent('download');await page.locator('.pdf-nav').click();assert.match((await download).suggestedFilename(),/Yuli_Studio/);checks.push('branded PDF download works');
  assert.deepEqual(errors,[]);checks.push('no browser exceptions or failed requests');console.log(JSON.stringify({passed:checks.length,checks},null,2));
}finally{await browser.close();}
