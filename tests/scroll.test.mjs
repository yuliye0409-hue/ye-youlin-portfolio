import test from 'node:test';
import assert from 'node:assert/strict';
import {portfolio} from '../portfolio.config.js';
import {ScrollWork,ScrollProject,ProjectPage,featuredImages} from '../scroll-projects.js';
import {sceneProgress,filmPosition,framePose} from '../scroll.math.js';

test('scroll progress starts when pinned, reaches the last image, and clamps at both ends',()=>{
  assert.equal(sceneProgress(0,1000,3000,800,100),0);
  assert.equal(sceneProgress(900,1000,3000,800,100),0);
  assert.equal(sceneProgress(2000,1000,3000,800,100),.5);
  assert.equal(sceneProgress(3100,1000,3000,800,100),1);
  assert.equal(sceneProgress(9000,1000,3000,800,100),1);
  assert.equal(filmPosition(0,4),0);assert.equal(filmPosition(.5,4),1.5);assert.equal(filmPosition(1,4),3);
  const middle=framePose(2,2);assert.deepEqual(middle,{y:0,scale:1,opacity:1,rotate:0});
});
test('all nine projects are real scroll sections with high-resolution main artwork',()=>{
  const html=ScrollWork(portfolio);
  assert.equal((html.match(/class="scroll-project /g)||[]).length,9);
  assert.ok(!html.includes('class="work-card'));
  for(const project of portfolio.projects){
    const section=ScrollProject(project);
    assert.ok(section.includes(`id="collection-${project.id}"`));
    assert.ok(section.includes(`href="#work/${project.id}"`));
    for(const art of featuredImages(project))assert.ok(section.includes(`src="${art.src}"`));
    assert.ok(!section.includes('src="'+project.cover.thumbnail+'"'));
  }
});
test('all original artworks are available in document-flow project pages',()=>{
  for(const project of portfolio.projects){
    const html=ProjectPage(portfolio,project);
    assert.ok(!html.includes('<dialog'));
    assert.equal((html.match(/class="editorial-art"/g)||[]).length,project.images.length);
    for(const art of project.images)assert.ok(html.includes(`src="${art.src}"`));
    assert.ok(html.includes('id="project-title"'));
  }
});
test('studio branding stays separate from the designer profile',()=>{
  assert.equal(portfolio.brandName,'Yuli Studio');assert.notEqual(portfolio.name,portfolio.brandName);
});
