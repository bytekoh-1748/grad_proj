import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {printBounds} from '../src/editor/room-print.js';

test('full-bleed print covers all visible corners at maximum zoom and parallax',()=>{
  const plane=new THREE.Plane(new THREE.Vector3(0,1,0),1.94),raycaster=new THREE.Raycaster();
  for(const aspect of [.46,.8,1.5,2,2.8,3.4])for(const fov of [38,46,52]){
    const baseHeight=Math.max(22,18/aspect/.849),bounds=printBounds(baseHeight,aspect,fov);
    const camera=new THREE.PerspectiveCamera(fov,aspect,.1,180);camera.up.set(0,0,-1);
    for(const lean of [-1.4,0,1.4]){
      camera.position.set(lean,baseHeight*1.3,lean);camera.lookAt(0,0,0);camera.updateMatrixWorld();
      for(const x of [-1,1])for(const y of [-1,1]){
        raycaster.setFromCamera(new THREE.Vector2(x,y),camera);const p=raycaster.ray.intersectPlane(plane,new THREE.Vector3());
        assert.ok(p&&Math.abs(p.x)<bounds.width/2&&Math.abs(p.z)<bounds.height/2,`clipped at aspect ${aspect}, fov ${fov}, lean ${lean}`);
      }
    }
  }
});
