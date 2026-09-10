/** The colophon is also the physical lip of the studio drawer. */
export class StudioDrawer {
  constructor(handle,{onChange,isOpen}) {
    Object.assign(this,{handle,onChange,isOpen,events:new AbortController()});
    const signal=this.events.signal;
    handle.addEventListener('pointerdown',e=>{
      if(e.button!==0)return;
      this.suppressClick=false;this.drag={id:e.pointerId,y:e.clientY,open:isOpen(),moved:false};handle.setPointerCapture(e.pointerId);handle.classList.add('pulling');
    },{signal});
    handle.addEventListener('pointermove',e=>{
      const d=this.drag;if(!d||d.id!==e.pointerId)return;
      const dy=e.clientY-d.y;if(Math.abs(dy)>6)d.moved=true;
      handle.style.setProperty('--pull',Math.max(-20,Math.min(20,dy*.25))+'px');
      if((!d.open&&dy< -32)||(d.open&&dy>32)){d.committed=true;onChange(!d.open);this.finish();}
    },{signal});
    handle.addEventListener('pointerup',()=>this.finish(),{signal});
    handle.addEventListener('pointercancel',()=>this.finish(),{signal});
    handle.addEventListener('click',e=>{if(this.suppressClick){e.preventDefault();this.suppressClick=false;return;}onChange(!isOpen());},{signal});
    handle.addEventListener('keydown',e=>{
      if(!['ArrowUp','ArrowDown','Escape'].includes(e.key))return;
      e.preventDefault();onChange(e.key==='ArrowUp');
    },{signal});
  }
  finish(){const d=this.drag;if(!d)return;this.suppressClick=d.moved||d.committed;this.drag=null;this.handle.classList.remove('pulling');this.handle.style.removeProperty('--pull');if(this.handle.hasPointerCapture(d.id))this.handle.releasePointerCapture(d.id);}
  sync(open){this.handle.setAttribute('aria-expanded',String(open));this.handle.setAttribute('aria-label',open?'꾸미기 서랍 닫고 감상하기':'꾸미기 서랍 열기');this.handle.querySelector('#drawer-hint').textContent=open?'내려서 감상 ↓':'끌어올려 꾸미기 ↑';}
  destroy(){this.finish();this.events.abort();}
}
