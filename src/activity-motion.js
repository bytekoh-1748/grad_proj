import {mix,smooth,ContourState} from './vector-math.js';

export const ACTIVITIES=['home','music','cinema','journal'];
export const POSTERS={
  music:{u:390,v:300,width:570,depth:490,angle:-5},
  cinema:{u:1040,v:205,width:440,depth:340,angle:7},
  journal:{u:1040,v:595,width:445,depth:290,angle:-5},
};
export const MUSIC_ORIGIN={u:675,v:545};
export const clamp=t=>Math.max(0,Math.min(1,t));
export const stagger=(amount,delay=0)=>smooth(clamp((amount-delay)/(1-delay)));
export const landing=p=>Math.sin(Math.PI*clamp(p))*(1-clamp(p))*120;

export class ActivityMotion {
  constructor(reduced=false){
    this.active='home';this.state=new ContourState(Object.fromEntries(ACTIVITIES.map(k=>[k,[k==='home'?1:0]])),reduced);
  }
  select(name){
    if(!ACTIVITIES.includes(name))return false;
    this.active=name;this.state.to(Object.fromEntries(ACTIVITIES.map(k=>[k,[k===name?1:0]])));return true;
  }
  step(dt){this.state.step(dt);}
  amount(name){return this.state.value[name][0];}
}

export function enteringRecord(pose,amount,index=0){
  const p=stagger(amount,index*.055),s=mix(.12,1,p);
  return {...pose,u:mix(MUSIC_ORIGIN.u,pose.u,p),v:mix(MUSIC_ORIGIN.v,pose.v,p),r:pose.r*s,
    angle:pose.angle+(1-p)*25,z:pose.z+landing(p)+(1-p)*40,opacity:clamp(p*4)};
}
export function enteringDeck(amount){
  const p=stagger(amount,.03),s=mix(.16,1,p);
  return {u:mix(MUSIC_ORIGIN.u,310,p)-380*s,v:mix(MUSIC_ORIGIN.v,304,p)-280*s,
    width:760*s,depth:560*s,z:landing(p)+(1-p)*55,opacity:clamp(p*4)};
}
