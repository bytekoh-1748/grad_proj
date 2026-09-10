import * as THREE from 'three';
import {PlatformWalker, supportAt, platformRoute} from './platform-motion.js';
import {drawResident, FIGURE_WIDTH, FIGURE_HEIGHT} from './resident-figure.js';
import {WidgetVisit} from './widget-scenes.js';
import {ResidentBurrow} from './resident-burrow.js';
import {VisitorSchedule} from './visitor-schedule.js';
import {activityFor, ACTIVITY_SECONDS, ENTRY_SECONDS, EXIT_SECONDS} from './widget-activities.js';

/** Turn the visible upper silhouette into ledges in the same X/Y/Z as the art. */
export function meshPlatforms(mesh, id, kind) {
  const image = mesh.material.uniforms?.uColor.value.image || mesh.material.map?.image;
  if (!image) return [];
  mesh.updateWorldMatrix(true, false);
  const {width, height} = mesh.geometry.parameters;
  const corner = (x, y) => mesh.localToWorld(new THREE.Vector3(x * width, y * height, 0));
  const a = corner(-.5, .5), b = corner(.5, .5), c = corner(-.5, -.5), d = corner(.5, -.5);
  const minX = Math.min(a.x, b.x, c.x, d.x), maxX = Math.max(a.x, b.x, c.x, d.x), minZ = Math.min(a.z, b.z, c.z, d.z), maxZ = Math.max(a.z, b.z, c.z, d.z);
  const resolution = 512, density = resolution / Math.max(maxX - minX, maxZ - minZ);
  const canvas = document.createElement('canvas'); canvas.width = Math.ceil((maxX - minX) * density) + 2; canvas.height = Math.ceil((maxZ - minZ) * density) + 2;
  const ctx = canvas.getContext('2d', {willReadFrequently: true});
  ctx.setTransform((b.x - a.x) * density / image.width, (b.z - a.z) * density / image.width, (c.x - a.x) * density / image.height, (c.z - a.z) * density / image.height, (a.x - minX) * density, (a.z - minZ) * density);
  ctx.drawImage(image, 0, 0);
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const normal = new THREE.Vector3(0, 0, 1).transformDirection(mesh.matrixWorld);
  const planeY = (x, z) => a.y - (normal.x * (x - a.x) + normal.z * (z - a.z)) / normal.y;
  const platforms = []; let run = [];
  const flush = () => { if (run.length > 1 && run.at(-1).x - run[0].x > .6) platforms.push({id: `${id}:${platforms.length}`, kind, objectId: id, points: run, mesh, matrix: mesh.matrixWorld.clone()}); run = []; };
  for (let px = 0; px < canvas.width; px += 2) {
    let pz = 0; while (pz < canvas.height && pixels[(pz * canvas.width + px) * 4 + 3] < 180) pz++;
    if (pz === canvas.height) { flush(); continue; }
    const x = minX + px / density, z = minZ + pz / density, point = {x, z, y: planeY(x, z)};
    if (run.length && Math.abs(point.z - run.at(-1).z) > (point.x - run.at(-1).x) * 1.8 + .045) flush();
    run.push(point);
  }
  flush(); return platforms;
}

function resident(seed) {
  const actor = new PlatformWalker(seed), canvas = document.createElement('canvas'); canvas.width = 192; canvas.height = 256;
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const geometry = new THREE.PlaneGeometry(FIGURE_WIDTH, FIGURE_HEIGHT); geometry.translate(0, FIGURE_HEIGHT * (.5 - 10 / 256), 0);
  const figure = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({map: texture, transparent: true, depthWrite: false, alphaTest: .05})); figure.rotation.x = -Math.PI / 2;
  figure.name = `paper-resident-${seed + 1}`; figure.renderOrder = 4;
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(.22, 24), new THREE.MeshBasicMaterial({color: '#080915', transparent: true, opacity: .2, depthWrite: false})); shadow.rotation.x = -Math.PI / 2; shadow.scale.y = .16;
  return {actor,canvas,figure,shadow,lastPaint:-1,visit:null,cooldowns:new Map(),phase:'inside',phaseTime:0,targetId:null};
}

