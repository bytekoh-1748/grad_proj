import test from 'node:test';
import assert from 'node:assert/strict';
import {constrainView} from '../src/editor/relief.js';
import {parseRoom,patchObject,RoomHistory} from '../src/editor/room-code.js';
import {INITIAL_ROOMS} from '../src/editor/templates.js';
const source=INITIAL_ROOMS[0].source;
test('artwork cameras constrain old orbit views and repeated zoom, including saved views',()=>{
  let camera=constrainView({position:[100,-20,90],target:[2,0,-4],fov:90});
  assert.deepEqual(camera.target,[2,0,-4]);
  assert.ok(camera.position[1]>=24*.62);
  assert.ok(Math.abs(camera.position[0]-2)<=1.4);
  assert.ok(Math.abs(camera.position[2]+4)<=1.1);
  for(let i=0;i<100;i++)camera=constrainView({...camera,position:camera.position.map((n,j)=>camera.target[j]+(n-camera.target[j])*.8)});
  assert.equal(camera.position[1],24*.62);
  assert.equal(camera.fov,46);
  const far=constrainView({position:[90,25,60],target:[90,0,60]});
  assert.deepEqual(far.target,[90,0,60],'keyboard focus can recover objects outside the initial composition');
});
test('relief is optional for old room files, bounded, persisted and undoable',()=>{
  const old=source.replace(/,"relief":[\d.]+/g,'');
  assert.equal(parseRoom(old).scene.objects[0].relief,.24);
  for(const relief of [-.01,.66,null,'0.2'])assert.throws(()=>parseRoom(patchObject(source,'camera-1',{relief})));
  const h=new RoomHistory(source);h.commit(patchObject(source,'camera-1',{relief:0}));h.commit(patchObject(h.source,'camera-1',{relief:.65}));assert.equal(parseRoom(h.source).scene.objects[0].relief,.65);h.undo();assert.equal(parseRoom(h.source).scene.objects[0].relief,0);h.undo();assert.equal(h.source,source);
});
