import {escapeHtml as e,arrow} from './portfolio.components.js';
import {mountAboutVideo} from './about-video.js';

// Verified against the supplied five-page resume. Keep the reported metric,
// period and unit together; CRV is the source's wording, not a derived CVR.
export const aboutResults=[
  {value:89.4,precision:1,label:'运营需求量增长',context:'4–5 月 · 需求承接',number:'01'},
  {value:63.6,precision:1,label:'设计交付效率提升',context:'4–5 月 · 流程优化',number:'02'},
  {value:20,precision:0,label:'团队整体人效提升',context:'3D 渲染 + AI 辅助',number:'03'},
  {value:0.4,precision:1,label:'单品图片优化 CRV 平均提升',context:'设计 · 反馈 · 复盘 · 迭代',number:'04'},
];
const statement=[['从','产品的形态，'],['到','品牌的表达。'],['以视觉','构建信任，'],['以数据','验证价值。']];

export function AboutStudio(s){
  return `<section id="about" class="about-stage" aria-labelledby="about-title">
    <div class="about-intro">
      <div class="about-section-top"><span>02 / ABOUT ME · 关于我</span><span>${e(s.englishName)} / YULI STUDIO</span></div>
      <div class="about-intro-copy">
        <p class="about-hello" data-about-reveal>你好，我是${e(s.name)}。</p>
        <h2 id="about-title" tabindex="-1"><span class="about-line-mask"><span>让产品出彩，</span></span><span class="about-line-mask"><span>让团队高效。</span></span></h2>
        <p class="about-role" data-about-reveal>${e(s.role)}</p>
        <p class="about-short" data-about-reveal>从产品设计出发，统筹品牌与电商视觉。<br>用 2D、3D 与 AI，让创意稳定落地。</p>
        <a class="about-inline-link" href="#about-impact" data-about-reveal>以结果，认识我 <span>↓</span></a>
      </div>
      <div class="about-video" data-about-video data-about-reveal>
        <div class="about-video-frame"><video id="about-film" width="1920" height="1080" data-src="assets/profile/yuli-about.mp4" poster="assets/profile/yuli-about-poster.jpg" preload="none" muted loop playsinline aria-label="叶佑林的 IP 形象生活片段"></video></div>
        <input class="about-video-seek" data-video-seek type="range" min="0" max="100" step="0.1" value="0" disabled aria-label="视频播放进度" aria-controls="about-film">
        <div class="about-video-bottom"><span data-video-status>IP IN MOTION.</span><div class="about-video-controls" role="group" aria-label="介绍视频控制"><button type="button" data-video-play aria-label="播放介绍视频" aria-controls="about-film"><svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path class="video-play-glyph" d="m5 3 8 5-8 5V3Z" fill="currentColor"/><path class="video-pause-glyph" d="M5 3v10M11 3v10" stroke="currentColor" stroke-width="2"/></svg><span>播放</span></button><button type="button" data-video-sound aria-label="开启视频声音" aria-pressed="false" aria-controls="about-film"><span>开启声音</span></button><button type="button" data-video-fullscreen aria-label="全屏观看介绍视频" aria-controls="about-film"><span>全屏 ↗</span></button></div></div>
        <a data-video-fallback class="about-video-fallback" href="assets/profile/yuli-about.mp4" target="_blank" rel="noopener noreferrer" hidden>单独打开视频 ↗</a>
      </div>
      <div class="about-intro-bottom" data-about-reveal><span>AMAZON / 独立站 / 多语种视觉</span><span>PRODUCT. VISUAL. IMPACT.</span></div>
    </div>
    <div class="about-manifesto">
      <p class="about-kicker" data-about-reveal><span class="about-small-star" aria-hidden="true">✳</span> DESIGN WITH INTENTION.</p>
      <div class="about-manifesto-layout"><h3 class="about-statement" aria-label="${statement.flat().join('')}">${statement.map(line=>`<span class="about-statement-line" aria-hidden="true">${line.map(word=>`<span data-about-word>${word}</span>`).join('')}</span>`).join('')}</h3><p class="about-manifesto-note" data-about-reveal>不止关注画面的完成，<br>更关注品牌的表达、<br>团队的交付与真实反馈。</p></div>
    </div>
    <div class="about-impact" id="about-impact" aria-labelledby="about-impact-title">
      <div class="about-impact-heading" data-about-reveal><h3 id="about-impact-title">设计的价值，<br>有数据回应。</h3><p>SELECTED IMPACT<br><span>来自真实的工作复盘</span></p></div>
      <div class="about-metrics">${aboutResults.map(m=>`<article class="about-metric" data-about-reveal><div class="about-metric-top"><span>${m.number} / RESULT</span><span aria-hidden="true">↗</span></div><p class="about-metric-value" aria-label="${e(m.label)} ${m.value}%"><span data-count="${m.value}" data-precision="${m.precision}" aria-hidden="true">${m.value.toFixed(m.precision)}</span><span class="about-percent" aria-hidden="true">%</span></p><h4>${e(m.label)}</h4><p class="about-metric-context">${e(m.context)}</p></article>`).join('')}</div>
      <p class="about-data-note">数据源自个人简历与工作复盘，按原始口径展示；月份未标注年份，CRV 保留原文表述。</p>
      <div class="about-practice" data-about-reveal><p><span>01 / VISUAL</span><strong>品牌与电商视觉</strong><small>主图 / A+ / 店铺与独立站</small></p><p><span>02 / EXPLORATION</span><strong>三维渲染与 AI</strong><small>Blender / 产品场景 / AI 工作流</small></p><p><span>03 / DELIVERY</span><strong>团队与流程</strong><small>需求统筹 / SOP / 质量审核</small></p></div>
      <a class="about-contact-link" href="#contact" data-about-reveal>聊聊下一个项目 ${arrow}</a>
    </div>
  </section>`;
}

