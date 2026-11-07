import {clamp,mix,span,smooth,railPoint,trackProgress,flightProgress,headlinePose,INITIAL_HEAD,RIBBON_END} from './ribbon-math.js';

// One canvas and the same artwork meshes move from the fixed ribbon rail into
// the exhibition. Blending in projected space prevents a camera-switch jump.
export function createRibbonBridge(root){
  const track=root.closest('.ribbon-experience');if(!track)return null;
  const THREE=window.THREE,copy=track.querySelector('.ribbon-copy'),controls=track.querySelector('.ribbon-controls');
  const first=copy.querySelector('.ribbon-first-frame'),line1=copy.querySelector('.ribbon-line-one'),line2=copy.querySelector('.ribbon-line-two');
  const caption=copy.querySelector('.ribbon-caption'),bottom=controls.querySelector('.ribbon-bottom'),projectLink=controls.querySelector('.ribbon-project-link');
  const heroCamera=new THREE.PerspectiveCamera(35,1,.1,1000);
  const points=[];for(let i=0;i<=160;i++){const p=railPoint(i/160);points.push(new THREE.Vector3(p.x,p.y,p.z));}
  const path=new THREE.CatmullRomCurve3(points,false,'centripetal');path.arcLengthDivisions=1500;
  const length=path.getLength(),SAMPLES=1200,pathP=[],pathT=[];
  for(let i=0;i<=SAMPLES;i++){pathP.push(path.getPointAt(i/SAMPLES));pathT.push(path.getTangentAt(i/SAMPLES));}
  const op=new THREE.Vector3(),ot=new THREE.Vector3(),up=new THREE.Vector3(),Y=new THREE.Vector3(0,1,0),rail=new THREE.Vector3(),dest=new THREE.Vector3();
  const matrix=new THREE.Matrix4(),rotation=new THREE.Quaternion(),axis=new THREE.Vector3(0,1,0),one=new THREE.Vector3(1,1,1),position=new THREE.Vector3();
  const NW=28,NH=3,W=2.1,H=1.32;
  let p=0,target=0,disposed=false,top=0,height=1,viewport=1,aspect=1,latestTimestamp=0;
  let pinned=false,allowPin=true,lastScroll=scrollY,painted=-1,drawn=-1,drawnCount=-1;
  const end=()=>top+height-viewport;
  function setPin(value){pinned=value;document.documentElement.classList.toggle('exhibition-pinned',value);}
  function releasePin(){allowPin=false;setPin(false);}
  function resumePin(){allowPin=true;lastScroll=scrollY;read();}
  function measure(){
    if(!track.offsetHeight||!root.clientHeight)return;
    top=track.getBoundingClientRect().top+scrollY;height=track.offsetHeight;viewport=root.clientHeight;aspect=root.clientWidth/root.clientHeight;
    heroCamera.aspect=aspect;heroCamera.fov=aspect<16/9?Math.atan(.561/aspect)*360/Math.PI:35;heroCamera.updateProjectionMatrix();heroCamera.updateMatrixWorld();drawn=-1;
    if(pinned&&allowPin){lastScroll=end();scrollTo({top:lastScroll,behavior:'instant'});}read();
  }
  function read(immediate=false){
    if(!track.offsetHeight){setPin(false);return;}
    let y=scrollY;const boundary=end();
    // Catch native wheel/touch momentum crossing the final sticky pixel. A
    // canvas-only wheel handler cannot prevent this overshoot or chrome scroll.
    if(allowPin&&((lastScroll<boundary-1&&y>=boundary-1)||(lastScroll>boundary+1&&y<=boundary+1&&y>=top)||(Math.abs(y-boundary)<=1))){
      setPin(true);if(Math.abs(y-boundary)>.1)scrollTo({top:boundary,behavior:'instant'});y=boundary;
    }else if(pinned&&Math.abs(y-boundary)>1)setPin(false);
    lastScroll=y;target=trackProgress(y,top,height,viewport);if(immediate){p=target;paintCopy();}
  }
  function paintCopy(){
    if(p===painted)return;painted=p;
    const text=headlinePose(p),alpha=1-smooth(span(p,.61,.79)),ui=smooth(span(p,.83,.995));
    line1.style.transform=`translate3d(${text.run}vw,${text.rise*34}svh,0)`;line2.style.transform=`translate3d(${-text.run}vw,${text.rise*34}svh,0)`;
    caption.style.opacity=String(text.caption);caption.style.transform=`translate(-50%,calc(-50% + ${text.rise*34}svh))`;
    first.style.opacity=String(text.intro);projectLink.style.opacity=String(text.intro);bottom.style.opacity=String(1-smooth(span(p,.56,.76)));
    copy.style.opacity=String(alpha);controls.style.opacity=String(alpha);root.style.setProperty('--stack-reveal',String(ui));
    const live=p>.995&&target>.999;root.classList.toggle('stack-live',live);root.classList.toggle('ribbon-in-motion',!live);
    root.dataset.experienceProgress=p.toFixed(4);copy.inert=p>.78;controls.inert=p>.78;copy.setAttribute('aria-hidden',String(p>.78));controls.setAttribute('aria-hidden',String(p>.78));
  }
  function at(s){const f=clamp(s/length)*SAMPLES,i=Math.min(SAMPLES-1,Math.floor(f)),k=f-i;op.lerpVectors(pathP[i],pathP[i+1],k);ot.lerpVectors(pathT[i],pathT[i+1],k).normalize();}
  function update(time){
    if(disposed)return;const delta=Math.min(50,time-(latestTimestamp||time-16.67));latestTimestamp=time;
    p+=(target-p)*(1-Math.pow(.91,delta/16.67));if(Math.abs(target-p)<.000025)p=target;paintCopy();
  }
  function draw(cards,stackCamera,poses,world){
    if(p>=.99995)return false;
    const unchanged=p===drawn&&cards.length===drawnCount;drawn=p;drawnCount=cards.length;
    world.scale.setScalar(1);stackCamera.updateMatrixWorld(true);
    const count=Math.min(9,cards.length),head=mix(INITIAL_HEAD,length+count*2.13,span(p,0,RIBBON_END));
    for(let n=0;n<cards.length;n++){
      const card=cards[n],pose=poses[n];
      if(n>=count){
        const k=smooth(span(p,.70,.99));card.mesh.material.uniforms.uOpacity.value=card.visK*k;
        card.mesh.material.uniforms.uRibbon.value=0;card.mesh.material.uniforms.uMeshAspect.value=.75;
        if(!card._stackFlat){setFlat(card);card._stackFlat=true;}
        card.holder.position.set(pose.x,pose.y,pose.z);card.holder.rotation.set(0,-Math.PI/6,0);card.holder.visible=k>.001&&Math.abs(pose.z)<12.5;continue;
      }
      const s=head-n*2.13,{q}=flightProgress(p,n,length,count),onRail=s<length-W;
      if(s<-W){card.holder.visible=false;continue;}
      card.holder.visible=true;card._stackFlat=false;card.holder.position.set(0,0,0);card.holder.rotation.set(0,0,0);card.inner.position.set(0,0,0);card.mesh.scale.set(1,1,1);
      position.set(pose.x,pose.y,pose.z);rotation.setFromAxisAngle(axis,-Math.PI/6);matrix.compose(position,rotation,one);
      const geometry=card.mesh.geometry,vertices=geometry.attributes.position,centre=onRail?s:length-W;
      if(!unchanged)for(let ix=0;ix<=NW;ix++){
        const u=ix/NW-.5;at(centre+u*W);up.copy(Y).addScaledVector(ot,-Y.dot(ot)).normalize();
        for(let iy=0;iy<=NH;iy++){
          const i=iy*(NW+1)+ix,v=.5-iy/NH;rail.copy(op).addScaledVector(up,v*H).project(heroCamera);
          if(!onRail){dest.set(u*1.25,v*(5/3),0).applyMatrix4(matrix).project(stackCamera);rail.lerp(dest,q);}
          rail.unproject(stackCamera);vertices.setXYZ(i,rail.x,rail.y,rail.z);
        }
      }
      if(!unchanged)vertices.needsUpdate=true;card.mesh.material.uniforms.uOpacity.value=card.visK;
      card.mesh.material.uniforms.uMeshAspect.value=mix(W/H,.75,onRail?0:q);card.mesh.material.uniforms.uRibbon.value=onRail?1:1-q;
    }
    world.updateMatrixWorld(true);return true;
  }
  function setFlat(card){
    const vertices=card.mesh.geometry.attributes.position;
    for(let y=0;y<=NH;y++)for(let x=0;x<=NW;x++)vertices.setXYZ(y*(NW+1)+x,(x/NW-.5)*1.25,(.5-y/NH)*(5/3),0);
    vertices.needsUpdate=true;card.mesh.material.uniforms.uMeshAspect.value=.75;card.mesh.material.uniforms.uRibbon.value=0;
  }
  const onScroll=()=>read();
  const resizeObserver=new ResizeObserver(measure);resizeObserver.observe(track);resizeObserver.observe(root);addEventListener('scroll',onScroll,{passive:true});
  measure();read(true);
  return {update,draw,setFlat,releasePin,resumePin,canInteract:()=>p>.995&&target>.999,atEnd:()=>target>.999,syncScroll(){allowPin=true;lastScroll=scrollY;measure();read(true);},inspect:()=>({progress:p,target,pinned,pathLength:length,phase:p<.66?'ribbon':p<.995?'handoff':'stack'}),dispose(){disposed=true;setPin(false);resizeObserver.disconnect();removeEventListener('scroll',onScroll);}};
}
