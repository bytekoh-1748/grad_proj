import {RenderState, settle} from './render-state.js';
import {recordSlots} from './record-layout.js';
import { deckBase, deckArm, DECK } from './turntable.js';
import { buildRecord } from './record-art.js';
import { SVGContext } from './svg-context.js';
import { ContourState, homography, project, affineAt, matrixText, mix, smooth } from './vector-math.js';
import { OBJECTS, floorView, adaptFloor, deckProjection, objectQuad, cssProjection, circleOnFloor, daylight, lightPatches, mapPoints, wallArtQuad, unproject, FLOOR_VIEWS, raisedFloor, shadowFloor, roundedOutline, corners } from './floor-scene.js';

import { enteringRecord, enteringDeck, stagger } from './activity-motion.js';

const NS='http://www.w3.org/2000/svg';
const svg=(tag,attrs={})=>{const el=document.createElementNS(NS,tag);Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,v));return el;};
const pathText=points=>points.map((p,i)=>`${i?'L':'M'}${p.map(n=>n.toFixed(2)).join(' ')}`).join('');

function sampleArtwork(markup,parent) {
  const holder=document.createElement('div');holder.className='svg-measure';holder.innerHTML=markup;document.body.appendChild(holder);
  const source=holder.querySelector('svg');source.setAttribute('width',760);source.setAttribute('height',560);
  const inverse=source.getCTM().inverse();
  const shapes=[...source.querySelectorAll('path,rect,circle,ellipse')].map(el=>{
    const length=el.getTotalLength(), count=Math.max(12,Math.ceil(length/7));
    const matrix=inverse.multiply(el.getCTM());
    const points=Array.from({length:count+1},(_,i)=>{const p=el.getPointAtLength(length*i/count).matrixTransform(matrix);return[p.x,p.y];});
    const node=svg('path');
    for(const key of ['fill','stroke','opacity','stroke-linecap','stroke-linejoin'])node.setAttribute(key,el.getAttribute(key)??({fill:'#111',stroke:'none',opacity:1,'stroke-linecap':'round','stroke-linejoin':'round'}[key]));
    parent.appendChild(node);
    return{points,node,closed:el.tagName!=='path'||/[zZ]/.test(el.getAttribute('d')),width:Number(el.getAttribute('stroke-width')||0)};
  });
  holder.remove();return shapes;
}
function warpArtwork(shapes,h,angle=0,lift=0,outline=1) {
  const c=Math.cos(angle*Math.PI/180),s=Math.sin(angle*Math.PI/180);
  const basis=affineAt(h,380,280,1),scale=Math.sqrt(Math.abs(basis[0]*basis[3]-basis[1]*basis[2]));
  shapes.forEach(shape=>{
    const points=shape.points.map(([x,y])=>{
      if(angle){const dx=x-DECK.pivot.x,dy=y-DECK.pivot.y;x=DECK.pivot.x+c*dx-s*dy;y=DECK.pivot.y+s*dx+c*dy;}
      if(lift)y-=lift*Math.min(1,Math.hypot(x-DECK.pivot.x,y-DECK.pivot.y)/350);
      return project(h,x,y);
    });
    const d=pathText(points)+(shape.closed?'Z':'');
    if(shape.node.getAttribute('d')!==d)shape.node.setAttribute('d',d);
    shape.node.setAttribute('stroke-width',shape.width*scale*outline);
  });
}

const closed=points=>points.length?pathText(points)+'Z':'';
const blendPose=(a,b,t)=>Object.fromEntries(['u','v','r','angle','z'].map(k=>[k,mix(a[k],b[k],t)]));

