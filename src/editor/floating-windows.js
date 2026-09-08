import {resizeWindow} from './window-geometry.js';
const KEY='room-tool-layout-v1';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const defaults={
  'library-window':{name:'오브제 보관함',w:370,h:520,minW:280,minH:280,x:()=>36,y:()=>90},
  'code-window':{name:'코드 창',w:840,h:570,minW:560,minH:360,x:w=>Math.max(420,w-924),y:()=>56},
  'properties-window':{name:'속성 창',w:312,h:482,minW:280,minH:300,x:()=>44,y:()=>168},
};
const edges={n:'위',e:'오른쪽',s:'아래',w:'왼쪽',ne:'오른쪽 위',nw:'왼쪽 위',se:'오른쪽 아래',sw:'왼쪽 아래'};
/** Movable, resizable surfaces. Their layout is separate from the room document. */
export class FloatingWindows {
  constructor(host,{onChange=()=>{}}={}){
    Object.assign(this,{host,onChange,enabled:false,raised:20,active:null,opened:new Set(['library-window']),layout:{},restore:{},mobileHeights:{},events:new AbortController()});
    try{const saved=JSON.parse(localStorage.getItem(KEY)||'null');if(saved?.version===1){for(const [id,box] of Object.entries(saved.layout||{}))if(defaults[id]&&['x','y','w','h'].every(k=>Number.isFinite(box[k])))this.layout[id]=box;for(const [id,height]of Object.entries(saved.mobileHeights||{}))if(defaults[id]&&Number.isFinite(height))this.mobileHeights[id]=height;}}catch{}
    this.windows=new Map([...host.querySelectorAll('[data-studio-window]')].map(el=>[el.id,el]));const signal=this.events.signal;
    for(const [id,el]of this.windows){
      el.addEventListener('pointerdown',()=>this.front(id),{signal});el.addEventListener('focusin',()=>this.front(id),{signal});
      el.querySelector('[data-window-close]').addEventListener('click',()=>this.close(id,true),{signal});
      const grip=el.querySelector('[data-window-drag]');grip.addEventListener('pointerdown',e=>this.begin(e,id,'move'),{signal});grip.addEventListener('dblclick',()=>this.maximize(id),{signal});grip.addEventListener('keydown',e=>this.keyboard(e,id,'move'),{signal});
      const handles=[grip];
      for(const [edge,name]of Object.entries(edges)){
        const handle=document.createElement('button');handle.className='window-edge';handle.dataset.windowResize=edge;handle.setAttribute('aria-label',`${defaults[id].name} ${name} 크기 조절`);handle.title='드래그하여 크기 조절';handle.tabIndex=['n','se'].includes(edge)?0:-1;
        handle.addEventListener('pointerdown',e=>this.begin(e,id,'resize',edge),{signal});handle.addEventListener('keydown',e=>this.keyboard(e,id,'resize',edge),{signal});el.append(handle);handles.push(handle);
      }
      for(const handle of handles){handle.addEventListener('pointermove',e=>this.move(e),{signal});handle.addEventListener('pointerup',()=>this.end(),{signal});handle.addEventListener('pointercancel',()=>this.end(true),{signal});}
      el.querySelector('[data-window-maximize]')?.addEventListener('click',()=>this.maximize(id),{signal});
    }
    window.addEventListener('keydown',e=>{if(e.key==='Escape'&&this.drag){this.end(true);e.preventDefault();e.stopImmediatePropagation();}},{signal,capture:true});
    this.observer=new ResizeObserver(()=>{if(this.drag)this.end(true);this.reflow();this.onChange();});this.observer.observe(host);this.reflow();
  }
  get mobile(){return this.host.clientWidth<=760;}
  box(id){const d=defaults[id];return this.layout[id]||{x:d.x(this.host.clientWidth),y:d.y(this.host.clientHeight),w:d.w,h:d.h};}
  fit(box,id){const width=this.host.clientWidth,height=this.host.clientHeight,d=defaults[id],maxW=Math.max(80,width-24),maxH=Math.max(60,height-98),w=clamp(box.w,Math.min(d.minW,maxW),maxW),h=clamp(box.h,Math.min(d.minH,maxH),maxH);return {x:clamp(box.x,12,Math.max(12,width-w-12)),y:clamp(box.y,12,Math.max(12,height-h-86)),w,h};}
  mobileHeight(id){const max=Math.max(100,this.host.clientHeight-104);return clamp(this.mobileHeights[id]??(id==='library-window'?490:470),Math.min(260,max),max);}
  apply(id){const el=this.windows.get(id);el.classList.toggle('window-maximized',!this.mobile&&!!this.restore[id]);if(this.mobile){for(const prop of ['left','top','width','height'])el.style.removeProperty(prop);el.style.setProperty('--mobile-window-height',this.mobileHeight(id)+'px');return;}const b=this.fit(this.box(id),id);for(const [prop,key]of [['left','x'],['top','y'],['width','w'],['height','h']])el.style[prop]=b[key]+'px';}
  reflow(){for(const id of this.windows.keys())this.apply(id);if(this.mobile&&this.opened.size>1){const keep=this.opened.has(this.active)?this.active:[...this.opened].at(-1);this.opened=new Set([keep]);}this.sync();}
  sync(){for(const [id,el]of this.windows){el.hidden=!this.enabled||!this.opened.has(id);el.classList.toggle('window-active',id===this.active);}for(const button of document.querySelectorAll('[data-window-toggle]'))button.setAttribute('aria-expanded',String(this.enabled&&this.opened.has(button.dataset.windowToggle)));this.onChange();}
  enable(value){this.enabled=value;if(!value)this.end(true);else if(!this.active&&this.opened.size)this.front([...this.opened].at(-1));this.sync();}
  front(id){if(!this.windows.has(id)||id===this.active)return;this.active=id;this.windows.get(id).style.zIndex=String(++this.raised);for(const [key,el]of this.windows)el.classList.toggle('window-active',key===id);}
  open(id){if(!this.windows.has(id))return;if(this.mobile)this.opened.clear();this.opened.add(id);this.front(id);this.apply(id);this.sync();}
  close(id,focus=false){this.opened.delete(id);if(this.drag?.id===id)this.end(true);this.sync();if(focus)document.querySelector(`[data-window-toggle="${id}"]`)?.focus({preventScroll:true});}
  toggle(id){this.opened.has(id)?this.close(id):this.open(id);}
  closeAll(){this.end(true);this.opened.clear();this.sync();}
  arrange(){this.end(true);this.layout={};this.restore={};this.mobileHeights={};for(const id of this.windows.keys())this.maximizeLabel(id);this.reflow();this.save();}
  begin(e,id,mode,edge='se'){
    if(e.button!==0||this.drag||(!this.mobile&&this.restore[id]))return;if(this.mobile&&mode==='resize'&&edge!=='n')return;
    e.preventDefault();this.front(id);const box=this.fit(this.box(id),id);this.drag={id,mode:this.mobile?'resize':mode,edge:this.mobile?'n':edge,box:{...box},mobile:this.mobile,height:this.mobileHeight(id),x:e.clientX,y:e.clientY,handle:e.currentTarget,pointer:e.pointerId};e.currentTarget.setPointerCapture(e.pointerId);this.windows.get(id).classList.add('window-dragging');
  }
  move(e){const d=this.drag;if(!d||e.pointerId!==d.pointer)return;const dx=e.clientX-d.x,dy=e.clientY-d.y;if(d.mobile)this.mobileHeights[d.id]=clamp(d.height-dy,Math.min(260,this.host.clientHeight-104),this.host.clientHeight-104);else this.layout[d.id]=d.mode==='move'?this.fit({...d.box,x:d.box.x+dx,y:d.box.y+dy},d.id):resizeWindow(d.box,d.edge,dx,dy,{width:this.host.clientWidth,height:this.host.clientHeight,minWidth:defaults[d.id].minW,minHeight:defaults[d.id].minH});this.apply(d.id);this.onChange();}
  end(cancel=false){const d=this.drag;if(!d)return;if(cancel){if(d.mobile)this.mobileHeights[d.id]=d.height;else this.layout[d.id]=d.box;this.apply(d.id);}this.drag=null;this.windows.get(d.id).classList.remove('window-dragging');if(d.handle.hasPointerCapture(d.pointer))d.handle.releasePointerCapture(d.pointer);this.save();this.onChange();}
  keyboard(e,id,mode,edge='se'){
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)||(!this.mobile&&this.restore[id]))return;if(this.mobile&&!['ArrowUp','ArrowDown'].includes(e.key))return;
    e.preventDefault();const b=this.fit(this.box(id),id),step=e.shiftKey?24:8,dx=e.key==='ArrowLeft'?-step:e.key==='ArrowRight'?step:0,dy=e.key==='ArrowUp'?-step:e.key==='ArrowDown'?step:0;
    if(this.mobile)this.mobileHeights[id]=clamp(this.mobileHeight(id)-dy,Math.min(260,this.host.clientHeight-104),this.host.clientHeight-104);
    else this.layout[id]=mode==='move'?this.fit({...b,x:b.x+dx,y:b.y+dy},id):resizeWindow(b,edge,dx,dy,{width:this.host.clientWidth,height:this.host.clientHeight,minWidth:defaults[id].minW,minHeight:defaults[id].minH});
    this.apply(id);this.save();this.onChange();
  }
  maximizeLabel(id){const button=this.windows.get(id).querySelector('[data-window-maximize]');if(button){button.setAttribute('aria-label',defaults[id].name+(this.restore[id]?' 원래 크기':' 크게 보기'));button.title=this.restore[id]?'원래 크기':'크게 보기';}}
  maximize(id){if(this.mobile)return;this.end(true);if(this.restore[id]){this.layout[id]=this.restore[id];delete this.restore[id];}else{this.restore[id]={...this.fit(this.box(id),id)};this.layout[id]={x:12,y:12,w:this.host.clientWidth-24,h:this.host.clientHeight-98};}this.maximizeLabel(id);this.apply(id);this.save();this.onChange();}
  save(){try{localStorage.setItem(KEY,JSON.stringify({version:1,layout:{...this.layout,...this.restore},mobileHeights:this.mobileHeights}));}catch{}}
  destroy(){this.end(true);this.events.abort();this.observer.disconnect();}
}
