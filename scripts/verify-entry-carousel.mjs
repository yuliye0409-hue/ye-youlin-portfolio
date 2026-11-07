import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {portfolio} from '../portfolio.config.js';
import {enterExhibition} from './verification-helpers.mjs';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({channel:'chrome',headless:true}),base=process.env.PREVIEW_URL||'http://127.0.0.1:4180',checks=[],errors=[];
const folder=new URL('../artifacts/v6/',import.meta.url);await mkdir(folder,{recursive:true});
const capture=(page,name)=>page.screenshot({path:fileURLToPath(new URL(name+'.png',folder))});
const ready=page=>page.waitForFunction(()=>window.portfolioReady&&window.stackReady);
const state=page=>page.evaluate(()=>window.stackDebug());
try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
  for(const suffix of ['/?version=6','/?version=6#work']){
    await page.goto('about:blank');
    await page.goto(base+suffix,{waitUntil:'networkidle'});await ready(page);assert.equal(await page.evaluate(()=>scrollY),0);assert.equal((await state(page)).experience.progress,0);assert.equal(new URL(page.url()).hash,'');assert.ok(!await page.locator('html').evaluate(el=>el.classList.contains('exhibition-pinned')));
  }
  await capture(page,'start-from-hero');await page.waitForTimeout(5200);assert.ok((await state(page)).carousel.every(s=>s.mix===0&&portfolio.projects.find(p=>p.id===s.project).cover.id===s.current));checks.push('fresh visits and old #work preview links start at the Hero; card autoplay waits for the exhibition');
  await enterExhibition(page);assert.ok(Math.abs((await page.locator('.ribbon-pin').boundingBox()).y)<1);assert.equal(await page.locator('#about-phase').evaluate(el=>el.hidden),true);await page.reload({waitUntil:'networkidle'});await ready(page);assert.equal(await page.evaluate(()=>scrollY),0);assert.equal((await state(page)).experience.progress,0);checks.push('refreshing from the exhibition restarts the intended Hero-to-works sequence');
  await enterExhibition(page);const initial=(await state(page)).carousel;await capture(page,'cards-before-carousel');
  await page.waitForFunction(()=>window.stackDebug().carousel.some(s=>s.mix>.15&&s.mix<.85),{},{timeout:15000});await capture(page,'cards-crossfade');
  await page.waitForFunction(()=>window.stackDebug().carousel.filter(s=>s.current!==window.carouselCovers[s.project]).length>=4,await page.evaluate(()=>{window.carouselCovers=Object.fromEntries(window.stackDebug().carousel.map(s=>[s.project,s.current]));return null;}),{timeout:15000});
  const rotated=await state(page);assert.ok(rotated.carousel.some(s=>s.current!==initial.find(p=>p.project===s.project).current));
  for(const s of rotated.carousel)assert.ok(portfolio.projects.find(p=>p.id===s.project).images.some(a=>a.id===s.current));assert.ok(rotated.gpuTextures<=36);await capture(page,'cards-after-carousel');checks.push('visible cards crossfade through images from their own project with a bounded current/next texture cache');
  let hovered=null;
  for(const card of rotated.cards.filter(c=>c.x>280&&c.x<1120&&c.y>270&&c.y<780)){await page.mouse.move(card.x,card.y);await page.waitForTimeout(100);hovered=(await state(page)).hovered;if(hovered)break;}
  assert.ok(hovered);const paused=(await state(page)).carousel.find(s=>s.project===hovered);await page.waitForTimeout(5600);const still=(await state(page)).carousel.find(s=>s.project===hovered);assert.equal(still.current,paused.current);assert.equal(still.mix,paused.mix);checks.push('hovering a card pauses its carousel without moving the pinned page');
  const clicked=(await state(page)).carousel.find(s=>s.project===hovered),artId=clicked.mix>=.5?clicked.next:clicked.current;
  await page.mouse.down();await page.mouse.up();await page.waitForFunction(()=>window.stackDebug().focused);const opened=await state(page),art=portfolio.artwork.find(a=>a.id===artId);assert.equal(opened.openedImage,artId);assert.ok(Math.abs(opened.openedAspect-art.width/art.height)<.00001);
  const frozen=opened.carousel;await page.waitForFunction(()=>document.querySelector('#home-view').hidden);await page.waitForTimeout(700);assert.deepEqual((await state(page)).carousel,frozen);await page.locator('.back-to-work').click();await page.waitForFunction(()=>window.stackDebug().experience.pinned);assert.ok(Math.abs((await page.locator('.ribbon-pin').boundingBox()).y)<1);checks.push('opening uses the image currently shown on the card, fits its true ratio, and pauses autoplay until return');
  for(const viewport of [{width:2048,height:1146},{width:1024,height:700}]){await page.setViewportSize(viewport);await page.waitForTimeout(200);const stage=await page.locator('.ribbon-pin').boundingBox();assert.ok(Math.abs(stage.y)<1&&Math.abs(stage.height-viewport.height)<1);assert.equal(await page.locator('#about-phase').evaluate(el=>el.hidden),true);}
  checks.push('the pinned exhibition follows the current viewport height without leaking the next section');
  const mobile=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});mobile.on('pageerror',e=>errors.push(e.message));await mobile.goto(base+'/?version=6#work',{waitUntil:'networkidle'});await ready(mobile);assert.equal(await mobile.evaluate(()=>scrollY),0);await enterExhibition(mobile);const first=(await state(mobile)).carousel;await mobile.waitForFunction(()=>window.stackDebug().carousel.some(s=>s.current!==window.firstMobile[s.project]),await mobile.evaluate(()=>{window.firstMobile=Object.fromEntries(window.stackDebug().carousel.map(s=>[s.project,s.current]));return null;}),{timeout:15000});assert.ok((await state(mobile)).carousel.some(s=>s.current!==first.find(p=>p.project===s.project).current));await capture(mobile,'mobile-carousel');checks.push('mobile starts at the Hero and rotates the project images after entering the fixed exhibition');
  assert.deepEqual(errors,[]);checks.push('zero browser errors or missing images');console.log(JSON.stringify({passed:checks.length,checks},null,2));
}finally{await browser.close();}
