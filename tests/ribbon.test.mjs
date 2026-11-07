import test from 'node:test';
import assert from 'node:assert/strict';
import {portfolio} from '../portfolio.config.js';
import {RibbonExperience} from '../ribbon-components.js';
import {trackProgress,railPoint,headlinePose,flightProgress} from '../ribbon-math.js';

test('the pinned hero reaches its exact work anchor and reverses without state',()=>{
  assert.equal(trackProgress(-1,0,5000,1000),0);assert.equal(trackProgress(0,0,5000,1000),0);
  assert.equal(trackProgress(2000,0,5000,1000),.5);assert.equal(trackProgress(4000,0,5000,1000),1);
  assert.equal(trackProgress(10000,0,5000,1000),1);assert.equal(trackProgress(2000,0,5000,1000),.5);
});
test('the fixed rail has a shallow near pass and a distant return',()=>{
  const points=Array.from({length:161},(_,i)=>railPoint(i/160));
  assert.ok(points.every(p=>[p.x,p.y,p.z].every(Number.isFinite)));
  assert.ok(Math.max(...points.map(p=>p.z))>-5.5);assert.ok(Math.min(...points.map(p=>p.z))< -23.9);
  for(let i=0;i<160;i++)assert.ok(Math.hypot(points[i+1].x-points[i].x,points[i+1].y-points[i].y,points[i+1].z-points[i].z)<2);
});
test('each artwork leaves the ribbon in order and finishes in the exhibition',()=>{
  let last=-Infinity;
  for(let i=0;i<9;i++){
    const {start,q}=flightProgress(1,i,93.03583384201272,9);assert.ok(start>last);last=start;assert.equal(q,1);
    assert.equal(flightProgress(start,i,93.03583384201272,9).q,0);
    assert.ok(flightProgress(start+.1,i,93.03583384201272,9).q>0);
  }
  assert.equal(headlinePose(0).run,-50);assert.equal(headlinePose(1).run,76);assert.equal(headlinePose(1).caption,0);
});
test('hero and second screen share one canvas, one home anchor and one work anchor',()=>{
  const html=RibbonExperience(portfolio);
  assert.equal((html.match(/<canvas /g)||[]).length,1);assert.equal((html.match(/id="home"/g)||[]).length,1);assert.equal((html.match(/id="work"/g)||[]).length,1);
  assert.ok(!html.includes('<video'));assert.ok(!html.includes('r2.dev'));assert.ok(!html.includes('VANTE'));
  for(const project of portfolio.projects)assert.ok(html.includes(`#work/${project.id}`));
});
