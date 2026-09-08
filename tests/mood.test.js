import test from 'node:test';
import assert from 'node:assert/strict';
import {roomMood,timePeriod,localHour,debugAllowed,TRACK_MOODS} from '../src/room-mood.js';
import {EDITIONS,resolveDesign} from '../src/design-data.js';
import {floorSurfaceData} from '../src/floor-surface.js';
import {FLOOR_VIEWS,adaptFloor,floorView,unproject} from '../src/floor-scene.js';
import {project} from '../src/vector-math.js';

test('time bands use local clock boundaries, including overnight and wrapped hours',()=>{
  for(const[h,expected]of[[0,'night'],[4.99,'night'],[5,'morning'],[10.99,'morning'],[11,'day'],[16.99,'day'],[17,'evening'],[19.99,'evening'],[20,'night'],[24,'night'],[-1,'night']])assert.equal(timePeriod(h),expected);
  assert.equal(localHour(new Date(2026,8,6,23,30,36)),23.51);
  assert.equal(roomMood({hour:23.5}).clock,'23:30');
  assert.equal(roomMood({hour:24}).clock,'00:00');
  assert.equal(roomMood({hour:0}).daylight,0);
  assert.equal(roomMood({hour:13}).daylight,1);
  assert.ok(roomMood({hour:19.999}).daylight<.001);
});

test('LP character drives the room; time changes the palette without using Gallery',()=>{
  assert.deepEqual(resolveDesign(roomMood({hour:13,activity:'music',trackId:'midnight-rotation'})),{edition:'liquid',palette:1,solid:false});
  assert.equal(roomMood({hour:13,activity:'music',trackId:'sun-machine'}).edition,'expressive');
  assert.equal(roomMood({hour:13,activity:'music',trackId:'cut-and-paste'}).edition,'bauhaus');
  assert.equal(roomMood({hour:23,activity:'music',trackId:'midnight-rotation'}).palette,0);
  for(const activity of['home','music','cinema','journal'])for(const trackId of[...Object.keys(TRACK_MOODS),'missing'])for(let minute=0;minute<1440;minute+=5){
    const mood=roomMood({hour:minute/60,activity,trackId});
    assert.ok(EDITIONS[mood.edition]?.palettes[mood.palette]);
    assert.ok(mood.lightHour>=7&&mood.lightHour<=19&&mood.daylight>=0&&mood.daylight<=1);
  }
  assert.equal(roomMood({hour:23,activity:'home',trackId:'sun-machine'}).edition,'liquid');
});

test('the inspector requires development AND loopback AND explicit opt-in',()=>{
  for(const hostname of['localhost','127.0.0.1','[::1]','::1']){
    assert.equal(debugAllowed({dev:true,hostname,search:'?debug=1'}),true);
    assert.equal(debugAllowed({dev:false,hostname,search:'?debug=1&edition=bauhaus&hour=13'}),false);
    assert.equal(debugAllowed({dev:true,hostname,search:'?edition=liquid'}),false);
  }
  for(const hostname of['example.com','localhost.example.com','192.168.1.4','127.0.0.1.example.com'])assert.equal(debugAllowed({dev:true,hostname,search:'?debug=1'}),false);
  assert.equal(debugAllowed(),false);
});

test('floor detail remains above the seam and projects without singularities in every room view',()=>{
  const details=floorSurfaceData();assert.ok(details.length>40);
  const points=details.flatMap(item=>item.paths.flat());
  assert.ok(points.every(p=>p[1]>=0));
  for(const name of Object.keys(FLOOR_VIEWS))for(const drag of[[0,0],[1,-1],[-1,1]])for(const height of[900,1500,3458]){
    const {floor}=adaptFloor(floorView(name,drag),height);
    for(const[u,v]of points){
      assert.ok(1+floor[6]*u+floor[7]*v>.1);
      const p=project(floor,u,v),original=unproject(floor,...p);
      assert.ok(p.every(Number.isFinite));
      assert.ok(Math.hypot(original[0]-u,original[1]-v)<1e-6);
    }
  }
});
