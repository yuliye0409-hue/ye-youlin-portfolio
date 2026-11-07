import {escapeHtml as e,arrow,download} from './portfolio.components.js';

export function ContactStudio(s){
  return `<section class="contact-stage light-section" id="contact" aria-labelledby="contact-title">
    <div class="about-section-top" data-contact-reveal><span>03 / CONTACT · 联系我</span><span>THE NEXT GOOD IDEA.</span></div>
    <div class="contact-studio-heading">
      <div class="contact-studio-copy">
        <p class="contact-studio-hello" data-contact-reveal>看过作品，也认识了我。</p>
        <h2 id="contact-title"><span class="contact-line-mask"><span>好设计，</span></span><span class="contact-line-mask"><span>从一次<span data-contact-word>沟通</span>开始<span class="contact-studio-star" aria-hidden="true">✳</span></span></span></h2>
        <p class="contact-studio-note" data-contact-reveal>关于品牌、电商视觉，或下一个新想法。<br>欢迎写信，一起把想法变成作品。</p>
      </div>
      <div class="contact-studio-invite" data-contact-reveal><a class="contact-studio-circle" href="mailto:${e(s.email)}" aria-label="发送邮件给${e(s.name)}">${arrow}</a><span>LET’S MAKE IT HAPPEN.</span></div>
    </div>
    <div class="contact-studio-actions">
      <div class="contact-studio-mail" data-contact-reveal>
        <div class="contact-action-top"><span>01 / SAY HELLO</span><span aria-hidden="true">↗</span></div>
        <a class="contact-studio-email" href="mailto:${e(s.email)}">${e(s.email)}</a>
        <div class="contact-mail-bottom"><span>期待你的下一个好想法。</span><button type="button" class="contact-copy" data-copy-email data-copy-state="idle"><span data-copy-label>复制邮箱</span><span class="contact-copy-icon" aria-hidden="true">↗</span></button></div>
      </div>
      <div class="contact-studio-takeaway" data-contact-reveal>
        <div class="contact-action-top"><span>02 / TAKE A CLOSER LOOK</span><span>${String(s.projects.length).padStart(2,'0')} COLLECTIONS / ${s.artwork.length} VISUALS</span></div>
        <h3>把作品集，带走。</h3><p>喜欢这些作品？留一份慢慢看。</p>
        <a class="contact-download" href="${e(s.pdf)}" download="Yuli_Studio_Portfolio_2026.pdf"><span>下载精选作品集 PDF</span>${download}</a>
      </div>
    </div>
  </section>`;
}

// The same reveal distance, timing and scroll-filled ink as the About phase.
// The hidden phase cannot trigger its reveals before Continue opens it.
export function mountContactStudio(root){
  const motion=matchMedia('(prefers-reduced-motion: reduce)'),words=[...root.querySelectorAll('[data-contact-word]')],reveals=[...root.querySelectorAll('[data-contact-reveal],.contact-line-mask')];
  const heading=root.querySelector('#contact-title');let observer=null,frame=0,disposed=false;
  const clamp=value=>Math.max(0,Math.min(1,value));
  function paint(){
    frame=0;if(disposed||root.closest('[hidden]'))return;
    const b=heading.getBoundingClientRect(),p=motion.matches?1:clamp((innerHeight*.84-b.top)/(innerHeight*.4+b.height*.4));
    words.forEach(el=>el.style.setProperty('--contact-ink',`${p*100}%`));
  }
  function refresh(){if(!frame)frame=requestAnimationFrame(paint);}
  function setup(){
    observer?.disconnect();
    if(motion.matches){root.classList.remove('contact-motion');reveals.forEach(el=>el.classList.add('contact-entered'));paint();return;}
    root.classList.add('contact-motion');
    observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('contact-entered');observer.unobserve(entry.target);}}),{threshold:.12});
    reveals.forEach((el,i)=>{el.style.setProperty('--contact-delay',`${Math.min(i%5,3)*55}ms`);observer.observe(el);});paint();
  }
  addEventListener('scroll',refresh,{passive:true});addEventListener('resize',refresh);motion.addEventListener('change',setup);setup();
  return {refresh,dispose(){disposed=true;cancelAnimationFrame(frame);observer?.disconnect();removeEventListener('scroll',refresh);removeEventListener('resize',refresh);motion.removeEventListener('change',setup);}};
}
