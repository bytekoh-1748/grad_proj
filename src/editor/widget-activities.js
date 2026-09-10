// Local widget coordinates: x to the right, y toward the header, z out of the paper.
export const activityFor = kind => ({lamp:'sunbath',calendar:'calendar',turntable:'record',book:'read'}[kind] || null);
export const ACTIVITY_SECONDS = {sunbath:24,calendar:18,record:20,read:22};
export const ENTRY_SECONDS = 2.2, EXIT_SECONDS = 2.1;
export const clamp01 = n => Math.max(0, Math.min(1, n));
const ease = n => { n=clamp01(n);return n*n*(3-2*n); };
const mix = (a,b,t) => ({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t});

export function pageCurl(time) {
  // Three broad lifts, with a smaller flutter as the sheet settles. Both ends rest flat.
  const envelope = Math.sin(Math.PI * clamp01(time / ACTIVITY_SECONDS.calendar)) ** 2;
  return envelope * (1.12 + .57*Math.sin(time*1.35) + .12*Math.sin(time*5.4));
}
export function pagePoint(width,height,u,v,curl) {
  const angle = curl*(.32+.68*v), length=height*.79*v;
  return {x:(u-.5)*width*.84,y:height*.39-length*Math.cos(angle),z:.018+length*Math.sin(angle)};
}
export function activityAnchor(activity,width,height,scale,time,variant='classic') {
  if(activity==='sunbath') return {x:width*.20,y:-height*.15,z:.024};
  if(activity==='calendar') {
    const hand=pagePoint(width,height,1,.55,pageCurl(time));
    return {x:hand.x+38/153.6*scale,y:hand.y-135/153.6*scale,z:hand.z+.015};
  }
  if(activity==='record') {
    const vinyl=variant==='vinyl',x=vinyl?0:-width*.209,y=height*.5-width*(vinyl?.464:.435),r=width*(vinyl?.44:.182);
    return {x:x+Math.sin(time*.8)*r*.2,y:y-r*.3+Math.cos(time*.8)*r*.06,z:.025};
  }
  return {x:width*.14,y:variant==='classic'?-height*.29-46/153.6*scale:-height*.37,z:.025};
}
export function sampleVisit(visit) {
  const {activity,width,height,scale,entry,variant}=visit,t=visit.time,duration=ACTIVITY_SECONDS[activity];
  const activeTime=Math.max(0,Math.min(duration,t-ENTRY_SECONDS));
  const target=activityAnchor(activity,width,height,scale,activeTime,variant);
  let position,mode,phase,hand,blend;
  if(t<ENTRY_SECONDS) {
    phase='enter';mode='climb';
    const floor=activityAnchor(activity,width,height,scale,0,variant);
    // Reach over the actual rim, lower under the hands, then let go into the window.
    const hanging={x:entry.x,y:entry.y-.86*scale,z:.025};
    if(t<1.05) {
      position=mix(entry,hanging,ease(t/1.05));
      hand=[(entry.x-position.x)/scale*153.6,-(entry.y-position.y)/scale*153.6];
    } else {
      const p=clamp01((t-1.05)/(ENTRY_SECONDS-1.05));
      position=mix(hanging,floor,p*p);mode='air';
    }
  } else if(t<ENTRY_SECONDS+duration) {
    phase='activity';position=target;
    mode={sunbath:'recline',calendar:'pull',record:'dance',read:'read'}[activity];
    if(activity==='calendar')hand=[-38,-135];
    else blend=ease(activeTime/.7);
  } else {
    phase='exit';mode='air';
    const exitTime=t-ENTRY_SECONDS-duration,p=clamp01((exitTime-.45)/(EXIT_SECONDS-.45)),start=activityAnchor(activity,width,height,scale,duration,variant);
    if(exitTime<.45){mode={sunbath:'recline',calendar:'pull',record:'dance',read:'read'}[activity];blend=1-ease(exitTime/.45);if(activity==='calendar')hand=[-38,-135];}
    position=mix(start,entry,p);position.y+=Math.sin(p*Math.PI)*Math.max(.65,(entry.y-start.y)*.35);
  }
  return {position,mode,hand,blend,phase,activeTime,curl:pageCurl(activeTime),opacity:Math.min(ease(t/.6),ease((ENTRY_SECONDS+duration+EXIT_SECONDS-t)/.65)),done:t>=ENTRY_SECONDS+duration+EXIT_SECONDS};
}
