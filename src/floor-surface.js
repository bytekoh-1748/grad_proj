import {mapPoints,corners,roundedOutline} from './floor-scene.js';

const circle=(u,v,r,n=24)=>Array.from({length:n},(_,i)=>{const a=i*Math.PI*2/n;return[u+Math.cos(a)*r,v+Math.sin(a)*r];});
const arc=(u,v,r,start,end)=>Array.from({length:90},(_,i)=>{const a=(start+(end-start)*i/89)*Math.PI/180;return[u+Math.cos(a)*r,v+Math.sin(a)*r];});

// All ornament is drawn in floor units, including dots: no screen-space texture overlay.
export function floorSurfaceData(){
  const items=[];
  const add=(kind,paths,{edition,fill='none',stroke='var(--ink)',opacity=.16,width=1.5,closed=false}={})=>items.push({kind,paths,edition,fill,stroke,opacity,width,closed});
  const line=(kind,points,options)=>add(kind,[points],options);
  // Large architectural panels, recessed joints and a fine skirting inlay.
  line('panel',corners(345,205,645,555),{fill:'var(--ink)',stroke:'none',opacity:.022,closed:true});
  line('panel',corners(990,760,610,470),{fill:'var(--paper)',stroke:'none',opacity:.035,closed:true});
  line('skirting',corners(-900,0,3400,12),{fill:'var(--ink)',stroke:'none',opacity:.14,closed:true});
  line('skirting',[[-900,14],[2500,14]],{stroke:'var(--paper)',opacity:.32,width:2});
  for(const u of[-300,345,990,1600,2210]){
    line('joint',[[u,16],[u,1670]]);
    line('joint-light',[[u+3,16],[u+3,1670]],{stroke:'var(--paper)',opacity:.2,width:1});
  }
  for(const v of[205,760,1230,1670]){
    line('joint',[[-700,v],[2400,v]]);
    line('joint-light',[[-700,v+3],[2400,v+3]],{stroke:'var(--paper)',opacity:.2,width:1});
  }
  // Two fine inlaid outlines hold the open space in front of the activities.
  line('inlay',roundedOutline(355,805,975,325,70),{stroke:'var(--art-a)',opacity:.27,width:2,closed:true});
  line('inlay',roundedOutline(373,823,939,289,55),{stroke:'var(--art-a)',opacity:.13,width:1,closed:true});
  for(const[u,v]of[[345,760],[990,760],[345,1230],[1600,1230]]){
    add('registration',[[[u-10,v],[u+10,v]],[[u,v-10],[u,v+10]]],{opacity:.32,width:2});
  }
  // Expressive: a cropped circular halftone and flowing, screen-printed ribbons.
  const dots=[];
  for(let u=-180;u<440;u+=26)for(let v=800;v<1440;v+=26){
    const distance=Math.hypot((u-100)/320,(v-1100)/310);
    if(distance<1)dots.push(circle(u,v,2.5+2.2*(1-distance),10));
  }
  add('halftone',dots,{edition:'expressive',fill:'var(--ink)',stroke:'none',opacity:.16,closed:true});
  for(const offset of[0,22,44]){
    const wave=Array.from({length:100},(_,i)=>{const u=430+i*12;return[u,980+offset+65*Math.sin((u-430)/220)];});
    line('ribbon',wave,{edition:'expressive',stroke:'var(--ink)',opacity:.17,width:4});
  }
  line('colour-tile',corners(1425,790,105,175),{edition:'expressive',fill:'var(--art-b)',stroke:'none',opacity:.66,closed:true});
  // Liquid: etched arcs and offset light lines, always on the same floor plane.
  for(const r of[280,310,340,370,401]){
    line('etched-arc',arc(1330,1020,r,100,282),{edition:'liquid',stroke:'var(--art-b)',opacity:.29,width:1.8});
    line('etched-glint',arc(1330,1020,r+4,150,230),{edition:'liquid',stroke:'var(--paper)',opacity:.30,width:1});
  }
  for(let i=0;i<4;i++)line('reflection',[[80+i*17,1440],[770+i*17,420]],{edition:'liquid',stroke:'var(--art-b)',opacity:.11,width:3});
  // Bauhaus: a contained checker field, concentric cut-outs and three parallel rules.
  const checks=[];
  for(let y=0;y<5;y++)for(let x=0;x<6;x++)if((x+y)%2===0)checks.push(corners(-50+x*42,865+y*42,42,42));
  add('checker',checks,{edition:'bauhaus',fill:'var(--ink)',stroke:'none',opacity:.25,closed:true});
  for(const r of[190,212,234])line('geometric-arc',arc(1470,1110,r,175,325),{edition:'bauhaus',stroke:'var(--art-a)',opacity:.7,width:5});
  for(const offset of[0,11,22])line('parallel-rule',[[430,1170+offset],[900,1170+offset]],{edition:'bauhaus',stroke:'var(--art-a)',opacity:.65,width:3});
  return items;
}

export function buildFloorSurface(parent){
  return floorSurfaceData().map(item=>{
    const node=document.createElementNS('http://www.w3.org/2000/svg','path');
    node.classList.add('floor-detail',`floor-${item.kind}`);
    if(item.edition){node.classList.add('surface-variant');node.dataset.editionArt=item.edition;}
    for(const[k,v]of Object.entries({fill:item.fill,stroke:item.stroke,'fill-opacity':item.opacity,'stroke-opacity':item.opacity,'stroke-width':item.width,'stroke-linecap':'round','stroke-linejoin':'round'}))node.setAttribute(k,v);
    parent.append(node);return{...item,node};
  });
}
export function paintFloorSurface(items,frame){
  for(const item of items){
    const d=item.paths.map(points=>mapPoints(frame.floor,points).map(([x,y],i)=>`${i?'L':'M'}${x.toFixed(2)} ${y.toFixed(2)}`).join('')+(item.closed?'Z':'')).join('');
    item.node.setAttribute('d',d);
  }
}
