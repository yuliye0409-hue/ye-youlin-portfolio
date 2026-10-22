import { site } from './site.config.js';
import { Header, Footer, ProjectCards, ProjectDetail, sectionComponents } from './components.js';

for (const [key,value] of Object.entries(site.theme)) document.documentElement.style.setProperty(`--${key}`,value);
document.querySelector('#header').innerHTML=Header(site);
document.querySelector('#main').innerHTML=site.sections.filter(s=>s.enabled&&sectionComponents[s.type]).map(s=>sectionComponents[s.type](site,s.id)).join('');
document.querySelector('#footer').innerHTML=Footer(site);

// Removing a module must not leave broken anchor links.
const sectionIds=new Set(site.sections.filter(s=>s.enabled).map(s=>s.id));
const firstSectionId=site.sections.find(s=>s.enabled)?.id;
document.querySelectorAll('a[href^="#"]').forEach(link=>{
  const target=link.getAttribute('href').slice(1);
  if(target.includes('/')||sectionIds.has(target))return;
  if((link.closest('header, footer')||link.classList.contains('skip-link'))&&firstSectionId)link.setAttribute('href',`#${firstSectionId}`);
  else link.hidden=true;
});
const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
const behavior=()=>motion.matches?'instant':'smooth';
const toast=document.querySelector('.toast');
let toastTimer;
function announce(message){
  toast.textContent=message;toast.classList.add('show');clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>toast.classList.remove('show'),3000);
}

// Archive filters and the gallery/index switch share a single source of state.
const gallery=document.querySelector('.project-gallery');
if(gallery){
  document.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{
    document.querySelectorAll('[data-filter]').forEach(b=>{const selected=b===button;b.classList.toggle('active',selected);b.setAttribute('aria-pressed',String(selected));});
    const list=button.dataset.filter===site.work.filters[0]?site.projects:site.projects.filter(p=>p.category===button.dataset.filter);
    gallery.innerHTML=list.length?ProjectCards(list):'<p class="empty-state">暂时没有这个方向的内容。</p>';
    announce(`已显示 ${list.length} 个设计方向`);
  }));
  document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>{
    const index=button.dataset.view==='index';
    gallery.classList.toggle('is-index',index);
    document.querySelectorAll('[data-view]').forEach(b=>{const selected=b===button;b.classList.toggle('active',selected);b.setAttribute('aria-pressed',String(selected));});
    announce(index?'已切换至目录视图':'已切换至画廊视图');
  }));
  // Small image movement is progressive enhancement; touch scrolling stays native.
  const finePointer=window.matchMedia('(hover: hover) and (pointer: fine)');
  let frame=0,activeArt;
  gallery.addEventListener('pointermove',event=>{
    if(motion.matches||!finePointer.matches||gallery.classList.contains('is-index'))return;
    const art=event.target.closest('.project-visual');
    if(!art)return;
    if(activeArt&&activeArt!==art){activeArt.style.removeProperty('--px');activeArt.style.removeProperty('--py');}
    activeArt=art;
    const rect=art.getBoundingClientRect(),x=(event.clientX-rect.left)/rect.width-.5,y=(event.clientY-rect.top)/rect.height-.5;
    cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{art.style.setProperty('--px',`${x*8}px`);art.style.setProperty('--py',`${y*8}px`);});
  });
  gallery.addEventListener('pointerleave',()=>{cancelAnimationFrame(frame);activeArt?.style.removeProperty('--px');activeArt?.style.removeProperty('--py');});
}

