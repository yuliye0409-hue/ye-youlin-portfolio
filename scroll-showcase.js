import {clamp,sceneProgress,filmPosition,framePose} from './scroll.math.js';

export function mountScrollShowcase(root,reducedMotion){
  if(!root)return ()=>{};
  root.classList.toggle('motion-reduced',reducedMotion.matches);
  const elements=[...root.querySelectorAll('.scroll-project')];
  if(reducedMotion.matches){elements.forEach(el=>el.style.removeProperty('height'));return ()=>{};}
  let metrics=[],frame=0,resizeFrame=0,disposed=false;
  function measure(){
    if(disposed)return;
    const mobile=innerWidth<=700;
    for(const el of elements){
      const pin=el.querySelector('.story-pin'),stage=el.querySelector('[data-stage]');
      const frames=[...el.querySelectorAll('[data-frame]')],long=el.querySelector('.long-art'),screen=el.querySelector('[data-long-screen]');
      let travel=0;
      if(long){const width=long.getBoundingClientRect().width;travel=Math.max(0,width*Number(long.getAttribute('height'))/Number(long.getAttribute('width'))-screen.clientHeight);}
      const distance=long?Math.max(travel,innerHeight*1.2):Math.max(innerHeight*1.35,(frames.length-1)*innerHeight*(mobile?.62:.76));
      el.style.height=`${Math.ceil(pin.getBoundingClientRect().height+distance)}px`;
      stage.style.setProperty('--long-travel',`${travel}px`);
    }
    metrics=elements.map(el=>({el,top:el.getBoundingClientRect().top+scrollY,height:el.offsetHeight,pin:el.querySelector('.story-pin'),pinTop:parseFloat(getComputedStyle(el.querySelector('.story-pin')).top)||0,pinHeight:el.querySelector('.story-pin').offsetHeight,frames:[...el.querySelectorAll('[data-frame]')],long:el.querySelector('.long-art'),travel:parseFloat(el.querySelector('[data-stage]').style.getPropertyValue('--long-travel'))||0,counter:el.querySelector('[data-frame-counter]'),bar:el.querySelector('.story-progress'),fill:el.querySelector('.story-progress>span'),title:el.querySelector('[data-frame-title]'),lastIndex:-1}));
    update();
  }
  function update(){
    frame=0;if(disposed)return;
    for(const item of metrics){
      const {el,top,height,pinTop,pinHeight}=item;
      if(top>scrollY+innerHeight*1.5||top+height<scrollY-innerHeight*.5)continue;
      const progress=sceneProgress(scrollY,top,height,pinHeight,pinTop);
      item.fill.style.transform=`scaleX(${progress})`;
      item.bar.setAttribute('aria-valuenow',String(Math.round(progress*100)));
      el.dataset.progress=progress.toFixed(4);
      if(item.long){
        item.long.style.transform=`translate3d(0,${(-progress*item.travel).toFixed(2)}px,0)`;
        item.counter.textContent=`${String(Math.round(progress*100)).padStart(3,'0')}%`;
      }else{
        const position=filmPosition(progress,item.frames.length),active=Math.round(position);
        item.frames.forEach((f,i)=>{const pose=framePose(i,position);f.style.transform=`translate3d(0,${pose.y.toFixed(3)}%,0) scale(${pose.scale.toFixed(4)}) rotate(${pose.rotate.toFixed(3)}deg)`;f.style.opacity=String(pose.opacity);f.classList.toggle('is-current',i===active);});
        if(active!==item.lastIndex){item.counter.textContent=`${String(active+1).padStart(2,'0')} / ${String(item.frames.length).padStart(2,'0')}`;item.title.textContent=item.frames[active].querySelector('img').alt;item.lastIndex=active;}
      }
    }
  }
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(update);};
  const resize=()=>{cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(measure);};
  addEventListener('scroll',schedule,{passive:true});addEventListener('resize',resize);
  const observer=new ResizeObserver(resize);
  elements.forEach(el=>observer.observe(el.querySelector('[data-stage]')));
  measure();
  return ()=>{disposed=true;cancelAnimationFrame(frame);cancelAnimationFrame(resizeFrame);observer.disconnect();removeEventListener('scroll',schedule);removeEventListener('resize',resize);};
}
