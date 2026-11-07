import {wrap,clamp,loopPosition,fitArtwork} from './stack-math.js';
import {createRibbonBridge} from './ribbon-hero.js';
import {createCardCarousel} from './card-carousel.js';

// The supplied Opaque Stack motion is adapted to real Yuli Studio projects.
// Preview cards use an undistorted crop; project pages always use original ratios.
export async function mountCardStack(root,site,{onOpen,onPrepare,reducedMotion=false}={}){
  const canvas=root.querySelector('.stack-canvas'),loader=root.querySelector('.stack-loader');
  const label=root.querySelector('.stack-cursor'),preview=root.querySelector('.stack-preview img');
  const index=root.querySelector('.stack-index');
  let disposed=false,ready=false,opened=null,hovered=null,frame=0,inView=false,mode='overview',filter=site.filters[0],transition=0,pendingOpenResolve=null;
  const THREE=window.THREE,gsap=window.gsap;
  const fallback=()=>{document.documentElement.classList.remove('exhibition-pinned');root.classList.add('stack-static');const track=root.closest('.ribbon-experience');track?.classList.add('ribbon-static');track?.querySelectorAll('.ribbon-copy,.ribbon-controls').forEach(el=>{el.inert=false;el.setAttribute('aria-hidden','false');});root.querySelector('.stack-fallback').hidden=false;loader.hidden=true;canvas.hidden=true;window.stackReady=true;};
  if(reducedMotion||!THREE||!gsap){fallback();return {open:async id=>onOpen?.(id),close(){},dispose(){disposed=true;},inspect:()=>({renderer:'static',ready:true})};}
  let renderer;
  const hasRibbon=Boolean(root.closest('.ribbon-experience'));
  try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:hasRibbon,powerPreference:'high-performance'});}catch{fallback();return {open:async id=>onOpen?.(id),close(){},dispose(){disposed=true;},inspect:()=>({renderer:'static',ready:true})};}
  renderer.setClearColor('#fafafa',hasRibbon?0:1);renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  const scene=new THREE.Scene(),world=new THREE.Group();scene.add(world);
  const camera=new THREE.PerspectiveCamera(5,1,.1,1000);
  const raycaster=new THREE.Raycaster(),mouse=new THREE.Vector2(-10,-10),point=new THREE.Vector3();
  const hitGeometry=new THREE.BoxGeometry(1.25,5/3,.0175);
  const hitMaterial=new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false});
  const cards=[],textures=new Set(),materials=[],listeners=[],details=new Map();let carousel=null;
  const ribbon=createRibbonBridge(root);
  const scroll={current:ribbon?100:0,previous:ribbon?100:0},intro={x:ribbon?0:-20,opacity:ribbon?1:0};
  const pointer={down:false,dragging:false,startX:0,startY:0,lastX:0,lastY:0,velocity:0};
  let aspect=1,drag=0,easedDrag=0,lastTime=0,loadTarget=0,loadCurrent=0,renderNeeded=true;
  const listen=(el,type,fn,opts)=>{el.addEventListener(type,fn,opts);listeners.push(()=>el.removeEventListener(type,fn,opts));};
  function placeCamera(){camera.position.set(0,100/7.5,aspect<1?55:35);camera.lookAt(0,0,0);}
  function resize(){
    if(disposed)return;const rect=root.getBoundingClientRect();if(!rect.width||!rect.height)return;
    aspect=rect.width/rect.height;renderer.setSize(rect.width,rect.height,false);camera.aspect=aspect;camera.updateProjectionMatrix();
    if(!opened)placeCamera();else if(opened.focused)fitOpened(opened);renderNeeded=true;
  }
  resize();
  const observer=new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;renderNeeded=true;if(!inView)clearHover();},{rootMargin:'120px'});observer.observe(root);
  const resizer=new ResizeObserver(resize);resizer.observe(root);
  function material(sharp,blur){return new THREE.ShaderMaterial({
    uniforms:{uImageTexture:{value:sharp},uBlurTexture:{value:blur},uNextImageTexture:{value:sharp},uNextBlurTexture:{value:blur},uNextImageAspect:{value:sharp.image.width/sharp.image.height},uImageMix:{value:0},uDetailTexture:{value:sharp},uDetailAspect:{value:sharp.image.width/sharp.image.height},uFocus:{value:0},uOpacity:{value:1},uMeshAspect:{value:.75},uImageAspect:{value:sharp.image.width/sharp.image.height},uRibbon:{value:0}},
    vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader:`precision highp float; varying vec2 vUv;
      uniform sampler2D uImageTexture,uBlurTexture,uNextImageTexture,uNextBlurTexture,uDetailTexture;
      uniform float uNextImageAspect,uImageMix,uDetailAspect,uFocus,uOpacity,uMeshAspect,uImageAspect,uRibbon;
      vec2 fitUV(vec2 uv,float aspect){vec2 ratio=vec2(min(uMeshAspect/aspect,1.),min(aspect/uMeshAspect,1.));return uv*ratio+(1.-ratio)*.5;}
      void main(){
        vec2 uv=vUv;if(!gl_FrontFacing)uv.x=1.-uv.x;
        float edge=min(min(vUv.x,1.-vUv.x),min(vUv.y,1.-vUv.y)),centre=smoothstep(0.,mix(.15,.025,uRibbon),edge);
        vec2 a=fitUV(uv,uImageAspect);vec4 sharp=texture2D(uImageTexture,a),blur=texture2D(uBlurTexture,a);blur.a*=.75;
        vec4 colour=mix(blur,sharp,centre);
        if(uImageMix>0.){vec2 b=fitUV(uv,uNextImageAspect);vec4 nextBlur=texture2D(uNextBlurTexture,b);nextBlur.a*=.75;vec4 next=mix(nextBlur,texture2D(uNextImageTexture,b),centre);float blend=uImageMix*uImageMix*(3.-2.*uImageMix);colour=mix(colour,next,blend);}
        colour.a*=smoothstep(0.,mix(.015,.003,uRibbon),edge);
        if(uFocus>0.)colour=mix(colour,texture2D(uDetailTexture,fitUV(uv,uDetailAspect)),uFocus);
        gl_FragColor=colour*uOpacity;
      }`,
    transparent:true,side:THREE.DoubleSide,depthWrite:true
  });}
  async function loadPreview(art,priority='low'){
    const source=new Image();source.decoding='async';source.fetchPriority=priority;source.src=`assets/stage/${art.id}.webp`;await source.decode();
    if(disposed)return null;
    const blur=document.createElement('canvas');blur.width=Math.max(4,Math.round(32*source.naturalWidth/Math.max(source.naturalWidth,source.naturalHeight)));blur.height=Math.max(4,Math.round(32*source.naturalHeight/Math.max(source.naturalWidth,source.naturalHeight)));blur.getContext('2d').drawImage(source,0,0,blur.width,blur.height);
    const a=new THREE.Texture(source),b=new THREE.CanvasTexture(blur);a.needsUpdate=true;a.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());b.minFilter=b.magFilter=THREE.LinearFilter;
    // Upload each pair before the scene is revealed, instead of stalling its
    // first moving frame with nine image decodes and GPU uploads together.
    renderer.initTexture(a);renderer.initTexture(b);
    textures.add(a);textures.add(b);return {sharp:a,blur:b};
  }
  async function makeTexture(project){
    const pair=await loadPreview(project.cover,'high');loadTarget+=100/site.projects.length;return pair?{...pair,project}:null;
  }
  function releasePreview(pair){for(const texture of [pair.sharp,pair.blur]){textures.delete(texture);texture.dispose();}}
  function selectedArt(card){return card.openedArt||carousel?.selectedArt(card)||card.project.cover;}
  function prepareDetail(card){
    const art=selectedArt(card),id=art.id;if(details.has(id))return details.get(id);
    const promise=(async()=>{
      const image=new Image();image.decoding='async';image.fetchPriority='high';image.src=art.src;await image.decode();if(disposed)return null;
      const scale=Math.min(1,4096/Math.max(image.naturalWidth,image.naturalHeight)),full=document.createElement('canvas');
      full.width=Math.round(image.naturalWidth*scale);full.height=Math.round(image.naturalHeight*scale);full.getContext('2d').drawImage(image,0,0,full.width,full.height);
      const texture=new THREE.CanvasTexture(full);texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());textures.add(texture);renderer.initTexture(texture);return {texture,aspect:image.naturalWidth/image.naturalHeight};
    })().catch(()=>null);details.set(id,promise);return promise;
  }
  function openedPose(card){
    const art=selectedArt(card),fit=fitArtwork(art.width,art.height,root.clientWidth,root.clientHeight),z=30;
    const viewHeight=2*z*Math.tan(camera.fov*Math.PI/360),unit=viewHeight/root.clientHeight;
    return {x:fit.width*unit/1.25,y:fit.height*unit/(5/3),centreY:(root.clientHeight/2-fit.y)*unit,z};
  }
  function fitOpened(card){const fit=openedPose(card),art=selectedArt(card);camera.position.set(0,0,fit.z);camera.lookAt(0,0,0);card.holder.position.set(0,fit.centreY,0);card.mesh.scale.set(fit.x,fit.y,1);card.mesh.material.uniforms.uMeshAspect.value=art.width/art.height;}
  function openedBounds(){
    if(!opened)return null;world.updateMatrixWorld(true);camera.updateMatrixWorld(true);
    const bounds={left:Infinity,top:Infinity,right:-Infinity,bottom:-Infinity};
    for(const [x,y] of [[-.625,-5/6],[.625,-5/6],[.625,5/6],[-.625,5/6]]){
      point.set(x,y,0).applyMatrix4(opened.mesh.matrixWorld).project(camera);const px=(point.x+1)/2*root.clientWidth,py=(1-point.y)/2*root.clientHeight;
      bounds.left=Math.min(bounds.left,px);bounds.top=Math.min(bounds.top,py);bounds.right=Math.max(bounds.right,px);bounds.bottom=Math.max(bounds.bottom,py);
    }
    return bounds;
  }
  function clearHover(){
    if(hovered)gsap.to(hovered.inner.position,{x:0,y:0,duration:.5,ease:'expo.out'});
    hovered=null;root.classList.remove('stack-hover');label.classList.remove('visible');
  }
  function setHover(card){
    if(hovered===card)return;clearHover();if(!card)return;
    hovered=card;gsap.to(card.inner.position,{x:2/3,y:-.1,duration:.5,ease:'expo.out'});
    void prepareDetail(card);
    label.textContent=card.project.title.split(' · ')[0];label.classList.add('visible');root.classList.add('stack-hover');
    preview.src=selectedArt(card).thumbnail;
  }
  function pick(){
    if(!ready||opened||pointer.dragging||mode==='index'||mouse.x===-10||ribbon&&!ribbon.canInteract())return;
    raycaster.setFromCamera(mouse,camera);
    const hit=raycaster.intersectObjects(cards.filter(c=>c.holder.visible&&c.on).map(c=>c.hit),false)[0];
    setHover(hit?cards.find(c=>c.hit===hit.object):null);
  }
  function layout(delta){
    const factor=Math.min(3,delta/16.67);
    easedDrag+=(drag-easedDrag)*(1-Math.pow(.9,factor));scroll.previous+=(scroll.current-scroll.previous)*(1-Math.pow(.85,factor));
    if(!pointer.down&&Math.abs(pointer.velocity)>.001){drag+=pointer.velocity*factor;pointer.velocity*=Math.pow(.9,factor);}
    const offset=scroll.previous/25-easedDrag/100+intro.x;
    const active=cards.filter(c=>c.on),count=active.length,length=Math.max(count,24),step=length/Math.max(count,1);
    active.forEach((c,k)=>{c.order=k*step;});
    const poses=[];
    for(const c of cards){
      c.visK+=((c.on?1:0)-c.visK)*(1-Math.pow(.88,factor));c.mesh.material.uniforms.uOpacity.value=c.visK*intro.opacity;
      if(opened){if(opened!==c)c.holder.visible=false;continue;}
      const position=loopPosition(c.order,offset,count,aspect);
      const pose={x:position.x,y:-(1-c.visK)*1.2,z:position.z};poses.push(pose);
      c.holder.position.set(pose.x,pose.y,pose.z);c.holder.rotation.set(0,-Math.PI/6,0);
      c.holder.visible=c.visK>.02&&Math.abs(position.z)<12.5;
    }
    if(ribbon&&!opened){if(!ribbon.draw(cards,camera,poses,world))for(const c of cards)if(!c._stackFlat){ribbon.setFlat(c);c._stackFlat=true;}}
    world.updateMatrixWorld(true);
    if(ribbon)for(const c of cards){
      if(!c.holder.visible)continue;
      const vertices=c.mesh.geometry.attributes.position;
      if(c._stackFlat)point.set(0,0,0);
      else{point.set(0,0,0);for(const index of [0,28,87,115]){point.x+=vertices.getX(index)/4;point.y+=vertices.getY(index)/4;point.z+=vertices.getZ(index)/4;}}
      point.applyMatrix4(c.mesh.matrixWorld).applyMatrix4(camera.matrixWorldInverse);
      // Dynamic rail vertices and local stack vertices must share the same
      // transparent draw order at the handoff, including their softened edges.
      c.mesh.renderOrder=point.z;
    }
  }
  function render(time){
    if(disposed)return;frame=requestAnimationFrame(render);
    const delta=Math.min(50,time-(lastTime||time-16.67));lastTime=time;
    if(!ready){loadCurrent+=(loadTarget-loadCurrent)*.15;loader.querySelector('span').textContent=`${Math.round(loadCurrent)}%`;}
    if(!inView&&!renderNeeded)return;
    ribbon?.update(time);
    layout(delta);pick();carousel?.update(delta,{active:ready&&inView&&!document.hidden&&mode==='overview'&&(!ribbon||ribbon.canInteract()),paused:Boolean(opened)||pointer.down,hovered:hovered?.project.id});renderer.render(scene,camera);renderNeeded=false;
  }
  frame=requestAnimationFrame(render);
  function coordinates(event){const rect=canvas.getBoundingClientRect();mouse.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);label.style.transform=`translate3d(${event.clientX-rect.left+14}px,${event.clientY-rect.top+12}px,0)`;}
  listen(canvas,'pointermove',event=>{
    coordinates(event);if(!pointer.down)return;
    const distance=Math.hypot(event.clientX-pointer.startX,event.clientY-pointer.startY);
    if(distance>3&&!pointer.dragging){pointer.dragging=true;clearHover();root.classList.add('stack-dragging');gsap.to(world.scale,{x:.825,y:.825,z:.825,duration:.75,ease:'expo.out'});}
    if(pointer.dragging){const change=event.clientX-pointer.lastX-(event.clientY-pointer.lastY);drag+=change;pointer.velocity=clamp(-38,38,change);}
    pointer.lastX=event.clientX;pointer.lastY=event.clientY;
  });
  listen(canvas,'pointerdown',event=>{if(!ready||opened||event.button!==0||ribbon&&!ribbon.canInteract())return;coordinates(event);pick();pointer.down=true;pointer.dragging=false;pointer.startX=pointer.lastX=event.clientX;pointer.startY=pointer.lastY=event.clientY;pointer.velocity=0;canvas.setPointerCapture(event.pointerId);});
  function release(event,cancel=false){
    if(!pointer.down)return;const wasDragging=pointer.dragging;pointer.down=false;pointer.dragging=false;root.classList.remove('stack-dragging');
    gsap.to(world.scale,{x:1,y:1,z:1,duration:.75,ease:'expo.out'});if(canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId);
    if(!cancel&&!wasDragging&&hovered)void open(hovered.project.id,hovered);
    if(wasDragging){mouse.set(-10,-10);clearHover();}
  }
  listen(canvas,'pointerup',event=>release(event));listen(canvas,'pointercancel',event=>release(event,true));listen(canvas,'lostpointercapture',event=>release(event,true));
  listen(canvas,'pointerleave',()=>{if(!pointer.down){mouse.set(-10,-10);clearHover();}});
  listen(window,'wheel',event=>{
    if(!ready||opened||event.ctrlKey)return;
    if(!root.contains(event.target)&&!ribbon?.inspect().pinned)return;
    if(event.target.closest('.stack-index,input,textarea,select,dialog'))return;
    if(ribbon&&!ribbon.canInteract()){if(ribbon.atEnd())event.preventDefault();return;}event.preventDefault();const unit=event.deltaMode===1?16:event.deltaMode===2?root.clientHeight:1;
    scroll.current+=(event.deltaY+event.deltaX)*unit/20;pointer.velocity=0;mouse.set(-10,-10);clearHover();
  },{passive:false});
  listen(document,'keydown',event=>{
    if(!ready||opened||!inView||ribbon&&!ribbon.canInteract()||event.defaultPrevented||event.target.closest('input,textarea,select,dialog'))return;
    if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();scroll.current+=event.key==='ArrowRight'?12:-12;mouse.set(-10,-10);clearHover();}
  });
  listen(root,'click',event=>{
    const filterButton=event.target.closest('[data-stack-filter]');
    if(filterButton){filter=filterButton.dataset.stackFilter;clearHover();cards.forEach(c=>{c.on=filter===site.filters[0]||c.project.category===filter;});root.querySelectorAll('[data-stack-filter]').forEach(b=>{const active=b===filterButton;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});root.querySelectorAll('[data-stack-project]').forEach(a=>{a.hidden=filter!==site.filters[0]&&site.projects.find(p=>p.id===a.dataset.stackProject).category!==filter;});return;}
    const modeButton=event.target.closest('[data-stack-mode]');
    if(modeButton){mode=modeButton.dataset.stackMode;root.classList.toggle('stack-index-mode',mode==='index');index.hidden=mode!=='index';root.querySelectorAll('[data-stack-mode]').forEach(b=>{const active=b===modeButton;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});clearHover();}
    const link=event.target.closest('[data-stack-project]');if(link){event.preventDefault();void open(link.dataset.stackProject);}
  });
  root.querySelectorAll('[data-stack-project]').forEach(link=>listen(link,'pointerenter',()=>{
    if(!ready||opened)return;const card=cards.find(c=>c.on&&c.project.id===link.dataset.stackProject);if(!card)return;
    const count=cards.filter(c=>c.on).length,length=Math.max(count,24),currentOffset=scroll.current/25-drag/100;
    const target=card.order+Math.round((currentOffset-card.order)/length)*length;
    scroll.current=(target+drag/100)*25;preview.src=card.project.cover.thumbnail;void prepareDetail(card);
  }));
  listen(canvas,'webglcontextlost',event=>{event.preventDefault();fallback();});
  async function open(id,preferred){
    if(disposed||opened||!ready)return;
    const ticket=++transition;
    const candidates=cards.filter(c=>c.project.id===id&&c.holder.visible);
    const card=preferred||candidates.sort((a,b)=>Math.abs(a.holder.position.x)-Math.abs(b.holder.position.x))[0]||cards.find(c=>c.project.id===id);
    if(!card)return;
    card.openedArt=carousel?.selectedArt(card)||card.project.cover;
    opened=card;clearHover();pointer.velocity=0;mouse.set(-10,-10);root.classList.add('stack-opening');
    cards.forEach(c=>{c.holder.visible=c===card;});gsap.killTweensOf(card.inner.position);card.inner.position.set(0,0,0);card.mesh.material.uniforms.uOpacity.value=1;
    card.holder.visible=true;
    // Motion starts on the click frame. Full-image decoding and the destination
    // page prepare in parallel, so a cold long image never freezes the card.
    onPrepare?.(id);
    const uniforms=card.mesh.material.uniforms,fit=openedPose(card),duration=.95,started=performance.now();
    await new Promise(resolve=>{
      pendingOpenResolve=resolve;let motionDone=false,detailDone=false;
      const finish=()=>{if(motionDone&&detailDone){card.focused=true;fitOpened(card);resolve();}};
      void prepareDetail(card).then(detail=>{
        if(disposed||ticket!==transition)return;
        if(!detail){detailDone=true;finish();return;}
        uniforms.uDetailTexture.value=detail.texture;uniforms.uDetailAspect.value=detail.aspect;
        const remaining=Math.max(.18,duration-(performance.now()-started)/1000);
        gsap.to(uniforms.uFocus,{value:1,duration:remaining,ease:'power2.inOut',onComplete:()=>{detailDone=true;finish();}});
      });
      gsap.to(card.holder.position,{x:0,y:fit.centreY,z:0,duration,ease:'power2.inOut'});
      gsap.to(card.holder.rotation,{y:0,duration,ease:'power2.inOut'});
      gsap.to(card.mesh.scale,{x:fit.x,y:fit.y,duration,ease:'power2.inOut',onUpdate:()=>{uniforms.uMeshAspect.value=.75*card.mesh.scale.x/card.mesh.scale.y;}});
      gsap.to(camera.position,{x:0,y:0,z:fit.z,duration,ease:'power2.inOut',onUpdate:()=>camera.lookAt(0,0,0),onComplete:()=>{motionDone=true;fitOpened(card);finish();}});
    });
    pendingOpenResolve=null;
    if(!disposed&&ticket===transition)await onOpen?.(id);
  }
  function close(){
    if(disposed)return;++transition;root.classList.remove('stack-opening');
    if(opened){gsap.killTweensOf(opened.holder.position);gsap.killTweensOf(opened.holder.rotation);gsap.killTweensOf(opened.mesh.scale);gsap.killTweensOf(opened.mesh.material.uniforms.uFocus);opened.focused=false;opened.openedArt=null;opened.mesh.scale.set(1,1,1);opened.mesh.material.uniforms.uMeshAspect.value=.75;opened.mesh.material.uniforms.uFocus.value=0;}
    gsap.killTweensOf(camera.position);pendingOpenResolve?.();pendingOpenResolve=null;opened=null;resize();placeCamera();intro.x=ribbon?0:-20;intro.opacity=0;
    gsap.to(intro,{x:0,opacity:1,duration:ribbon ? .45 : 2,ease:'power2.out'});renderNeeded=true;
  }
  const loading=await Promise.allSettled(site.projects.map(makeTexture));
  if(disposed){renderer.dispose();return null;}
  for(let repeat=0;repeat<3;repeat++)for(let i=0;i<loading.length;i++){
    const entry=loading[i];if(entry.status!=='fulfilled'||!entry.value)continue;
    const value=entry.value,mat=material(value.sharp,value.blur);materials.push(mat);
    const geometry=ribbon?new THREE.PlaneGeometry(1.25,5/3,28,3):new THREE.BoxGeometry(1.25,5/3,.0175);
    const mesh=new THREE.Mesh(geometry,mat),hit=new THREE.Mesh(hitGeometry,hitMaterial);mesh.frustumCulled=false;hit.scale.x=1.5;
    const inner=new THREE.Group(),holder=new THREE.Group();inner.add(mesh);holder.add(inner,hit);world.add(holder);
    const card={project:value.project,mesh,hit,inner,holder,order:cards.length,visK:1,on:true};hit.userData.cardIndex=cards.length;cards.push(card);
  }
  if(!cards.length){fallback();cancelAnimationFrame(frame);return {open:async id=>onOpen?.(id),close(){},dispose(){observer.disconnect();resizer.disconnect();listeners.forEach(fn=>fn());renderer.dispose();},inspect:()=>({renderer:'static',ready:true})};}
  carousel=createCardCarousel({cards,projects:site.projects,load:loadPreview,release:releasePreview});
  renderer.compile(scene,camera);layout(16.67);renderer.render(scene,camera);
  loader.querySelector('span').textContent='100%';ready=true;root.classList.add('stack-ready');gsap.to(loader,{opacity:0,duration:.35,onComplete:()=>{loader.hidden=true;}});
  if(!ribbon){gsap.to(intro,{x:0,opacity:1,duration:2,ease:'expo.out'});world.scale.setScalar(.825);gsap.to(world.scale,{x:1,y:1,z:1,duration:1,delay:.4,ease:'expo.out'});}
  window.stackReady=true;
  return {
    open,close,syncScroll:()=>ribbon?.syncScroll(),releasePin:()=>ribbon?.releasePin(),resumePin:()=>ribbon?.resumePin(),
    inspect(){return {renderer:'webgl',ready,filter,mode,offset:scroll.previous/25-easedDrag/100,experience:ribbon?.inspect()||null,carousel:carousel?.inspect()||[],gpuTextures:renderer.info.memory.textures,opened:opened?.project.id||null,openedImage:opened?.openedArt?.id||null,focused:Boolean(opened?.focused),openedBounds:openedBounds(),openedAspect:opened?.mesh.material.uniforms.uMeshAspect.value||null,hovered:hovered?.project.id||null,activeCards:cards.filter(c=>c.on).length,renderedCards:cards.filter(c=>c.holder.visible).length,cards:cards.filter(c=>c.holder.visible).map(c=>{c.inner.getWorldPosition(point);point.project(camera);return {id:c.project.id,image:c.currentArt?.id||c.project.cover.id,x:(point.x+1)/2*root.clientWidth,y:(1-point.y)/2*root.clientHeight};})};},
    dispose(){disposed=true;cancelAnimationFrame(frame);observer.disconnect();resizer.disconnect();ribbon?.dispose();carousel?.dispose();listeners.forEach(fn=>fn());cards.forEach(c=>{gsap.killTweensOf(c.inner.position);gsap.killTweensOf(c.holder.position);gsap.killTweensOf(c.holder.rotation);gsap.killTweensOf(c.mesh.scale);gsap.killTweensOf(c.mesh.material.uniforms.uFocus);c.mesh.geometry.dispose();});gsap.killTweensOf(intro);gsap.killTweensOf(world.scale);gsap.killTweensOf(camera.position);textures.forEach(t=>t.dispose());materials.forEach(m=>m.dispose());hitGeometry.dispose();hitMaterial.dispose();renderer.dispose();}
  };
}
