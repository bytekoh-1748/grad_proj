import { homography, project, mix } from './vector-math.js';

export const FLOOR = Object.freeze({ width:1600, depth:1000 });

// These are positions on ONE sheet of floor, never screen coordinates.
// The rear edge is v=0. Every object footprint stays on the v>0 side.
export const OBJECTS = Object.freeze({
  deck: {u:-70,v:24,width:760,depth:560},
  cue: {u:1070,v:650,r:173,angle:-7},
  stack: [
    {u:1480,v:170,r:150,angle:-13},
    {u:1540,v:275,r:157,angle:-5},
    {u:1540,v:380,r:164,angle:4},
    {u:1500,v:485,r:171,angle:11},
    {u:1440,v:585,r:178,angle:18},
  ],
});

// Only the shared floor projection changes between compositions.
// Default rear edge follows the user's red guide: y ≈ .268x - 68.
export const FLOOR_VIEWS = {
  home: {floor:[-120,-150,1690,205,1510,1180,-520,825], rise:[.055,-1.05]},
  cinema: {floor:[-240,300,1710,535,1550,1220,-660,930], rise:[.04,-1.03]},
  journal: {floor:[-150,-45,1690,245,1500,1130,-470,840], rise:[.04,-1.02]},
  listen: {floor:[-250,-135,1650,375,1300,1250,-740,740], rise:[.055,-1.05]},
  room: {floor:[-40,90,1490,365,1460,1070,-400,745], rise:[-.035,-1.00]},
  deck: {floor:[80,240,1550,-100,1950,1020,-70,1220], rise:[-.08,-1.03]},
  wall: {floor:[-200,220,1710,525,1640,1110,-710,720], rise:[.065,-1.03]},
};

export function floorView(name, drag=[0,0]) {
  if(!FLOOR_VIEWS[name])throw new RangeError(`Unknown floor view: ${name}`);
  const p=structuredClone(FLOOR_VIEWS[name]),[dx,dy]=drag;
  p.floor=p.floor.map((n,i)=>n+(i%2?dy*(i<4?-70:95):dx*(i<4?60:-80)));
  p.rise[0]+=dx*.02;
  return p;
}

export function adaptFloor(view,height=900) {
  // A single viewport adjustment, applied before deriving ANY object or boundary.
  const portrait=Math.max(0,Math.min(1,(height-1800)/1650));
  const fit=Math.max(.75,Math.min(1.10,Math.sqrt(height/900)))+portrait*.55;
  const offset=Math.max(0,height-900*fit)*.24;
  const q=view.floor.map((n,i)=>i%2?n*fit+offset:n);
  const floor=homography(q,FLOOR.width,FLOOR.depth);
  // Wall and floor share exactly the same parameterization along v=0 / z=0.
  const wall=[floor[0],floor[1],view.rise[0],view.rise[1]*fit,floor[4],floor[5],floor[6],0];
  return {floor,wall,quad:q};
}

export function corners(u,v,width,depth,angle=0) {
  const c=Math.cos(angle*Math.PI/180),s=Math.sin(angle*Math.PI/180);
  return [[0,0],[width,0],[width,depth],[0,depth]].map(([x,y])=>[u+c*x-s*y,v+s*x+c*y]);
}
export const mapPoints=(h,points)=>points.map(([u,v])=>project(h,u,v));
export function objectQuad(h,pose) {
  const c=Math.cos((pose.angle||0)*Math.PI/180),s=Math.sin((pose.angle||0)*Math.PI/180);
  return [[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,y])=>project(h,pose.u+pose.r*(c*x-s*y),pose.v+pose.r*(s*x+c*y)));
}
export function deckProjection(floor) {
  const {u,v,width,depth}=OBJECTS.deck;
  return homography(mapPoints(floor,corners(u,v,width,depth)).flat(),760,560);
}
export function circleOnFloor(h,pose,offset=[0,0]) {
  return Array.from({length:96},(_,i)=>{const a=i*Math.PI/48;return project(h,pose.u+offset[0]+pose.r*Math.cos(a),pose.v+offset[1]+pose.r*Math.sin(a));});
}

