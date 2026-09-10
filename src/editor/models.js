import * as THREE from 'three';
import {WIDGETS,widgetSize} from './widget-catalog.js';
import {drawVariant} from './widget-variants.js';
import {drawWidget} from './widget-art.js';
import {reliefVertex,reliefFragment} from './relief.js';
import {displayDate} from './widget-appearance.js';
const S=1024;
export const ART_SIZES=Object.fromEntries(Object.entries(WIDGETS).map(([kind,widget])=>[kind,widget.size]));
const INK='#121318',PAPER='#ecebd7',ACID='#edff52',BLUE='#252ce5';
const font=(size,weight=500)=>`${weight} ${size}px "Uncut Sans",sans-serif`;
function random(seed){let n=seed;return()=>{n=(n*1664525+1013904223)>>>0;return n/4294967296;};}
/** Printed desktop windows: registered color and height artwork on a single plane. */
export function artwork(kind,accent=ACID,type='clay',date=new Date(),content='',variant='classic',appearance={}) {
  date=displayDate(date,appearance);
  const [w,h]=widgetSize(kind,variant),H=1000*h/w,c=document.createElement('canvas'),d=document.createElement('canvas');c.width=d.width=S;c.height=d.height=Math.round(S*h/w);
  const a=c.getContext('2d'),b=d.getContext('2d'),rand=random(kind.length*51);a.scale(S/1000,S/1000);b.scale(S/1000,S/1000);
  const gray=n=>`rgb(${n*255},${n*255},${n*255})`;
  function rect(x,y,w,h,color,depth=.6){a.fillStyle=color;a.fillRect(x,y,w,h);b.fillStyle=gray(depth);b.fillRect(x,y,w,h);}
  function text(t,x,y,size,color=PAPER,depth=.8,weight=650){a.fillStyle=color;a.font=font(size,weight);const width=a.textAlign==='center'?Math.max(40,Math.min(x,1000-x)*1.9):Math.max(40,970-x);a.fillText(t,x,y,width);b.fillStyle=gray(depth);b.font=a.font;b.fillText(t,x,y,width);}
  function mono(t,x,y,size,color=PAPER,depth=.75){a.fillStyle=color;a.font=`500 ${size}px monospace`;a.fillText(t,x,y);b.fillStyle=gray(depth);b.font=a.font;b.fillText(t,x,y);}
  function line(x,y,x2,y2,color,width=2,depth=.45){for(const [ctx,isDepth] of [[a,false],[b,true]]){ctx.strokeStyle=isDepth?gray(depth):color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x2,y2);ctx.stroke();}}
  function ellipse(x,y,rx,ry,color,depth=.6){for(const [ctx,isDepth] of [[a,false],[b,true]]){ctx.fillStyle=isDepth?gray(depth):color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();}}
  function ring(x,y,r,color,width=2,depth=.6){for(const [ctx,isDepth] of [[a,false],[b,true]]){ctx.strokeStyle=isDepth?gray(depth):color;ctx.lineWidth=width;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.stroke();}}
  function polygon(points,color,depth=.6){for(const [ctx,isDepth] of [[a,false],[b,true]]){ctx.fillStyle=isDepth?gray(depth):color;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();}}
  function path(draw,color,depth=.6){for(const [ctx,isDepth] of [[a,false],[b,true]]){ctx.fillStyle=isDepth?gray(depth):color;ctx.beginPath();draw(ctx);ctx.fill();}}
  function rounded(x,y,w,h,r,color,depth=.6){path(ctx=>ctx.roundRect(x,y,w,h,r),color,depth);}
  function centered(t,x,y,size,color=PAPER,depth=.8,weight=650){a.save();b.save();a.textAlign=b.textAlign='center';text(t,x,y,size,color,depth,weight);a.restore();b.restore();}
  function clip(draw,paint){a.save();b.save();for(const ctx of [a,b]){ctx.beginPath();draw(ctx);ctx.clip();}paint();a.restore();b.restore();}
  function hole(x,y,r){a.save();b.save();a.globalCompositeOperation=b.globalCompositeOperation='destination-out';ellipse(x,y,r,r,'#000',1);a.restore();b.restore();}
  const brushes={rect,text,mono,line,ellipse,ring,polygon,rounded,path,centered,clip,hole,H,accent,date,content,appearance};
  if(variant!=='classic')drawVariant(kind,variant,brushes);
  else drawWidget(kind,brushes);
  // Grain and print variants keep the transparent margin around each window.
  a.save();a.setTransform(1,0,0,1,0,0);a.globalCompositeOperation='source-atop';a.globalAlpha=.075;
  for(let i=0;i<21000;i++){a.fillStyle=i%2?'#fff':'#000';a.fillRect(rand()*c.width,rand()*c.height,1+rand()*1.3,1);}a.restore();
  if(type==='ink'){const pixels=a.getImageData(0,0,c.width,c.height);for(let i=0;i<pixels.data.length;i+=4){const n=.2126*pixels.data[i]+.7152*pixels.data[i+1]+.0722*pixels.data[i+2];pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=n;}a.putImageData(pixels,0,0);}
  if(type==='chrome'){a.save();a.setTransform(1,0,0,1,0,0);a.globalCompositeOperation='source-atop';a.globalAlpha=.2;const g=a.createLinearGradient(0,0,c.width,c.height);g.addColorStop(0,'#bdc7e7');g.addColorStop(.45,'#ffffff');g.addColorStop(.6,'#2837bb');g.addColorStop(1,'#ffffff');a.fillStyle=g;a.fillRect(0,0,c.width,c.height);a.restore();}
  const smooth=document.createElement('canvas');smooth.width=d.width;smooth.height=d.height;const depthContext=smooth.getContext('2d');depthContext.filter='blur(1.2px)';depthContext.drawImage(d,0,0);return {color:c,height:smooth};
}
function pickMap(images){const width=256,height=Math.round(256*images.color.height/images.color.width),canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(images.color,0,0,width,height);const alpha=ctx.getImageData(0,0,width,height).data;ctx.clearRect(0,0,width,height);ctx.drawImage(images.height,0,0,width,height);return {width,height,alpha,depth:ctx.getImageData(0,0,width,height).data};}
export function makeObject(kind,color=ACID,type='clay',depth=.24,content='',variant='classic',appearance={}){
  const images=artwork(kind,color,type,new Date(),content,variant,appearance),map=new THREE.CanvasTexture(images.color),height=new THREE.CanvasTexture(images.height);map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=4;height.generateMipmaps=false;height.minFilter=THREE.LinearFilter;
  const material=new THREE.ShaderMaterial({vertexShader:reliefVertex,fragmentShader:reliefFragment,uniforms:{uColor:{value:map},uHeight:{value:height},uDepth:{value:depth},uTexel:{value:new THREE.Vector2(1/images.height.width,1/images.height.height)},uLight:{value:1},uTint:{value:new THREE.Color('#ffffff')},uOpacity:{value:type==='glass'?.88:1}},transparent:true,depthWrite:type!=='glass'});
  const group=new THREE.Group(),size=widgetSize(kind,variant),mesh=new THREE.Mesh(new THREE.PlaneGeometry(...size),material);mesh.rotation.x=-Math.PI/2;mesh.name='relief';mesh.userData.pickMap=pickMap(images);group.add(mesh);
  const shadow=new THREE.Mesh(new THREE.PlaneGeometry(...size),new THREE.MeshBasicMaterial({map,color:'#000000',transparent:true,opacity:.38,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.set(.13,-.035,.18);shadow.userData.ignorePick=true;group.add(shadow);group.userData={kind,primary:material,color,type,variant,content,appearance,stamp:widgetStamp(kind,displayDate(new Date(),appearance))};return group;
}
export function disposeObject(group){const geometries=new Set(),materials=new Set(),textures=new Set();group.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>{materials.add(m);Object.values(m).forEach(v=>{if(v?.isTexture)textures.add(v);});Object.values(m.uniforms||{}).forEach(u=>{if(u.value?.isTexture)textures.add(u.value);});});});textures.forEach(t=>t.dispose());materials.forEach(m=>m.dispose());geometries.forEach(g=>g.dispose());}

const widgetStamp=(kind,date)=>kind==='clock'?Math.floor(date.getTime()/60000):kind==='calendar'?date.toDateString():null;
export function refreshWidget(group,date=new Date()){
  const {kind,color,type,stamp,variant,content,appearance={}}=group.userData,next=widgetStamp(kind,displayDate(date,appearance));if(next===null||stamp===next)return false;
  const images=artwork(kind,color,type,date,content,variant,appearance),mesh=group.getObjectByName('relief'),uniforms=mesh.material.uniforms;
  uniforms.uColor.value.image=images.color;uniforms.uColor.value.needsUpdate=true;uniforms.uHeight.value.image=images.height;uniforms.uHeight.value.needsUpdate=true;
  mesh.userData.pickMap=pickMap(images);group.userData.stamp=next;return true;
}
