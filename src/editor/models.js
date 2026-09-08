import * as THREE from 'three';
import {WIDGETS,widgetSize} from './widget-catalog.js';
import {drawVariant} from './widget-variants.js';
import {drawWidget} from './widget-art.js';
import {reliefVertex,reliefFragment} from './relief.js';
const S=1024;
export const ART_SIZES=Object.fromEntries(Object.entries(WIDGETS).map(([kind,widget])=>[kind,widget.size]));
const INK='#121318',PAPER='#ecebd7',ACID='#edff52',BLUE='#252ce5';
const font=(size,weight=500)=>`${weight} ${size}px "Uncut Sans",sans-serif`;
function random(seed){let n=seed;return()=>{n=(n*1664525+1013904223)>>>0;return n/4294967296;};}
/** Printed desktop windows: registered color and height artwork on a single plane. */
export function artwork(kind,accent=ACID,type='clay',date=new Date(),content='',variant='classic') {
  const [w,h]=widgetSize(kind,variant),H=1000*h/w,c=document.createElement('canvas'),d=document.createElement('canvas');c.width=d.width=S;c.height=d.height=Math.round(S*h/w);
  const a=c.getContext('2d'),b=d.getContext('2d'),rand=random(kind.length*51);a.scale(S/1000,S/1000);b.scale(S/1000,S/1000);
  const gray=n=>`rgb(${n*255},${n*255},${n*255})`;
  function rect(x,y,w,h,color,depth=.6){a.fillStyle=color;a.fillRect(x,y,w,h);b.fillStyle=gray(depth);b.fillRect(x,y,w,h);}
  function text(t,x,y,size,color=PAPER,depth=.8,weight=650){a.fillStyle=color;a.font=font(size,weight);a.fillText(t,x,y);b.fillStyle=gray(depth);b.font=a.font;b.fillText(t,x,y);}
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
  function chrome(filename,{titleColor=INK,background=PAPER,menu=true}={}){
    rect(20,20,960,H-40,INK,.35);rect(26,26,944,H-54,'#bdbdb0',.64);
    line(28,28,967,28,'#fffdec',5,.87);line(28,28,28,H-34,'#fffdec',5,.87);line(967,30,967,H-31,'#55574e',7,.5);line(28,H-31,967,H-31,'#55574e',7,.5);
    rect(36,36,921,45,titleColor,.78);text('✦',45,68,27,PAPER,.9);mono(filename,78,66,21,PAPER,.9);mono('− □ ×',847,65,19,PAPER,.9);
    if(menu){rect(36,87,921,37,PAPER,.65);text('File   Edit   View   Memory',48,112,18,INK,.74,500);line(36,124,957,124,'#7e8175',3,.5);}
    const top=menu?133:91;rect(36,top,921,H-top-69,INK,.4);rect(43,top+7,907,H-top-82,background,.25);
    mono('ROOM® / PERSONAL ARCHIVE',43,H-43,15,'#3f423c',.71);mono('100%',894,H-43,15,'#3f423c',.71);return top+7;
  }
  if(variant!=='classic')drawVariant(kind,variant,{rect,text,mono,line,ellipse,ring,polygon,rounded,path,centered,clip,hole,H,accent,date,content});
  else if(kind==='camera'){
    const top=chrome('afterimage.png',{titleColor:BLUE,background:'#101244'});
    const gradient=a.createLinearGradient(0,top,0,H-70);gradient.addColorStop(0,'#080b29');gradient.addColorStop(.6,'#26227c');gradient.addColorStop(1,'#160f32');a.fillStyle=gradient;a.fillRect(43,top,907,H-top-82);
    for(let i=0;i<31;i++)line(500,430,43+i*30,H-82,i%3?'#5666d6':'#dd6fae',1.6,.25+i%4*.02);
    for(let i=0;i<15;i++){const y=448+Math.pow(i/14,1.9)*(H-530);line(43,y,950,y,'#b354a9',1.5,.28);}
    text('AFTER',66,298,146,PAPER,.9,850);text('IMAGE',66,438,146,PAPER,.88,850);
    rect(65,457,382,36,accent,.86);text('THINGS THAT NEVER LEFT.',77,482,22,INK,.94,500);
    ellipse(692,340,163,172,'#aca6f0',.51);ellipse(681,333,143,154,'#8b79d4',.42);
    a.save();b.save();for(const ctx of [a,b]){ctx.beginPath();ctx.ellipse(692,340,161,169,0,0,Math.PI*2);ctx.clip();}for(let i=0;i<39;i++)line(510,176+i*8.5,869,240+i*8.5,PAPER,2,.58);a.restore();b.restore();
    const colors=[accent,'#ff5b3b','#a398e5',PAPER];for(let i=0;i<175;i++){const x=492+rand()*426,y=310+Math.pow(rand(),.6)*(H-395),size=4+rand()*15;rect(x,y,size,size*(.4+rand()),colors[i%4],.45+rand()*.44);}
    for(let y=top;y<H-81;y+=7)line(45,y,949,y,'#7884ff24',1,.31);
    mono('REBUILDING / 2400 MEMORIES',65,H-99,15,PAPER,.78);
  } else if(kind==='turntable'){
    chrome('sound.exe',{background:BLUE});rect(56,151,879,57,INK,.5);text('SIDE A',72,192,31,accent,.87,750);mono('33⅓ RPM',738,192,26,PAPER,.8);
    ellipse(291,435,182,182,INK,.55);for(let i=0;i<37;i++)ring(291,435,173-i*3.4,i%4?'#515449':'#a1a195',1.7,.6+Math.sin(i)*.015);ellipse(291,435,47,47,accent,.79);ellipse(291,435,6,6,INK,.87);
    text('SOFT',525,316,112,PAPER,.91,850);text('NOISE',525,410,112,PAPER,.9,850);
    for(let i=0;i<85;i++){const x=534+i*4.5,amp=7+rand()*53;line(x,462-amp*.5,x,462+amp*.5,PAPER,1.8,.62+rand()*.17);}
    polygon([[552,573],[552,610],[583,591]],PAPER,.87);rect(624,573,12,37,PAPER,.87);rect(646,573,12,37,PAPER,.87);text('↗',708,606,37,PAPER,.88);
    mono('LISTEN / REPEAT / DISAPPEAR',65,H-99,15,PAPER,.78);
  } else if(kind==='lamp'){
    rect(24,24,952,H-48,INK,.4);rect(33,33,930,H-71,accent,.61);line(38,38,956,38,PAPER,6,.86);line(38,38,38,H-44,PAPER,6,.86);
    mono('chromatic.study',64,81,22,INK,.82);mono('NO. 04',811,81,20,INK,.82);
    const cx=505,cy=425;ellipse(cx,cy,317,317,'#537046',.36);for(const [r,color,height] of [[285,'#ff7543',.43],[245,PAPER,.51],[206,'#f27234',.59],[165,accent,.65],[128,PAPER,.73],[94,BLUE,.85]])ellipse(cx,cy,r,r,color,height);
    for(let y=145;y<742;y+=14)line(189,y,822,y,'#ecebd773',3,.72);
    text('SUN',67,H-245,152,INK,.86,850);text('WITHOUT',70,H-165,52,INK,.81,550);text('A WINDOW.',70,H-101,52,INK,.81,550);
  } else if(kind==='book'){
    chrome('untitled.txt',{menu:false,background:PAPER});mono('A note to myself.',62,157,25,'#757568',.7);line(60,184,931,184,'#c2c2ad',2,.49);
    ['KEEP','WHAT','MOVES','YOU.'].forEach((word,i)=>text(word,65,381+i*218,196,INK,.9-i*.02,600));
    rect(63,H-292,863,102,accent,.72);text('THE REST CAN WAIT.',76,H-226,46,INK,.84,500);mono('WORDS / NOT SORTED',524,H-112,20,'#686b60',.66);
  } else if(kind==='portal'){
    rect(52,50,923,H-75,INK,.35);rect(27,22,927,H-71,accent,.53);line(30,25,950,25,PAPER,5,.84);rect(36,33,906,41,INK,.8);mono('elsewhere.room',48,61,22,PAPER,.89);mono('↗ ×',866,60,21,accent,.92);
    for(let i=0;i<13;i++){const inset=56+i*15;for(const [ctx,isDepth]of[[a,false],[b,true]]){ctx.strokeStyle=isDepth?gray(.45+i*.027):i%2?'#c0c647':'#65702e';ctx.lineWidth=2;ctx.strokeRect(inset,95+i*14,864-i*30,H-166-i*27);}}
    rect(124,227,736,238,INK,.77);text('ELSEWHERE',143,329,96,PAPER,.95,800);text('MAYBE JUST NEXT ROOM ↗',145,406,28,accent,.88,600);
  } else if(kind==='projector'){
    chrome('moving_image.mp4',{background:'#111429'});const gradient=a.createLinearGradient(60,140,930,H-85);gradient.addColorStop(0,'#2d237f');gradient.addColorStop(.45,'#7954ac');gradient.addColorStop(1,BLUE);a.fillStyle=gradient;a.fillRect(44,141,905,H-223);
    for(let i=0;i<24;i++){const x=72+i*40;polygon([[x,153],[x+31,153],[x-80,H-83],[x-130,H-83]],i%3?BLUE:'#ecff5266',.3+i%4*.09);}
    text('MOVE',83,315,169,PAPER,.9,850);text('MENT',83,472,169,PAPER,.85,850);rect(69,522,832,2,PAPER,.69);rect(69,522,358,7,accent,.87);
    polygon([[76,576],[76,617],[108,597]],PAPER,.85);mono('00:13 / 00:32',150,608,26,PAPER,.8);mono('FRAME 0312',707,607,23,PAPER,.8);
    for(let y=146;y<H-87;y+=8)line(44,y,948,y,'#b8a9eb40',1,.4);
  }
  else drawWidget(kind,{rect,text,mono,line,ellipse,ring,polygon,chrome,H,accent,date,content});
  // Grain and print variants keep the transparent margin around each window.
  a.save();a.setTransform(1,0,0,1,0,0);a.globalCompositeOperation='source-atop';a.globalAlpha=.075;
  for(let i=0;i<21000;i++){a.fillStyle=i%2?'#fff':'#000';a.fillRect(rand()*c.width,rand()*c.height,1+rand()*1.3,1);}a.restore();
  if(type==='ink'){const pixels=a.getImageData(0,0,c.width,c.height);for(let i=0;i<pixels.data.length;i+=4){const n=.2126*pixels.data[i]+.7152*pixels.data[i+1]+.0722*pixels.data[i+2];pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=n;}a.putImageData(pixels,0,0);}
  if(type==='chrome'){a.save();a.setTransform(1,0,0,1,0,0);a.globalCompositeOperation='source-atop';a.globalAlpha=.2;const g=a.createLinearGradient(0,0,c.width,c.height);g.addColorStop(0,'#bdc7e7');g.addColorStop(.45,'#ffffff');g.addColorStop(.6,'#2837bb');g.addColorStop(1,'#ffffff');a.fillStyle=g;a.fillRect(0,0,c.width,c.height);a.restore();}
  const smooth=document.createElement('canvas');smooth.width=d.width;smooth.height=d.height;const depthContext=smooth.getContext('2d');depthContext.filter='blur(1.2px)';depthContext.drawImage(d,0,0);return {color:c,height:smooth};
}
function pickMap(images){const width=256,height=Math.round(256*images.color.height/images.color.width),canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(images.color,0,0,width,height);const alpha=ctx.getImageData(0,0,width,height).data;ctx.clearRect(0,0,width,height);ctx.drawImage(images.height,0,0,width,height);return {width,height,alpha,depth:ctx.getImageData(0,0,width,height).data};}
export function makeObject(kind,color=ACID,type='clay',depth=.24,content='',variant='classic'){
  const images=artwork(kind,color,type,new Date(),content,variant),map=new THREE.CanvasTexture(images.color),height=new THREE.CanvasTexture(images.height);map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=4;height.generateMipmaps=false;height.minFilter=THREE.LinearFilter;
  const material=new THREE.ShaderMaterial({vertexShader:reliefVertex,fragmentShader:reliefFragment,uniforms:{uColor:{value:map},uHeight:{value:height},uDepth:{value:depth},uTexel:{value:new THREE.Vector2(1/images.height.width,1/images.height.height)},uLight:{value:1},uTint:{value:new THREE.Color('#ffffff')},uOpacity:{value:type==='glass'?.88:1}},transparent:true,depthWrite:type!=='glass'});
  const group=new THREE.Group(),size=widgetSize(kind,variant),mesh=new THREE.Mesh(new THREE.PlaneGeometry(...size),material);mesh.rotation.x=-Math.PI/2;mesh.name='relief';mesh.userData.pickMap=pickMap(images);group.add(mesh);
  const shadow=new THREE.Mesh(new THREE.PlaneGeometry(...size),new THREE.MeshBasicMaterial({map,color:'#000000',transparent:true,opacity:.38,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.set(.13,-.035,.18);shadow.userData.ignorePick=true;group.add(shadow);group.userData={kind,primary:material,color,type,variant,content,stamp:widgetStamp(kind,new Date())};return group;
}
export function disposeObject(group){const geometries=new Set(),materials=new Set(),textures=new Set();group.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>{materials.add(m);Object.values(m).forEach(v=>{if(v?.isTexture)textures.add(v);});Object.values(m.uniforms||{}).forEach(u=>{if(u.value?.isTexture)textures.add(u.value);});});});textures.forEach(t=>t.dispose());materials.forEach(m=>m.dispose());geometries.forEach(g=>g.dispose());}

const widgetStamp=(kind,date)=>kind==='clock'?Math.floor(date.getTime()/60000):kind==='calendar'?date.toDateString():null;
export function refreshWidget(group,date=new Date()){
  const {kind,color,type,stamp,variant,content}=group.userData,next=widgetStamp(kind,date);if(next===null||stamp===next)return false;
  const images=artwork(kind,color,type,date,content,variant),mesh=group.getObjectByName('relief'),uniforms=mesh.material.uniforms;
  uniforms.uColor.value.image=images.color;uniforms.uColor.value.needsUpdate=true;uniforms.uHeight.value.image=images.height;uniforms.uHeight.value.needsUpdate=true;
  mesh.userData.pickMap=pickMap(images);group.userData.stamp=next;return true;
}
