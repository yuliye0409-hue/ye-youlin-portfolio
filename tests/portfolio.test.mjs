import test from 'node:test';
import assert from 'node:assert/strict';
import {access} from 'node:fs/promises';
import {portfolio} from '../portfolio.config.js';
import {Cards,Header,ProjectDetail,PrintDocument} from '../portfolio.components.js';

test('all 69 supplied artworks appear once in the nine collections',()=>{
  assert.equal(portfolio.artwork.length,69);
  assert.equal(portfolio.projects.length,9);
  const ids=portfolio.projects.flatMap(p=>p.images.map(a=>a.id));
  assert.equal(ids.length,69);assert.equal(new Set(ids).size,69);
  assert.ok(portfolio.projects.every(p=>p.images.includes(p.cover)));
});
test('all artwork and preview files are local and exist',async()=>{
  for(const art of portfolio.artwork){
    assert.ok(art.width>0&&art.height>0);
    for(const asset of [art.src,art.thumbnail]){
      assert.match(asset,/^assets\/work\/[a-z0-9-]+\.(webp|jpg)$/);
      await access(new URL('../'+asset,import.meta.url));
    }
  }
});
test('categories cover every collection and detail routes are unique',()=>{
  assert.equal(new Set(portfolio.projects.map(p=>p.id)).size,9);
  for(const p of portfolio.projects){
    assert.ok(portfolio.filters.includes(p.category));
    assert.ok(Cards([p]).includes(`#work/${p.id}`));
    assert.ok(ProjectDetail(portfolio,p).includes('id="project-title"'));
  }
});
test('PDF uses all full artworks and excludes cropped previews',()=>{
  const html=PrintDocument(portfolio);
  assert.equal((html.match(/class="pdf-page/g)||[]).length,32);
  assert.ok(!html.includes('-thumb.webp'));
  for(const art of portfolio.artwork)assert.ok(html.includes(`assets/print/${art.id}.jpg`));
  assert.equal((html.match(/<img/g)||[]).length,81);
});
test('PDF downloads are same-origin and configurable text is escaped',()=>{
  const header=Header(portfolio);assert.ok(header.includes('download='));assert.ok(header.includes(portfolio.pdf));
  const copy=structuredClone(portfolio);copy.projects[0].title='<img onerror="bad()">';
  assert.ok(!Cards(copy.projects).includes('<img onerror='));
  assert.ok(!ProjectDetail(copy,copy.projects[0]).includes('<img onerror='));
});
