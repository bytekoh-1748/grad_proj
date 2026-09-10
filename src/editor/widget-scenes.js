import * as THREE from 'three';
import {disposeObject} from './models.js';
import {displayDate} from './widget-appearance.js';
import {activityFor, sampleVisit, pagePoint} from './widget-activities.js';
import {INK,PAPER} from './resident-figure.js';

export class WidgetVisit {
  constructor(object,actor) {
    this.object=object;this.mesh=object.getObjectByName('relief');this.data=object.userData.data;
    this.activity=activityFor(this.data.kind);this.variant=this.data.variant||'classic';
    this.mesh.updateWorldMatrix(true,false);
    const {width,height}=this.mesh.geometry.parameters;this.width=width;this.height=height;
    this.entry=this.mesh.worldToLocal(new THREE.Vector3(actor.x,actor.y,actor.z));this.entry.z=.012;
    this.scale=Math.min(1.12,width/2.8,height/2.6);this.time=0;this.lastPaint=-1;
    this.group=new THREE.Group();this.group.name=`widget-life:${this.data.id}`;this.group.matrixAutoUpdate=false;
    this.canvas=document.createElement('canvas');this.canvas.width=640;this.canvas.height=Math.round(640*height/width);
    const texture=new THREE.CanvasTexture(this.canvas);texture.colorSpace=THREE.SRGBColorSpace;
    this.overlay=new THREE.Mesh(new THREE.PlaneGeometry(width,height),new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false}));this.overlay.position.z=.009;this.overlay.renderOrder=2;this.group.add(this.overlay);
    if(this.activity==='calendar')this.makePage();
  }
  makePage() {
    const canvas=document.createElement('canvas');canvas.width=640;canvas.height=790;
    const ctx=canvas.getContext('2d'),date=displayDate(new Date(),this.data.appearance||{});
    ctx.fillStyle=PAPER;ctx.fillRect(0,0,640,790);ctx.fillStyle=this.data.color;ctx.fillRect(0,0,640,17);
    ctx.fillStyle=INK;ctx.textAlign='left';ctx.font='500 38px monospace';ctx.fillText(date.toLocaleDateString('en-GB',{month:'short'}).toUpperCase()+' / '+date.getFullYear(),36,111);
    ctx.textAlign='center';ctx.font='800 395px "Uncut Sans",sans-serif';ctx.fillText(String(date.getDate()).padStart(2,'0'),320,547,596);
    ctx.font='600 61px "Uncut Sans",sans-serif';ctx.fillText(date.toLocaleDateString('en-GB',{weekday:'short'}).toUpperCase(),320,695);
    ctx.strokeStyle='#b5b3a0';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(30,746);ctx.lineTo(610,746);ctx.stroke();
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
    const geometry=new THREE.PlaneGeometry(this.width*.84,this.height*.79,12,28);
    geometry.setAttribute('color',new THREE.Float32BufferAttribute(new Float32Array(geometry.attributes.position.count*3).fill(1),3));
    this.page=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide,transparent:true,depthWrite:true,vertexColors:true}));this.page.name='turning-calendar-page';this.page.renderOrder=2;this.group.add(this.page);
  }
  update(dt) {
    this.time+=Math.max(0,Math.min(.1,dt));
    this.mesh.updateWorldMatrix(true,false);this.group.matrix.copy(this.mesh.matrixWorld);this.group.matrixWorldNeedsUpdate=true;
    const sample=sampleVisit(this);this.sample=sample;
    this.overlay.material.opacity=sample.opacity;
    if(this.page) {
      const positions=this.page.geometry.attributes.position,uv=this.page.geometry.attributes.uv;
      for(let i=0;i<positions.count;i++) {
        const p=pagePoint(this.width,this.height,uv.getX(i),1-uv.getY(i),sample.curl);
        positions.setXYZ(i,p.x,p.y,p.z);
        const shade=.84+.16*Math.cos(sample.curl*(.32+.68*(1-uv.getY(i))));this.page.geometry.attributes.color.setXYZ(i,shade,shade,shade);
      }
      positions.needsUpdate=true;this.page.geometry.attributes.color.needsUpdate=true;this.page.geometry.computeBoundingSphere();this.page.material.opacity=sample.opacity;
    }
    const paint=Math.floor(this.time*24);
    if(paint!==this.lastPaint) {this.paint(sample);this.overlay.material.map.needsUpdate=true;this.lastPaint=paint;}
    return sample;
  }
  paint(sample) {
    const ctx=this.canvas.getContext('2d'),W=this.canvas.width,H=this.canvas.height,accent=this.data.color;
    ctx.clearRect(0,0,W,H);ctx.save();ctx.scale(W,H);
    const fill=(x,y,w,h,color)=>{ctx.fillStyle=color;ctx.fillRect(x,y,w,h);};
    const line=(points,color=INK,width=.004)=>{ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();};
    const ellipse=(x,y,rx,ry,color)=>{ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();};
    if(this.activity==='sunbath') {
      const cloud=this.variant==='cloud';
      // Preserve the printed rim and SUN caption; unfold a tiny seaside in its picture.
      ctx.beginPath();if(this.variant==='classic')ctx.rect(.054,.103,.886,.84);else if(cloud)ctx.ellipse(.5,.60,.36,.27,0,0,Math.PI*2);else ctx.ellipse(.5,.5,.304,.304,0,0,Math.PI*2);ctx.clip();
      fill(0,0,1,1,cloud||this.variant==='classic'?PAPER:accent);
      fill(.054,.103,.892,.433,accent);ellipse(.72,.255,.116,.116*this.width/this.height,'#f16d48');
      fill(.04,.385,.92,.28,'#a2b8d0');fill(.04,.535,.92,.25,PAPER);
      for(let row=0;row<3;row++)for(let col=0;col<5;col++){
        const x=.075+col*.2+Math.sin(sample.activeTime*.5+row)*.023,y=.411+row*.043;
        line([[x,y],[x+.03,y+.007],[x+.09,y-.003]],PAPER,.003);
      }
      line([[.06,.57],[.23,.549],[.45,.561],[.69,.542],[.94,.55]],'#b3b0a0',.003);
      line([[.23,.41],[.255,.681]],INK,.008);
      ctx.fillStyle='#ff7353';ctx.beginPath();ctx.moveTo(.075,.433);ctx.quadraticCurveTo(.225,.242,.391,.405);ctx.lineTo(.075,.433);ctx.fill();
      line([[.23,.329],[.23,.423]],PAPER,.013);line([[.17,.352],[.146,.43]],PAPER,.013);line([[.297,.351],[.316,.412]],PAPER,.013);
      const root={x:.70,y:.65},pixel=p=>[root.x+p[0]/153.6*this.scale/this.width,root.y+p[1]/153.6*this.scale/this.height];
      const chair=[[-79,-47],[-33,-12],[44,-1]].map(pixel);
      line(chair,INK,.016);line(chair,accent,.009);
      line([pixel([-63,-35]),pixel([26,10])],INK,.009);line([pixel([24,-3]),pixel([-47,10])],INK,.009);
      ellipse(.86,.684,.024,.008,'#b6b19d');fill(.846,.632,.026,.045,'#ff7353');line([[.863,.634],[.873,.60]],INK,.004);
      // A few coarse print dots tie the new picture to the surrounding collage.
      ctx.fillStyle='#a6a693';for(let i=0;i<22;i++)ctx.fillRect(.07+(i*37%83)/100,.59+(i*19%13)/100,.003,.002);
      if(this.variant==='classic'){
        ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle=INK;ctx.font=`850 ${H*.108}px "Uncut Sans",sans-serif`;ctx.fillText(this.data.appearance?.text||'SUN',W*.073,H*.848,W*.84);
        ctx.font=`500 ${H*.029}px monospace`;ctx.fillText('WITHOUT A WINDOW.',W*.075,H*.905,W*.84);ctx.restore();
      }
    } else if(this.activity==='calendar') {
      // A broad, soft contact shadow is cast on the original date beneath the lifting leaf.
      ctx.globalAlpha=Math.min(.23,sample.curl*.18);fill(.08,.14,.84,.76,INK);ctx.globalAlpha=1;
      line([[.08,.105],[.92,.105]],INK,.012);[.22,.78].forEach(x=>ellipse(x,.105,.011,.008,INK));
    } else if(this.activity==='record') {
      const vinyl=this.variant==='vinyl',cx=vinyl?.5:.291,cy=(vinyl?.464:.435)*this.width/this.height,r=vinyl?.44:.182;
      ctx.save();ctx.translate(cx,cy);ctx.scale(1,this.width/this.height);ctx.rotate(sample.activeTime*.65);
      ellipse(0,0,r,r,INK);for(let i=1;i<8;i++){ctx.beginPath();ctx.arc(0,0,r*(.66+i*.041),0,Math.PI*2);ctx.strokeStyle=i%3?'#666757':'#a9a78e';ctx.lineWidth=.0015;ctx.stroke();}
      ellipse(0,0,r*.65,r*.65,accent);line([[-r*.16,0],[r*.16,0]],INK,.005);ellipse(0,0,.007,.007,INK);
      for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(0,0,r*(.64+i*.065),-.5,.04);ctx.strokeStyle=PAPER;ctx.lineWidth=.003;ctx.stroke();}
      ctx.restore();
    } else if(this.activity==='read'&&this.variant!=='classic') {
      const p=sample.position,x=.5+p.x/this.width,y=.5-(p.y+.30*this.scale)/this.height;
      line([[x-.19,y],[x+.15,y]],INK,.009);
    }
    ctx.restore();
    // Effects retain every original cutout / hole. The hinged leaf is deliberately a separate sheet.
    ctx.globalCompositeOperation='destination-in';ctx.drawImage(this.mesh.material.uniforms.uColor.value.image,0,0,W,H);ctx.globalCompositeOperation='source-over';
  }
  dispose() {this.group.removeFromParent();disposeObject(this.group);}
}
