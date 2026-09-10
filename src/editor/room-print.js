import * as THREE from 'three';
const clamp=n=>Math.max(0,Math.min(1,n));
const smooth=n=>{n=clamp(n);return n*n*(3-2*n);};
/** Size once for the farthest allowed camera, including the full parallax margin. */
export function printBounds(baseHeight,aspect,fov=46){
  const halfHeight=(baseHeight*1.3+1.94)*Math.tan(fov*Math.PI/360);
  return {halfWidth:halfHeight*aspect,halfHeight,width:Math.ceil((halfHeight*aspect*1.15+3)/2)*4,height:Math.ceil((halfHeight*1.15+3)/2)*4};
}
function printLayer(name,paint,bounds){
  const density=Math.min(64,4096/Math.max(bounds.width,bounds.height));
  const canvas=document.createElement('canvas');canvas.width=Math.ceil(bounds.width*density);canvas.height=Math.ceil(bounds.height*density);
  const ctx=canvas.getContext('2d');ctx.scale(canvas.width/bounds.width,canvas.height/bounds.height);ctx.translate(-bounds.left,-bounds.top);paint(ctx);
  const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=4;
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(bounds.width,bounds.height),new THREE.MeshBasicMaterial({map,transparent:true,depthWrite:false}));
  mesh.name=name;mesh.rotation.x=-Math.PI/2;mesh.position.set(bounds.left+bounds.width/2,-1.94,bounds.top+bounds.height/2);mesh.renderOrder=-1;return mesh;
}
const line=(ctx,points,width=.02)=>{ctx.lineWidth=width;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();};
const type=(ctx,text,x,y,size=.18,weight=500,maxWidth=9,mono=false)=>{ctx.font=`${weight} ${size}px ${mono?'monospace':'"Uncut Sans",sans-serif'}`;ctx.fillText(text,x,y,maxWidth);};

/** The print bleeds beyond all four sides, even at full zoom-out. */
export class RoomPrint {
  constructor(scene){this.group=new THREE.Group();this.group.name='room-printed-field';scene.add(this.group);this.signature='';}
  apply(data,palette){this.data=data;this.palette=palette;}
  rebuild(field){
    const {data,palette}=this,{width,height,halfWidth,halfHeight}=field;
    const signature=JSON.stringify([data.room,data.objects.length,palette.ink,width,height]);if(signature===this.signature)return false;this.signature=signature;
    for(const mesh of [...this.group.children]){this.group.remove(mesh);mesh.geometry.dispose();mesh.material.map.dispose();mesh.material.dispose();}
    const left=-width/2,right=width/2,top=-height/2,bottom=height/2,ink=palette.ink;
    const start=Math.ceil((-halfWidth+1.6)/2)*2,step=Math.max(4,Math.floor((halfWidth*2-3.2)/8)*2),columns=Array.from({length:4},(_,i)=>start+i*step);
    const heading=-halfHeight+2.5;
    this.edges=printLayer('field-full-bleed',ctx=>{
      ctx.strokeStyle=ctx.fillStyle=ink;ctx.globalAlpha=.34;
      // Every module continues beyond the visible edge; there is no inner picture frame.
      for(let x=Math.ceil(left/2)*2;x<=right;x+=2){
        line(ctx,[[x,top],[x,heading+1.2]],.022);line(ctx,[[x,halfHeight-2.8],[x,bottom]],.022);
        if(Math.abs(x)>halfWidth-4.5)line(ctx,[[x,top],[x,bottom]],.022);
      }
      for(let y=Math.ceil(top/2)*2;y<=bottom;y+=2){
        line(ctx,[[left,y],[-halfWidth+4.5,y]],.022);line(ctx,[[halfWidth-3.3,y],[right,y]],.022);
        if(y<heading+1.2||y>halfHeight-2.8)line(ctx,[[left,y],[right,y]],.022);
      }
      ctx.globalAlpha=.65;
      for(let row=0;row<15;row++){
        const points=[];for(let x=left;x<=right+.1;x+=.13)points.push([x,halfHeight-1.7+row*.13+.43*Math.sin(x*.24+.6)+.22*Math.sin(x*.48)]);
        line(ctx,points,.044+row*.0015);
      }
      for(let col=0;col<11;col++){
        const points=[];for(let y=top;y<=bottom+.1;y+=.12)points.push([halfWidth-1.35+col*.13+.28*Math.sin(y*.34),y]);line(ctx,points,.035+col*.002);
      }
      ctx.globalAlpha=1;
      const headings=['IMAGES','SOUND','DAYLIGHT','NOTES'],subtitles=['THINGS THAT STAY','LISTEN / REPEAT','TAKE YOUR TIME','STILL IN PROGRESS'];
      columns.forEach((x,i)=>{
        type(ctx,`0${i+1} / ${headings[i]}`,x,heading,.4,650,step-1);
        type(ctx,subtitles[i],x,heading+.44,.16,500,step-1,true);
        line(ctx,[[x,heading+.85],[x+step-1,heading+.85]],.015);
        type(ctx,'+',x+step-1.2,heading,.28,500,1);
      });
      ctx.save();ctx.translate(-halfWidth+.48,2.6);ctx.rotate(-Math.PI/2);type(ctx,'THE DESKTOP IS A LANDSCAPE',0,0,.21,500,9,true);ctx.restore();
    },{left,top,width,height});
    this.noteX=Math.max(12,columns[3]);const x=this.noteX;
    this.notes=printLayer('field-aligned-marginalia',ctx=>{
      ctx.fillStyle=ctx.strokeStyle=ink;
      ['A PLACE','FOR SMALL','THINGS.'].forEach((t,i)=>type(ctx,t,x,-6.6+i*.98,.92,600,6));
      line(ctx,[[x,-3.7],[x+6,-3.7]]);
      ['A personal collection','of images, sounds','and things in between.'].forEach((t,i)=>type(ctx,t,x,-2.95+i*.43,.31,450,6));
      line(ctx,[[x,.05],[x+6,.05]]);
      [['OBJECTS',String(data.objects.length).padStart(2,'0')],['VISITORS','01—03'],['STATUS','OPEN']].forEach(([label,value],i)=>{type(ctx,label,x,.58+i*.43,.23,500,3,true);type(ctx,value,x+4.6,.58+i*.43,.23,500,1.4,true);});
      line(ctx,[[x,2.27],[x+6,2.27]]);
      type(ctx,'Leave a little room',x,3.12,.32,500,6);type(ctx,'for something else.',x,3.53,.32,500,6);type(ctx,'COLLECTED, NEVER COMPLETED.',x,5.26,.18,500,6,true);
      for(let i=0;i<6;i++){ctx.globalAlpha=.2+i*.12;ctx.fillRect(x+i*.27,6,.21,.21);}
    },{left:x-.15,top:-7.5,width:6.4,height:14.5});
    this.group.add(this.edges,this.notes);return true;
  }
  update(camera,baseHeight){
    if(!this.data)return false;
    let changed=this.rebuild(printBounds(baseHeight,camera.aspect,camera.fov));
    const zoom=smooth((camera.position.y/baseHeight-.99)/.28),halfWidth=(camera.position.y+1.94)*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*camera.aspect;
    const notes=smooth((halfWidth+camera.position.x-this.noteX-6.1)/1.2);
    const values=[.15+zoom*.4,(.09+zoom*.48)*notes];
    [this.edges,this.notes].forEach((mesh,i)=>{if(Math.abs(mesh.material.opacity-values[i])>.0005){mesh.material.opacity=values[i];changed=true;}});return changed;
  }
}
