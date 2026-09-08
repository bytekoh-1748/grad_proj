const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
/** Keep the opposite edge fixed when a user drags a window border. */
export function resizeWindow(box,edge,dx,dy,{width,height,minWidth=280,minHeight=280}){
  let left=box.x,right=box.x+box.w,top=box.y,bottom=box.y+box.h;
  if(edge.includes('w'))left=clamp(left+dx,12,right-Math.min(minWidth,box.w));
  if(edge.includes('e'))right=clamp(right+dx,left+Math.min(minWidth,width-left-12),width-12);
  if(edge.includes('n'))top=clamp(top+dy,12,bottom-Math.min(minHeight,box.h));
  if(edge.includes('s'))bottom=clamp(bottom+dy,top+Math.min(minHeight,height-top-86),height-86);
  return {x:left,y:top,w:right-left,h:bottom-top};
}