// Physical keycap controls: visible, keyboard accessible and silent by default.
document.querySelectorAll('[data-key]').forEach(button=>button.addEventListener('click',()=>{
  const theme=site.hero.keyThemes.find(x=>x.key===button.dataset.key);
  if(!theme)return;
  document.querySelectorAll('[data-key]').forEach(b=>{const active=b===button;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
  document.querySelector('[data-key-label]').textContent=theme.label;
  document.querySelector('[data-key-title]').textContent=theme.title;
  document.querySelector('[data-key-text]').textContent=theme.text;
  button.classList.remove('pulse');
  if(!motion.matches){void button.offsetWidth;button.classList.add('pulse');}
}));

// WAI-ARIA tabs: arrow keys, Home and End support, one tab stop in the tablist.
const expertiseTabs=[...document.querySelectorAll('[data-expertise]')];
function activateExpertise(button,focus=false){
  expertiseTabs.forEach(tab=>{const active=tab===button;tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;document.getElementById(tab.getAttribute('aria-controls')).hidden=!active;});
  if(focus)button.focus();
}
expertiseTabs.forEach((button,index)=>{
  button.addEventListener('click',()=>activateExpertise(button));
  button.addEventListener('keydown',event=>{
    let next;
    if(['ArrowDown','ArrowRight'].includes(event.key))next=(index+1)%expertiseTabs.length;
    if(['ArrowUp','ArrowLeft'].includes(event.key))next=(index-1+expertiseTabs.length)%expertiseTabs.length;
    if(event.key==='Home')next=0;
    if(event.key==='End')next=expertiseTabs.length-1;
    if(next!==undefined){event.preventDefault();activateExpertise(expertiseTabs[next],true);}
  });
});
const tabOrientation=window.matchMedia('(max-width: 600px)');
function syncTabOrientation(){document.querySelector('.expertise-selector')?.setAttribute('aria-orientation',tabOrientation.matches?'horizontal':'vertical');}
tabOrientation.addEventListener('change',syncTabOrientation);syncTabOrientation();

document.querySelectorAll('[data-copy]').forEach(button=>button.addEventListener('click',async()=>{
  try{await navigator.clipboard.writeText(site[button.dataset.copy]);announce('邮箱已复制，可以直接粘贴');}
  catch{announce(`请手动复制：${site[button.dataset.copy]}`);}
}));

// A detail sequence occupies one history entry; closing restores the archive.
const dialog=document.querySelector('#project-dialog');
let opener=null,previousHash='#work',openedFromPage=false,routeActive=false,activeProjectId=null;
function syncRoute(){
  const match=location.hash.match(/^#work\/([a-z0-9-]+)$/);
  const project=match&&site.projects.find(p=>p.id===match[1]);
  if(project){
    if(dialog.open&&activeProjectId===project.id)return;
    const alreadyOpen=dialog.open;
    activeProjectId=project.id;dialog.innerHTML=ProjectDetail(site,project);
    if(!dialog.open)dialog.showModal();
    dialog.scrollTop=0;document.body.classList.add('modal-open');
    dialog.querySelectorAll('.dialog-close').forEach(b=>b.addEventListener('click',closeProject));
    if(alreadyOpen)dialog.querySelector('.dialog-close').focus({preventScroll:true});
    routeActive=true;document.title=`${project.name} — ${site.name}`;
  }else{
    activeProjectId=null;if(dialog.open)dialog.close();document.body.classList.remove('modal-open');
    document.title=`${site.name} — ${site.role}`;
    if(routeActive){if(opener?.isConnected)opener.focus({preventScroll:true});routeActive=false;}
    if(match){history.replaceState(null,'','#work');document.querySelector('#work')?.scrollIntoView();announce('未找到该方向，已返回列表');}
  }
}
document.addEventListener('click',event=>{
  const link=event.target.closest('.project-open');
  if(!link||event.defaultPrevented||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
  event.preventDefault();
  if(dialog.open)history.replaceState(history.state,'',link.getAttribute('href'));
  else{opener=link;previousHash=location.hash||'#work';openedFromPage=true;history.pushState({project:true},'',link.getAttribute('href'));}
  syncRoute();
});
function closeProject(){
  if(openedFromPage&&history.state?.project){openedFromPage=false;history.back();}
  else{history.replaceState(null,'',previousHash);syncRoute();document.getElementById(previousHash.slice(1))?.scrollIntoView({behavior:behavior()});}
}
dialog.addEventListener('cancel',event=>{event.preventDefault();closeProject();});
dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)closeProject();}});
window.addEventListener('hashchange',syncRoute);window.addEventListener('popstate',syncRoute);syncRoute();

const navLinks=[...document.querySelectorAll('header nav a')];
const sectionObserver=new IntersectionObserver(entries=>{
  entries.forEach(entry=>{if(!entry.isIntersecting)return;navLinks.forEach(link=>{const active=link.hash===`#${entry.target.id}`;link.classList.toggle('is-active',active);if(active)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');});});
},{rootMargin:'-15% 0px -45% 0px'});
document.querySelectorAll('main > section').forEach(section=>sectionObserver.observe(section));

// Keep content readable before an animation starts and under reduced motion.
if(!motion.matches){
  const revealObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('revealed');revealObserver.unobserve(entry.target);}}),{threshold:.08});
  document.querySelectorAll('.section-heading,.work-heading,.about-grid,.expertise-system,.metric-grid').forEach(element=>{element.classList.add('will-reveal');revealObserver.observe(element);});
}
const progress=document.querySelector('.reading-progress');
let scrollFrame=0;
function updateProgress(){const max=document.documentElement.scrollHeight-window.innerHeight;progress.style.transform=`scaleX(${max>0?Math.min(1,Math.max(0,window.scrollY/max)):0})`;}
window.addEventListener('scroll',()=>{cancelAnimationFrame(scrollFrame);scrollFrame=requestAnimationFrame(updateProgress);},{passive:true});
window.addEventListener('resize',updateProgress);updateProgress();
