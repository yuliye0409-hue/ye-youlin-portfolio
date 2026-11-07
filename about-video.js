// Source stays unset until the visible About module needs it; the exhibition
// must not download or play the movie while its explicit phase gate is closed.
export function mountAboutVideo(root){
  const video=root.querySelector('video'),playButton=root.querySelector('[data-video-play]'),soundButton=root.querySelector('[data-video-sound]'),expandButton=root.querySelector('[data-video-fullscreen]'),status=root.querySelector('[data-video-status]'),seek=root.querySelector('[data-video-seek]');
  const motion=matchMedia('(prefers-reduced-motion: reduce)');let inView=false,requested=false,userPaused=false,manualStart=false,disposed=false,playAttempt=null;
  video.muted=true;
  function visible(){return inView&&!document.hidden&&!root.closest('[hidden]');}
  function update(){
    const playing=!video.paused&&!video.ended;
    playButton.querySelector('span').textContent=playing?'暂停':'播放';playButton.setAttribute('aria-label',playing?'暂停介绍视频':'播放介绍视频');playButton.dataset.playing=String(playing);
    soundButton.querySelector('span').textContent=video.muted?'开启声音':'静音';soundButton.setAttribute('aria-label',video.muted?'开启视频声音':'静音视频');soundButton.setAttribute('aria-pressed',String(!video.muted));
    const expanded=document.fullscreenElement===root;expandButton.querySelector('span').textContent=expanded?'退出全屏':'全屏 ↗';expandButton.setAttribute('aria-label',expanded?'退出视频全屏':'全屏观看介绍视频');
    if(video.error){root.dataset.videoState='error';status.textContent='视频暂时无法播放，可单独打开。';root.querySelector('[data-video-fallback]').hidden=false;return;}
    root.dataset.videoState=playing?(video.readyState>=3?'playing':'loading'):'paused';
    status.textContent=playing?'IP IN MOTION.':requested?'点击播放，继续观看。':'IP IN MOTION.';
  }
  function load(){if(requested)return;requested=true;video.src=video.dataset.src;video.preload='auto';video.load();}
  async function play(){
    if(playAttempt||disposed||!visible()||video.error)return;
    load();playAttempt=video.play();let interrupted=false;
    try{await playAttempt;}catch(error){interrupted=error.name==='AbortError';if(!disposed&&visible()&&!interrupted){userPaused=true;status.textContent='点击播放，开始观看。';}}
    finally{playAttempt=null;if(!visible()||userPaused)video.pause();update();if(interrupted&&!disposed&&visible()&&!userPaused)requestAnimationFrame(refresh);}
  }
  function refresh(){
    if(disposed)return;
    if(!visible()||userPaused||(motion.matches&&!manualStart)){video.pause();update();return;}
    void play();
  }
  const view=new IntersectionObserver(entries=>{inView=entries[0].isIntersecting&&entries[0].intersectionRatio>=.2;refresh();},{threshold:[0,.2,.5]});
  view.observe(root.querySelector('.about-video-frame'));
  const ancestors=new MutationObserver(refresh);
  for(const el of [root.closest('#about-phase'),root.closest('#home-view')])if(el)ancestors.observe(el,{attributes:true,attributeFilter:['hidden']});
  function togglePlay(){userPaused=!video.paused;if(!userPaused)manualStart=true;refresh();}
  function toggleSound(){video.muted=!video.muted;update();}
  function scrub(){if(Number.isFinite(video.duration))video.currentTime=video.duration*Number(seek.value)/100;}
  function progress(){if(Number.isFinite(video.duration)&&video.duration>0){seek.disabled=false;seek.value=String(video.currentTime/video.duration*100);seek.style.setProperty('--video-progress',`${seek.value}%`);seek.setAttribute('aria-valuetext',`${Math.floor(video.currentTime)} / ${Math.floor(video.duration)} 秒`);}}
  async function fullscreen(){
    try{if(document.fullscreenElement)await document.exitFullscreen();else if(root.requestFullscreen)await root.requestFullscreen();else if(video.webkitEnterFullscreen)video.webkitEnterFullscreen();}catch{/* Playback and inline controls remain available if fullscreen is denied. */}
  }
  const events=['playing','pause','loadeddata','volumechange','waiting','error'];events.forEach(name=>video.addEventListener(name,update));
  video.addEventListener('timeupdate',progress);video.addEventListener('loadedmetadata',progress);
  playButton.addEventListener('click',togglePlay);soundButton.addEventListener('click',toggleSound);expandButton.addEventListener('click',fullscreen);seek.addEventListener('input',scrub);
  document.addEventListener('visibilitychange',refresh);document.addEventListener('fullscreenchange',update);motion.addEventListener('change',refresh);update();
  return {refresh,dispose(){disposed=true;video.pause();view.disconnect();ancestors.disconnect();events.forEach(name=>video.removeEventListener(name,update));video.removeEventListener('timeupdate',progress);video.removeEventListener('loadedmetadata',progress);playButton.removeEventListener('click',togglePlay);soundButton.removeEventListener('click',toggleSound);expandButton.removeEventListener('click',fullscreen);seek.removeEventListener('input',scrub);document.removeEventListener('visibilitychange',refresh);document.removeEventListener('fullscreenchange',update);motion.removeEventListener('change',refresh);}};
}
