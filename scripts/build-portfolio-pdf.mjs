import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { spawn } from 'node:child_process';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=fileURLToPath(new URL('../',import.meta.url));
const port=Number(process.env.PDF_PORT||4181);
const server=spawn(process.execPath,['server.mjs'],{cwd:root,env:{...process.env,PORT:String(port)},stdio:'ignore',windowsHide:true});
let browser;
try{
  let ready=false;
  for(let i=0;i<40;i++){try{const r=await fetch(`http://127.0.0.1:${port}`);if(r.ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,150));}
  if(!ready)throw new Error('PDF preview server did not become ready.');
  browser=await chromium.launch({headless:true,channel:'chrome'});
  const page=await browser.newPage({viewport:{width:1123,height:794},deviceScaleFactor:1});
  const failures=[];page.on('pageerror',error=>failures.push(error.message));
  await page.goto(`http://127.0.0.1:${port}/?export=pdf`,{waitUntil:'networkidle'});
  await page.waitForFunction(()=>window.portfolioReady===true);
  await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.querySelectorAll('.pdf-page img')].map(img=>img.decode()));});
  if(failures.length)throw new Error(failures.join('\n'));
  const count=await page.locator('.pdf-page').count();
  const broken=await page.locator('.pdf-page img').evaluateAll(imgs=>imgs.filter(i=>!i.complete||i.naturalWidth===0).length);
  if(broken)throw new Error(`${broken} images failed to load.`);
  await mkdir(path.join(root,'output','pdf'),{recursive:true});
  await mkdir(path.join(root,'artifacts'),{recursive:true});
  await page.pdf({path:path.join(root,'output','pdf','selected-works.pdf'),format:'A4',landscape:true,printBackground:true,preferCSSPageSize:true,displayHeaderFooter:false,tagged:true});
  for(const i of [0,1,2,8,16,count-1])if(i<count)await page.locator('.pdf-page').nth(i).screenshot({path:path.join(root,'artifacts',`pdf-layout-${i+1}.png`)});
  console.log(JSON.stringify({pdf:'output/pdf/selected-works.pdf',pages:count,images:await page.locator('.pdf-page img').count(),brokenImages:broken}));
}finally{if(browser)await browser.close();server.kill();}
