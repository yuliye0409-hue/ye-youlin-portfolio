export const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
export const mix=(a,b,t)=>a+(b-a)*t;
export const span=(p,a,b)=>clamp((p-a)/(b-a));
export const smooth=t=>t*t*(3-2*t);
export const out=t=>1-(1-t)**3;
export const RIBBON_END=.66,HANDOFF_DURATION=.22,INITIAL_HEAD=12.8;
export function trackProgress(scroll,top,height,viewport){return clamp((scroll-top)/Math.max(1,height-viewport));}
export function railPoint(t){
  const ph=mix(-1.5,Math.PI*2+1.35,t),cs=Math.cos(ph),u=2*t-1;
  const depth=cs>0?7.6+16.4*cs**.9:7.6+2.2*cs;
  const edge=.84+.5*span(.14-t,0,.14)+.8*span(t,.84,1);
  return {x:edge*Math.sin(ph)*depth*.561,y:.5*Math.sign(u)*Math.abs(u)**1.4*depth*.63,z:-depth};
}
export function flightProgress(p,index,pathLength,count){
  const end=pathLength-2.1,total=pathLength+count*2.13;
  const start=RIBBON_END*(end+index*2.13-INITIAL_HEAD)/(total-INITIAL_HEAD);
  return {start,q:out(span(p,start,start+HANDOFF_DURATION))};
}
export function headlinePose(p){
  return {run:mix(-50,76,span(p,0,.58)),rise:1-out(span(p,0,.12)),caption:1-span(p,.52,.57),intro:1-span(p,0,.055)};
}
