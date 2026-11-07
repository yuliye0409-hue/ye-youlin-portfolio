import {createRequire} from 'node:module';
import {mkdir,readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const require=createRequire(import.meta.url);
const sharp=require(process.env.SHARP_PATH||'C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root=fileURLToPath(new URL('../',import.meta.url));
const list=JSON.parse(await readFile(path.join(root,'artwork.manifest.json'),'utf8'));
await mkdir(path.join(root,'assets','print'),{recursive:true});
for(const art of list){
  await sharp(path.join(root,art.src)).flatten({background:'#efefed'}).jpeg({quality:87,mozjpeg:true}).toFile(path.join(root,'assets','print',art.id+'.jpg'));
}
console.log(`Prepared ${list.length} print images. JPEG streams preserve full image dimensions and embed efficiently in PDF.`);
