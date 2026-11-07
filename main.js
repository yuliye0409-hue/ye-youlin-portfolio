import { portfolio as site } from './portfolio.config.js';
import { Header, Hero, Work, About, Contact, Footer, Cards, ProjectDetail, PrintDocument } from './portfolio.components.js';

if(new URLSearchParams(location.search).get('export')==='pdf'){
  document.documentElement.classList.add('pdf-export');
  document.querySelector('#main').innerHTML=PrintDocument(site);
  document.title=`${site.name} · 精选作品集 2026`;
  window.portfolioReady=true;
}else{
  document.querySelector('#header').innerHTML=Header(site);
  document.querySelector('#main').innerHTML=Hero(site)+Work(site)+About(site)+Contact(site);
  document.querySelector('#footer').innerHTML=Footer(site);
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
  const toast=document.querySelector('.toast');
  let toastTimer;
  function announce(message){toast.textContent=message;toast.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('visible'),3000);}
  const grid=document.querySelector('.work-grid');
  document.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{
    document.querySelectorAll('[data-filter]').forEach(b=>{const active=b===button;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
    const items=button.dataset.filter===site.filters[0]?site.projects:site.projects.filter(p=>p.category===button.dataset.filter);
    grid.innerHTML=Cards(items);
    document.querySelector('.work-counter').textContent=`显示 ${String(items.length).padStart(2,'0')} 个作品系列`;
  }));
  const menuButton=document.querySelector('.menu-toggle'),menu=document.querySelector('#mobile-menu');
  function closeMenu(){menu.hidden=true;menuButton.setAttribute('aria-expanded','false');}
  menuButton.addEventListener('click',()=>{menu.hidden=!menu.hidden;menuButton.setAttribute('aria-expanded',String(!menu.hidden));});
  menu.addEventListener('click',e=>{if(e.target.closest('a'))closeMenu();});
  document.addEventListener('click',e=>{if(!e.target.closest('.menu-toggle,#mobile-menu'))closeMenu();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu();});
  document.querySelector('[data-copy-email]').addEventListener('click',async()=>{
    try{await navigator.clipboard.writeText(site.email);announce('邮箱已复制');}catch{announce(`请复制邮箱：${site.email}`);}
  });

  const dialog=document.querySelector('#project-dialog'),lightbox=document.querySelector('#image-dialog');
  let activeProject=null,opener=null,returnHash='#work',openedFromPage=false;
  let imageIndex=0;
  const setScrollLock=()=>document.documentElement.classList.toggle('modal-open',dialog.open);
  function closeProject(){if(openedFromPage){history.back();}else{history.replaceState(null,'',returnHash);syncRoute();}}
  function syncRoute(){
    const match=location.hash.match(/^#work\/([a-z0-9-]+)$/);
    const project=match&&site.projects.find(p=>p.id===match[1]);
    if(project){
      if(activeProject?.id===project.id&&dialog.open)return;
      if(lightbox.open)lightbox.close();
      activeProject=project;dialog.innerHTML=ProjectDetail(site,project);
      if(!dialog.open)dialog.showModal();
      dialog.scrollTop=0;dialog.querySelector('.close-dialog').focus({preventScroll:true});
      document.title=`${project.title} — ${site.name}`;
    }else{
      if(lightbox.open)lightbox.close();
      if(dialog.open){dialog.close();opener?.focus({preventScroll:true});}
      activeProject=null;openedFromPage=false;
      document.title=`${site.name} — 个人视觉作品集`;
      if(match){history.replaceState(null,'','#work');announce('没有找到这个作品系列，已返回作品列表');}
    }
    setScrollLock();
  }
  document.addEventListener('click',event=>{
    const anchor=event.target.closest('.project-open');
    if(anchor){
      event.preventDefault();
      if(!dialog.open){opener=anchor;returnHash=location.hash||'#work';openedFromPage=true;history.pushState(null,'',anchor.getAttribute('href'));}
      else history.replaceState(null,'',anchor.getAttribute('href'));
      syncRoute();
    }
    if(event.target.closest('.close-dialog'))closeProject();
    const zoom=event.target.closest('[data-image]');
    if(zoom&&activeProject){imageIndex=Number(zoom.dataset.image);showImage();if(!lightbox.open)lightbox.showModal();}
  });
  dialog.addEventListener('cancel',event=>{event.preventDefault();closeProject();});
  dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right)closeProject();}});
  addEventListener('popstate',syncRoute);addEventListener('hashchange',syncRoute);
  function showImage(){
    const art=activeProject.images[imageIndex];
    const holder=lightbox.querySelector('.lightbox-media');
    holder.classList.remove('zoomed');holder.scrollTop=0;holder.scrollLeft=0;
    const img=holder.querySelector('img');img.src=art.src;img.alt=art.title;img.width=art.width;img.height=art.height;
    lightbox.querySelector('.image-count').textContent=`${String(imageIndex+1).padStart(2,'0')} / ${activeProject.images.length} · ${art.title}`;
    lightbox.querySelector('.image-original').href=art.src;
    lightbox.querySelector('.zoom-image').textContent='原尺寸放大 ＋';
  }
  function stepImage(dir){if(activeProject){imageIndex=(imageIndex+dir+activeProject.images.length)%activeProject.images.length;showImage();}}
  lightbox.querySelector('.close-image').addEventListener('click',()=>lightbox.close());
  lightbox.querySelector('.previous-image').addEventListener('click',()=>stepImage(-1));
  lightbox.querySelector('.next-image').addEventListener('click',()=>stepImage(1));
  lightbox.querySelector('.zoom-image').addEventListener('click',()=>{const zoomed=lightbox.querySelector('.lightbox-media').classList.toggle('zoomed');lightbox.querySelector('.zoom-image').textContent=zoomed?'适应屏幕 −':'原尺寸放大 ＋';});
  lightbox.addEventListener('keydown',event=>{if(event.key==='ArrowRight')stepImage(1);if(event.key==='ArrowLeft')stepImage(-1);});
  lightbox.addEventListener('close',()=>dialog.querySelector(`[data-image="${imageIndex}"]`)?.focus({preventScroll:true}));
  syncRoute();

  const header=document.querySelector('#header');
  const progress=document.querySelector('.reading-progress');
  const collage=document.querySelector('.hero-collage');
  const navLinks=[...document.querySelectorAll('.nav-dock a')];
  let scrollQueued=false;
  function updateScroll(){
    const y=scrollY;
    header.classList.toggle('scrolled',y>40);
    const light=y>document.querySelector('#work').offsetTop-70&&y<document.querySelector('#contact').offsetTop-70;
    header.classList.toggle('on-light',light);
    const probe=y+Math.min(innerHeight*.35,350);
    const current=probe>=document.querySelector('#contact').offsetTop?'contact':probe>=document.querySelector('#about').offsetTop?'about':'work';
    navLinks.forEach(link=>{const active=link.hash===`#${current}`;link.classList.toggle('is-current',active);if(active)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');});
    progress.style.transform=`scaleX(${y/Math.max(1,document.documentElement.scrollHeight-innerHeight)})`;
    if(!reducedMotion.matches&&y<innerHeight*1.5)collage.style.setProperty('--scroll',`${y*.12}px`);
    scrollQueued=false;
  }
  addEventListener('scroll',()=>{if(!scrollQueued){requestAnimationFrame(updateScroll);scrollQueued=true;}},{passive:true});
  addEventListener('resize',updateScroll);
  updateScroll();
  const observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){entry.target.classList.add('in-view');observer.unobserve(entry.target);}},{threshold:.08});
  if(!reducedMotion.matches)document.querySelectorAll('.section-heading,.about-layout,.contact-heading').forEach(el=>{el.classList.add('reveal');observer.observe(el);});
  window.portfolioReady=true;
}
