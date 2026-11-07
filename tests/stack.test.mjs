import test from 'node:test';
import assert from 'node:assert/strict';
import {portfolio} from '../portfolio.config.js';
import {StackWork,StackProjectPage} from '../stack-components.js';
import {PrintDocument} from '../portfolio.components.js';
import {coverCrop,wrap,loopPosition,fitArtwork} from '../stack-math.js';

test('diagonal stack loops seamlessly in both directions',()=>{
  assert.equal(wrap(-5,5,5),-5);assert.equal(wrap(-5,5,-6),4);
  for(const aspect of [.46,1.44,1.78])for(const offset of [-200,-.1,0,25,200]){
    const a=loopPosition(3,offset,27,aspect),b=loopPosition(3,offset+27,27,aspect);
    assert.ok(Math.abs(a.x-b.x)<1e-10&&Math.abs(a.z-b.z)<1e-10);
  }
});
test('portrait card previews crop without changing image proportions',()=>{
  for(const art of portfolio.artwork){
    const c=coverCrop(art.width,art.height);
    assert.ok(Math.abs(c.width/c.height-.75)<.0001);
    assert.ok(c.x>=0&&c.y>=0&&c.x+c.width<=art.width+.01&&c.y+c.height<=art.height+.01);
    if(art.height/art.width>3)assert.equal(c.y,0);
  }
});
test('stack provides all nine project routes and an accessible fallback',()=>{
  const html=StackWork(portfolio);assert.ok(html.includes('<canvas'));assert.ok(html.includes('stack-fallback'));
  for(const project of portfolio.projects)assert.ok(html.includes(`href="#work/${project.id}"`));
});
test('opened artwork fits below navigation without clipping any original edge',()=>{
  for(const [vw,vh] of [[1440,1000],[390,844],[844,390],[1920,1080]])for(const [w,h] of [[1800,800],[1600,1600],[1280,1920],[1580,19806]]){
    const rect=fitArtwork(w,h,vw,vh);
    assert.ok(Math.abs(rect.width/rect.height-w/h)<1e-9);
    assert.ok(rect.x-rect.width/2>=23&&rect.x+rect.width/2<=vw-23);
    assert.ok(rect.y-rect.height/2>=103&&rect.y+rect.height/2<=vh-31);
  }
});
test('all original images remain accessible without visible individual image names',()=>{
  for(const project of portfolio.projects){
    const html=StackProjectPage(portfolio,project);
    assert.equal((html.match(/class="stack-project-art /g)||[]).length,project.images.length);
    assert.ok(!html.includes('<figcaption>'));assert.ok(!html.includes('<h2>'));
    for(const art of project.images){assert.ok(html.includes(`src="${art.src}"`));assert.ok(!html.includes(`>${art.title}<`));}
  }
  assert.ok(!PrintDocument(portfolio).includes('<figcaption>'));
});
