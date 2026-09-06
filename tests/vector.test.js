import test from 'node:test';
import assert from 'node:assert/strict';
import { ContourState, project, spring, inversePoint, multiply } from '../src/vector-math.js';
import { FLOOR_VIEWS, OBJECTS, floorView, adaptFloor, deckProjection, objectQuad, circleOnFloor, cssProjection, unproject, daylight, lightPatches } from '../src/floor-scene.js';
import { SVGContext } from '../src/svg-context.js';

globalThis.matchMedia=()=>({matches:false});
const {getTracks}=await import('../src/tracks/index.js');
delete globalThis.matchMedia;

const near=(a,b,epsilon=1e-7)=>assert.ok(Math.hypot(a[0]-b[0],a[1]-b[1])<epsilon,`${a} ≠ ${b}`);

test('default wall/floor boundary follows the downward-right reference guide',()=>{
  const {floor}=adaptFloor(floorView('listen'));
  const [a,b]=[project(floor,0,0),project(floor,1600,0)];
  const slope=(b[1]-a[1])/(b[0]-a[0]);
  assert.ok(slope>.26&&slope<.28);
  assert.ok(Math.abs(a[1]+(250-a[0])*slope)<2);
});

test('all transitions and viewport shapes share one continuous, non-folding floor',()=>{
  const names=Object.keys(FLOOR_VIEWS);
  for(const from of names)for(const to of names)for(const drag of [[0,0],[-1,-1],[1,1],[-1,1],[1,-1]]){
    const a=floorView(from),b=floorView(to,drag);
    for(let step=0;step<=12;step++)for(const height of [750,900,1473,3458]){
      const view=Object.fromEntries(Object.keys(a).map(k=>[k,a[k].map((n,i)=>n+(b[k][i]-n)*step/12)]));
      const {floor,wall}=adaptFloor(view,height),deck=deckProjection(floor);
      for(const u of [-400,0,500,1000,1800])near(project(floor,u,0),project(wall,u,0));
      for(let y=0;y<=560;y+=140)for(let x=0;x<=760;x+=190){
        near(project(deck,x,y),project(floor,x+OBJECTS.deck.u,y+OBJECTS.deck.v));
      }
      for(let v=0;v<=1000;v+=200)for(let u=-400;u<=2000;u+=300){
        const p=project(floor,u,v),x=project(floor,u+.1,v),y=project(floor,u,v+.1);
        assert.ok(p.every(Number.isFinite));
        assert.ok((x[0]-p[0])*(y[1]-p[1])-(x[1]-p[1])*(y[0]-p[0])>0);
        near(unproject(floor,...p),[u,v]);
      }
    }
  }
});

test('every LP footprint remains on the floor and native SVG corners use that exact projection',()=>{
  for(const name of Object.keys(FLOOR_VIEWS)){
    const {floor}=adaptFloor(floorView(name));
    for(const pose of [OBJECTS.cue,...OBJECTS.stack]){
      for(const point of circleOnFloor(floor,pose))assert.ok(unproject(floor,...point)[1]>0);
      const quad=objectQuad(floor,pose),m=cssProjection(quad,200,200,.7,1.12).slice(9,-1).split(',').map(Number);
      [[0,0],[200,0],[200,200],[0,200]].forEach(([x,y],i)=>{
        const w=m[3]*x+m[7]*y+1;
        const actual=[(m[0]*x+m[4]*y+m[12])/w,(m[1]*x+m[5]*y+m[13])/w];
        near(actual,[(800+(quad[i][0]-800)*1.12)*.7,(450+(quad[i][1]-450)*1.12)*.7],.01);
      });
    }
  }
});

