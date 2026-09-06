import test from 'node:test';
import assert from 'node:assert/strict';
import {ActivityMotion,ACTIVITIES,enteringDeck,enteringRecord} from '../src/activity-motion.js';
import {FLOOR_VIEWS,floorView,adaptFloor,raisedFloor,shadowFloor,OBJECTS,deckProjection} from '../src/floor-scene.js';
import {project} from '../src/vector-math.js';

const near=(a,b)=>assert.ok(Math.hypot(a[0]-b[0],a[1]-b[1])<1e-7);

test('raised SVG planes keep ground anchors and share the wall vertical',()=>{
  for(const name of Object.keys(FLOOR_VIEWS))for(const height of [900,1500,3458]){
    const frame=adaptFloor(floorView(name),height);
    assert.deepEqual(raisedFloor(frame,0),frame.floor);
    assert.deepEqual(shadowFloor(frame,0),frame.floor);
    for(const[u,v]of[[0,0],[180,274],[1070,650],[1440,585]]){
      const top=project(raisedFloor(frame,54),u,v),ground=project(frame.floor,u,v),w=1+frame.floor[6]*u+frame.floor[7]*v;
      near([top[0]-ground[0],top[1]-ground[1]],[frame.wall[2]*54/w,frame.wall[3]*54/w]);
      assert.ok(top[1]<ground[1]);
      for(const hour of [7,13,19])assert.ok(project(shadowFloor(frame,54,hour),u,v).every(Number.isFinite));
    }
    // Both platter and LP use the same raised plane rather than an independent ellipse.
    const deck=deckProjection(raisedFloor(frame,54));
    near(project(deck,250,250),project(raisedFloor(frame,54),OBJECTS.deck.u+250,OBJECTS.deck.v+250));
  }
});

test('home/activity reversal preserves current position and speed with no stale completion',()=>{
  const motion=new ActivityMotion();
  assert.equal(motion.active,'home');assert.equal(motion.amount('home'),1);
  motion.select('music');motion.step(160);
  const p=structuredClone(motion.state.value),v=structuredClone(motion.state.velocity);
  motion.select('home');assert.deepEqual(motion.state.value,p);assert.deepEqual(motion.state.velocity,v);
  motion.step(80);motion.select('cinema');motion.step(100);motion.select('journal');
  for(let i=0;i<300;i++)motion.step(16);
  assert.equal(motion.active,'journal');assert.equal(motion.amount('journal'),1);
  for(const other of ['home','music','cinema'])assert.equal(motion.amount(other),0);
  assert.equal(motion.select('missing'),false);assert.equal(motion.active,'journal');
});

test('reduced motion lands directly; entrance never places an LP under the floor',()=>{
  const motion=new ActivityMotion(true);
  for(const activity of ACTIVITIES){motion.select(activity);motion.step(0);assert.equal(motion.amount(activity),1);}
  const record={...OBJECTS.cue,z:12};
  for(let step=0;step<=100;step++){
    const p=step/100,deck=enteringDeck(p);
    assert.ok(deck.width>0&&deck.depth>0&&deck.z>=0&&deck.opacity>=0&&deck.opacity<=1);
    for(let i=0;i<6;i++){
      const r=enteringRecord(record,p,i);
      assert.ok(r.z>=12&&r.r>0&&r.opacity>=0&&r.opacity<=1);
      assert.ok(Object.values(r).every(Number.isFinite));
    }
  }
  const final=enteringRecord(record,1,5);
  for(const key of ['u','v','r','angle','z'])assert.equal(final[key],record[key]);
  const deck=enteringDeck(1);
  assert.equal(deck.u,OBJECTS.deck.u);assert.equal(deck.v,OBJECTS.deck.v);assert.equal(deck.z,0);
});
