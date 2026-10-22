import test from 'node:test';
import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import { site } from '../site.config.js';
import { Header, Footer, ProjectCards, ProjectDetail, sectionComponents, escapeHtml } from '../components.js';

test('identity and resume reference match the provided subject', () => {
  assert.equal(site.name, '叶佑林');
  assert.equal(site.role, '跨境电商视觉设计组长');
  assert.equal(site.email, '2659308702@qq.com');
  assert.equal(site.projects.length, 3);
});

test('each enabled module renders independently without undefined content', () => {
  for (const section of site.sections) {
    const html = sectionComponents[section.type](site, section.id);
    assert.ok(html.startsWith(`<section id="${section.id}"`), section.type);
    assert.ok(!html.includes('undefined'), section.type);
    assert.ok(html.includes('aria-labelledby='), section.type);
  }
});

test('navigation omits disabled modules', () => {
  for (const id of ['work', 'about', 'capabilities', 'contact']) {
    const copy = structuredClone(site);
    copy.sections.find(s => s.id === id).enabled = false;
    const html = Header(copy);
    assert.ok(!html.includes(`href="#${id}"`), id);
  }
});

test('project numbering remains stable after filtering and details link to the next project', () => {
  const second = site.projects[1];
  assert.ok(ProjectCards([second]).includes(`DIRECTION / ${second.code}`));
  for (let i=0; i<site.projects.length; i++) {
    const next=site.projects[(i+1)%site.projects.length];
    assert.ok(ProjectDetail(site, site.projects[i]).includes(`href="#work/${next.id}"`));
  }
});

test('new art headings and interactive key labels escape configurable text', () => {
  const copy=structuredClone(site);
  copy.hero.keyThemes[0].title='<script>bad()</script>';
  copy.projects[0].shortName='<img onerror="bad()">';
  assert.ok(sectionComponents.hero(copy, 'home').includes('&lt;script&gt;'));
  assert.ok(!ProjectCards(copy.projects).includes('<img onerror='));
});

test('project ids are unique, route-safe and categories correspond to filters', () => {
  assert.equal(new Set(site.projects.map(p => p.id)).size, site.projects.length);
  for (const project of site.projects) {
    assert.match(project.id, /^[a-z0-9-]+$/);
    assert.ok(site.work.filters.includes(project.category));
    assert.ok(project.alt.length > 0);
    assert.ok(ProjectCards([project]).includes(`#work/${project.id}`));
    assert.ok(ProjectDetail(site, project).includes('id="project-title"'));
  }
});

test('replacing content is escaped, not interpreted as markup', () => {
  assert.equal(escapeHtml('<img onerror="x">&'), '&lt;img onerror=&quot;x&quot;&gt;&amp;');
  const copy = structuredClone(site);
  copy.name = '<script>bad()</script>';
  assert.ok(!Header(copy).includes('<script>'));
  assert.ok(!Footer(copy).includes('<script>'));
});

test('all referenced local images exist', async () => {
  for (const image of new Set([site.hero.image, ...site.projects.map(p => p.image)])) {
    await access(new URL('../' + image, import.meta.url));
  }
});

test('resume metrics retain original reporting and image disclaimers', () => {
  assert.deepEqual(site.impact.metrics.map(m => m.value), ['89.4', '63.6', '20', '0.4']);
  assert.match(site.impact.note, /未标注年份/);
  assert.match(site.impact.note, /CRV/);
  assert.match(site.work.note, /非已交付项目作品/);
});
