import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { analyzeReference } from './analyzer.mjs';

const root = fileURLToPath(new URL('.', import.meta.url));
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.pdf': 'application/pdf', '.svg': 'image/svg+xml', '.json': 'application/json; charset=utf-8', '.mp4': 'video/mp4', '.md': 'text/markdown; charset=utf-8' };
let playwrightPromise;
async function loadPlaywright() {
  if (!playwrightPromise) {
    playwrightPromise = process.env.PLAYWRIGHT_MODULE
      ? import(pathToFileURL(path.resolve(process.env.PLAYWRIGHT_MODULE)).href)
      : import('playwright');
  }
  return playwrightPromise;
}

async function readJson(req, maxBytes = 8192) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBytes) throw new Error('请求内容过大。');
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new Error('请求数据格式无效。'); }
}

function sendJson(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(JSON.stringify(payload));
}

http.createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (pathname === '/api/analyze') {
      if (req.method !== 'POST') return sendJson(res, 405, { error: '仅支持 POST 请求。' });
      const body = await readJson(req);
      if (typeof body.url !== 'string' || !body.url.trim()) return sendJson(res, 400, { error: '请输入要分析的参考网页网址。' });
      try {
        const playwright = await loadPlaywright();
        const result = await analyzeReference(body.url.trim(), { playwright, executablePath: process.env.CHROME_EXECUTABLE });
        return sendJson(res, 200, result);
      } catch (error) {
        const status = /网址|公网|内部地址|非公网|账号密码|本地网络|解析到非公网/.test(error.message) ? 400 : /timeout|Timeout/i.test(error.message) ? 504 : 502;
        return sendJson(res, status, { error: error.message || '网页分析失败，请稍后重试。' });
      }
    }
    if (!['GET','HEAD'].includes(req.method)) { res.writeHead(405, { Allow: 'GET, HEAD' }); return res.end(); }
    const filePath = pathname === '/' ? '/index.html' : pathname.endsWith('/') ? `${pathname}index.html` : pathname;
    const target = path.resolve(root, '.' + filePath);
    const relative = path.relative(root, target);
    if (relative.startsWith('..') || path.isAbsolute(relative) || relative.split(path.sep).some(part => part.startsWith('.')) || !types[path.extname(target)]) { res.writeHead(404); return res.end('Not found'); }
    if(path.extname(target)==='.mp4'){
      const {size}=await stat(target),headers={'Content-Type':'video/mp4','Accept-Ranges':'bytes','X-Content-Type-Options':'nosniff','Cache-Control':'no-cache'};
      let start=0,end=size-1,status=200;
      if(req.headers.range){
        const match=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
        if(!match||(!match[1]&&!match[2])){res.writeHead(416,{...headers,'Content-Range':`bytes */${size}`});return res.end();}
        if(match[1]){start=Number(match[1]);if(match[2])end=Math.min(Number(match[2]),size-1);}
        else{const suffix=Number(match[2]);start=Math.max(0,size-suffix);if(suffix===0)start=size;}
        if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>=size||end<start){res.writeHead(416,{...headers,'Content-Range':`bytes */${size}`});return res.end();}
        headers['Content-Range']=`bytes ${start}-${end}/${size}`;status=206;
      }
      res.writeHead(status,{...headers,'Content-Length':end-start+1});
      if(req.method==='HEAD')return res.end();
      const stream=createReadStream(target,{start,end});stream.on('error',()=>res.destroy());res.on('close',()=>stream.destroy());return stream.pipe(res);
    }
    const bytes = await readFile(target);
    res.writeHead(200, { 'Content-Type': types[path.extname(target)], 'Content-Length': bytes.length, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-cache' });
    res.end(req.method === 'HEAD' ? undefined : bytes);
  } catch (error) {
    if (!res.headersSent) {
      if(error.code==='ENOENT'||error.code==='EISDIR'){res.writeHead(404);res.end('Not found');}
      else sendJson(res,400,{error:error.message||'请求失败。'});
    }
    else res.destroy();
  }
}).listen(Number(process.env.PORT || 4173), '127.0.0.1', () => console.log('Portfolio ready: http://127.0.0.1:' + (process.env.PORT || 4173)));
