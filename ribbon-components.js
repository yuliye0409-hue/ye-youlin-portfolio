import {escapeHtml as e} from './portfolio.components.js';
import {StackWork} from './stack-components.js';

export function RibbonExperience(s){
  const copy=`<div class="ribbon-copy"><div class="ribbon-first-frame"><div class="ribbon-glow"></div><div class="ribbon-cross"><span>+</span></div><p class="ribbon-edition">YULI STUDIO / VISUAL PORTFOLIO ${e(s.edition)}</p></div><h1 class="ribbon-headline" aria-label="Craft in motion，让产品不止被看见"><span class="ribbon-line ribbon-line-one" aria-hidden="true"><span>CRAFT IN</span></span><span class="ribbon-line ribbon-line-two" aria-hidden="true"><span>MOTION</span></span></h1><p class="ribbon-caption">让产品，不止被看见。<br><span>EXPLORING IDEAS THROUGH DESIGN.</span></p><div class="ribbon-static-art" aria-hidden="true">${s.projects.slice(0,3).map(p=>`<img src="${e(p.cover.src)}" width="${p.cover.width}" height="${p.cover.height}" loading="lazy" alt="">`).join('')}</div></div>`;
  const controls=`<div class="ribbon-controls"><a class="ribbon-project-link" href="#contact">开启一次合作 ↗</a><div class="ribbon-bottom"><p>以视觉连接产品、品牌与人。<br><span>品牌与电商视觉 / 产品渲染 / AI 探索</span></p><span class="ribbon-disciplines">PRODUCT <i>/</i> VISUAL <i>/</i> EMOTION</span><a class="ribbon-explore" href="#work">滚动，走进作品 <span>↓</span></a></div></div>`;
  const stack=StackWork(s).replace('<section id="work"','<section data-stack-section').replace('<canvas',copy+controls+'<canvas');
  return `<section id="home" class="ribbon-experience" aria-label="Yuli Studio，滚动进入作品展览"><div class="ribbon-pin">${stack}</div><div id="work" class="ribbon-work-anchor" aria-hidden="true"></div></section>`;
}
