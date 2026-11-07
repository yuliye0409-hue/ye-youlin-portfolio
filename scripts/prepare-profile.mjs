import {createRequire} from 'node:module';
import {mkdir,stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url),sharp=require(process.env.SHARP_PATH||'C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const sources=process.argv.slice(2);
if(sources.length!==2)throw new Error('Provide the supplied black-shirt and casual IP image paths, in that order.');
const folder=new URL('../assets/profile/',import.meta.url);await mkdir(folder,{recursive:true});
for(const [i,name] of ['yuli-black','yuli-casual'].entries()){
  const output=fileURLToPath(new URL(name+'.webp',folder));
  await sharp(sources[i]).rotate().resize({height:1824,withoutEnlargement:true}).webp({quality:92,effort:6}).toFile(output);
  const meta=await sharp(output).metadata();console.log(JSON.stringify({name,width:meta.width,height:meta.height,bytes:(await stat(output)).size}));
}
