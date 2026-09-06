import { multiply, matrixText } from './vector-math.js';

const NS='http://www.w3.org/2000/svg';
const identity=()=>[1,0,0,1,0,0];
const f=n=>Number(n.toFixed(3));
const attrs=(el,values)=>Object.entries(values).forEach(([key,value])=>{if(el.getAttribute(key)!==String(value))el.setAttribute(key,value);});

// The existing six track drawing functions now write native SVG paths.
// This deliberately implements only the path/state operations used by those tracks.
export class SVGContext {
  constructor(root = null) { this.root=root; this.nodes=[]; this.clipNodes=[]; this.reset(); }
  reset() {
    this.fillStyle='#000';this.strokeStyle='#000';this.lineWidth=1;this.globalAlpha=1;
    this.lineCap='butt';this.lineJoin='miter';this.transform=identity();this.clipId=-1;
    this.stack=[];this.commands=[];this.clips=[];this.beginPath();
  }
  save(){this.stack.push({fillStyle:this.fillStyle,strokeStyle:this.strokeStyle,lineWidth:this.lineWidth,globalAlpha:this.globalAlpha,lineCap:this.lineCap,lineJoin:this.lineJoin,transform:[...this.transform],clipId:this.clipId});}
  restore(){const value=this.stack.pop();if(value)Object.assign(this,value);}
  translate(x,y){this.transform=multiply(this.transform,[1,0,0,1,x,y]);}
  scale(x,y){this.transform=multiply(this.transform,[x,0,0,y,0,0]);}
  rotate(a){this.transform=multiply(this.transform,[Math.cos(a),Math.sin(a),-Math.sin(a),Math.cos(a),0,0]);}
  beginPath(){this.path='';this.hasPoint=false;}
  moveTo(x,y){this.path+=`M${f(x)} ${f(y)}`;this.hasPoint=true;}
  lineTo(x,y){this.path+=`${this.hasPoint?'L':'M'}${f(x)} ${f(y)}`;this.hasPoint=true;}
  quadraticCurveTo(x1,y1,x,y){this.path+=`Q${f(x1)} ${f(y1)} ${f(x)} ${f(y)}`;this.hasPoint=true;}
  closePath(){this.path+='Z';}
  rect(x,y,w,h){this.path+=`M${f(x)} ${f(y)}h${f(w)}v${f(h)}h${f(-w)}Z`;this.hasPoint=true;}
  arc(x,y,r,start,end,ccw=false){this.ellipse(x,y,r,r,0,start,end,ccw);}
  ellipse(x,y,rx,ry,rotation,start,end,ccw=false){
    if(rx<0||ry<0)throw new RangeError('Negative ellipse radius');
    const tau=Math.PI*2,raw=end-start;
    let span=ccw?-((start-end)%tau+tau)%tau:((end-start)%tau+tau)%tau;
    if(Math.abs(raw)>=tau-1e-7)span=ccw?-tau:tau;
    const point=a=>[x+Math.cos(rotation)*rx*Math.cos(a)-Math.sin(rotation)*ry*Math.sin(a),y+Math.sin(rotation)*rx*Math.cos(a)+Math.cos(rotation)*ry*Math.sin(a)];
    const first=point(start);this.lineTo(...first);
    const steps=Math.max(1,Math.ceil(Math.abs(span)/Math.PI));
    for(let i=1;i<=steps;i++){
      const p=point(start+span*i/steps);
      this.path+=`A${f(rx)} ${f(ry)} ${f(rotation*180/Math.PI)} 0 ${ccw?0:1} ${f(p[0])} ${f(p[1])}`;
    }
  }
  emit(fill,path){this.commands.push({d:typeof path==='string'?path:this.path,transform:matrixText(this.transform),fill:fill?this.fillStyle:'none',stroke:fill?'none':this.strokeStyle,'stroke-width':this.lineWidth,'stroke-linecap':this.lineCap,'stroke-linejoin':this.lineJoin,opacity:this.globalAlpha,clip:this.clipId});}
  fill(path){this.emit(true,path);}
  stroke(path){this.emit(false,path);}
  fillRect(x,y,w,h){const old=this.path,point=this.hasPoint;this.beginPath();this.rect(x,y,w,h);this.fill();this.path=old;this.hasPoint=point;}
  clip(){this.clipId=this.clips.length;this.clips.push({d:this.path,transform:matrixText(this.transform)});}
  commit(){
    if(!this.root)return;
    if(!this.defs){this.defs=document.createElementNS(NS,'defs');this.root.appendChild(this.defs);}
    this.clips.forEach((clip,i)=>{
      if(!this.clipNodes[i]){const el=document.createElementNS(NS,'clipPath');el.id=`track-clip-${i}`;el.setAttribute('clipPathUnits','userSpaceOnUse');el.appendChild(document.createElementNS(NS,'path'));this.defs.appendChild(el);this.clipNodes[i]=el;}
      attrs(this.clipNodes[i].firstChild,clip);
    });
    this.commands.forEach((command,i)=>{
      if(!this.nodes[i]){const g=document.createElementNS(NS,'g');g.appendChild(document.createElementNS(NS,'path'));this.root.appendChild(g);this.nodes[i]=g;}
      const group=this.nodes[i],{clip,...values}=command;
      group.removeAttribute('display');
      if(clip>=0)group.setAttribute('clip-path',`url(#track-clip-${clip})`);else group.removeAttribute('clip-path');
      attrs(group.firstChild,values);
    });
    for(let i=this.commands.length;i<this.nodes.length;i++)this.nodes[i].setAttribute('display','none');
  }
}
