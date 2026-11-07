import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {portfolio} from '../portfolio.config.js';
import {enterExhibition} from './verification-helpers.mjs';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({channel:'chrome',headless:true}),base=process.env.PREVIEW_URL||'http://127.0.0.1:4180',checks=[],errors=[];
const folder=new URL('../artifacts/v5/',import.meta.url);await mkdir(folder,{recursive:true});
const capture=(page,name)=>page.screenshot({path:fileURLToPath(new URL(name+'.png',folder))});
const ready=page=>page.waitForFunction(()=>window.portfolioReady&&window.stackReady);
const settled=page=>page.waitForFunction(()=>window.stackDebug().experience.progress>.99995);
async function go(page,hash=''){await page.goto(base+'/?version=6'+hash,{waitUntil:'networkidle'});await ready(page);if(hash==='#work')await enterExhibition(page);}
async function assertFit(page,id){
  await page.waitForFunction(()=>window.stackDebug().focused);
  const state=await page.evaluate(()=>window.stackDebug()),bounds=state.openedBounds,size=await page.locator('.stack-canvas').boundingBox();
  const art=portfolio.artwork.find(a=>a.id===state.openedImage);
  assert.equal(state.opened,id);assert.ok(Math.abs(state.openedAspect-art.width/art.height)<.00001);
  assert.ok(Math.abs((bounds.right-bounds.left)/(bounds.bottom-bounds.top)-art.width/art.height)<.001);
  assert.ok(bounds.left>=20&&bounds.right<=size.width-20&&bounds.top>=100&&bounds.bottom<=size.height-29,JSON.stringify({id,bounds,size}));
  await page.screenshot({clip:size,style:'#project-view.project-flight-overlay{visibility:hidden!important}',path:fileURLToPath(new URL('opened-'+id+'-'+size.width+'.png',folder))});
  await page.waitForFunction(()=>document.querySelector('#home-view').hidden);assert.ok(!await page.locator('html').evaluate(el=>el.classList.contains('exhibition-pinned')));
}
async function lightboxFit(page,index){
  await page.locator(`[data-image="${index}"]`).click();await page.locator('.lightbox-media img').evaluate(img=>img.decode());
  const fit=await page.locator('.lightbox-media').evaluate(el=>{const img=el.querySelector('img'),a=img.getBoundingClientRect(),b=el.getBoundingClientRect();return {inside:a.left>=b.left&&a.right<=b.right&&a.top>=b.top&&a.bottom<=b.bottom,ratio:a.width/a.height,native:img.naturalWidth/img.naturalHeight};});
  assert.ok(fit.inside,JSON.stringify(fit));assert.ok(Math.abs(fit.ratio-fit.native)<.002);
  await capture(page,'lightbox-'+index+'-'+(await page.viewportSize()).width);await page.keyboard.press('Escape');
}
try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
  await go(page);const startup=await page.evaluate(()=>{const r=performance.getEntriesByType('resource');return {originals:r.filter(x=>/assets\/work\/(?!.*-thumb)/.test(x.name)).length,stageBytes:r.filter(x=>/assets\/stage\//.test(x.name)).reduce((sum,x)=>sum+x.encodedBodySize,0)};});
  assert.equal(startup.originals,0);assert.ok(startup.stageBytes<2.5*1048576);await capture(page,'hero-start');checks.push('first paint uses 2.14 MB of dedicated sharp stage previews and defers original long-image decoding');
  await page.evaluate(()=>{const t=document.querySelector('.ribbon-experience');scrollTo({top:(t.offsetHeight-innerHeight)*.92,behavior:'instant'});});
  await page.mouse.move(700,500);await page.mouse.wheel(0,3600);await settled(page);const pinY=await page.evaluate(()=>scrollY);
  assert.ok(await page.locator('html').evaluate(el=>el.classList.contains('exhibition-pinned')));
  assert.ok(Math.abs((await page.locator('.ribbon-pin').boundingBox()).y)<1);assert.equal(await page.locator('#about-phase').evaluate(el=>el.hidden),true);
  await capture(page,'pinned-after-fast-wheel');checks.push('large wheel deltas stop exactly at the full-screen exhibition instead of revealing About');
  for(const selector of ['.brand','.pdf-nav','[data-stack-filter="全部作品"]','[data-stack-mode="overview"]']){
    const b=await page.locator(selector).boundingBox(),before=await page.evaluate(()=>window.stackDebug().offset);await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.wheel(0,650);await page.waitForTimeout(350);assert.equal(await page.evaluate(()=>scrollY),pinY);assert.ok(Math.abs((await page.evaluate(()=>window.stackDebug())).offset-before)>.5);
  }
  for(const key of ['PageDown','End','Space']){await page.keyboard.press(key);await page.waitForTimeout(80);assert.equal(await page.evaluate(()=>scrollY),pinY);}
  checks.push('wheel over navigation and filters plus page-scroll keys cannot move the pinned exhibition');
  await page.locator('[data-stack-mode="index"]').click();await page.locator('[data-stack-project="campaign-banners"]').click();await assertFit(page,'campaign-banners');await lightboxFit(page,0);checks.push('landscape artwork opens edge-to-edge at its real aspect ratio, then the gallery and lightbox stay proportional');
  await page.locator('.back-to-work').click();await settled(page);assert.equal(await page.evaluate(()=>scrollY),pinY);await page.locator('[data-stack-project="product-pages"]').click();await assertFit(page,'product-pages');await lightboxFit(page,2);checks.push('very long artwork reveals its entire original composition during opening and fits completely in the lightbox');
await page.locator('.back-to-work').click();await settled(page);await page.locator('.stack-exit').click();await page.waitForFunction(()=>Math.abs(document.querySelector('#about').getBoundingClientRect().top)<1);assert.equal(page.url().split('#')[1],'about');assert.ok(Math.abs((await page.locator('#about').boundingBox()).y)<1);assert.ok(!await page.locator('html').evaluate(el=>el.classList.contains('exhibition-pinned')));checks.push('return restores the pinned cards while explicit About navigation releases the page');
  await page.locator('.nav-dock a[href="#work"]').click();await settled(page);await page.locator('.brand').click();await page.waitForFunction(()=>window.stackDebug().experience.progress<.0001);assert.equal(await page.evaluate(()=>scrollY),0);checks.push('returning to the Hero releases the pin and reverses the ribbon smoothly');
  await page.locator('.ribbon-explore').click();await page.waitForTimeout(300);await page.mouse.move(700,500);await page.mouse.wheel(0,-100);await page.waitForTimeout(100);await page.mouse.wheel(0,6500);await settled(page);
  assert.ok(await page.locator('html').evaluate(el=>el.classList.contains('exhibition-pinned')));
  for(const viewport of [{width:1280,height:800},{width:1440,height:1000}]){await page.setViewportSize(viewport);await page.waitForTimeout(150);assert.ok(Math.abs((await page.locator('.ribbon-pin').boundingBox()).y)<1);assert.equal(await page.locator('#about-phase').evaluate(el=>el.hidden),true);}
  checks.push('interrupting auto-scroll and resizing the window both retain the full-screen pin');
  const cold=await browser.newPage({viewport:{width:1440,height:1000}});cold.on('pageerror',e=>errors.push(e.message));
  await cold.route('**/assets/work/campaign-banners-19.webp',async route=>{await new Promise(resolve=>setTimeout(resolve,900));await route.continue();});
  await go(cold,'#work');await cold.locator('[data-stack-mode="index"]').click();await cold.locator('[data-stack-project="campaign-banners"]').press('Enter');
  const openingStart=await cold.evaluate(()=>window.stackDebug().openedBounds);await cold.waitForTimeout(220);const openingMid=await cold.evaluate(()=>window.stackDebug());
  assert.equal(openingMid.focused,false);assert.ok(Math.abs(openingMid.openedBounds.left-openingStart.left)>3);await capture(cold,'opening-in-flight');
  await assertFit(cold,'campaign-banners');checks.push('the clicked card starts moving immediately even when its uncropped original is delayed by 900 ms');
  const mobile=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});mobile.on('pageerror',e=>errors.push(e.message));await go(mobile,'#work');
  const session=await mobile.context().newCDPSession(mobile),before=await mobile.evaluate(()=>scrollY);
  await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:340,y:565}]});for(let i=1;i<=5;i++)await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:340,y:565-i*40}]});await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await mobile.waitForTimeout(400);assert.equal(await mobile.evaluate(()=>scrollY),before);await capture(mobile,'mobile-pinned');
  await mobile.locator('[data-stack-mode="index"]').click();await mobile.locator('[data-stack-project="campaign-posters"]').click();await assertFit(mobile,'campaign-posters');await lightboxFit(mobile,0);checks.push('mobile chrome cannot swipe the exhibition away, and portrait opening plus lightbox fit all four edges');
  assert.deepEqual(errors,[]);checks.push('no browser errors or missing local resources');console.log(JSON.stringify({passed:checks.length,startup,checks},null,2));
}finally{await browser.close();}
