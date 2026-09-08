import {ActivityMotion,POSTERS,MOBILE_POSTERS,stagger,clamp,landing} from './activity-motion.js';
import {corners,mapPoints,raisedFloor,shadowFloor,wallArtQuad,roundedOutline} from './floor-scene.js';
import {posterMarkup, cinemaMarkup, newspaperMarkup} from './activity-markup.js';
import {CinemaPlayer} from './activities/cinema-player.js';
import {JournalReader} from './activities/journal-reader.js';
import {mix} from './vector-math.js';

const NS='http://www.w3.org/2000/svg';
const shape=(parent,attrs)=>{const p=document.createElementNS(NS,'path');Object.entries(attrs).forEach(([k,v])=>p.setAttribute(k,v));parent.append(p);return p;};
const path=points=>points.map((p,i)=>`${i?'L':'M'}${p.join(' ')}`).join('')+'Z';

export class FloorHome {
  constructor(world,onActivity){
    this.world=world;this.onActivity=onActivity;this.motion=new ActivityMotion(world.reduced);this.active='home';
    const layer=document.getElementById('activity-layer');layer.innerHTML=posterMarkup(world.tracks.length)+cinemaMarkup()+newspaperMarkup();
    this.heading=document.getElementById('home-heading');
    this.posters=Object.entries(POSTERS).map(([name,pose])=>({name,pose,el:layer.querySelector(`[data-activity=${name}]`),shadow:this.makeShadow(),edge:this.makeEdge()}));
    this.objects=[
      {name:'projector',activity:'cinema',u:480,v:500,width:490,depth:350,angle:-10,height:46},
      {name:'newspaper',activity:'journal',u:475,v:125,width:910,depth:610,sourceDepth:650,angle:-2,height:7},
      {name:'coffee',activity:'journal',u:1360,v:635,width:205,depth:205,angle:14,height:42},
    ].map(p=>({...p,el:document.getElementById(p.name),shadow:this.makeShadow(),edge:this.makeEdge()}));
    this.screen=document.getElementById('cinema-screen');this.console=document.getElementById('cinema-console');
    this.cinema=new CinemaPlayer(layer);this.journal=new JournalReader(layer);
    this.abort=new AbortController();const options={signal:this.abort.signal};
    this.posters.forEach(p=>p.el.addEventListener('click',()=>this.select(p.name),options));
    document.getElementById('go-home').addEventListener('click',()=>this.select('home'),options);
    this.sync();
  }
  makeShadow(){return shape(document.getElementById('activity-shadows'),{fill:'#24152e',opacity:'.18'});}
  makeEdge(){return shape(document.getElementById('activity-edges'),{fill:'#453324',stroke:'#231b24','stroke-width':2,'stroke-linejoin':'round'});}
  select(name){
    if(name===this.active||!this.motion.select(name))return;
    this.active=name;this.world.activity=name;this.world.setView({home:'home',music:'listen',cinema:'cinema',journal:'journal'}[name]);
    this.world.artTarget=0;this.world.playing=false;this.world.setArm(false);
    this.cinema.pause();this.onActivity(name);this.sync();
    this.focusTarget=name==='home'?this.posters[0].el:document.getElementById('go-home');
  }
  sync(){
    this.world.room.dataset.activity=this.active;
    document.getElementById('go-home').hidden=this.active==='home';
    document.querySelector('.view-controls').hidden=this.active!=='music';
    document.getElementById('home-caption').hidden=this.active!=='home';
    this.posters.forEach(p=>{p.el.inert=this.active!=='home';});
    this.objects.forEach(p=>p.el.inert=p.activity!==this.active);
    this.console.inert=this.active!=='cinema';this.screen.inert=this.active!=='cinema';
    document.getElementById('record-layer').inert=this.active!=='music';this.world.billboard.inert=this.active!=='music';
  }
  step(dt){this.motion.step(dt);this.world.musicAmount=this.motion.amount('music');}
  visibility(el,amount){el.style.opacity=clamp(amount*3);el.style.visibility=amount<.002?'hidden':'visible';}
  plane(item,frame,amount,index=0){
    const p=stagger(amount,index*.06),s=mix(.68,1,p),z=item.height+landing(p),u=item.u+(1-p)*110,v=item.v+(1-p)*150;
    const points=corners(u,v,item.width*s,item.depth*s,item.angle+(item.poster?0:(1-p)*12));
    this.world.place(item.el,mapPoints(raisedFloor(frame,z),points),item.sourceWidth??item.width,item.sourceDepth??item.depth);this.visibility(item.el,p);
    if(item.poster){item.shadow.style.opacity=0;item.edge.style.opacity=0;return;}
    let outline=corners(0,0,item.width,item.depth);
    if(item.name==='projector')outline=roundedOutline(28,82,375,222,26);
    if(item.name==='coffee')outline=Array.from({length:64},(_,i)=>{const a=i*Math.PI/32;return[102+Math.cos(a)*85,108+Math.sin(a)*85];});
    const angle=(item.angle+(item.poster?0:(1-p)*12))*Math.PI/180,c=Math.cos(angle),sn=Math.sin(angle);
    const footprint=outline.map(([x,y])=>[u+s*(c*x-sn*y),v+s*(sn*x+c*y)]);
    item.shadow.setAttribute('d',path(mapPoints(shadowFloor(frame,z,this.world.lightHour),footprint)));item.shadow.style.opacity=p*.20;
    const top=mapPoints(raisedFloor(frame,z),footprint),base=mapPoints(raisedFloor(frame,z-item.height),footprint);
    item.edge.setAttribute('fill',item.name==='projector'?'#362340':item.name==='coffee'?'#d6a76e':'#a89171');
    item.edge.setAttribute('d',path([...top,...base.reverse()]));item.edge.style.opacity=clamp(p*3);
  }
  render(frame){
    const home=this.motion.amount('home');
    this.world.place(this.heading,mapPoints(frame.floor,corners(405,35,1120,185,0)),1120,260);this.visibility(this.heading,home);
    this.posters.forEach((p,i)=>this.plane({...p,...(this.world.width<=570?MOBILE_POSTERS[p.name]:p.pose),sourceWidth:p.pose.width,sourceDepth:p.pose.depth,height:5,poster:true},frame,home,i));
    this.objects.forEach((p,i)=>this.plane(p,frame,this.motion.amount(p.activity),i));
    const cinema=stagger(this.motion.amount('cinema'),.13);
    this.world.place(this.screen,mapPoints(frame.wall,[[760,355],[1430,355],[1430,35],[760,35]]),1000,600);this.visibility(this.screen,cinema);
    this.world.place(this.console,mapPoints(frame.floor,corners(900,175,590,300,0)),590,300);this.visibility(this.console,cinema);
    if(this.focusTarget&&!this.focusTarget.hidden&&this.focusTarget.style.visibility!=='hidden'){this.focusTarget.focus({preventScroll:true});this.focusTarget=null;}
    this.world.room.dataset.transitioning=String(this.motion.amount(this.active)<.995);
  }
  destroy(){this.abort.abort();this.cinema.destroy();this.journal.destroy();}
}
