import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {portfolio} from '../portfolio.config.js';
import {enterExhibition} from './verification-helpers.mjs';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const base=process.env.PREVIEW_URL||'http://127.0.0.1:4180',folder=new URL('../artifacts/v9/',import.meta.url),checks=[],errors=[];
await mkdir(folder,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const capture=(page,name)=>page.screenshot({path:fileURLToPath(new URL(name+'.png',folder))});
const watch=page=>{page.on('pageerror',error=>errors.push(error.message));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});};
async function openAbout(page){
  await page.goto(base+'/?version=9',{waitUntil:'networkidle'});await page.waitForFunction(()=>window.portfolioReady&&window.stackReady);
  assert.equal(await page.locator('#contact').isVisible(),false);assert.equal(await page.locator('#footer').isVisible(),false);await enterExhibition(page);
  await page.locator('.stack-exit').click();await page.waitForFunction(()=>!document.querySelector('#about-phase').hidden&&Math.abs(document.querySelector('#about').getBoundingClientRect().top)<1);await page.waitForTimeout(150);
}
async function contact(page){
  await page.locator('.about-contact-link').evaluate(el=>el.click());await page.waitForFunction(()=>location.hash==='#contact'&&document.querySelector('#contact').getBoundingClientRect().top<120);await page.waitForTimeout(1400);
}
try{
  const context=await browser.newContext({viewport:{width:1440,height:1000},permissions:['clipboard-read','clipboard-write']});
  const page=await context.newPage();watch(page);await openAbout(page);
  const before=await page.locator('[data-contact-word]').evaluate(el=>parseFloat(el.style.getPropertyValue('--contact-ink'))||0);await contact(page);
  const colors=await page.evaluate(()=>Object.fromEntries(['about','contact','footer'].map(id=>[id,getComputedStyle(document.getElementById(id)).backgroundColor])));
  assert.deepEqual(Object.values(colors),['rgb(250, 250, 250)','rgb(250, 250, 250)','rgb(250, 250, 250)']);assert.equal(await page.locator('#header').evaluate(el=>el.classList.contains('on-light')),true);
  assert.equal(await page.locator('.nav-dock a[href="#contact"]').getAttribute('aria-current'),'location');assert.equal(await page.evaluate(()=>document.activeElement.id),'contact-title');checks.push('About, Contact, footer and floating navigation share the white visual system; Contact navigation and focus are correct');
  for(const line of await page.locator('.contact-line-mask>span').all())assert.equal(await line.evaluate(el=>getComputedStyle(el).transform),'matrix(1, 0, 0, 1, 0, 0)');
  const after=await page.locator('[data-contact-word]').evaluate(el=>parseFloat(el.style.getPropertyValue('--contact-ink')));assert.ok(after>before&&after>98);
  assert.equal(await page.locator('.contact-studio-mail').evaluate(el=>getComputedStyle(el).opacity),'1');checks.push('masked title and action reveals finish visibly; the emphasis fills from gray to ink with scroll');
  await capture(page,'desktop-contact');
  await page.locator('.contact-studio-circle').hover();await page.waitForTimeout(500);assert.match(await page.locator('.contact-studio-circle svg').evaluate(el=>getComputedStyle(el).transform),/5, -5/);
  assert.equal(await page.locator('.contact-studio-circle').getAttribute('href'),'mailto:'+portfolio.email);checks.push('email invitation retains the real address and gives a restrained arrow and ring hover response');
  await page.locator('[data-copy-email]').click();await page.waitForFunction(()=>document.querySelector('[data-copy-email]').dataset.copyState==='copied');assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),portfolio.email);assert.match(await page.locator('.toast').textContent(),/已复制/);
  await page.waitForFunction(()=>document.querySelector('[data-copy-email]').dataset.copyState==='idle');assert.equal(await page.locator('[data-copy-label]').textContent(),'复制邮箱');
  await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw new Error('Denied for verification');}}}));await page.locator('[data-copy-email]').click();await page.waitForFunction(()=>document.querySelector('.toast').textContent.startsWith('请复制邮箱：'));assert.match(await page.locator('.toast').textContent(),new RegExp(portfolio.email.replaceAll('.','\\.')));checks.push('clipboard copies the actual email, announces success, resets its label and gracefully handles denied access');
  const downloading=page.waitForEvent('download');await page.locator('.contact-download').click();const download=await downloading;assert.equal(download.suggestedFilename(),'Yuli_Studio_Portfolio_2026.pdf');assert.equal(await download.failure(),null);
  const response=await page.request.get(base+'/'+portfolio.pdf);assert.equal(response.status(),200);assert.equal((await response.body()).subarray(0,4).toString(),'%PDF');checks.push('the Contact button downloads the existing real portfolio PDF with the expected filename');
  await page.evaluate(()=>scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));await page.locator('#footer a[href="#home"]').last().click();await page.waitForFunction(()=>scrollY<1&&document.querySelector('#about-phase').hidden);checks.push('return-to-top starts at Hero and closes the phase gate again');
  const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});watch(mobile);await openAbout(mobile);await contact(mobile);await capture(mobile,'mobile-contact');
  await mobile.evaluate(()=>scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));await mobile.waitForTimeout(1200);await capture(mobile,'mobile-contact-actions');
  for(const width of [320,360,390,768,1024,2048]){
    await mobile.setViewportSize({width,height:900});await mobile.waitForTimeout(50);
    assert.ok(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    const line=await mobile.locator('.contact-line-mask').last().evaluate(el=>({box:el.clientWidth,content:el.scrollWidth}));assert.ok(line.content<=line.box+1,JSON.stringify({width,...line}));
    const email=await mobile.locator('.contact-studio-email').evaluate(el=>{const a=el.getBoundingClientRect(),b=el.parentElement.getBoundingClientRect();return a.left>=b.left&&a.right<=b.right;});assert.ok(email);
  }
  checks.push('six screen widths retain complete headlines and email addresses without horizontal overflow; mobile actions have usable touch targets');
  const reduced=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});watch(reduced);await openAbout(reduced);await contact(reduced);assert.equal(await reduced.locator('.contact-motion').count(),0);assert.equal(await reduced.locator('[data-contact-word]').evaluate(el=>getComputedStyle(el).color),'rgb(23, 25, 25)');assert.equal(await reduced.locator('.contact-line-mask>span').first().evaluate(el=>getComputedStyle(el).animationName),'none');await capture(reduced,'reduced-motion-contact');checks.push('reduced-motion visitors get complete text and functional actions without entry or scroll animation');
  assert.deepEqual(errors,[]);checks.push('no browser errors or missing local assets');console.log(JSON.stringify({passed:checks.length,checks},null,2));
}finally{await browser.close();}