export class VectorRoom {
  constructor({stage,billboard,tracks,reduced,onSelect,onView,onGesture}) {
    Object.assign(this,{stage,billboard,tracks,reduced,onSelect,onView,onGesture});
    this.room=stage.parentElement;this.selected=0;this.view='home';this.playing=false;this.activity='home';this.musicAmount=0;this.renderState=new RenderState();this.lightState=new RenderState();this.activityState=new RenderState();this.deckState=new RenderState();
    this.contours=new ContourState(floorView('home'),reduced);this.dragOffset=[0,0];
    this.pointer={x:.5,y:.5,dx:0,dy:0,down:false};this.pointerTarget={x:.5,y:.5};
    this.arm=this.armTarget=DECK.arm.rest;this.armLift=this.armLiftTarget=0;
    this.artOpacity=this.artTarget=0;this.zoom=this.zoomTarget=1;
    this.lightHour=this.lightTarget=13;
    this.artPlane=document.getElementById('track-plane');this.artContext=new SVGContext(document.getElementById('track-drawing'));
    this.deckShadow=svg('path',{fill:'var(--shadow-ink)',opacity:'.23'});stage.querySelector('#record-shadows').append(this.deckShadow);
    this.deckSide=svg('path',{fill:'var(--primary-deep)',stroke:'var(--ink)','stroke-width':5,'stroke-linejoin':'round'});stage.querySelector('#deck-sides').append(this.deckSide);
    this.deckRim=svg('path',{fill:'none',stroke:'var(--soft)','stroke-width':3,opacity:'.8'});stage.querySelector('#deck-sides').append(this.deckRim);
    this.baseShapes=sampleArtwork(deckBase(),stage.querySelector('#deck-base'));
    this.armShapes=sampleArtwork(deckArm(),document.getElementById('deck-arm'));
    this.armShadowShapes=sampleArtwork(deckArm(),document.getElementById('arm-shadow'));
    this.armShadowShapes.forEach(shape=>{shape.node.setAttribute('fill','var(--shadow-ink)');shape.node.setAttribute('stroke','var(--shadow-ink)');});
    const layer=document.getElementById('record-layer');
    this.cards=tracks.map((track,index)=>{
      const group=document.createElement('button');group.type='button';group.className='record';group.dataset.record=index;
      group.setAttribute('aria-label',`${track.title} 선택`);group.setAttribute('aria-pressed',String(index===0));
      layer.appendChild(group);
      group.addEventListener('click',()=>onSelect(index));
      const shadow=svg('path',{fill:'var(--shadow-ink)',opacity:.17});stage.querySelector('#record-shadows').appendChild(shadow);
      return{group,shadow,edge:null,spin:null,spinAngle:0,index,mode:index===0?'cue':'stack',pose:null,flight:null,renderState:new RenderState()};
    });
    this.abort=new AbortController();this.bind();
    this.nodes=Object.fromEntries([...document.querySelectorAll('[id]')].map(node=>[node.id,node]));
    this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(this.room);this.resize();
  }
  mountRecord(card){
    if(card.spin)return;
    const {group}=card,track=this.tracks[card.index];
      const front=buildRecord(track).querySelector('svg');front.setAttribute('width',200);front.setAttribute('height',200);
      const depth=svg('svg',{viewBox:'0 0 200 200',width:200,height:200,'aria-hidden':'true'});depth.classList.add('record-depth');
      const edge=svg('path',{fill:'#302737',stroke:'#09090b','stroke-width':2});depth.append(edge);group.append(depth,front);
      front.append(svg('path',{d:'M8 98A92 92 0 0 0 192 98',fill:'none',stroke:'#fff','stroke-width':1.25,opacity:'.35'}));
    card.edge=edge;card.spin=group.querySelector('.record-spin');
  }
  resize(){
    this.width=Math.max(1,this.room.clientWidth);this.height=Math.max(1,this.room.clientHeight);this.logicalHeight=1600*this.height/this.width;
    this.stage.setAttribute('viewBox',`0 0 1600 ${this.logicalHeight}`);
    document.getElementById('arm-overlay').setAttribute('viewBox',`0 0 1600 ${this.logicalHeight}`);
    this.needsPaint=true;
  }
  setView(name,user=false){
    if(!FLOOR_VIEWS[name])return;
    this.needsPaint=true;this.view=name;this.dragOffset=[0,0];this.zoomTarget=1;this.contours.to(floorView(name));
    this.room.dataset.view=name;this.onView?.(name,user);
  }
  zoomBy(delta){this.zoomTarget=Math.max(.78,Math.min(1.18,this.zoomTarget+delta));this.onGesture?.();}
  setHour(hour){this.studio?.setDebugHour(hour);}
  updateTimeUI(){
    const hour=this.studio?.mood.hour??this.lightTarget,total=Math.floor(hour*60+1e-7)%1440,value=`${String(Math.floor(total/60)).padStart(2,'0')}:${String(total%60).padStart(2,'0')}`;
    document.getElementById('light-readout').textContent=value;
    const range=document.getElementById('light-time');if(document.activeElement!==range)range.value=hour;
    range.setAttribute('aria-valuetext',value);
    document.getElementById('light-auto').setAttribute('aria-pressed',String(this.studio?.debugHour==null));
  }
  bind(){
    const options={signal:this.abort.signal};
    this.room.addEventListener('pointerdown',e=>{
      if(e.button!==0||e.target.closest('button,input,video,dialog,#billboard,.room-controls,#edition-dock'))return;
      const art=Boolean(e.target.closest('#track-plane'));
      this.drag={id:e.pointerId,x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,moved:false,art,deck:Boolean(e.target.closest('[data-deck]'))};
      this.stage.setPointerCapture(e.pointerId);if(art){this.pointer.down=true;this.pointAt(e);}
    },options);
    this.room.addEventListener('pointermove',e=>{
      if(e.target.closest('#track-plane')||this.drag?.art)this.pointAt(e);
      if(!this.drag)return;
      const dx=e.clientX-this.drag.x,dy=e.clientY-this.drag.y;
      this.drag.moved ||= Math.hypot(e.clientX-this.drag.startX,e.clientY-this.drag.startY)>5;
      if(this.drag.moved&&!this.drag.art){
        this.dragOffset[0]=Math.max(-1,Math.min(1,this.dragOffset[0]+dx/350));
        this.dragOffset[1]=Math.max(-1,Math.min(1,this.dragOffset[1]+dy/300));
        this.contours.to(floorView(this.view,this.dragOffset));this.onGesture?.();
      }
      this.drag.x=e.clientX;this.drag.y=e.clientY;
    },options);
    const release=e=>{
      if(!this.drag)return;const drag=this.drag;this.drag=null;this.pointer.down=false;
      if(this.stage.hasPointerCapture(e.pointerId))this.stage.releasePointerCapture(e.pointerId);
      if(this.activity==='music'&&!drag.moved&&e.type!=='pointercancel'&&drag.deck)this.setView('deck',true);
    };
    this.room.addEventListener('pointerup',release,options);this.room.addEventListener('pointercancel',release,options);
    this.room.addEventListener('wheel',e=>{if(e.target.closest('input,video,dialog,#edition-dock,#space-controls'))return;e.preventDefault();this.zoomBy(-e.deltaY*.0004);},{...options,passive:false});
    document.getElementById('light-time').addEventListener('input',e=>this.setHour(Number(e.target.value)),options);
    document.getElementById('light-auto').addEventListener('click',()=>this.studio?.setDebugHour(null),options);
  }
  pointAt(event){
    if(!this.frame)return;
    const rect=this.room.getBoundingClientRect(),scale=this.width/1600;
    const x=800+((event.clientX-rect.left)/scale-800)/this.zoom;
    const cy=this.logicalHeight*.5,y=cy+((event.clientY-rect.top)/scale-cy)/this.zoom;
    const [u,z]=unproject(this.frame.wall,x,y);
    this.pointerTarget.x=Math.max(0,Math.min(1,(u-800)/700));
    this.pointerTarget.y=Math.max(0,Math.min(1,(480-z)/445));
  }
  changeMode(card,mode,force=false){
    if(card.mode===mode&&!card.flight&&!force)return Promise.resolve(true);
    card.flight?.resolve(false);card.mode=mode;
    return new Promise(resolve=>{card.flight={from:card.pose?{...card.pose}:null,elapsed:0,duration:this.reduced?0:1100,resolve};});
  }
  select(index){
    if(!this.cards[index])return Promise.resolve(false);
    this.needsPaint=true;this.selected=index;
    const slots=recordSlots(this.cards.length,index);
    this.cards.forEach(card=>{
      card.group.setAttribute('aria-pressed',String(card.index===index));
      if(card.index!==index){
        const target=slots.get(card.index);
        const moved=target&&card.pose&&['u','v','r','angle','z'].some(key=>card.pose[key]!==target[key]);
        this.changeMode(card,'stack',moved);
      }
    });
    return this.changeMode(this.cards[index],'cue');
  }
  cue(){return this.changeMode(this.cards[this.selected],'cue');}
  dock(){return this.changeMode(this.cards[this.selected],'dock');}
  setArm(playing,progress=0){this.armTarget=playing?mix(DECK.arm.lead,DECK.arm.runOut,progress):DECK.arm.rest;this.armLiftTarget=0;}

