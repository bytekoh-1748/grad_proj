import * as THREE from 'three';
import {makeObject,disposeObject,artwork,refreshWidget} from './models.js';
import {WIDGETS} from './widget-catalog.js';
import {constrainView,reliefContains} from './relief.js';
import {roomMood,localHour} from '../room-mood.js';
export const PALETTES={citrus:{floor:'#252ce5',wall:'#252ce5',ink:'#f0efcf'},berry:{floor:'#f34c2b',wall:'#f34c2b',ink:'#201717'},blue:{floor:'#111224',wall:'#111224',ink:'#eaff51'},paper:{floor:'#0b7c84',wall:'#0b7c84',ink:'#ebe9d9'}};
export const VIEWS={floor:{position:[0,22,0],target:[0,0,0],fov:46},close:{position:[0,18,0],target:[0,0,0],fov:46},graphic:{position:[0,25,0],target:[0,0,0],fov:46}};
const rad=THREE.MathUtils.degToRad,clamp=THREE.MathUtils.clamp;
export class RoomRenderer {
  constructor(host,{onSelect=()=>{},onTransform=()=>{},onBlocked=()=>{},onReady=()=>{},onView=()=>{}}={}){
    Object.assign(this,{host,onSelect,onTransform,onBlocked,onReady,onView,objects:new Map(),editable:false,blocked:false,selected:null,tool:'direct',snap:false,reduced:matchMedia('(prefers-reduced-motion: reduce)').matches,playing:false,needsRender:true,time:0});
    this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.65));host.append(this.renderer.domElement);
    this.renderer.domElement.setAttribute('aria-label','ROOM 콜라주. 감상에서는 마우스 움직임으로 깊이를 느낄 수 있습니다. 편집에서는 오른쪽 드래그로 회전, 선택한 오브제 위 스크롤로 깊이를 조절합니다.');
    this.scene=new THREE.Scene();this.camera=new THREE.PerspectiveCamera(46,1,.1,180);this.camera.up.set(0,0,-1);this.target=new THREE.Vector3();this.lean=new THREE.Vector2();this.basePosition=new THREE.Vector3(0,22,0);this.baseHeight=22;
    this.floor=new THREE.Mesh(new THREE.PlaneGeometry(160,160),new THREE.MeshBasicMaterial());this.floor.rotation.x=-Math.PI/2;this.floor.position.y=-2;this.scene.add(this.floor);
    this.art=new THREE.Group();this.scene.add(this.art);this.grid=new THREE.GridHelper(60,60,'#f2efc9','#606be2');this.grid.position.y=-.5;this.grid.material.transparent=true;this.grid.material.opacity=.24;this.grid.visible=false;this.scene.add(this.grid);
    this.raycaster=new THREE.Raycaster();this.pointer=new THREE.Vector2();this.events=new AbortController();const signal=this.events.signal,canvas=this.renderer.domElement;
    canvas.addEventListener('pointerdown',e=>this.pointerDown(e),{signal});canvas.addEventListener('pointermove',e=>this.pointerMove(e),{signal});canvas.addEventListener('pointerup',e=>this.pointerUp(e),{signal});canvas.addEventListener('pointercancel',()=>this.cancelDrag(),{signal});canvas.addEventListener('pointerleave',()=>{this.flushWheel();this.lean.set(0,0);this.needsRender=true;},{signal});
    canvas.addEventListener('contextmenu',e=>{if(this.editable)e.preventDefault();},{signal});canvas.addEventListener('wheel',e=>this.wheel(e),{signal,passive:false});
    document.addEventListener('pointerdown',()=>this.flushWheel(),{signal,capture:true});document.addEventListener('keydown',e=>e.key==='Escape'?this.cancelWheel():this.flushWheel(),{signal,capture:true});
    window.addEventListener('pagehide',()=>this.flushWheel(),{signal});
    canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.contextLost=true;this.onBlocked('그래픽 연결이 끊겼습니다. 저장한 뒤 새로고침해 주세요.');},{signal});
    document.addEventListener('visibilitychange',()=>{this.flushWheel();this.last=performance.now();this.needsRender=true;if(!document.hidden&&!this.frame)this.frame=requestAnimationFrame(t=>this.tick(t));},{signal});
    this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(host);this.resize();this.last=performance.now();this.frame=requestAnimationFrame(t=>this.tick(t));
  }
  resize(){const {width,height}=this.host.getBoundingClientRect();if(!width||!height)return;this.mobile=width<650;this.renderer.setSize(width,height);this.camera.aspect=width/height;this.camera.updateProjectionMatrix();this.baseHeight=Math.max(22,18/this.camera.aspect/.849);if(this.data)this.home(true);this.needsRender=true;}
  apply(data,{resetView=false}={}){
    this.cancelWheel();const previous=this.data;this.data=data;const ids=new Set(data.objects.map(o=>o.id));
    for(const [id,g]of this.objects)if(!ids.has(id)){this.scene.remove(g);disposeObject(g);this.objects.delete(id);}
    for(const [i,o]of data.objects.entries()){
      let g=this.objects.get(o.id);const old=g?.userData.data;
      if(g&&(old.kind!==o.kind||old.color!==o.color||old.material!==o.material||old.variant!==o.variant||(o.kind==='sketch'&&old.content!==o.content))){this.scene.remove(g);disposeObject(g);this.objects.delete(o.id);g=null;}
      if(!g){g=new THREE.Group();g.add(makeObject(o.kind,o.color,o.material,o.relief,o.content,o.variant));g.userData.id=o.id;this.scene.add(g);this.objects.set(o.id,g);}
      g.userData.data=o;g.userData.layer=i*.008;g.position.fromArray(o.at);g.position.y+=g.userData.layer+(o.surface==='wall'?-.2:.1);
      g.rotation.set(rad(clamp(o.rotate[0],-12,12)),rad(o.rotate[1]),rad(clamp(o.rotate[2],-12,12)));g.scale.setScalar(o.scale);
      g.children[0].getObjectByName('relief').material.uniforms.uDepth.value=o.relief??.24;
    }
    this.updatePalette();
    if(!previous||JSON.stringify(previous.shader)!==JSON.stringify(data.shader))this.setShader(data.shader);
    if(!previous||previous.room!==data.room||previous.palette!==data.palette||previous.title!==data.title)this.makeArt();
    if(!previous||previous.room!==data.room||JSON.stringify(previous.objects.map(o=>[o.id,o.kind,o.at,o.scale]))!==JSON.stringify(data.objects.map(o=>[o.id,o.kind,o.at,o.scale])))this.makeFragments();
    if(resetView||!previous||previous.composition!==data.composition||JSON.stringify(previous.camera)!==JSON.stringify(data.camera))this.home(true);
    this.select(this.selected);this.needsRender=true;
  }
  updatePalette(){if(!this.data)return;const mood=roomMood({hour:localHour(),activity:this.data.room==='music'?'music':'home',trackId:this.trackId});const p=PALETTES[this.data.palette]||PALETTES[mood.daylight>.5?'citrus':'blue'];if(this.palette?.floor!==p.floor){this.palette=p;this.floor.material.color.set(p.floor);this.scene.background=new THREE.Color(p.floor);this.host.style.background=p.floor;this.needsRender=true;}
    const cycle=this.data.light.cycle,level=clamp(.62+this.data.light.intensity*.126,.5,1.3)*(cycle==='pulse'&&!this.reduced?1+Math.sin(this.time*.7)*.07:cycle==='day'?.8+mood.daylight*.2:1);for(const g of this.objects.values()){const u=g.children[0].getObjectByName('relief').material.uniforms;u.uLight.value=level;u.uTint.value.set(this.data.light.color);}
  }
  makeArt(){while(this.art.children.length){const o=this.art.children[0];this.art.remove(o);disposeObject(o);}const c=document.createElement('canvas');c.width=3072;c.height=950;const ctx=c.getContext('2d');ctx.fillStyle=this.palette.ink;ctx.font='850 870px "Uncut Sans",sans-serif';ctx.letterSpacing='-75px';ctx.fillText('ROOM',-2,788,3000);const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;const m=new THREE.Mesh(new THREE.PlaneGeometry(29,9),new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false}));m.rotation.x=-Math.PI/2;m.position.set(0,-1.7,-4.5);this.art.add(m);
    const ring=new THREE.Mesh(new THREE.RingGeometry(8.8,8.815,120),new THREE.MeshBasicMaterial({color:this.palette.ink,transparent:true,opacity:.26}));ring.rotation.x=-Math.PI/2;ring.position.set(5,-1.6,3);this.art.add(ring);this.needsRender=true;
  }
  makeFragments(){if(this.fragments){this.scene.remove(this.fragments);disposeObject(this.fragments);}this.fragments=new THREE.Group();this.scene.add(this.fragments);this.fragmentItems=[];
    const anchor=this.data.objects.find(o=>o.kind==='camera'||o.kind==='projector');if(!anchor)return;let seed=427;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
    const colors=['#edff52','#e9e7d9','#ff5635','#545fff'],dummy=new THREE.Object3D();
    colors.forEach((color,k)=>{const c=document.createElement('canvas');c.width=c.height=64;const ctx=c.getContext('2d');ctx.fillStyle='#101012';ctx.fillRect(0,0,64,64);ctx.fillStyle=color;ctx.fillRect(3,3,58,58);ctx.fillStyle='#19191a';if(k===0){ctx.beginPath();ctx.arc(32,32,15,0,Math.PI*2);ctx.fill();}else if(k===1){for(let y=12;y<56;y+=10)ctx.fillRect(12,y,40-(y%3)*5,2);}else if(k===2){ctx.fillRect(15,12,34,40);ctx.fillStyle=color;for(let y=17;y<50;y+=9){ctx.fillRect(18,y,4,4);ctx.fillRect(42,y,4,4);}}else{ctx.beginPath();ctx.moveTo(12,48);ctx.lineTo(32,13);ctx.lineTo(52,48);ctx.closePath();ctx.fill();}ctx.fillStyle='#fff';ctx.globalAlpha=.55;ctx.fillRect(5,5,54,2);const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;const m=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:tex}),100);m.userData.ignorePick=true;this.fragments.add(m);
      for(let i=0;i<100;i++){const t=rand(),pile=i>55,spread=pile?3.7:t*2.6;const x=anchor.at[0]+2.4+3.2*t+(rand()-.5)*spread*2;const z=anchor.at[2]+1.6+(pile?6.3+rand()*1.6:t*7);const size=.06+Math.pow(rand(),2)*.27;const item={m,i,x,z,y:.3+rand()*.8,size,angle:rand()*Math.PI*2,phase:rand()*6.3,pile};this.fragmentItems.push(item);dummy.position.set(x,item.y,z);dummy.rotation.set(-Math.PI/2,0,item.angle);dummy.scale.setScalar(size);dummy.updateMatrix();m.setMatrixAt(i,dummy.matrix);}m.instanceMatrix.needsUpdate=true;m.frustumCulled=false;
    });this.dummy=dummy;this.needsRender=true;
  }
  validateShader(code){if(!code)return;const gl=this.renderer.getContext(),s=gl.createShader(gl.FRAGMENT_SHADER);gl.shaderSource(s,`precision highp float; vec3 roomSurface(vec3 color,vec3 p,float time){${code}\n}\nvoid main(){gl_FragColor=vec4(roomSurface(vec3(1.),vec3(0.),0.),1.);}`);gl.compileShader(s);const ok=gl.getShaderParameter(s,gl.COMPILE_STATUS),log=gl.getShaderInfoLog(s);gl.deleteShader(s);if(!ok)throw new Error(`셰이더 컴파일 오류: ${log}`);}
  setShader(s){this.validateShader(s.code);this.uniforms={uRoomTime:{value:0},uRoomStrength:{value:s.strength},uRoomSpeed:{value:s.speed}};const patterns={grain:'fract(sin(dot(vRoomPosition.xz,vec2(12.9898,78.233)))*43758.5453)',stripes:'smoothstep(.48,.52,fract(vRoomPosition.z*8.+uRoomTime*uRoomSpeed*.08))',checker:'mod(floor(vRoomPosition.x)+floor(vRoomPosition.z),2.)',none:'.5'};
    this.floor.material.onBeforeCompile=shader=>{Object.assign(shader.uniforms,this.uniforms);shader.vertexShader='varying vec3 vRoomPosition;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvRoomPosition=(modelMatrix*vec4(position,1.)).xyz;');shader.fragmentShader=`varying vec3 vRoomPosition;uniform float uRoomTime;uniform float uRoomStrength;uniform float uRoomSpeed;vec3 roomSurface(vec3 color,vec3 p,float time){${s.code||'return color;'}\n}\n`+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>\ndiffuseColor.rgb*=1.+(${patterns[s.pattern]}-.5)*uRoomStrength*.35;diffuseColor.rgb=clamp(roomSurface(diffuseColor.rgb,vRoomPosition,uRoomTime),0.,1.);`);};this.floor.material.customProgramCacheKey=()=>JSON.stringify(s);this.floor.material.needsUpdate=true;
  }
  home(instant=false,override){this.flat=false;const preset=VIEWS[this.data?.composition||'floor'];const p=structuredClone(override||this.data?.camera||preset);if(!override&&!this.data?.camera)p.position[1]=this.baseHeight*(preset.position[1]/22);this.flyTo(p,instant);}
  flyTo(p,instant=false){const next=constrainView(p,this.baseHeight);this.viewTarget=next;this.lean.set(0,0);if(instant||this.reduced){this.basePosition.fromArray(next.position);this.target.fromArray(next.target);this.camera.position.copy(this.basePosition);this.camera.lookAt(this.target);this.viewTarget=null;}this.needsRender=true;}
  focus(id){const g=this.objects.get(id);if(!g)return;const z=g.position.z,x=g.position.x;this.flat=false;this.flyTo({position:[x,this.baseHeight*.76,z],target:[x,0,z],fov:46});}
  top(){this.flat=true;this.flyTo({position:[this.target.x,this.baseHeight,this.target.z],target:this.target.toArray(),fov:46});this.setGrid(true);}
  cameraState(){return {position:this.basePosition.toArray().map(n=>+n.toFixed(3)),target:this.target.toArray().map(n=>+n.toFixed(3)),fov:46};}
  setGrid(v){this.grid.visible=v;this.needsRender=true;}
  setMode(editable,blocked=false){if(this.editable!==editable){this.flushWheel();this.cancelDrag();this.lean.set(0,0);}this.editable=editable;this.blocked=blocked;if(blocked)this.cancelDrag();this.select(this.selected);}
  setTool(mode){this.tool=mode;this.needsRender=true;}
  setSnap(v){this.snap=v;}
  select(id){if(id!==this.selected)this.flushWheel();this.selected=this.objects.has(id)?id:null;this.needsRender=true;}
  ray(event){const r=this.renderer.domElement.getBoundingClientRect();this.pointer.set((event.clientX-r.left)/r.width*2-1,-(event.clientY-r.top)/r.height*2+1);this.raycaster.setFromCamera(this.pointer,this.camera);return this.raycaster;}
  pick(event){const hits=this.ray(event).intersectObjects([...this.objects.values()],true);const hit=hits.find(h=>{if(h.object.userData.ignorePick)return false;const map=h.object.userData.pickMap;if(!map)return true;const inverse=h.object.matrixWorld.clone().invert(),eye=this.raycaster.ray.direction.clone().transformDirection(inverse).negate();return reliefContains(map,h.uv,eye,h.object.material.uniforms.uDepth.value);});if(!hit)return null;let g=hit.object;while(g&&!g.userData.id)g=g.parent;return g;}
  surfacePoint(event,surface='floor'){const plane=new THREE.Plane(new THREE.Vector3(0,1,0),surface==='wall'?.2:0);return this.ray(event).ray.intersectPlane(plane,new THREE.Vector3());}
  capturePointer(e){if(e.pointerId!==undefined)this.renderer.domElement.setPointerCapture(e.pointerId);}
  pointerDown(e){
    if(this.drag||this.viewDrag||![0,2].includes(e.button))return;this.flushWheel();
    const secondary=e.button===2||(e.button===0&&e.ctrlKey);if(secondary&&!this.editable)return;const g=this.pick(e);this.down={x:e.clientX,y:e.clientY,id:g?.userData.id,secondary};
    if(secondary){
      e.preventDefault?.();
      if(!g){this.viewTarget=null;this.viewDrag={x:e.clientX,y:e.clientY,position:this.basePosition.clone(),camera:this.camera.position.clone()};this.capturePointer(e);return;}
    }
    if(!this.editable||!g)return;
    if(this.blocked){this.down=null;this.onBlocked('미적용 코드를 먼저 실행하거나 되돌려 주세요.');return;}
    this.onSelect(g.userData.id);const p=this.surfacePoint(e,g.userData.data.surface);
    if(p){this.viewTarget=null;const touch=e.pointerType==='touch'||e.pointerType==='pen',mode=secondary?(this.tool==='scale'?'scale':'rotate'):touch?this.tool:'direct';this.drag={g,start:g.position.clone(),point:p,rotation:g.rotation.y,scale:g.scale.x,mode};this.capturePointer(e);}
  }
  beginHandle(e,mode){
    this.flushWheel();const g=this.objects.get(this.selected),touch=e.pointerType==='touch'||e.pointerType==='pen',secondary=e.button===2||(e.button===0&&e.ctrlKey);if(!this.editable||!g||!(secondary||(touch&&e.button===0)))return false;if(this.blocked){this.onBlocked('미적용 코드를 먼저 실행하거나 되돌려 주세요.');return false;}
    const frame=this.frameFor(this.selected),r=this.host.getBoundingClientRect();if(!frame)return false;const center={x:r.left+frame.center.x,y:r.top+frame.center.y};this.viewTarget=null;
    this.down={x:e.clientX,y:e.clientY,id:this.selected};this.drag={g,start:g.position.clone(),point:this.surfacePoint(e,g.userData.data.surface),rotation:g.rotation.y,scale:g.scale.x,mode,handle:true,center,lastAngle:Math.atan2(e.clientY-center.y,e.clientX-center.x),turn:0,radius:Math.max(12,Math.hypot(e.clientX-center.x,e.clientY-center.y))};this.needsRender=true;return true;
  }
  pointerMove(e){if(this.viewDrag){const d=this.viewDrag;this.basePosition.x=clamp(d.position.x+(e.clientX-d.x)*.009,this.target.x-1.4,this.target.x+1.4);this.basePosition.z=clamp(d.position.z+(e.clientY-d.y)*.009,this.target.z-1.1,this.target.z+1.1);this.needsRender=true;return;}if(this.drag){const d=this.drag,{g,start,point,rotation,scale}=d,mode=d.mode||this.tool;const dx=e.clientX-this.down.x,dy=e.clientY-this.down.y;
    if(mode==='rotate'){let angle=rotation+dx*.006;if(d.handle){const next=Math.atan2(e.clientY-d.center.y,e.clientX-d.center.x);d.turn+=Math.atan2(Math.sin(next-d.lastAngle),Math.cos(next-d.lastAngle));d.lastAngle=next;angle=rotation-d.turn;}g.rotation.y=this.snap?Math.round(angle/(Math.PI/12))*Math.PI/12:angle;}
    else if(mode==='scale'){const n=clamp(d.handle?scale*Math.hypot(e.clientX-d.center.x,e.clientY-d.center.y)/d.radius:scale*Math.exp((dx-dy)*.004),.15,6);g.scale.setScalar(this.snap?clamp(Math.round(n*10)/10,.15,6):n);}
    else{const p=this.surfacePoint(e,g.userData.data.surface);if(!p||!point)return;const v=start.clone().add(p.sub(point));v.y=start.y;if(this.snap){v.x=Math.round(v.x*2)/2;v.z=Math.round(v.z*2)/2;}v.x=clamp(v.x,-100,100);v.z=clamp(v.z,-100,100);g.position.copy(v);}this.needsRender=true;this.onView();
    }else{const hit=this.pick(e);this.renderer.domElement.style.cursor=hit?(this.editable?'grab':'pointer'):'crosshair';if(!this.editable&&!this.reduced&&!this.flat){const r=this.host.getBoundingClientRect();this.lean.set(clamp((e.clientX-r.left)/r.width*2-1,-1,1),clamp((e.clientY-r.top)/r.height*2-1,-1,1));this.needsRender=true;}}}
  pointerUp(e){
    if(this.viewDrag){this.viewDrag=null;this.needsRender=true;}
    else if(this.drag){const {g,start,rotation,scale}=this.drag,moved=g.position.distanceTo(start)>.001||Math.abs(g.rotation.y-rotation)>.001||Math.abs(g.scale.x-scale)>.001;this.drag=null;if(moved)this.finishTransform();this.needsRender=true;this.onView();}
    else if(this.down&&!this.down.secondary&&Math.hypot(e.clientX-this.down.x,e.clientY-this.down.y)<5){const g=this.pick(e);if(!this.editable)this.onSelect(g?.userData.id??null,true);else if(!g)this.onSelect(null);}
    this.down=null;
  }
  cancelDrag(){this.cancelWheel();if(this.viewDrag){this.basePosition.copy(this.viewDrag.position);this.camera.position.copy(this.viewDrag.camera);this.viewDrag=null;}if(this.drag){this.drag.g.position.copy(this.drag.start);this.drag.g.rotation.y=this.drag.rotation;this.drag.g.scale.setScalar(this.drag.scale);}this.drag=null;this.down=null;this.needsRender=true;}
  wheel(e){
    if(!this.editable||e.ctrlKey||e.metaKey)return;e.preventDefault();if(this.drag||this.viewDrag)return;
    const delta=clamp(e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?this.host.clientHeight:1),-100,100);if(!delta)return;
    const g=this.pick(e);
    if(this.editable&&g?.userData.id===this.selected){
      if(this.blocked){this.onBlocked('미적용 코드를 먼저 실행하거나 되돌려 주세요.');return;}
      if(this.wheelEdit?.g!==g)this.flushWheel();
      const edit=this.wheelEdit||{g,id:g.userData.id,start:g.userData.data.relief,value:g.userData.data.relief};
      edit.value=clamp(edit.value-delta*.0015,0,.65);this.wheelEdit=edit;this.flat=false;
      g.getObjectByName('relief').material.uniforms.uDepth.value=edit.value;clearTimeout(this.wheelTimer);this.wheelTimer=setTimeout(()=>this.flushWheel(),220);this.needsRender=true;this.onView();
    }else{
      this.flushWheel();const p=structuredClone(this.viewTarget||this.cameraState()),factor=Math.exp(delta*.0015);p.position=p.position.map((n,i)=>p.target[i]+(n-p.target[i])*factor);this.flyTo(p);
    }
  }
  flushWheel(){
    clearTimeout(this.wheelTimer);const edit=this.wheelEdit;this.wheelEdit=null;if(!edit||this.objects.get(edit.id)!==edit.g)return;
    if(Math.abs(edit.value-edit.start)>.0005)this.onTransform(edit.id,{relief:+edit.value.toFixed(3)});this.needsRender=true;
  }
  cancelWheel(){clearTimeout(this.wheelTimer);if(this.wheelEdit){this.wheelEdit.g.getObjectByName('relief').material.uniforms.uDepth.value=this.wheelEdit.start;this.wheelEdit=null;this.needsRender=true;}}
  finishTransform(){const g=this.objects.get(this.selected);if(!g||this.blocked)return;const o=g.userData.data;this.onTransform(this.selected,{at:[+g.position.x.toFixed(2),o.at[1],+g.position.z.toFixed(2)],rotate:[o.rotate[0],+(((THREE.MathUtils.radToDeg(g.rotation.y)+180)%360+360)%360-180).toFixed(1),o.rotate[2]],scale:+g.scale.x.toFixed(2)});}
  preview(kind,event,surface='floor',variant='classic'){if(!this.ghost||this.ghost.userData.kind!==kind||this.ghost.userData.variant!==variant){this.clearPreview();this.ghost=makeObject(kind,WIDGETS[kind].color,'clay',.24,'',variant);this.ghost.getObjectByName('relief').material.transparent=true;this.ghost.getObjectByName('relief').material.uniforms.uOpacity.value=.55;this.scene.add(this.ghost);}const p=this.surfacePoint(event,surface);this.ghost.visible=!!p;if(p){p.y=0;this.ghost.position.copy(p);this.ghost.position.y=.2;}this.needsRender=true;return p?.toArray();}
  clearPreview(){if(this.ghost){this.scene.remove(this.ghost);disposeObject(this.ghost);this.ghost=null;this.needsRender=true;}}
  frameFor(id){
    const g=this.objects.get(id);if(!g)return null;const mesh=g.getObjectByName('relief'),{width,height}=mesh.geometry.parameters;mesh.updateWorldMatrix(true,false);
    const corners=[[-1,1],[1,1],[1,-1],[-1,-1]].map(([x,y])=>{const p=mesh.localToWorld(new THREE.Vector3(x*width/2,y*height/2,0)).project(this.camera);return {x:(p.x+1)*this.host.clientWidth/2,y:(1-p.y)*this.host.clientHeight/2,z:p.z};});
    const center={x:corners.reduce((n,p)=>n+p.x,0)/4,y:corners.reduce((n,p)=>n+p.y,0)/4};const left=Math.min(...corners.map(p=>p.x)),right=Math.max(...corners.map(p=>p.x)),top=Math.min(...corners.map(p=>p.y)),bottom=Math.max(...corners.map(p=>p.y));
    return {corners,center,left,right,top,bottom,visible:corners.every(p=>p.z<1)&&right>0&&left<this.host.clientWidth&&bottom>0&&top<this.host.clientHeight,angle:THREE.MathUtils.radToDeg(g.rotation.y),scale:g.scale.x};
  }
  projected(id){const g=this.objects.get(id);if(!g)return null;const point=g.position.clone().add(new THREE.Vector3(0,0,-g.getObjectByName('relief').geometry.parameters.height*g.scale.x/2)).project(this.camera);return {x:(point.x+1)*this.host.clientWidth/2,y:(1-point.y)*this.host.clientHeight/2,visible:point.z<1&&Math.abs(point.x)<1&&Math.abs(point.y)<1};}
  tick(now){this.frame=null;if(document.hidden||this.contextLost)return;const dt=Math.min((now-this.last)/1000,.05);this.last=now;if(!this.reduced)this.time+=dt;let animated=false;
    if(this.viewTarget){const p=this.viewTarget;this.basePosition.lerp(new THREE.Vector3(...p.position),.14);this.target.lerp(new THREE.Vector3(...p.target),.14);if(this.basePosition.distanceTo(new THREE.Vector3(...p.position))<.003)this.viewTarget=null;this.needsRender=true;}
    const want=this.basePosition.clone();if(!this.editable&&!this.reduced&&!this.flat){want.x+=this.lean.x*1.1;want.z+=this.lean.y*.8;}want.x=clamp(want.x,this.target.x-1.4,this.target.x+1.4);want.z=clamp(want.z,this.target.z-1.1,this.target.z+1.1);if(!this.drag&&this.camera.position.distanceTo(want)>.001){this.camera.position.lerp(want,this.reduced?1:.1);this.needsRender=true;}this.camera.lookAt(this.target);
    for(const [id,g]of this.objects){const o=g.userData.data,m=g.children[0];m.position.y=0;m.rotation.y=0;m.scale.setScalar(1);m.getObjectByName('relief').material.uniforms.uDepth.value=this.flat?0:(this.wheelEdit?.id===id?this.wheelEdit.value:(o.relief??.24));if(!this.reduced&&o.motion!=='none'&&!(this.editable&&id===this.selected)){if(o.motion==='float')m.position.y=Math.sin(this.time*.7)*.09;if(o.motion==='spin')m.rotation.y=Math.sin(this.time*.35)*.025;if(o.motion==='pulse')m.scale.setScalar(1+Math.sin(this.time)*.012);animated=true;}}
    if(!this.reduced&&this.fragmentItems?.length){for(const item of this.fragmentItems){const d=this.dummy;d.position.set(item.x+Math.sin(this.time*.3+item.phase)*.07,item.y,item.z+(item.pile?.025:.12)*Math.sin(this.time*.4+item.phase));d.rotation.set(-Math.PI/2,0,item.angle+Math.sin(this.time*.2+item.phase)*.03);d.scale.setScalar(item.size);d.updateMatrix();item.m.setMatrixAt(item.i,d.matrix);item.m.instanceMatrix.needsUpdate=true;}animated=true;}
    const minute=Math.floor(Date.now()/60000);if(this.widgetMinute!==minute){this.widgetMinute=minute;const date=new Date();for(const g of this.objects.values())if(refreshWidget(g.children[0],date))this.needsRender=true;}
    if(this.data){this.updatePalette();if(this.uniforms)this.uniforms.uRoomTime.value=this.time;if(!this.reduced&&(this.data.light.cycle==='pulse'||this.data.shader.code||this.data.shader.pattern==='stripes'))animated=true;}
    if(this.needsRender||animated){this.renderer.render(this.scene,this.camera);this.needsRender=false;this.onReady();this.onView();}this.frame=requestAnimationFrame(t=>this.tick(t));
  }
  thumbnail(kind,color,variant='classic'){return artwork(kind,color,'clay',new Date(),'',variant).color.toDataURL('image/png');}
  destroy(){this.cancelWheel();cancelAnimationFrame(this.frame);this.events.abort();this.resizeObserver.disconnect();disposeObject(this.scene);this.renderer.dispose();}
}
