import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {aboutResults} from '../about-studio.js';
import {enterExhibition} from './verification-helpers.mjs';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const base=process.env.PREVIEW_URL||'http://127.0.0.1:4180',folder=new URL('../artifacts/v7/',import.meta.url);
await mkdir(folder,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),checks=[],errors=[];
const ready=page=>page.waitForFunction(()=>window.portfolioReady&&window.stackReady);
const capture=(page,name)=>page.screenshot({path:fileURLToPath(new URL(name+'.png',folder))});
const aboutReady=page=>page.waitForFunction(()=>Math.abs(document.querySelector('#about').getBoundingClientRect().top)<1&&!document.documentElement.classList.contains('exhibition-pinned'));
const trackErrors=page=>{page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});};
try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});trackErrors(page);
  await page.goto(base+'/?version=7',{waitUntil:'networkidle'});await ready(page);assert.equal(await page.evaluate(()=>scrollY),0);await capture(page,'hero');
  await enterExhibition(page);const y=await page.evaluate(()=>scrollY);
  for(const selector of ['.stack-canvas','.brand','.stack-exit']){
    const b=await page.locator(selector).boundingBox();await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.wheel(0,2000);await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>scrollY),y);
  }
  assert.equal(await page.locator('#about-phase').evaluate(el=>el.hidden),true);await capture(page,'immersive-exhibition');checks.push('Hero first; the entire exhibition stays pinned, including wheel input over its exit and navigation');
  await page.locator('.stack-exit').click();await page.waitForTimeout(260);const middle=await page.evaluate(()=>scrollY);assert.ok(middle>y&&middle<y+1000);await aboutReady(page);
  await page.waitForTimeout(1500);await page.waitForFunction(()=>document.querySelector('#about-film').readyState>=2);await capture(page,'about-intro');assert.equal(await page.locator('#about').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(250, 250, 250)');
  assert.match(await page.locator('#about-title').textContent(),/让产品出彩，.*让团队高效/);assert.equal(await page.locator('[data-about-video] video:visible').count(),1);
  assert.equal(await page.locator('.about-line-mask>span').first().evaluate(el=>getComputedStyle(el).transform),'matrix(1, 0, 0, 1, 0, 0)');checks.push('explicit Continue enters the white About phase with a smooth scroll and masked headline reveal that remains visible after completion');
  assert.equal(await page.locator('[data-portrait],[data-persona]').count(),0);assert.equal(await page.locator('#about-film').evaluate(el=>getComputedStyle(el).objectFit),'contain');assert.equal(await page.locator('#about-film').evaluate(el=>el.videoWidth/el.videoHeight),16/9);checks.push('the supplied complete 16:9 film replaces the former portraits and outfit switch');
  const manifestoY=await page.locator('.about-manifesto').evaluate(el=>el.getBoundingClientRect().top+scrollY),before=await page.locator('[data-about-word]').evaluateAll(els=>els.map(el=>parseFloat(el.style.getPropertyValue('--word-fill'))));
  await page.evaluate(y=>scrollTo({top:y+240,behavior:'instant'}),manifestoY);await page.waitForTimeout(120);const after=await page.locator('[data-about-word]').evaluateAll(els=>els.map(el=>parseFloat(el.style.getPropertyValue('--word-fill'))));
  assert.ok(after.reduce((a,b)=>a+b)>before.reduce((a,b)=>a+b));assert.ok(after[0]>=after.at(-1));await capture(page,'statement');checks.push('statement fills from light gray to ink in reading order as it crosses the viewport');
  await page.locator('.about-inline-link').evaluate(el=>el.click());await page.waitForTimeout(1700);
  const expected=aboutResults.map(m=>m.value.toFixed(m.precision));await page.waitForFunction(expected=>JSON.stringify([...document.querySelectorAll('[data-count]')].map(el=>el.textContent))===JSON.stringify(expected),expected);
  assert.match(await page.locator('.about-data-note').textContent(),/月份未标注年份.*CRV/);await capture(page,'work-results');
  const card=page.locator('.about-metric').first();await page.mouse.move(-10,-10);const beforeHover=(await card.boundingBox()).y;await card.hover();await page.waitForTimeout(550);assert.ok((await card.boundingBox()).y<beforeHover-4);checks.push('four verified resume metrics count up, retain reporting context, and their cards lift on hover');
  await page.goto(base+'/?version=7#work/visual-upgrade',{waitUntil:'networkidle'});await page.waitForFunction(()=>window.portfolioReady);
  await page.locator('.stack-project-art img').evaluateAll(images=>Promise.all(images.map(img=>img.decode())));
  for(const img of await page.locator('.stack-project-art img').all()){
    const result=await img.evaluate(el=>{const b=el.getBoundingClientRect(),section=el.closest('.stack-project-page').getBoundingClientRect();return {center:b.x+b.width/2,target:section.x+section.width/2,ratio:b.width/b.height,native:el.naturalWidth/el.naturalHeight};});
    assert.ok(Math.abs(result.center-result.target)<1,JSON.stringify(result));assert.ok(Math.abs(result.ratio-result.native)<.001);
  }
  await page.evaluate(()=>scrollTo({top:300,behavior:'instant'}));await capture(page,'centered-visual-upgrade');checks.push('both Page Refresh project images form a centered single column with their original aspect ratios');
  const mobile=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});trackErrors(mobile);await mobile.goto(base+'/?version=7',{waitUntil:'networkidle'});await ready(mobile);await enterExhibition(mobile);await mobile.locator('.stack-exit').click();await aboutReady(mobile);await mobile.waitForTimeout(1500);await capture(mobile,'mobile-about-intro');
  const image=await mobile.locator('.about-video-frame').boundingBox();await mobile.evaluate(y=>scrollBy({top:y,behavior:'instant'}),image.y-160);await mobile.waitForFunction(()=>document.querySelector('#about-film').readyState>=2);await capture(mobile,'mobile-video');
  await mobile.locator('.about-impact').evaluate(el=>el.scrollIntoView({behavior:'instant'}));await mobile.waitForTimeout(1700);await capture(mobile,'mobile-results');
  for(const width of [360,390,768,1024,1920]){await mobile.setViewportSize({width,height:900});assert.ok(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
  checks.push('mobile preserves the full video, readable results and player controls without horizontal overflow across five widths');
  const reduced=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});trackErrors(reduced);await reduced.goto(base+'/?version=8',{waitUntil:'networkidle'});await ready(reduced);await enterExhibition(reduced);await reduced.locator('.stack-exit').click();await aboutReady(reduced);
  assert.equal(await reduced.locator('.about-motion').count(),0);assert.deepEqual(await reduced.locator('[data-count]').allTextContents(),expected);assert.equal(await reduced.locator('[data-about-word]').first().evaluate(el=>getComputedStyle(el).color),'rgb(23, 25, 25)');await capture(reduced,'reduced-motion-about');checks.push('reduced motion shows completed typography and exact data immediately with no entrance or parallax animations');
  const response=await page.request.get(base+'/output/pdf/selected-works.pdf');assert.equal(response.status(),200);assert.equal((await response.body()).subarray(0,4).toString(),'%PDF');assert.deepEqual(errors,[]);checks.push('original portfolio PDF stays downloadable; no browser errors or missing resources');
  console.log(JSON.stringify({passed:checks.length,checks},null,2));
}finally{await browser.close();}
