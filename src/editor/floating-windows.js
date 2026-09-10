import {resizeWindow} from './window-geometry.js';
const KEY='room-tool-layout-v1';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const defaults={
  'library-window':{name:'오브제 보관함',dock:'bottom',w:480,h:380,minW:280,minH:220,x:()=>36,y:()=>60},
  'code-window':{name:'코드 창',dock:'right',w:720,h:550,minW:320,minH:300,x:w=>Math.max(36,w-756),y:()=>36},
};
const edges={n:'위',e:'오른쪽',s:'아래',w:'왼쪽',ne:'오른쪽 위',nw:'왼쪽 위',se:'오른쪽 아래',sw:'왼쪽 아래'};
/** Docked panels reserve real canvas space; detached panels keep their own geometry. */
export class FloatingWindows {
  constructor(host,{onChange=()=>{}}={}){
    Object.assign(this,{host,onChange,enabled:false,raised:200,active:null,opened:new Set(['library-window']),layout:{},restore:{},docks:{},heights:{},widths:{},events:new AbortController()});
    try{const saved=JSON.parse(localStorage.getItem(KEY)||'null');if(saved?.version===2){
      for(const [id,box]of Object.entries(saved.layout||{}))if(defaults[id]&&['x','y','w','h'].every(k=>Number.isFinite(box[k])))this.layout[id]=box;
      for(const [id,dock]of Object.entries(saved.docks||{}))if(defaults[id]&&['float',defaults[id].dock].includes(dock))this.docks[id]=dock;
      for(const prop of ['heights','widths'])for(const [id,value]of Object.entries(saved[prop]||{}))if(defaults[id]&&Number.isFinite(value))this[prop][id]=value;
    }}catch{}
    this.windows=new Map([...host.querySelectorAll('[data-studio-window]')].map(el=>[el.id,el]));const signal=this.events.signal;
    this.preview=document.createElement('div');this.preview.className='studio-dock-preview';this.preview.hidden=true;this.preview.setAttribute('aria-hidden','true');host.append(this.preview);
    for(const [id,el]of this.windows){
      el.addEventListener('pointerdown',()=>this.front(id),{signal});el.addEventListener('focusin',()=>this.front(id),{signal});
      el.querySelector('[data-window-close]').addEventListener('click',()=>this.close(id,true),{signal});
      const grip=el.querySelector('[data-window-drag]');grip.addEventListener('pointerdown',e=>this.begin(e,id,'move'),{signal});grip.addEventListener('dblclick',()=>this.toggleDock(id),{signal});grip.addEventListener('keydown',e=>this.keyboard(e,id,'move'),{signal});
      const dock=document.createElement('button');dock.dataset.windowDock='';dock.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16"/><path d="M14 4v16m-6-8h3m-2-2 2 2-2 2"/></svg>';dock.addEventListener('click',()=>this.toggleDock(id),{signal});el.querySelector('[data-window-maximize]').before(dock);
      const handles=[grip];
      for(const [edge,name]of Object.entries(edges)){
        const handle=document.createElement('button');handle.className='window-edge';handle.dataset.windowResize=edge;handle.setAttribute('aria-label',`${defaults[id].name} ${name} 크기 조절`);handle.title='드래그하여 크기 조절';handle.tabIndex=['n','w','se'].includes(edge)?0:-1;
        handle.addEventListener('pointerdown',e=>this.begin(e,id,'resize',edge),{signal});handle.addEventListener('keydown',e=>this.keyboard(e,id,'resize',edge),{signal});el.append(handle);handles.push(handle);
      }
      for(const handle of handles){handle.addEventListener('pointermove',e=>this.move(e),{signal});handle.addEventListener('pointerup',()=>this.end(),{signal});handle.addEventListener('pointercancel',()=>this.end(true),{signal});}
      el.querySelector('[data-window-maximize]').addEventListener('click',()=>this.maximize(id),{signal});
    }
    window.addEventListener('keydown',e=>{if(e.key==='Escape'&&this.drag){this.end(true);e.preventDefault();e.stopImmediatePropagation();}},{signal,capture:true});
    this.observer=new ResizeObserver(()=>{if(this.drag)this.end(true);this.reflow();});this.observer.observe(host);this.reflow();
  }
  get mobile(){return this.host.clientWidth<=760;}
  dock(id){return this.docks[id]||defaults[id].dock;}
  box(id){const d=defaults[id];return this.layout[id]||{x:d.x(this.host.clientWidth),y:d.y(this.host.clientHeight),w:d.w,h:d.h};}
  fit(box,id){const width=this.host.clientWidth,height=this.host.clientHeight,d=defaults[id],maxW=Math.max(80,width-24),maxH=Math.max(60,height-98),w=clamp(box.w,Math.min(d.minW,maxW),maxW),h=clamp(box.h,Math.min(d.minH,maxH),maxH);return {x:clamp(box.x,12,Math.max(12,width-w-12)),y:clamp(box.y,12,Math.max(12,height-h-86)),w,h};}
  panelHeight(id){const max=Math.max(100,this.host.clientHeight*.48);return clamp(this.heights[id]??260,Math.min(180,max),max);}
  panelWidth(id){const w=this.host.clientWidth,max=Math.max(160,w-170),min=Math.min(this.mobile?320:400,max);return clamp(this.widths[id]??(Math.min(530,w*.42)),min,max);}
  apply(id){
    const el=this.windows.get(id),dock=this.dock(id);el.dataset.dock=dock;el.classList.toggle('window-maximized',dock==='float'&&!!this.restore[id]);
    const button=el.querySelector('[data-window-dock]'),label=defaults[id].name+(dock==='float'?(defaults[id].dock==='bottom'?' 아래에 도킹':' 오른쪽에 도킹'):' 분리');button.setAttribute('aria-label',label);button.title=label;button.setAttribute('aria-pressed',String(dock!=='float'));
    for(const prop of ['left','top','width','height'])el.style.removeProperty(prop);
    if(dock==='float'){const b=this.fit(this.box(id),id);for(const [prop,key]of [['left','x'],['top','y'],['width','w'],['height','h']]){el.style[prop]=b[key]+'px';el.style.setProperty('--float-'+({left:'x',top:'y',width:'width',height:'height'}[prop]),b[key]+'px');}}
    else if(dock==='bottom')el.style.setProperty('--drawer-height',this.panelHeight(id)+'px');
    else el.style.setProperty('--panel-width',this.panelWidth(id)+'px');
    this.maximizeLabel(id);
  }
  reflow(){for(const id of this.windows.keys())this.apply(id);this.sync();}
  sync(){
    const app=document.querySelector('#app'),bottom=this.enabled&&this.opened.has('library-window')&&this.dock('library-window')==='bottom'?this.panelHeight('library-window'):0;
    const side=[...this.opened].find(id=>this.dock(id)==='right'),width=this.enabled&&side?this.panelWidth(side):0;
    app.dataset.libraryOpen=String(bottom>0);app.style.setProperty('--library-height',bottom+'px');app.style.setProperty('--studio-bottom',this.enabled?(bottom+66)+'px':'0px');app.style.setProperty('--studio-side',width+'px');
    for(const [id,el]of this.windows){this.show(id,this.enabled&&this.opened.has(id));el.classList.toggle('window-active',id===this.active);}
    for(const button of document.querySelectorAll('[data-window-toggle]'))button.setAttribute('aria-expanded',String(this.enabled&&this.opened.has(button.dataset.windowToggle)));this.onChange();
  }
  show(id,visible){const el=this.windows.get(id);el.hidden=!visible;el.inert=!visible;}
  enable(value){this.enabled=value;if(!value)this.end(true);else if(!this.active&&this.opened.size)this.front([...this.opened].at(-1));this.sync();}
  front(id){if(!this.windows.has(id)||id===this.active)return;this.active=id;this.windows.get(id).style.zIndex=String(++this.raised);for(const [key,el]of this.windows)el.classList.toggle('window-active',key===id);}
  open(id){if(!this.windows.has(id))return;if(this.mobile)this.opened.clear();if(this.dock(id)==='right')for(const other of this.opened)if(other!==id&&this.dock(other)==='right')this.opened.delete(other);this.opened.add(id);this.front(id);this.apply(id);this.sync();}
  close(id,focus=false){this.opened.delete(id);if(this.drag?.id===id)this.end(true);this.sync();if(focus)document.querySelector(`[data-window-toggle="${id}"]`)?.focus({preventScroll:true});}
  toggle(id){this.opened.has(id)?this.close(id):this.open(id);}
  closeAll(){this.end(true);this.opened.clear();this.sync();}
  setDock(id,dock){this.docks[id]=dock;delete this.restore[id];if(dock==='right')for(const other of this.opened)if(other!==id&&this.dock(other)==='right')this.opened.delete(other);this.apply(id);this.sync();}
  toggleDock(id){this.end(true);this.setDock(id,this.dock(id)==='float'?defaults[id].dock:'float');this.save();}
  arrange(){this.end(true);this.layout={};this.restore={};this.heights={};this.widths={};this.docks={};this.reflow();this.save();}
  begin(e,id,mode,edge='se'){
    if(e.button!==0||this.drag||this.restore[id])return;const dock=this.dock(id);if(mode==='resize'&&dock!=='float'&&edge!==(dock==='bottom'?'n':'w'))return;
    e.preventDefault();this.front(id);this.drag={id,mode,edge,dock,box:{...this.fit(this.box(id),id)},height:this.panelHeight(id),width:this.panelWidth(id),x:e.clientX,y:e.clientY,handle:e.currentTarget,pointer:e.pointerId};e.currentTarget.setPointerCapture(e.pointerId);this.windows.get(id).classList.add('window-dragging');
  }
  move(e){
    const d=this.drag;if(!d||e.pointerId!==d.pointer)return;const dx=e.clientX-d.x,dy=e.clientY-d.y;
    if(d.mode==='move'){
      if(Math.hypot(dx,dy)<8&&!d.detached)return;
      if(this.dock(d.id)!=='float'){
        const r=this.host.getBoundingClientRect(),b=this.fit(this.box(d.id),d.id);d.box={...b,x:e.clientX-r.left-b.w*.45-dx,y:e.clientY-r.top-22-dy};d.detached=true;this.setDock(d.id,'float');
      }
      this.layout[d.id]=this.fit({...d.box,x:d.box.x+dx,y:d.box.y+dy},d.id);
      const rect=this.host.getBoundingClientRect(),edge=defaults[d.id].dock;
      d.snap=edge==='right'?e.clientX>rect.right-65:e.clientY>rect.bottom-85;
      this.preview.hidden=!d.snap;this.preview.dataset.edge=edge;this.preview.style.setProperty('--preview-width',this.panelWidth(d.id)+'px');this.preview.style.setProperty('--preview-height',this.panelHeight(d.id)+'px');this.preview.textContent=edge==='right'?'오른쪽에 도킹':'아래에 도킹';
    }else if(d.dock==='bottom')this.heights[d.id]=d.height-dy;
    else if(d.dock==='right')this.widths[d.id]=d.width-dx;
    else this.layout[d.id]=resizeWindow(d.box,d.edge,dx,dy,{width:this.host.clientWidth,height:this.host.clientHeight,minWidth:defaults[d.id].minW,minHeight:defaults[d.id].minH});
    this.apply(d.id);this.sync();
  }
  end(cancel=false){
    const d=this.drag;if(!d)return;this.drag=null;this.preview.hidden=true;
    if(cancel){this.layout[d.id]=d.box;this.heights[d.id]=d.height;this.widths[d.id]=d.width;this.setDock(d.id,d.dock);}else if(d.snap)this.setDock(d.id,defaults[d.id].dock);
    this.windows.get(d.id).classList.remove('window-dragging');if(d.handle.hasPointerCapture(d.pointer))d.handle.releasePointerCapture(d.pointer);this.save();this.onChange();
  }
  keyboard(e,id,mode,edge='se'){
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)||this.restore[id])return;
    e.preventDefault();const b=this.fit(this.box(id),id),step=e.shiftKey?24:8,dx=e.key==='ArrowLeft'?-step:e.key==='ArrowRight'?step:0,dy=e.key==='ArrowUp'?-step:e.key==='ArrowDown'?step:0,dock=this.dock(id);
    if(dock==='bottom')this.heights[id]=this.panelHeight(id)-dy;else if(dock==='right')this.widths[id]=this.panelWidth(id)-dx;
    else this.layout[id]=mode==='move'?this.fit({...b,x:b.x+dx,y:b.y+dy},id):resizeWindow(b,edge,dx,dy,{width:this.host.clientWidth,height:this.host.clientHeight,minWidth:defaults[id].minW,minHeight:defaults[id].minH});
    this.apply(id);this.sync();this.save();
  }
  maximizeLabel(id){const button=this.windows.get(id).querySelector('[data-window-maximize]');button.setAttribute('aria-label',defaults[id].name+(this.restore[id]?' 원래 크기':' 크게 보기'));button.title=this.restore[id]?'원래 크기':'크게 보기';}
  maximize(id){if(this.dock(id)!=='float')return;this.end(true);if(this.restore[id]){this.layout[id]=this.restore[id];delete this.restore[id];}else{this.restore[id]={...this.fit(this.box(id),id)};this.layout[id]={x:12,y:12,w:this.host.clientWidth-24,h:this.host.clientHeight-98};}this.apply(id);this.save();this.onChange();}
  save(){try{localStorage.setItem(KEY,JSON.stringify({version:2,layout:{...this.layout,...this.restore},docks:this.docks,heights:this.heights,widths:this.widths}));}catch{}}
  destroy(){this.end(true);this.preview.remove();this.events.abort();this.observer.disconnect();}
}
