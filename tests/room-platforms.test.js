import test from 'node:test';
import assert from 'node:assert/strict';
import {PlatformWalker, supportAt, jumpVelocity, GRAVITY} from '../src/editor/platform-motion.js';
const ledge=(id,x1,x2,z,y=0)=>({id,kind:id==='R'?'type':'camera',points:[{x:x1,z,y},{x:x2,z,y}]});
const surfaces=()=>[ledge('R',-8,-3,-5),ledge('O',-2,3,-5),ledge('camera',-5,1,-2,1),ledge('record',1,6,1,2),ledge('book',6,9,-2,1)];

test('jump velocities land on targets at different heights under the same gravity',()=>{
  for(const target of [{x:2,z:-2},{x:-3,z:4},{x:0,z:0}]){
    const from={x:0,z:0},v=jumpVelocity(from,target),t=v.duration;
    assert.ok(Math.abs(from.x+v.vx*t-target.x)<1e-9);
    assert.ok(Math.abs(from.z+v.vz*t+GRAVITY*t*t/2-target.z)<1e-9);
    assert.ok(v.vz+GRAVITY*t>0,'Landing happens on descent');
  }
});
test('five minutes of locomotion visits every ledge, maintains contact and never edits platforms',()=>{
  const platforms=surfaces(),source=JSON.stringify(platforms),actor=new PlatformWalker();actor.setPlatforms(platforms);
  const states=new Set();for(let i=0;i<18000;i++){
    actor.update(1/60);states.add(actor.state);assert.ok(actor.visible);
    if(actor.state!=='air')assert.deepEqual({x:actor.x,y:actor.y,z:actor.z},supportAt(actor.platform,actor.x));
  }
  assert.equal(actor.visits.size,platforms.length);assert.ok(states.has('crouch')&&states.has('land'));
  assert.equal(JSON.stringify(platforms),source);
});
test('30 and 120 fps follow the same physical route; empty or removed ledges cannot leave stale contacts',()=>{
  const slow=new PlatformWalker(),fast=new PlatformWalker();slow.setPlatforms(surfaces());fast.setPlatforms(surfaces());
  for(let i=0;i<900;i++)slow.update(1/30);for(let i=0;i<3600;i++)fast.update(1/120);
  assert.equal(slow.state,fast.state);for(const key of ['x','y','z','time'])assert.ok(Math.abs(slow[key]-fast[key])<1e-8);
  slow.setPlatforms([]);assert.equal(slow.visible,false);
  slow.setPlatforms([ledge('new',4,8,2)]);assert.equal(slow.visible,true);assert.equal(slow.platform.id,'new');assert.ok(supportAt(slow.platform,slow.x));
  slow.visible=false;slow.setPlatforms(slow.platforms);assert.equal(slow.visible,true,'A lost walker can re-enter even when its last ledge still exists');
});
