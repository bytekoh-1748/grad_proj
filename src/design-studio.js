import {settle} from './render-state.js';
import {EDITIONS,resolveDesign,rgb,easeColour} from './design-data.js';
import {buildFloorMotifs} from './design-art.js';
import {buildFloorSurface,paintFloorSurface} from './floor-surface.js';
import {mapPoints} from './floor-scene.js';
import {roomMood,localHour,debugAllowed,normalizeHour} from './room-mood.js';

const preferenceKey='room-material.v1';
const readSolid=()=>{try{return JSON.parse(localStorage.getItem(preferenceKey)||'{}').solid===true;}catch{return false;}};

export class DesignStudio {
  constructor(world){
    this.world=world;this.root=document.documentElement;this.abort=new AbortController();
    this.debugEnabled=debugAllowed({dev:import.meta.env.DEV,hostname:location.hostname,search:location.search});
    this.root.dataset.debug=String(this.debugEnabled);
    this.solid=readSolid();this.manual=null;this.debugHour=null;this.colours={};this.lastContext='';
    const query=new URLSearchParams(location.search);
    if(this.debugEnabled){
      if(query.has('edition'))this.manual=resolveDesign({edition:query.get('edition'),palette:query.get('palette')});
      const hour=Number(query.get('hour'));
      if(query.has('hour')&&Number.isFinite(hour)&&hour>=0&&hour<24)this.debugHour=hour;
    }else{
      // Old exhibition links must not pin visitors to a palette or simulated time.
      const url=new URL(location.href);
      for(const key of['edition','palette','hour','debug'])url.searchParams.delete(key);
      if(url.href!==location.href)history.replaceState(null,'',url);
    }
    this.motifs=buildFloorMotifs(document.getElementById('edition-floor-art'));
    this.surface=buildFloorSurface(document.getElementById('floor-surface'));this.phaseGlow=1;
    const opts={signal:this.abort.signal},toggle=document.getElementById('space-toggle');
    toggle.addEventListener('click',()=>this.setPanel(toggle.getAttribute('aria-expanded')!=='true'),opts);
    document.getElementById('close-space').addEventListener('click',()=>this.setPanel(false,true),opts);
    document.getElementById('solid-glass').addEventListener('click',()=>{
      this.solid=!this.solid;this.syncSolid();
      try{localStorage.setItem(preferenceKey,JSON.stringify({solid:this.solid}));}catch{}
    },opts);
    document.addEventListener('pointerdown',e=>{if(!e.target.closest('#space-controls,#space-toggle'))this.setPanel(false);},opts);
    this.refresh(true);
    // Vite removes this branch and the inspector chunk from production builds.
    if(import.meta.env.DEV&&this.debugEnabled)import('./design-debug.js').then(({mountDesignDebug})=>{
      if(!this.abort.signal.aborted)this.debugUI=mountDesignDebug(this);
    }).catch(error=>console.error('Room inspector:',error));
  }
  refresh(initial=false){
    const hour=this.debugHour??localHour(),track=this.world.tracks[this.world.selected];
    this.mood=roomMood({hour,activity:this.world.activity,trackId:track?.id,trackMoods:track?.moods});
    const selection=this.manual??this.mood;
    if(initial||!this.selection||selection.edition!==this.selection.edition||selection.palette!==this.selection.palette){
      this.selection=resolveDesign({...selection,solid:this.solid});this.apply(initial);
    }
    this.root.dataset.period=this.mood.period;this.world.lightTarget=this.mood.lightHour;
    if(initial){this.world.lightHour=this.mood.lightHour;this.phaseGlow=this.mood.daylight;}
    const h=document.getElementById('edition-title');
    if(h.dataset.period!==this.mood.period){
      h.innerHTML=this.mood.title;h.dataset.period=this.mood.period;
      document.getElementById('edition-eyebrow').textContent=this.mood.label;
      document.getElementById('edition-subtitle').textContent=this.mood.subtitle;
    }
    document.getElementById('edition-number').textContent=this.mood.clock;
    document.getElementById('edition-detail').textContent={morning:'천천히 시작해도 좋아요.',day:'취향으로 채우는 오후.',evening:'오늘의 여운이 머무는 곳.',night:'나만의 속도로 쉬어 가요.'}[this.mood.period];
    this.world.updateTimeUI();this.debugUI?.sync();
  }
  apply(initial=false){
    const {edition,palette}=this.selection,theme=EDITIONS[edition],p=theme.palettes[palette];
    this.root.dataset.edition=edition;this.root.dataset.palette=p.name.toLowerCase().replaceAll(' ','-');
    this.target=Object.fromEntries(Object.entries(p.colors).map(([k,v])=>[k,rgb(v)]));this.materialTarget=theme.material;
    if(initial){this.colours=structuredClone(this.target);this.material={...theme.material};}
    document.getElementById('palette-name').textContent='빛과 시선';
    const labels=edition==='bauhaus'?['sound','cinema','print']:edition==='liquid'?['Music','Cinema','Journal']:['Listen.','Watch.','Read.'];
    document.querySelectorAll('.poster-display').forEach((el,i)=>el.textContent=labels[i]);
    document.querySelector('meta[name=theme-color]').content=p.colors.wash;
    this.syncSolid();this.world.needsPaint=true;document.getElementById('design-status').textContent='방의 분위기가 바뀌었어요.';
    if(initial)this.paint(0);
  }
  setManual(edition,palette=0){
    if(!this.debugEnabled)return;
    this.manual=edition?resolveDesign({edition,palette}):null;this.refresh();this.writeDebugURL();
  }
  setDebugHour(hour){
    if(!this.debugEnabled)return;
    this.debugHour=hour===null?null:normalizeHour(hour);this.refresh();this.writeDebugURL();
  }
  writeDebugURL(){
    const url=new URL(location.href);
    for(const key of['edition','palette','hour'])url.searchParams.delete(key);
    if(this.manual){url.searchParams.set('edition',this.manual.edition);url.searchParams.set('palette',this.manual.palette);}
    if(this.debugHour!==null)url.searchParams.set('hour',this.debugHour.toFixed(2));
    history.replaceState(null,'',url);
  }
  syncSolid(){
    this.root.dataset.solidGlass=String(this.solid);
    document.getElementById('solid-glass').setAttribute('aria-pressed',String(this.solid));
    document.getElementById('glass-option').hidden=this.selection.edition!=='liquid';
  }
  setPanel(open,focus=false){
    document.getElementById('space-controls').hidden=!open;
    document.getElementById('space-toggle').setAttribute('aria-expanded',String(open));
    if(focus)document.getElementById('space-toggle').focus({preventScroll:true});
  }
  step(dt){
    // Sample Date again after backgrounding; clock time never advances by animation frames.
    const context=`${this.world.activity}:${this.world.tracks[this.world.selected]?.id}:${Math.floor(Date.now()/1000)}`;
    if(context!==this.lastContext){this.lastContext=context;this.refresh();}
    this.paint(dt);
  }
  paint(dt){
    const ease=this.world.reduced?1:1-Math.exp(-dt/1100);
    for(const[key,goal]of Object.entries(this.target)){
      const next=easeColour(this.colours[key]||goal,goal,dt,this.world.reduced,1100);this.colours[key]=next;
      const value=`rgb(${next.map(Math.round).join(',')})`;
      if(this.root.style.getPropertyValue('--'+key)!==value)this.root.style.setProperty('--'+key,value);
    }
    for(const key of Object.keys(this.material)){
      const v=settle(this.material[key],this.materialTarget[key],dt,1100,this.world.reduced);
      if(Math.abs(v-this.material[key])>.0001)this.world.needsPaint=true;this.material[key]=v;
    }
    this.phaseGlow=settle(this.phaseGlow,this.mood.daylight,dt,1100,this.world.reduced);
    this.world.material=this.material;this.world.daylightStrength=this.phaseGlow;
    const strength=this.phaseGlow.toFixed(3);
    if(this.root.style.getPropertyValue('--daylight-strength')!==strength)this.root.style.setProperty('--daylight-strength',strength);
  }
  render(frame){
    const key=frame.floor.join(',');if(key===this.surfaceKey)return;this.surfaceKey=key;
    this.motifs.forEach(({node,points})=>node.setAttribute('d',mapPoints(frame.floor,points).map((p,i)=>`${i?'L':'M'}${p.map(n=>n.toFixed(2)).join(' ')}`).join('')+(points.length>2?'Z':'')));
    paintFloorSurface(this.surface,frame);
  }
  destroy(){this.abort.abort();this.debugUI?.destroy();}
}