export class PlatformResidents {
  constructor(world,{seed=Date.now()}={}) {
    this.world=world;this.seed=seed;this.dirty=true;this.group=new THREE.Group();this.group.name='platform-residents';world.scene.add(this.group);
    this.burrow=new ResidentBurrow(world.scene);this.residents=Array.from({length:3},(_,i)=>resident(i));this.schedule=new VisitorSchedule(seed);this.tripCounts=new Map();this.interactionsEnabled=true;
    for(const r of this.residents){this.group.add(r.shadow,r.figure);r.figure.visible=r.shadow.visible=false;}
    this.actor=this.residents[0].actor;this.figure=this.residents[0].figure;
  }
  invalidate(){this.dirty=true;}
  get activeCount(){return this.residents.filter(r=>r.phase!=='inside').length;}
  retire(r){if(r.visit)r.visit.dispose();r.visit=null;r.phase='inside';r.phaseTime=0;r.targetId=null;r.actor.visible=false;r.actor.destinationId=null;r.figure.visible=r.shadow.visible=false;}
  reset(seed=this.seed){for(const r of this.residents)this.retire(r);this.schedule=new VisitorSchedule(seed);this.tripCounts.clear();}
  endVisit(r){
    if(!r.visit)return;
    const visit=r.visit,actor=r.actor,platform=actor.platform,entry=visit.mesh.localToWorld(visit.entry.clone());
    const x=Math.max(platform.points[0].x+.05,Math.min(platform.points.at(-1).x-.05,entry.x));Object.assign(actor,supportAt(platform,x));
    actor.state='idle';actor.elapsed=1.1;actor.goal=null;actor.vx=actor.vz=actor.accumulator=0;
    visit.dispose();r.visit=null;r.lastPaint=-1;r.phase='return';r.targetId=null;actor.destinationId='BURROW';actor.destinationX=this.burrow.origin.x;
  }
  rebuild(){
    this.reset(this.seed);
    const type=this.world.art.getObjectByName('room-type'),platforms=type?meshPlatforms(type,'ROOM','type'):[];
    for(const [id,group]of this.world.objects)platforms.push(...meshPlatforms(group.getObjectByName('relief'),id,group.userData.data.kind));
    const anchor=platforms.find(p=>p.kind==='lamp')||platforms.find(p=>activityFor(p.kind))||platforms[0];
    if(anchor)platforms.push(this.burrow.place(anchor));else this.burrow.mesh.visible=false;
    for(const r of this.residents){r.actor.setPlatforms(platforms);r.actor.visible=false;r.phase='inside';r.lastPaint=-1;}
    this.dirty=false;
  }
  carryMovingLedges() {
    const platforms = this.actor.platforms || [];
    for (const [id, object] of this.world.objects) {
      if (object.userData.data.motion === 'none') continue;
      const ledges = platforms.filter(p => p.objectId === id); if (!ledges.length) continue;
      const mesh = ledges[0].mesh; mesh.updateWorldMatrix(true, false);
      if (mesh.matrixWorld.equals(ledges[0].matrix)) continue;
      const delta = mesh.matrixWorld.clone().multiply(ledges[0].matrix.clone().invert());
      const move = point => { const p = new THREE.Vector3(point.x, point.y, point.z).applyMatrix4(delta); return {x: p.x, y: p.y, z: p.z}; };
      for (const r of this.residents) {
        const actor = r.actor; if (r.visit) continue;
        const groundedHere = actor.platform?.objectId === id && actor.state !== 'air';
        const takeoff = groundedHere && actor.goal ? supportAt(actor.platform, actor.goal.takeoffX) : null;
        if (groundedHere) Object.assign(actor, move(actor));
        if (takeoff) actor.goal.takeoffX = move(takeoff).x;
        if (actor.goal?.target && actor.goal.platform.objectId === id) actor.goal.target = move(actor.goal.target);
      }
      for (const ledge of ledges) { ledge.points = ledge.points.map(move); ledge.matrix.copy(mesh.matrixWorld); }
    }
  }

