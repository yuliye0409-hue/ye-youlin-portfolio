export const wrap=(min,max,value)=>((value-min)%(max-min)+(max-min))%(max-min)+min;
export const clamp=(min,max,value)=>Math.max(min,Math.min(max,value));
export function coverCrop(width,height,ratio=.75){
  const cropWidth=Math.min(width,height*ratio),cropHeight=cropWidth/ratio;
  return {x:(width-cropWidth)/2,y:height/width>3?0:(height-cropHeight)/2,width:cropWidth,height:cropHeight};
}
export function loopPosition(order,offset,count,aspect){
  const length=Math.max(count,24),half=length*.375/2;
  const x=wrap(-half,half,(order-offset)*.375);
  return {x,z:aspect<1?-x*6:-x*aspect*1.5};
}
// Fit the entire clicked artwork below the navigation, in CSS pixels.
export function fitArtwork(width,height,viewportWidth,viewportHeight){
  const side=viewportWidth<640?24:Math.max(48,viewportWidth*.06),top=viewportWidth<640?104:112,bottom=32;
  const availableWidth=Math.max(1,viewportWidth-side*2),availableHeight=Math.max(1,viewportHeight-top-bottom);
  const scale=Math.min(availableWidth/width,availableHeight/height);
  return {width:width*scale,height:height*scale,x:viewportWidth/2,y:top+availableHeight/2};
}