  paintBackground(frame){
    const {floor,wall}=frame,H=this.logicalHeight;
    const a=project(floor,0,0),b=project(floor,1600,0),slope=(b[1]-a[1])/(b[0]-a[0]);
    const edge=x=>a[1]+(x-a[0])*slope;
    const ground=[[-2500,edge(-2500)],[4100,edge(4100)],[4100,H+4000],[-2500,H+4000]];
    this.nodes['floor'].setAttribute('d',closed(ground));
    this.nodes['floor-clip-path'].setAttribute('d',closed(ground));
    this.nodes['seam'].setAttribute('d',pathText([[-2500,edge(-2500)],[4100,edge(4100)]]));
    for(const[i,lo,hi]of[[0,0,28],[1,28,68],[2,68,112]]){
      this.nodes[`boundary-${i}`].setAttribute('d',closed(mapPoints(wall,[[-1200,lo],[2700,lo],[2700,hi],[-1200,hi]])));
    }
    this.nodes['floor-hatching'].setAttribute('d',closed(mapPoints(floor,[[-1200,1],[2700,1],[2700,23],[-1200,23]])));
    this.nodes['seam-inner'].setAttribute('d',pathText(mapPoints(floor,[[-1200,8],[2700,8]])));
    const degrees=Math.atan2(b[1]-a[1],b[0]-a[0])*180/Math.PI;
    this.nodes['hatch'].setAttribute('patternTransform',`rotate(${degrees})`);
  }
  paintLight(frame){
    const patches=lightPatches(frame.floor,frame.wall,this.lightHour);
    patches.forEach((p,i)=>{
      this.nodes[`floor-light-${i}`].setAttribute('d',closed(p.floor));
      this.nodes[`wall-light-${i}`].setAttribute('d',closed(p.wall));
    });
    const light=daylight(this.lightHour);
    this.nodes['floor-light'].style.opacity=light.opacity*(this.material?.light??1)*(this.daylightStrength??1);
    this.nodes['wall-light'].style.opacity=light.opacity*.74*(this.material?.light??1)*(this.daylightStrength??1);
    return light;
  }
  drawTrack(track,time,dt){
    const g=this.artContext;g.reset();g.fillStyle=track.scene.ground;g.fillRect(0,0,1000,600);
    const beat=time/60000*track.bpm;
    track.render({context:g,width:1000,height:600,time,dt,beat,pulse:this.reduced?0:Math.pow(1-beat%1,3),pointer:this.pointer});g.commit();
  }
  place(el,quad,width,height){
    const transform=cssProjection(quad,width,height,this.width/1600,this.zoom,[800,this.logicalHeight*.5]);
    if(el.dataset.transform!==transform){el.style.transform=transform;el.dataset.transform=transform;}
  }
  render(dt,now){
    this.activities?.step(dt);
    const moving=this.contours.step(dt),ease=this.reduced?1:1-Math.exp(-dt/220);
    const geometryChanged=this.contours.changed;
    this.zoom=settle(this.zoom,this.zoomTarget,dt,220,this.reduced);
    this.arm=settle(this.arm,this.armTarget,dt,250,this.reduced);this.armLift=settle(this.armLift,this.armLiftTarget,dt,220,this.reduced);
    this.artOpacity=settle(this.artOpacity,this.artTarget,dt,600,this.reduced);
    this.lightHour=settle(this.lightHour,this.lightTarget,dt,520,this.reduced);
    const px=this.pointer.x,py=this.pointer.y;
    this.pointer.x=settle(px,this.pointerTarget.x,dt,220,this.reduced,.00001);this.pointer.y=settle(py,this.pointerTarget.y,dt,220,this.reduced,.00001);
    this.pointer.dx=settle(this.pointer.dx,this.pointer.down?(this.pointer.x-px)*20:0,dt,220,this.reduced,.00001);
    this.pointer.dy=settle(this.pointer.dy,this.pointer.down?(this.pointer.y-py)*20:0,dt,220,this.reduced,.00001);
    // Spin is independent of room geometry and only touches one SVG transform.
    if(this.playing&&!this.reduced){
      const card=this.cards[this.selected];card.spinAngle=(card.spinAngle+dt*.2)%360;
      card.spin.setAttribute('transform',`rotate(${card.spinAngle} 100 100)`);
    }
    const changed=this.renderState.changed([
      ...Object.values(this.contours.value).flat(),this.width,this.height,this.zoom,
      this.arm,this.armLift,this.artOpacity,Number(this.lightHour.toFixed(3)),Number((this.daylightStrength??1).toFixed(3)),
      ...Object.values(this.material??{}),...Object.values(this.activities?.motion.state.value??{}).flat(),
    ]);
    if(!this.lastTimeUI||now-this.lastTimeUI>300){this.updateTimeUI();this.lastTimeUI=now;}
    if(!changed&&!this.needsPaint&&!this.cards.some(card=>card.flight))return;
    const frame=this.frame=adaptFloor(this.contours.value,this.logicalHeight);
    const geometry=[...frame.floor,...frame.wall];
    const lightHour=Number(this.lightHour.toFixed(3));
    const entry=enteringDeck(this.musicAmount),deckPoints=corners(entry.u,entry.v,entry.width,entry.depth);
    const h=homography(mapPoints(raisedFloor(frame,54+entry.z),deckPoints).flat(),760,560);
    const deckMoving=this.musicAmount!==this.lastMusicAmount;this.lastMusicAmount=this.musicAmount;
    const zoom=[this.zoom,0,0,this.zoom,800*(1-this.zoom),this.logicalHeight*.5*(1-this.zoom)];
    this.nodes['drawing'].setAttribute('transform',matrixText(zoom));
    this.nodes['arm-drawing'].setAttribute('transform',matrixText(zoom));
    if(geometryChanged||this.needsPaint)this.paintBackground(frame);
    if(geometryChanged||this.needsPaint||deckMoving)warpArtwork(this.baseShapes,h,0,0,this.material?.outline??1);
    if(this.deckState.changed([...geometry,this.musicAmount,lightHour,...Object.values(this.material??{})])||this.needsPaint){
    const outline=roundedOutline(entry.u+entry.width*.025,entry.v+entry.depth*.035,entry.width*.95,entry.depth*.925,entry.width*.065);
    const top=mapPoints(raisedFloor(frame,54+entry.z),outline),bottom=mapPoints(raisedFloor(frame,10+entry.z),outline);
    this.deckSide.setAttribute('d',closed([...top,...bottom.toReversed()]));
    this.deckSide.setAttribute('stroke-width',5*(this.material?.outline??1));
    const sheen=this.nodes['deck-material'];sheen.setAttribute('d',closed(top));sheen.style.opacity=(this.material?.shine??0)*entry.opacity;
    this.deckRim.setAttribute('d',pathText(bottom.slice(9,28)));
    this.deckShadow.setAttribute('d',closed(mapPoints(shadowFloor(frame,54+entry.z,this.lightHour),outline)));
    this.deckShadow.style.opacity=entry.opacity*.25;
    for(const id of ['deck-base','deck-sides'])this.nodes[id].style.opacity=entry.opacity;
    this.nodes['deck-arm'].style.opacity=entry.opacity;
    this.nodes['arm-shadow'].style.opacity=entry.opacity*.18;
    }
    if(geometryChanged||this.needsPaint||deckMoving||this.arm!==this.drawnArm||this.armLift!==this.drawnLift){
      const armH=homography(mapPoints(raisedFloor(frame,65+entry.z),deckPoints).flat(),760,560);
      warpArtwork(this.armShapes,armH,this.arm,this.armLift,this.material?.outline??1);warpArtwork(this.armShadowShapes,h,this.arm,this.armLift*.28);this.drawnArm=this.arm;this.drawnLift=this.armLift;
    }
    const lightingChanged=this.lightState.changed([...geometry,lightHour,Number((this.daylightStrength??1).toFixed(3)),this.material?.light]);
    if(lightingChanged||this.needsPaint)this.light=this.paintLight(frame);
    const light=this.light;
    this.place(this.billboard,mapPoints(frame.floor,light.title),650,360);
    this.billboard.style.setProperty('--shadow-opacity',.79+(1-Math.abs(light.phase))*.10);
    const titleAmount=stagger(this.musicAmount,.28);this.billboard.style.opacity=titleAmount;this.billboard.style.visibility=titleAmount<.002?'hidden':'visible';
    this.place(this.artPlane,wallArtQuad(frame.wall),1000,600);
    this.artPlane.style.visibility=this.artOpacity<.002?'hidden':'visible';this.artPlane.style.opacity=this.artOpacity;this.artPlane.style.pointerEvents=this.artOpacity>.1?'auto':'none';
    const slots=recordSlots(this.cards.length,this.selected);
    this.cards.forEach(card=>{
      let target,rank=10;
      if(card.mode==='dock')target={u:OBJECTS.deck.u+DECK.platter.x,v:OBJECTS.deck.v+DECK.platter.y,r:170,angle:0,z:64};
      else if(card.mode==='cue')target={...OBJECTS.cue,z:12};
      else{
        const slot=slots.get(card.index);
        if(!slot){
          card.group.hidden=true;card.shadow.style.opacity=0;
          if(card.flight){card.flight.resolve(true);card.flight=null;}
          card.pose=null;return;
        }
        target=slot;rank=slot.rank;
      }
      this.mountRecord(card);card.group.hidden=false;
      let pose=target;
      if(card.flight){
        const f=card.flight;f.elapsed+=dt;const t=f.duration?Math.min(1,f.elapsed/f.duration):1;
        pose=blendPose(f.from||target,target,smooth(t));pose.u+=Math.sin(t*Math.PI)*45;pose.z+=Math.sin(t*Math.PI)*82;
        if(t===1){card.flight=null;f.resolve(true);}
      }
      card.pose=pose;
      if(!card.renderState.changed([...geometry,this.width,this.zoom,...Object.values(pose),this.musicAmount,rank,lightHour])&&!this.needsPaint)return;
      card.group.style.zIndex=rank;
      const drawn=enteringRecord(pose,this.musicAmount,rank===10?1:rank+1),topPlane=raisedFloor(frame,drawn.z),bottomPlane=raisedFloor(frame,drawn.z-9);
      this.place(card.group,objectQuad(topPlane,drawn),200,200);card.group.style.opacity=drawn.opacity;card.group.style.visibility=drawn.opacity<.002?'hidden':'visible';
      const c=Math.cos(-drawn.angle*Math.PI/180),s=Math.sin(-drawn.angle*Math.PI/180);
      const edge=circleOnFloor(bottomPlane,{...drawn,r:drawn.r*.98}).map(p=>{const[u,v]=unproject(topPlane,...p),x=u-drawn.u,y=v-drawn.v;return[100+(c*x-s*y)*100/drawn.r,100+(s*x+c*y)*100/drawn.r];});
      card.edge.setAttribute('d',closed(edge));
      card.shadow.setAttribute('d',closed(circleOnFloor(shadowFloor(frame,drawn.z,this.lightHour),drawn)));card.shadow.style.opacity=String(drawn.opacity*(card.mode==='dock'?.08:.25));
    });
    if(this.activityState.changed([...geometry,this.width,this.zoom,lightHour,...Object.values(this.activities?.motion.state.value??{}).flat()])||this.needsPaint)this.activities?.render(frame);
    this.studio?.render(frame);
    if(!this.lastTimeUI||now-this.lastTimeUI>300){this.updateTimeUI();this.lastTimeUI=now;}
    this.room.dataset.morphing=String(moving);this.room.dataset.lightHour=this.lightHour.toFixed(3);this.needsPaint=false;
  }
  destroy(){this.abort.abort();this.resizeObserver.disconnect();this.cards.forEach(card=>card.flight?.resolve(false));}
}
