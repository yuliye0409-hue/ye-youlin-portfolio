import {createRequire} from 'node:module';
import {mkdir,stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {portfolio} from '../portfolio.config.js';
import {coverCrop} from '../stack-math.js';
const require=createRequire(import.meta.url),sharp=require(process.env.SHARP_PATH||'C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const folder=new URL('../assets/stage/',import.meta.url);await mkdir(folder,{recursive:true});let bytes=0;
for(const art of portfolio.artwork){
  const source=fileURLToPath(new URL('../'+art.src,import.meta.url)),meta=await sharp(source).metadata();
  let image=sharp(source);
  if(meta.height/meta.width>3){const crop=coverCrop(meta.width,meta.height);image=image.extract({left:Math.floor(crop.x),top:Math.floor(crop.y),width:Math.floor(crop.width),height:Math.floor(crop.height)});}
  const output=fileURLToPath(new URL(art.id+'.webp',folder));
  await image.resize({width:1600,height:1600,fit:'inside',withoutEnlargement:true}).webp({quality:92,effort:5}).toFile(output);bytes+=(await stat(output)).size;
}
console.log(JSON.stringify({previews:portfolio.artwork.length,totalMB:(bytes/1048576).toFixed(2),originalsUnchanged:true}));
