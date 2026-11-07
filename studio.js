import {portfolio as site} from './portfolio.config.js';
import {Header,Hero,About,Contact,Footer,PrintDocument} from './portfolio.components.js';
import {ScrollWork,ScrollProject,CollectionIndex,ProjectPage} from './scroll-projects.js';
import {mountScrollShowcase} from './scroll-showcase.js';

if(new URLSearchParams(location.search).get('export')==='pdf'){
  document.documentElement.classList.add('pdf-export');
  document.querySelector('#main').innerHTML=PrintDocument(site);
  document.title=`${site.brandName} · 精选作品集 ${site.edition}`;
  window.portfolioReady=true;
}else{
  const main=document.querySelector('#main'),header=document.querySelector('#header');
  header.innerHTML=Header(site);document.querySelector('#footer').innerHTML=Footer(site);
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  const lightbox=document.querySelector('#image-dialog');
  const toast=document.querySelector('.toast');
  const menuButton=document.querySelector('.menu-toggle'),menu=document.querySelector('#mobile-menu');
  let viewKey='',activeProject=null,activeFilter=site.filters[0],homeY=0,disposeMotion=()=>{},revealObserver=null;
  let imageIndex=0,imageOpener=null,scrollFrame=0,toastTimer;
  function announce(message){toast.textContent=message;toast.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('visible'),2600);}
  function closeMenu(){menu.hidden=true;menuButton.setAttribute('aria-expanded','false');}
  menuButton.addEventListener('click',()=>{menu.hidden=!menu.hidden;menuButton.setAttribute('aria-expanded',String(!menu.hidden));});
  function applyFilter(){
    const items=activeFilter===site.filters[0]?site.projects:site.projects.filter(p=>p.category===activeFilter);
    disposeMotion();
    main.querySelector('.scroll-collections').innerHTML=items.map(ScrollProject).join('');
    main.querySelector('.collection-index').innerHTML=CollectionIndex(items);
    main.querySelectorAll('[data-filter]').forEach(button=>{const active=button.dataset.filter===activeFilter;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});
    main.querySelector('.work-counter').textContent=`显示 ${String(items.length).padStart(2,'0')} 个作品系列`;
    disposeMotion=mountScrollShowcase(main.querySelector('.scroll-collections'),motion);
  }
  function jumpToHash(hash,restore=false){
    requestAnimationFrame(()=>{
      if(restore&&homeY>0)window.scrollTo({top:homeY,behavior:'instant'});
      else if(hash&&hash!=='#home')document.getElementById(hash.slice(1))?.scrollIntoView({block:'start',behavior:'instant'});
      else window.scrollTo({top:0,behavior:'instant'});
      updateScroll();
    });
  }
  function renderRoute({restore=false,force=false}={}){
    const match=location.hash.match(/^#work\/([a-z0-9-]+)$/);
    const project=match&&site.projects.find(p=>p.id===match[1]);
    const key=project?project.id:'home';
    if(key===viewKey&&!force){updateScroll();return;}
    if(lightbox.open)lightbox.close();
    disposeMotion();revealObserver?.disconnect();closeMenu();
    viewKey=key;activeProject=project||null;
    document.documentElement.dataset.view=project?'project':'home';
    document.documentElement.classList.remove('modal-open');
    if(project){
      main.innerHTML=ProjectPage(site,project);
      document.title=`${project.title} — ${site.brandName}`;
      window.scrollTo({top:0,behavior:'instant'});
    }else{
      main.innerHTML=Hero(site)+ScrollWork(site)+About(site)+Contact(site);
      document.title=`${site.brandName} — 视觉设计与产品表达`;
      applyFilter();
      if(!motion.matches){
        revealObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('in-view');revealObserver.unobserve(entry.target);}}),{threshold:.08});
        main.querySelectorAll('.section-heading,.about-layout,.contact-heading').forEach(el=>{el.classList.add('reveal');revealObserver.observe(el);});
      }
      jumpToHash(match?'#work':location.hash,restore);
    }
    updateScroll();window.portfolioReady=true;
  }
  function navigate(hash,restore=false){
    if(viewKey==='home'&&hash.startsWith('#work/'))homeY=scrollY;
    history.pushState({studioRoute:true},'',hash);renderRoute({restore});
    if(viewKey==='home'&&!restore)jumpToHash(hash);
  }
  function showImage(){
    const art=activeProject.images[imageIndex];
    const holder=lightbox.querySelector('.lightbox-media'),img=holder.querySelector('img');
    holder.classList.remove('zoomed');holder.scrollTop=0;holder.scrollLeft=0;
    img.src=art.src;img.alt=art.title;img.width=art.width;img.height=art.height;
    lightbox.querySelector('.image-count').textContent=`${String(imageIndex+1).padStart(2,'0')} / ${activeProject.images.length} · ${art.title}`;
    lightbox.querySelector('.image-original').href=art.src;
    lightbox.querySelector('.zoom-image').textContent='原尺寸放大 ＋';
  }
  const stepImage=direction=>{if(activeProject){imageIndex=(imageIndex+direction+activeProject.images.length)%activeProject.images.length;showImage();}};
  lightbox.querySelector('.close-image').addEventListener('click',()=>lightbox.close());
  lightbox.querySelector('.previous-image').addEventListener('click',()=>stepImage(-1));
  lightbox.querySelector('.next-image').addEventListener('click',()=>stepImage(1));
  lightbox.querySelector('.zoom-image').addEventListener('click',()=>{const zoomed=lightbox.querySelector('.lightbox-media').classList.toggle('zoomed');lightbox.querySelector('.zoom-image').textContent=zoomed?'适应屏幕 −':'原尺寸放大 ＋';});
  lightbox.addEventListener('keydown',event=>{if(event.key==='ArrowRight')stepImage(1);if(event.key==='ArrowLeft')stepImage(-1);});
  lightbox.addEventListener('close',()=>{document.documentElement.classList.remove('modal-open');imageOpener?.focus({preventScroll:true});});
  document.addEventListener('click',async event=>{
    const projectLink=event.target.closest('.project-open');
    if(projectLink){event.preventDefault();navigate(projectLink.getAttribute('href'));return;}
    const filter=event.target.closest('[data-filter]');
    if(filter){activeFilter=filter.dataset.filter;applyFilter();updateScroll();return;}
    const zoom=event.target.closest('[data-image]');
    if(zoom&&activeProject){imageIndex=Number(zoom.dataset.image);imageOpener=zoom;showImage();lightbox.showModal();document.documentElement.classList.add('modal-open');return;}
    const back=event.target.closest('.back-to-work');
    if(back){event.preventDefault();navigate('#work',true);return;}
    const hashLink=event.target.closest('a[href^="#"]');
    if(hashLink&&viewKey!=='home'&&!hashLink.getAttribute('href').startsWith('#work/')){event.preventDefault();navigate(hashLink.getAttribute('href'));return;}
    if(event.target.closest('[data-copy-email]')){
      try{await navigator.clipboard.writeText(site.email);announce('邮箱已复制');}catch{announce(`请复制邮箱：${site.email}`);}
    }
    if(event.target.closest('#mobile-menu a')||!event.target.closest('.menu-toggle,#mobile-menu'))closeMenu();
  });
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu();});
  addEventListener('popstate',()=>renderRoute({restore:!location.hash.startsWith('#work/')}));
  addEventListener('hashchange',()=>renderRoute());
  motion.addEventListener('change',()=>{if(viewKey==='home'){homeY=scrollY;renderRoute({force:true,restore:true});}});
  function updateScroll(){
    scrollFrame=0;
    const y=scrollY,project=viewKey!=='home';
    header.classList.toggle('scrolled',y>40||project);
    const work=main.querySelector('#work'),about=main.querySelector('#about'),contact=main.querySelector('#contact');
    const light=project||(work&&contact&&y>work.offsetTop-70&&y<contact.offsetTop-70);
    header.classList.toggle('on-light',Boolean(light));
    const probe=y+Math.min(innerHeight*.35,350);
    const current=project?'work':contact&&probe>=contact.offsetTop?'contact':about&&probe>=about.offsetTop?'about':'work';
    header.querySelectorAll('.nav-dock a').forEach(link=>{const active=link.hash===`#${current}`;link.classList.toggle('is-current',active);if(active)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');});
    document.querySelector('.reading-progress').style.transform=`scaleX(${y/Math.max(1,document.documentElement.scrollHeight-innerHeight)})`;
    const hero=main.querySelector('.hero');
    if(hero&&!motion.matches&&y<innerHeight*1.6){hero.style.setProperty('--hero-exit',Math.min(1,y/innerHeight));hero.querySelector('.hero-collage').style.setProperty('--scroll',`${y*.19}px`);}
  }
  addEventListener('scroll',()=>{if(!scrollFrame)scrollFrame=requestAnimationFrame(updateScroll);},{passive:true});
  addEventListener('resize',updateScroll);
  renderRoute();
}
