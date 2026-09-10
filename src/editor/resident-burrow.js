import * as THREE from 'three';

/** An ink arch and a shallow reveal, printed in the same plane as the widgets. */
export class ResidentBurrow {
  constructor(scene){
    const canvas=document.createElement('canvas');canvas.width=480;canvas.height=560;
    const c=canvas.getContext('2d');
    const arch=(x,y,w,h)=>{c.beginPath();c.moveTo(x,y+h);c.lineTo(x,y+w/2);c.bezierCurveTo(x,y+w*.15,x+w*.23,y,x+w/2,y);c.bezierCurveTo(x+w*.77,y,x+w,y+w*.15,x+w,y+w/2);c.lineTo(x+w,y+h);c.quadraticCurveTo(x+w,y+h+13,x+w-15,y+h+13);c.lineTo(x+15,y+h+13);c.quadraticCurveTo(x,y+h+13,x,y+h);c.closePath();};
    arch(73,70,334,373);c.fillStyle='#0c0d14';c.fill();
    arch(87,84,306,348);c.strokeStyle='#ecebd744';c.lineWidth=2;c.stroke();
    arch(104,98,270,334);c.fillStyle='#030407';c.fill();
    c.strokeStyle='#ecebd7';c.lineWidth=3;c.beginPath();c.moveTo(49,458);c.lineTo(431,458);c.stroke();
    c.fillStyle='#ecebd7';c.font='500 18px monospace';c.fillText('00 / BACK SOON',82,504);
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
    this.mesh=new THREE.Mesh(new THREE.PlaneGeometry(2.18,2.54),new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false}));
    this.mesh.rotation.x=-Math.PI/2;this.mesh.name='resident-burrow';scene.add(this.mesh);
  }
  place(anchor){
    const x=anchor.points[0].x-2.05,z=anchor.points[0].z-1.4,y=-1.1;
    this.origin={x,y,z};this.mesh.position.set(x,y-.02,z-.806);
    this.platform={id:'BURROW:0',objectId:'BURROW',kind:'burrow',points:[{x:x-.74,y,z},{x:x+.74,y,z}]};
    this.mesh.visible=true;return this.platform;
  }
}
