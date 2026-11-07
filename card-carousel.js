// Each project rotates its own artworks. The three looped copies share textures,
// keeping at most the current/next preview pair per project resident on the GPU.
export function createCardCarousel({cards,projects,load,release}){
  let disposed=false;
  const states=projects.map((project,index)=>{
    const copies=cards.filter(card=>card.project.id===project.id),uniforms=copies[0]?.mesh.material.uniforms;
    if(!uniforms)return null;
    const sequence=[project.cover,...project.images.filter(art=>art.id!==project.cover.id)];
    copies.forEach(card=>{card.currentArt=project.cover;});
    return {project,copies,sequence,index:0,current:{sharp:uniforms.uImageTexture.value,blur:uniforms.uBlurTexture.value},next:null,loading:false,mix:0,elapsed:-index*230,duration:4700+(index%3)*350};
  }).filter(Boolean);
  function apply(state){
    const current=state.current,next=state.next||current;
    for(const card of state.copies){
      const u=card.mesh.material.uniforms;
      u.uImageTexture.value=current.sharp;u.uBlurTexture.value=current.blur;u.uImageAspect.value=current.sharp.image.width/current.sharp.image.height;
      u.uNextImageTexture.value=next.sharp;u.uNextBlurTexture.value=next.blur;u.uNextImageAspect.value=next.sharp.image.width/next.sharp.image.height;u.uImageMix.value=state.mix;
      // Before a click the detail sampler is only a placeholder, not a cache.
      if(!card.openedArt&&!u.uFocus.value)u.uDetailTexture.value=current.sharp;
      card.currentArt=state.sequence[state.index];
    }
  }
  function update(delta,{active,paused,hovered}={}){
    if(disposed||!active||paused)return;
    for(const state of states){
      if(state.sequence.length<2||state.project.id===hovered||!state.copies.some(card=>card.on&&card.holder.visible))continue;
      state.elapsed+=delta;
      if(state.elapsed>=state.duration-1000&&!state.next&&!state.loading){
        state.loading=true;const nextIndex=(state.index+1)%state.sequence.length;
        void load(state.sequence[nextIndex]).then(pair=>{
          state.loading=false;if(!pair)return;
          if(disposed){release(pair);return;}state.next=pair;apply(state);
        }).catch(()=>{state.loading=false;state.elapsed=0;});
      }
      if(!state.next||state.elapsed<state.duration)continue;
      state.mix=Math.min(1,state.mix+delta/900);apply(state);
      if(state.mix>=1){
        const previous=state.current;state.current=state.next;state.next=null;state.index=(state.index+1)%state.sequence.length;state.mix=0;state.elapsed=0;apply(state);release(previous);
      }
    }
  }
  function selectedArt(card){const state=states.find(s=>s.project.id===card.project.id);return state?.sequence[(state.index+(state.mix>=.5?1:0))%state.sequence.length]||card.project.cover;}
  return {update,selectedArt,inspect:()=>states.map(s=>({project:s.project.id,current:s.sequence[s.index].id,next:s.next?s.sequence[(s.index+1)%s.sequence.length].id:null,mix:s.mix})),dispose(){disposed=true;}};
}
