import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('.', import.meta.url));
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.pdf': 'application/pdf', '.svg': 'image/svg+xml', '.json': 'application/json; charset=utf-8', '.mp4': 'video/mp4' };
http.createServer(async (req, res) => {
  try {
    if (!['GET','HEAD'].includes(req.method)) { res.writeHead(405, { Allow: 'GET, HEAD' }); return res.end(); }
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const target = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
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
  } catch { res.writeHead(404); res.end('Not found'); }
}).listen(Number(process.env.PORT || 4173), '127.0.0.1', () => console.log('Portfolio ready: http://127.0.0.1:' + (process.env.PORT || 4173)));
