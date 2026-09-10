import test from 'node:test';
import assert from 'node:assert/strict';
import {ACTIVITY_SECONDS,ENTRY_SECONDS,EXIT_SECONDS,activityAnchor,sampleVisit,pageCurl,pagePoint} from '../src/editor/widget-activities.js';
const fixture=activity=>({activity,width:3.2,height:3.85,scale:1.1,entry:{x:.45,y:1.86,z:.012},time:0,variant:'classic'});
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);

test('every widget visit enters continuously, performs its activity, and returns to the original rim',()=>{
  for(const activity of Object.keys(ACTIVITY_SECONDS)) {
    const visit=fixture(activity),end=ENTRY_SECONDS+ACTIVITY_SECONDS[activity]+EXIT_SECONDS,phases=new Set();
    assert.ok(distance(sampleVisit(visit).position,visit.entry)<1e-9);
    for(let t=0;t<=end;t+=1/120){visit.time=t;const s=sampleVisit(visit);phases.add(s.phase);assert.ok(Object.values(s.position).every(Number.isFinite));assert.ok(s.opacity>=0&&s.opacity<=1);}
    for(const time of [1.05,ENTRY_SECONDS,ENTRY_SECONDS+ACTIVITY_SECONDS[activity],end]) {
      visit.time=time-.00001;const a=sampleVisit(visit);visit.time=time+.00001;const b=sampleVisit(visit);
      assert.ok(distance(a.position,b.position)<.001,`${activity} jumps at ${time}`);
    }
    visit.time=end;const last=sampleVisit(visit);assert.ok(last.done);assert.ok(distance(last.position,visit.entry)<1e-9);
    assert.deepEqual([...phases],['enter','activity','exit']);
  }
});
test('the large calendar sheet keeps its binding fixed while the held edge carries the resident',()=>{
  const visit=fixture('calendar');let maxDepth=0,maxLift=0;
  for(let t=0;t<=ACTIVITY_SECONDS.calendar;t+=1/60) {
    const curl=pageCurl(t),hand=pagePoint(visit.width,visit.height,1,.55,curl),root=activityAnchor('calendar',visit.width,visit.height,visit.scale,t);
    const fixed=pagePoint(visit.width,visit.height,.25,0,curl);
    assert.deepEqual(fixed,pagePoint(visit.width,visit.height,.25,0,0));
    assert.ok(Math.abs(root.x-38/153.6*visit.scale-hand.x)<1e-9);
    assert.ok(Math.abs(root.y+135/153.6*visit.scale-hand.y)<1e-9);
    assert.ok(Math.abs(root.z-.015-hand.z)<1e-9);
    const bottom=pagePoint(visit.width,visit.height,1,1,curl);maxDepth=Math.max(maxDepth,bottom.z);maxLift=Math.max(maxLift,bottom.y+visit.height*.40);
  }
  assert.ok(maxDepth>2,'A full sheet lifts off the print');assert.ok(maxLift>3,'The motion is large enough to read in the home view');
  assert.equal(pageCurl(0),0);assert.ok(Math.abs(pageCurl(ACTIVITY_SECONDS.calendar))<1e-12);
});

test('reading hips rest on the printed shelf across widget proportions and resident sizes',()=>{
  for(const width of [2.8,3.2])for(const height of [3.7,3.85])for(const scale of [.7,1,1.12]){
    const root=activityAnchor('read',width,height,scale,10,'classic');
    const hipHeight=root.y+46/153.6*scale;
    assert.ok(Math.abs(hipHeight-height*(.5-.79))<1e-9);
    assert.ok(root.y>-height*.5,'feet must remain within the print');
  }
});