test('window light folds at the shared boundary; time moves the title on the same floor',()=>{
  for(const name of Object.keys(FLOOR_VIEWS))for(const hour of [7,13,19]){
    const {floor,wall}=adaptFloor(floorView(name)),light=daylight(hour),patches=lightPatches(floor,wall,hour);
    let seamPoints=0;
    for(const patch of patches){
      for(const p of patch.floor){
        const local=unproject(floor,...p);assert.ok(local[1]>-1e-7);
        if(Math.abs(local[1])<1e-7){seamPoints++;assert.ok(patch.wall.some(q=>Math.hypot(q[0]-p[0],q[1]-p[1])<1e-7));}
      }
      for(const p of patch.wall)assert.ok(unproject(wall,...p)[1]>-1e-7);
    }
    assert.equal(seamPoints,4);
    for(const [u,v] of light.title){assert.ok(v>0);assert.ok(u>OBJECTS.deck.u+OBJECTS.deck.width);}
  }
  assert.notDeepEqual(daylight(7).title,daylight(19).title);
});

test('interrupted contours preserve position and velocity, then settle at the new drawing',()=>{
  const state=new ContourState(FLOOR_VIEWS.listen);
  state.to(FLOOR_VIEWS.deck);state.step(180);
  const position=structuredClone(state.value),velocity=structuredClone(state.velocity);
  assert.notEqual(velocity.floor[0],0);
  state.to(FLOOR_VIEWS.wall);
  assert.deepEqual(state.value,position);assert.deepEqual(state.velocity,velocity);
  for(let i=0;i<250;i++)state.step(16);
  assert.deepEqual(state.value,FLOOR_VIEWS.wall);
  state.reduced=true;state.to(FLOOR_VIEWS.listen);state.step(0);
  assert.deepEqual(state.value,FLOOR_VIEWS.listen);
});

test('spring timing does not depend on the animation frame rate',()=>{
  const expected=spring(0,0,100,640);
  for(const dt of [8,16,32,64]){
    let state=[0,0];for(let i=0;i<640/dt;i++)state=spring(...state,100,dt);
    assert.ok(Math.abs(state[0]-expected[0])<1e-9);
    assert.ok(Math.abs(state[1]-expected[1])<1e-9);
  }
});

test('all six existing interactions produce valid SVG, including clipping and pointer presses',()=>{
  const context=new SVGContext(),tracks=getTracks();assert.equal(tracks.length,6);
  for(const track of tracks){
    for(const beat of [0,1.5,7.5,7.75,8.01,16])for(const down of [false,true]){
      context.reset();
      track.render({context,width:1000,height:600,time:beat*60000/track.bpm,dt:40,beat,pulse:.4,pointer:{x:.88,y:.14,dx:.4,dy:-.3,down}});
      assert.ok(context.commands.length>0,track.id);assert.equal(context.stack.length,0,track.id);
      context.commands.forEach(command=>{
        assert.ok(command.d.length>0);assert.ok(!/NaN|Infinity|undefined/.test(command.d+command.transform),track.id);
        assert.ok(command['stroke-width']>=0);assert.ok(command.opacity>=0&&command.opacity<=1);
        assert.ok(command.clip<context.clips.length);
      });
      if(track.id==='eye-of-the-needle')assert.equal(context.clips.length,1);
    }
  }
});

test('clipping and transforms restore correctly and pointer coordinates invert the SVG plane',()=>{
  const g=new SVGContext();g.translate(20,30);g.save();g.scale(2,3);g.beginPath();g.arc(40,50,25,0,Math.PI*2);g.clip();g.fill();g.restore();g.fillRect(0,0,10,10);
  assert.equal(g.commands[0].clip,0);assert.equal(g.commands[1].clip,-1);
  assert.equal(g.commands[0].d.match(/A/g).length,2);
  const m=multiply([2,.1,-.2,1.5,100,50],[.5,0,0,.5,30,20]),x=.78,y=.24;
  const p=inversePoint(m,m[0]*x+m[2]*y+m[4],m[1]*x+m[3]*y+m[5]);
  assert.ok(Math.abs(p[0]-x)<1e-9&&Math.abs(p[1]-y)<1e-9);
});