const clamp=value=>Math.max(0,Math.min(1,value));
export function mountAboutStudio(root){
  const motion=matchMedia('(prefers-reduced-motion: reduce)'),statement=root.querySelector('.about-statement'),film=mountAboutVideo(root.querySelector('[data-about-video]'));
  const words=[...root.querySelectorAll('[data-about-word]')],counters=[...root.querySelectorAll('[data-count]')],reveal=[...root.querySelectorAll('[data-about-reveal],.about-line-mask')];
  const timers=new Set(),observers=[];let frame=0,disposed=false;
  function finishCounts(){counters.forEach(el=>{el.textContent=Number(el.dataset.count).toFixed(Number(el.dataset.precision));el.dataset.counted='true';});}
  function count(el){
    if(el.dataset.counted)return;el.dataset.counted='true';const start=performance.now(),value=Number(el.dataset.count),precision=Number(el.dataset.precision);
    function tick(time){if(disposed)return;const p=clamp((time-start)/1400);el.textContent=(value*(1-Math.pow(1-p,3))).toFixed(precision);if(p<1&&!motion.matches){const id=requestAnimationFrame(t=>{timers.delete(id);tick(t);});timers.add(id);}else el.textContent=value.toFixed(precision);}
    tick(start);
  }
  function paint(){
    frame=0;if(root.closest('[hidden]')||disposed)return;
    const b=statement.getBoundingClientRect(),p=motion.matches?1:clamp((innerHeight*.82-b.top)/(innerHeight*.6+b.height*.35));
    words.forEach((el,i)=>el.style.setProperty('--word-fill',`${clamp((p*(words.length+3)-i)/3)*100}%`));
  }
  function requestPaint(){if(!frame)frame=requestAnimationFrame(paint);}
  function setup(){
    observers.forEach(observer=>observer.disconnect());observers.length=0;
    if(motion.matches){root.classList.remove('about-motion');reveal.forEach(el=>el.classList.add('about-entered'));timers.forEach(cancelAnimationFrame);timers.clear();finishCounts();paint();return;}
    root.classList.add('about-motion');
    const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('about-entered');observer.unobserve(entry.target);}}),{threshold:.12});
    reveal.forEach((el,i)=>{el.style.setProperty('--reveal-delay',`${Math.min(i%6,4)*55}ms`);observer.observe(el);});observers.push(observer);
    const stats=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.querySelectorAll('[data-count]').forEach(count);stats.unobserve(entry.target);}}),{threshold:.2});
    root.querySelectorAll('.about-metric').forEach(el=>stats.observe(el));observers.push(stats);paint();
  }
  addEventListener('scroll',requestPaint,{passive:true});addEventListener('resize',requestPaint);motion.addEventListener('change',setup);setup();
  return {refresh(){requestPaint();film.refresh();},dispose(){disposed=true;film.dispose();cancelAnimationFrame(frame);timers.forEach(cancelAnimationFrame);observers.forEach(o=>o.disconnect());removeEventListener('scroll',requestPaint);removeEventListener('resize',requestPaint);motion.removeEventListener('change',setup);}};
}