  choices(){
    if(!this.interactionsEnabled||!this.burrow.platform)return [];
    const reserved=new Set(this.residents.filter(r=>r.phase!=='inside').map(r=>r.targetId)),seen=new Set(),platforms=this.actor.platforms||[];
    return platforms.filter(p=>{
      if(!activityFor(p.kind)||reserved.has(p.objectId)||seen.has(p.objectId))return false;seen.add(p.objectId);
      return platformRoute(platforms,this.burrow.platform,p.objectId)&&platformRoute(platforms,p,'BURROW');
    });
  }
  depart(r,target){
    const actor=r.actor,origin=this.burrow.origin;
    Object.assign(actor,origin);actor.platform=this.burrow.platform;actor.state='idle';actor.elapsed=0;actor.visible=true;actor.direction=1;actor.goal=null;actor.vx=actor.vz=actor.accumulator=0;
    actor.destinationId=target.objectId;actor.destinationX=null;actor.entered=actor.time;
    r.phase='emerge';r.phaseTime=0;r.targetId=target.objectId;r.lastPaint=-1;this.tripCounts.set(target.objectId,(this.tripCounts.get(target.objectId)||0)+1);
  }
  startVisit(r){
    const actor=r.actor;if(!this.interactionsEnabled||actor.platform?.objectId!==r.targetId||actor.state!=='idle'||actor.elapsed<.4)return;
    if(this.residents.some(other=>other.visit?.data.id===r.targetId))return;
    const object=this.world.objects.get(r.targetId);if(!object){r.phase='return';actor.destinationId='BURROW';return;}
    r.visit=new WidgetVisit(object,actor);this.group.add(r.visit.group);actor.state='visit';r.phase='visit';r.lastPaint=-1;
  }
  update(dt){
    this.group.visible=!this.world.editable;if(this.dirty)this.rebuild();if(this.world.editable)return false;
    const step=this.world.reduced?0:Math.min(.1,Math.max(0,dt));this.carryMovingLedges();
    if(step){
      const available=this.residents.find(r=>r.phase==='inside'),mouthBusy=this.residents.some(r=>r.phase==='emerge'||r.phase==='enter');
      const needsTarget=!this.schedule.batchOpen||this.schedule.remaining>0;
      const choices=needsTarget&&available&&!mouthBusy&&this.schedule.time+step>=this.schedule.nextAt?this.choices():[];
      if(this.schedule.tick(step,this.activeCount,mouthBusy,choices.length>0)){
        const ranked=choices.map(p=>({p,score:(this.tripCounts.get(p.objectId)||0)+this.schedule.random()*2})).sort((a,b)=>a.score-b.score);
        this.depart(available,ranked[0].p);
      }
    }
    for(const r of this.residents){
      const {actor,figure,shadow}=r;if(r.phase==='inside'){figure.visible=shadow.visible=false;continue;}
      let pose={},opacity=1,scale=1;r.phaseTime+=step;
      if(r.phase==='emerge'||r.phase==='enter'){
        actor.time+=step;actor.distance+=step*.62;const emerging=r.phase==='emerge',t=Math.min(1,r.phaseTime/1.5),ease=t*t*(3-2*t);
        actor.x=this.burrow.origin.x+(emerging?ease*.46:(1-ease)*(r.entryX-this.burrow.origin.x));actor.y=this.burrow.origin.y;actor.z=this.burrow.origin.z;actor.direction=emerging?1:-1;
        pose={mode:'walk'};opacity=emerging?ease:1-ease;scale=.82+.18*opacity;
        if(t===1){if(emerging){r.phase='travel';actor.state='idle';actor.elapsed=1.2;r.phaseTime=0;}else{this.retire(r);continue;}}
      }else if(!r.visit&&step){
        actor.update(step);
        if(!actor.visible){this.retire(r);continue;}
        if(r.phase==='travel')this.startVisit(r);
        if(r.phase==='return'&&actor.platform?.objectId==='BURROW'&&actor.state==='idle'){
          r.phase='enter';r.phaseTime=0;r.entryX=actor.x;actor.goal=null;
        }
      }
      if(r.visit){
        actor.time+=step;const visit=r.visit,sample=visit.update(step),p=visit.mesh.localToWorld(new THREE.Vector3(sample.position.x,sample.position.y,sample.position.z));Object.assign(actor,{x:p.x,y:p.y,z:p.z});
        figure.position.copy(p);const worldScale=visit.mesh.getWorldScale(new THREE.Vector3()),exitTime=visit.time-ENTRY_SECONDS-ACTIVITY_SECONDS[visit.activity];
        const entrance=sample.phase==='exit'?Math.max(0,1-exitTime/EXIT_SECONDS):Math.min(1,visit.time/1.05);
        figure.scale.copy(new THREE.Vector3(1,1,1).lerp(worldScale.multiplyScalar(visit.scale),entrance));
        const outsideRotation=new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI/2,0,0));figure.quaternion.copy(outsideRotation.slerp(visit.mesh.getWorldQuaternion(new THREE.Quaternion()),entrance));
        pose={mode:sample.mode,hand:sample.hand,direction:1,blend:sample.blend};shadow.visible=false;if(sample.done){this.endVisit(r);pose={};}
      }
      if(!r.visit){
        figure.position.set(actor.x,actor.y+.008,actor.z);figure.rotation.set(-Math.PI/2,0,0);figure.scale.setScalar(scale);
        const contact=actor.state==='air'?supportAt(actor.goal.platform,actor.x):{x:actor.x,y:actor.y,z:actor.z};shadow.visible=!!contact;
        if(contact){const gap=Math.max(0,contact.z-actor.z);shadow.position.set(contact.x,contact.y+.004,contact.z+.01);shadow.material.opacity=opacity*.24/(1+gap*3);shadow.scale.x=1+Math.min(1,gap)*.4;}
      }
      figure.visible=actor.visible;figure.material.opacity=opacity;
      const paint=Math.floor(actor.time*30);if(paint!==r.lastPaint){drawResident(r.canvas,actor,pose);figure.material.map.needsUpdate=true;r.lastPaint=paint;}
    }
    return !this.world.reduced||this.world.needsRender;
  }
}
