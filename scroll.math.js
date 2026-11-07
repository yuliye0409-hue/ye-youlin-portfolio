export const clamp=(n,min=0,max=1)=>Math.min(max,Math.max(min,n));
export function sceneProgress(scrollY,sceneTop,sceneHeight,pinHeight,pinTop){return clamp((scrollY-sceneTop+pinTop)/Math.max(1,sceneHeight-pinHeight));}
export function filmPosition(progress,count){return clamp((progress-.075)/.85)*Math.max(0,count-1);}
export function framePose(index,position){const delta=index-position;return {y:delta*112,scale:1-Math.min(Math.abs(delta),1)*.065,opacity:clamp(1-(Math.abs(delta)-.7)/.6),rotate:delta*1.2};}