export function cssProjection(quad,width,height,scale=1,zoom=1,origin=[800,450]) {
  const points=quad.map(([x,y])=>[(origin[0]+(x-origin[0])*zoom)*scale,(origin[1]+(y-origin[1])*zoom)*scale]);
  const [a,b,c,d,e,f,g,h]=homography(points.flat(),width,height);
  return `matrix3d(${[a,b,0,g,c,d,0,h,0,0,1,0,e,f,0,1].map(n=>Number(n.toFixed(8))).join(',')})`;
}

export function unproject(h,x,y) {
  const a=h[0]-x*h[6],b=h[2]-x*h[7],c=h[1]-y*h[6],d=h[3]-y*h[7];
  const e=x-h[4],f=y-h[5],det=a*d-b*c;
  return [(e*d-b*f)/det,(a*f-e*c)/det];
}

function clipAtSeam(points,positive) {
  const out=[];
  for(let i=0;i<points.length;i++){
    const a=points[i],b=points[(i+1)%points.length],inside=positive?a[1]>=0:a[1]<=0,next=positive?b[1]>=0:b[1]<=0;
    if(inside)out.push(a);
    if(inside!==next){const t=-a[1]/(b[1]-a[1]);out.push([mix(a[0],b[0],t),0]);}
  }
  return out;
}

export function daylight(hour) {
  const phase=Math.max(-1,Math.min(1,(hour-13)/6));
  // Rays travel from beyond the lower-left floor edge, then fold onto the wall.
  const window=[[-400+phase*45,1160],[200+phase*45,1160],[1460+phase*100,-240],[840+phase*100,-240]];
  const at=(u,v)=>[0,1].map(k=>(1-u)*(1-v)*window[0][k]+u*(1-v)*window[1][k]+u*v*window[2][k]+(1-u)*v*window[3][k]);
  const panes=[];
  for(const[u0,u1]of[[0,.473],[.527,1]])for(const[v0,v1]of[[0,.47],[.53,1]])panes.push([at(u0,v0),at(u1,v0),at(u1,v1),at(u0,v1)]);
  const u=765+45*phase,v=170-35*phase,w=475+10*phase,d=260+20*phase;
  const title=[[u,v],[u+w,v],[u+w-18,d+v],[u-18,d+v]];
  return {phase,title,panes,opacity:.24+.11*Math.sin((phase+1)*Math.PI/2)};
}

export function lightPatches(floor,wall,hour) {
  return daylight(hour).panes.map(pane=>({
    floor:mapPoints(floor,clipAtSeam(pane,true)),
    wall:mapPoints(wall,clipAtSeam(pane,false).map(([u,v])=>[u,-v])),
  }));
}

export const wallArtQuad=wall=>mapPoints(wall,[[800,480],[1500,480],[1500,35],[800,35]]);

// Height is another SVG projection of the same floor, not a separate camera.
// The vertical direction is shared with the wall; feet and cast shadows stay at z=0.
export function raisedFloor(frame,height=0){
  const h=[...frame.floor];h[4]+=frame.wall[2]*height;h[5]+=frame.wall[3]*height;return h;
}
export function shadowFloor(frame,height,hour=13){
  const phase=daylight(hour).phase,h=[...frame.floor];
  const du=height*(.85+phase*.2),dv=-height*.48;
  // Translating the source plane also updates the projective denominator.
  const w=1+h[6]*du+h[7]*dv;
  return [h[0]/w,h[1]/w,h[2]/w,h[3]/w,(h[4]+h[0]*du+h[2]*dv)/w,(h[5]+h[1]*du+h[3]*dv)/w,h[6]/w,h[7]/w];
}
export function roundedOutline(u,v,width,depth,radius=40){
  return [[u+width-radius,v+radius,-90],[u+width-radius,v+depth-radius,0],[u+radius,v+depth-radius,90],[u+radius,v+radius,180]]
    .flatMap(([x,y,start])=>Array.from({length:9},(_,i)=>{const a=(start+i*90/8)*Math.PI/180;return[x+Math.cos(a)*radius,y+Math.sin(a)*radius];}));
}
