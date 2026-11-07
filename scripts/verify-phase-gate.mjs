import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {enterExhibition} from './verification-helpers.mjs';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({channel:'chrome',headless:true}),base=process.env.PREVIEW_URL||'http://127.0.0.1:4180',folder=new URL('../artifacts/v8/',import.meta.url),checks=[],errors=[];
await mkdir(folder,{recursive:true});
const ready=page=>page.waitForFunction(()=>window.portfolioReady&&window.stackReady);
const state=page=>page.evaluate(()=>({locked:document.querySelector('#about-phase').hidden,inert:document.querySelector('#about-phase').inert,footer:document.querySelector('#footer').hidden,expanded:document.querySelector('[data-enter-about]').getAttribute('aria-expanded'),y:scrollY,max:document.documentElement.scrollHeight-innerHeight,boundary:document.querySelector('.ribbon-experience').offsetHeight-innerHeight,stageY:document.querySelector('.ribbon-pin').getBoundingClientRect().top}));
const closed=async page=>{const s=await state(page);assert.ok(s.locked&&s.inert&&s.footer,JSON.stringify(s));assert.equal(s.expanded,'false');assert.equal(await page.locator('#about').isVisible(),false);assert.ok(Math.abs(s.max-s.boundary)<1,JSON.stringify(s));return s;};
const aboutReady=page=>page.waitForFunction(()=>!document.querySelector('#about-phase').hidden&&Math.abs(document.querySelector('#about').getBoundingClientRect().top)<1&&!document.documentElement.classList.contains('exhibition-pinned'));
const capture=(page,name)=>page.screenshot({path:fileURLToPath(new URL(name+'.png',folder))});
const watch=page=>{page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});};
try{
  const page=await browser.newPage({viewport:{width:2048,height:1050}});watch(page);
  for(const suffix of ['/?version=8','/?version=8#about','/?version=8#contact']){
    await page.goto('about:blank');await page.goto(base+suffix,{waitUntil:'networkidle'});await ready(page);assert.equal(await page.evaluate(()=>scrollY),0);await closed(page);
  }
  checks.push('fresh visits and saved phase-two anchors start at the Hero with About and the footer absent from layout');
  await enterExhibition(page);const pin=await closed(page);assert.equal(pin.y,pin.boundary);
  for(const selector of ['.stack-canvas','.brand','.pdf-nav','.stack-exit']){
    const r=await page.locator(selector).boundingBox();await page.mouse.move(r.x+r.width/2,r.y+r.height/2);
    for(let i=0;i<3;i++)await page.mouse.wheel(0,2400);await page.waitForTimeout(100);assert.equal((await closed(page)).y,pin.y);
  }
  for(const key of ['End','PageDown','Space','ArrowDown','Control+End']){await page.keyboard.press(key);assert.equal((await closed(page)).y,pin.y);}
  await capture(page,'locked-exhibition');checks.push('repeated wheel input over the entire page and all page-scroll keys cannot advance into phase two');
  const safety=await page.addStyleTag({content:'html.exhibition-pinned{overflow:auto!important}'});await page.evaluate(()=>scrollTo({top:1e7,behavior:'instant'}));await page.waitForTimeout(100);assert.equal((await closed(page)).y,pin.y);await safety.evaluate(el=>el.remove());checks.push('the structural gate still prevents escape even if the CSS overflow lock is removed');
  await page.locator('.nav-dock a[href="#about"]').click();await page.waitForTimeout(150);await closed(page);assert.equal(new URL(page.url()).hash,'#work');assert.match(await page.locator('.toast').textContent(),/继续了解/);checks.push('About navigation points to Continue without opening the phase gate');
  await page.locator('.stack-exit').click();await aboutReady(page);assert.equal(await page.locator('[data-enter-about]').getAttribute('aria-expanded'),'true');assert.ok(!(await state(page)).footer);await page.waitForTimeout(1400);await capture(page,'unlocked-about');
  const y=await page.evaluate(()=>scrollY);await page.mouse.move(600,550);await page.mouse.wheel(0,700);await page.waitForTimeout(200);assert.ok((await page.evaluate(()=>scrollY))>y);checks.push('only activating Continue reveals phase two; the introduction then scrolls normally');
  await page.goBack();await page.waitForFunction(()=>document.querySelector('#about-phase').hidden);await closed(page);await page.goForward();await page.waitForTimeout(250);await closed(page);checks.push('Back to the exhibition closes the gate and Forward cannot silently reopen About');
  await page.locator('.stack-exit').click();await aboutReady(page);await page.mouse.move(600,550);await page.mouse.wheel(0,-2100);
  await page.waitForFunction(()=>document.querySelector('#about-phase').hidden&&location.hash==='#work');await closed(page);checks.push('scrolling back from About relocks the exhibition and restores its work route');
  await page.locator('.stack-exit').click();await aboutReady(page);await page.locator('.nav-dock a[href="#work"]').click();await page.waitForFunction(()=>document.documentElement.classList.contains('exhibition-pinned'));await closed(page);
  await page.locator('[data-stack-mode="index"]').click();await page.locator('[data-stack-project="visual-upgrade"]').click();await page.waitForFunction(()=>document.querySelector('#home-view').hidden);assert.ok(await page.locator('#about-phase').evaluate(el=>el.hidden));
  await page.locator('.back-to-work').click();await page.waitForFunction(()=>document.documentElement.classList.contains('exhibition-pinned'));await closed(page);await page.mouse.wheel(0,9000);await closed(page);checks.push('returning from About or a complete project restores the locked immersive exhibition');
  for(const viewport of [{width:1280,height:800},{width:2048,height:1050}]){await page.setViewportSize(viewport);await page.waitForTimeout(150);const s=await closed(page);assert.ok(Math.abs(s.y-s.boundary)<1&&Math.abs(s.stageY)<1,JSON.stringify(s));}checks.push('resizing retains the stage boundary and never exposes hidden introduction content');
  const mobile=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});watch(mobile);await mobile.goto(base+'/?version=8',{waitUntil:'networkidle'});await ready(mobile);await enterExhibition(mobile);const m=await closed(mobile),session=await mobile.context().newCDPSession(mobile);
  for(const [x,y] of [[190,510],[335,80]]){
    await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});for(let i=1;i<=5;i++)await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:Math.max(10,y-i*65)}]});await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.equal((await closed(mobile)).y,m.y);
  }
  await capture(mobile,'mobile-locked');await mobile.locator('.stack-exit').click();await aboutReady(mobile);checks.push('touch drags and swipes cannot advance the mobile page; tapping Continue opens About');
  for(const mode of ['reduced','no-webgl']){
    const fallback=await browser.newPage({viewport:{width:1440,height:1000},...(mode==='reduced'?{reducedMotion:'reduce'}:{})});watch(fallback);
    if(mode==='no-webgl')await fallback.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /^(webgl2?|experimental-webgl)$/.test(type)?null:original.call(this,type,...args);};});
    await fallback.goto(base+'/?version=8',{waitUntil:'networkidle'});await ready(fallback);await enterExhibition(fallback);await closed(fallback);assert.ok(await fallback.locator('.stack-exit').isVisible());await fallback.locator('.stack-exit').click();await aboutReady(fallback);await fallback.locator('#about-film').evaluate(async video=>{const poster=new Image();poster.src=video.poster;await poster.decode();});await capture(fallback,mode+'-about');await fallback.close();
  }
  checks.push('reduced-motion and no-WebGL fallbacks expose a working Continue button while keeping phase two initially closed');
  assert.deepEqual(errors,[]);checks.push('no browser errors or failed local requests');console.log(JSON.stringify({passed:checks.length,checks},null,2));
}finally{await browser.close();}
