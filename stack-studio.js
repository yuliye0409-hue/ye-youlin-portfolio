import {portfolio as site} from './portfolio.config.js';
import {Header,Footer,PrintDocument} from './portfolio.components.js';
import {AboutStudio,mountAboutStudio} from './about-studio.js';
import {ContactStudio,mountContactStudio} from './contact-studio.js';
import {StackProjectPage} from './stack-components.js';
import {RibbonExperience} from './ribbon-components.js';
import {mountCardStack} from './card-stack.js';

if(new URLSearchParams(location.search).get('export')==='pdf'){
  document.documentElement.classList.add('pdf-export');
  document.querySelector('#main').innerHTML=PrintDocument(site);
  document.title=`${site.brandName} · 精选作品集 ${site.edition}`;
  window.portfolioReady=true;
}else{
  // Normalize legacy preview anchors before inserting #work into the DOM, so
  // the browser cannot queue a fragment jump ahead of the Hero's first frame.
  history.scrollRestoration='manual';
  if(['#work','#about','#about-impact','#contact'].includes(location.hash))history.replaceState(history.state,'',location.pathname+location.search);
  if(!location.hash||location.hash==='#home')scrollTo({top:0,behavior:'instant'});
  const main=document.querySelector('#main'),header=document.querySelector('#header'),footer=document.querySelector('#footer');
  header.innerHTML=Header(site);footer.innerHTML=Footer(site);
  main.innerHTML=`<div id="home-view">${RibbonExperience(site)}<div id="about-phase" hidden inert>${AboutStudio(site)}${ContactStudio(site)}</div></div><div id="project-view" hidden></div>`;
  const home=main.querySelector('#home-view'),projectView=main.querySelector('#project-view'),shell=main.querySelector('[data-stack-shell]'),aboutPhase=home.querySelector('#about-phase'),continueButton=shell.querySelector('[data-enter-about]');
  const motion=matchMedia('(prefers-reduced-motion: reduce)'),lightbox=document.querySelector('#image-dialog'),toast=document.querySelector('.toast');
  const menuButton=document.querySelector('.menu-toggle'),menu=document.querySelector('#mobile-menu');
  const aboutMotion=mountAboutStudio(home.querySelector('#about'));
  const contactMotion=mountContactStudio(home.querySelector('#contact'));
  let stack=null,stackMount=null,activeProject=null,preparedProject=null,homeY=0,imageIndex=0,imageOpener=null,toastTimer,scrollFrame=0,routeSerial=0,scrollTween=null,aboutUnlocked=false,attentionTimer,copyTimer;
  // Only the Continue button opens this gate. Overflow locking is secondary:
  // while closed, there is no following phase in the document's scroll range.
  function setAboutUnlocked(value){
    aboutUnlocked=value;aboutPhase.hidden=!value;aboutPhase.inert=!value;footer.hidden=!value;
    continueButton.setAttribute('aria-expanded',String(value));document.documentElement.dataset.aboutUnlocked=String(value);
  }
  setAboutUnlocked(false);
  function pointToContinue(){
    announce('点击下方“继续了解”，进入关于我。');continueButton.classList.add('gate-attention');
    clearTimeout(attentionTimer);attentionTimer=setTimeout(()=>continueButton.classList.remove('gate-attention'),1600);
  }
  function announce(message){toast.textContent=message;toast.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('visible'),2600);}
  function closeMenu(){menu.hidden=true;menuButton.setAttribute('aria-expanded','false');}
  menuButton.addEventListener('click',()=>{menu.hidden=!menu.hidden;menuButton.setAttribute('aria-expanded',String(!menu.hidden));});
  async function ensureStack(){
    if(stack)return stack;
    if(!stackMount)stackMount=mountCardStack(shell,site,{onPrepare:prepareProject,onOpen:async id=>{history.pushState({studioRoute:true},'',`#work/${id}`);await showProject(id,true);},reducedMotion:motion.matches}).then(value=>{stack=value;window.stackDebug=()=>stack?.inspect();return value;});
    return stackMount;
  }
  function prepareProject(id){
    const project=site.projects.find(p=>p.id===id);if(!project||preparedProject===id)return;
    projectView.innerHTML=StackProjectPage(site,project);preparedProject=id;
    // Eager destination images decode while the clicked card is still flying.
    projectView.querySelectorAll('img[loading="eager"]').forEach(img=>{void img.decode().catch(()=>{});});
  }
  function workY(){return home.querySelector('#work').getBoundingClientRect().top+scrollY;}
  function jump(hash,restore=false,smooth=false){
    scrollTween?.kill();scrollTween=null;stack?.releasePin?.();
    if(restore){scrollTo({top:homeY||workY(),behavior:'instant'});return;}
    const element=hash&&hash!=='#home'?document.getElementById(hash.slice(1)):null;
    const y=element?element.getBoundingClientRect().top+scrollY-(hash==='#about-impact'?110:0):0;
    const focusAbout=()=>{if(hash==='#about')home.querySelector('#about-title').focus({preventScroll:true});if(hash==='#contact'){const title=home.querySelector('#contact-title');title.setAttribute('tabindex','-1');title.focus({preventScroll:true});}contactMotion.refresh();};
    if(smooth&&!motion.matches&&window.gsap){const state={y:scrollY},duration=hash==='#about'||hash==='#about-impact'||hash==='#contact'?1.15:2.1;scrollTween=window.gsap.to(state,{y,duration,ease:'power2.inOut',onUpdate:()=>scrollTo({top:state.y,behavior:'instant'}),onComplete:()=>{scrollTween=null;stack?.syncScroll?.();aboutMotion.refresh();focusAbout();}});}
    else{scrollTo({top:y,behavior:'instant'});focusAbout();}
  }
  async function showProject(id,fromStack=false){
    const project=site.projects.find(p=>p.id===id);if(!project)return showHome('#work');
    const serial=++routeSerial;if(lightbox.open)lightbox.close();closeMenu();setAboutUnlocked(false);
    if(!activeProject)homeY=scrollY;
    activeProject=project;prepareProject(id);projectView.hidden=false;
    projectView.classList.toggle('project-arriving',!motion.matches);document.documentElement.dataset.view='project';
    if(fromStack&&!motion.matches){
      projectView.classList.add('project-flight-overlay');
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
      projectView.classList.add('project-visible');
      await new Promise(resolve=>setTimeout(resolve,500));
      if(serial!==routeSerial)return;
      stack?.releasePin?.();home.hidden=true;projectView.classList.remove('project-flight-overlay');
    }else{stack?.releasePin?.();home.hidden=true;projectView.classList.add('project-visible');}
    scrollTo({top:0,behavior:'instant'});document.title=`${project.title.split(' · ')[0]} — ${site.brandName}`;updateScroll();
    projectView.querySelector('#project-title').setAttribute('tabindex','-1');projectView.querySelector('#project-title').focus({preventScroll:true});
    window.portfolioReady=true;
  }
  async function showHome(hash=location.hash,restore=false,smooth=false){
    ++routeSerial;if(lightbox.open)lightbox.close();const fromProject=Boolean(activeProject);activeProject=null;
    if(!aboutUnlocked&&['#about','#about-impact','#contact'].includes(hash)){hash='#work';history.replaceState({studioRoute:true},'',hash);}
    if(!hash||hash==='#home'||hash==='#work')setAboutUnlocked(false);
    home.hidden=false;projectView.hidden=true;projectView.innerHTML='';preparedProject=null;projectView.className='';document.documentElement.dataset.view='home';
    document.title=`${site.brandName} — 视觉设计与产品表达`;closeMenu();
    jump(hash,restore,smooth);const current=await ensureStack();if(current?.inspect().renderer==='static'&&!smooth)jump(hash,restore);if(!smooth)current?.syncScroll?.();if(fromProject||current?.inspect().opened)current?.close();updateScroll();window.portfolioReady=true;
  }
  async function navigate(hash){
    closeMenu();
    if(!aboutUnlocked&&['#about','#about-impact','#contact'].includes(hash)){hash='#work';pointToContinue();}
    const match=hash.match(/^#work\/([a-z0-9-]+)$/);
    if(match){
      if(!activeProject){homeY=scrollY;scrollTo({top:workY(),behavior:'instant'});const current=await ensureStack();await current?.open(match[1]);}
      else{history.pushState({studioRoute:true},'',hash);await showProject(match[1]);}
    }else{const smooth=!activeProject&&(hash==='#work'&&scrollY<workY()-innerHeight*.5||hash==='#home'&&scrollY>innerHeight*.5||hash==='#about'||hash==='#about-impact'||hash==='#contact');history.pushState({studioRoute:true},'',hash);await showHome(hash,hash==='#work'&&Boolean(activeProject),smooth);}
  }
  function showImage(){
    const art=activeProject.images[imageIndex],holder=lightbox.querySelector('.lightbox-media'),img=holder.querySelector('img');
    holder.classList.remove('zoomed');holder.scrollTop=holder.scrollLeft=0;
    img.src=art.src;img.alt=`${activeProject.title.split(' · ')[0]}，作品 ${imageIndex+1}`;img.width=art.width;img.height=art.height;
    lightbox.querySelector('.image-count').textContent=`${String(imageIndex+1).padStart(2,'0')} / ${String(activeProject.images.length).padStart(2,'0')}`;
    lightbox.querySelector('.image-original').href=art.src;lightbox.querySelector('.zoom-image').textContent='原尺寸放大 ＋';
  }
  const stepImage=direction=>{if(activeProject){imageIndex=(imageIndex+direction+activeProject.images.length)%activeProject.images.length;showImage();}};
  lightbox.querySelector('.close-image').addEventListener('click',()=>lightbox.close());
  lightbox.querySelector('.previous-image').addEventListener('click',()=>stepImage(-1));lightbox.querySelector('.next-image').addEventListener('click',()=>stepImage(1));
  lightbox.querySelector('.zoom-image').addEventListener('click',()=>{const zoomed=lightbox.querySelector('.lightbox-media').classList.toggle('zoomed');lightbox.querySelector('.zoom-image').textContent=zoomed?'适应屏幕 −':'原尺寸放大 ＋';});
  lightbox.addEventListener('keydown',event=>{if(event.key==='ArrowRight'){event.stopPropagation();stepImage(1);}if(event.key==='ArrowLeft'){event.stopPropagation();stepImage(-1);}});
  lightbox.addEventListener('close',()=>{document.documentElement.classList.remove('modal-open');imageOpener?.focus({preventScroll:true});});
  document.addEventListener('click',async event=>{
    if(event.defaultPrevented)return;
    if(event.target.closest('[data-enter-about]')){event.preventDefault();setAboutUnlocked(true);await navigate('#about');return;}
    const link=event.target.closest('.project-open');if(link){event.preventDefault();await navigate(link.getAttribute('href'));return;}
    const zoom=event.target.closest('[data-image]');if(zoom&&activeProject){imageIndex=Number(zoom.dataset.image);imageOpener=zoom;showImage();lightbox.showModal();document.documentElement.classList.add('modal-open');return;}
    const hashLink=event.target.closest('a[href^="#"]');if(hashLink&&!hashLink.closest('.stack-index')){event.preventDefault();await navigate(hashLink.getAttribute('href'));return;}
    const copyButton=event.target.closest('[data-copy-email]');
    if(copyButton){try{
      await navigator.clipboard.writeText(site.email);announce('邮箱已复制');clearTimeout(copyTimer);
      const label=copyButton.querySelector('[data-copy-label]'),icon=copyButton.querySelector('.contact-copy-icon');
      if(label){label.textContent='已复制';icon.textContent='✓';copyButton.dataset.copyState='copied';copyTimer=setTimeout(()=>{label.textContent='复制邮箱';icon.textContent='↗';copyButton.dataset.copyState='idle';},2400);}
    }catch{announce(`请复制邮箱：${site.email}`);}}
    if(!event.target.closest('.menu-toggle,#mobile-menu'))closeMenu();
  });
  document.addEventListener('keydown',event=>{if(event.key==='Escape'){closeMenu();if(!lightbox.open&&activeProject&&!event.defaultPrevented){event.preventDefault();void navigate('#work');}}});
  async function readRoute(){const match=location.hash.match(/^#work\/([a-z0-9-]+)$/);if(match){if(activeProject?.id!==match[1])await showProject(match[1]);}else await showHome(location.hash,Boolean(activeProject)&&location.hash==='#work');}
  addEventListener('popstate',readRoute);
  addEventListener('hashchange',()=>{const match=location.hash.match(/^#work\/([a-z0-9-]+)$/);if(!aboutUnlocked&&['#about','#about-impact','#contact'].includes(location.hash)||(match?.[1]||null)!==(activeProject?.id||null))void readRoute();});
  motion.addEventListener('change',async()=>{scrollTween?.kill();stack?.dispose();stack=null;stackMount=null;shell.closest('.ribbon-experience').classList.remove('ribbon-static');shell.classList.remove('stack-static','stack-ready');shell.querySelector('.stack-fallback').hidden=true;shell.querySelector('.stack-canvas').hidden=false;await ensureStack();});
  for(const event of ['wheel','touchstart','pointerdown'])addEventListener(event,()=>{if(scrollTween){scrollTween.kill();scrollTween=null;stack?.resumePin?.();}},{passive:true});
  function updateScroll(){
    scrollFrame=0;const y=scrollY,work=home.querySelector('#work'),contact=home.querySelector('#contact'),about=home.querySelector('#about');
    if(aboutUnlocked&&!scrollTween&&!activeProject&&document.documentElement.classList.contains('exhibition-pinned')){
      setAboutUnlocked(false);history.replaceState({studioRoute:true},'','#work');
    }
    const contactTop=aboutUnlocked?contact.getBoundingClientRect().top+y:Infinity,aboutTop=aboutUnlocked?about.getBoundingClientRect().top+y:Infinity;
    header.classList.toggle('scrolled',y>40||Boolean(activeProject));header.classList.add('on-light');
    const probe=y+Math.min(innerHeight*.35,350),current=activeProject?'work':probe>=contactTop?'contact':probe>=aboutTop?'about':'work';
    header.querySelectorAll('.nav-dock a').forEach(a=>{const active=a.hash===`#${current}`;a.classList.toggle('is-current',active);if(active)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');});
    document.querySelector('.reading-progress').style.transform=`scaleX(${y/Math.max(1,document.documentElement.scrollHeight-innerHeight)})`;
  }
  addEventListener('scroll',()=>{if(!scrollFrame)scrollFrame=requestAnimationFrame(updateScroll);},{passive:true});addEventListener('resize',updateScroll);
  await readRoute();
}
