import test from 'node:test';
import assert from 'node:assert/strict';
import {VisitorSchedule} from '../src/editor/visitor-schedule.js';
import {platformRoute,PlatformWalker,supportAt} from '../src/editor/platform-motion.js';
const ledge=(id,a,b,z)=>({id,objectId:id,points:[{x:a,y:0,z},{x:b,y:0,z}]});
test('irregular departures are individual, bounded to three and include quiet gaps between visits',()=>{
  const schedule=new VisitorSchedule(381),active=[],counts=new Set(),gaps=[];let last=null;
  for(let t=0;t<1200;t+=.1){
    while(active.length&&active[0]<t)active.shift();
    if(schedule.tick(.1,active.length,false)){
      if(last!==null)gaps.push(t-last);last=t;active.push(t+55);
    }
    assert.ok(active.length<=3);counts.add(active.length);
  }
  assert.deepEqual([...counts].sort(),[0,1,2,3]);assert.ok(Math.min(...gaps)>=4.9);assert.ok(Math.max(...gaps)>50);
  assert.ok(new Set(gaps.map(g=>g.toFixed(1))).size>10);
});
test('a busy entrance, full room or unreachable destination never admits a visitor',()=>{
  for(const [active,mouth,available]of [[3,false,true],[0,true,true],[0,false,false]]){
    const schedule=new VisitorSchedule(19);for(let i=0;i<1000;i++)assert.equal(schedule.tick(.1,active,mouth,available),false);
    assert.equal(schedule.tick(.1,0,false,true),true);
  }
});
test('directed trips traverse intermediary ledges and physically return to the burrow',()=>{
  const platforms=[ledge('BURROW',-9,-7,2),ledge('A',-5,-2,0),ledge('B',1,4,-2),ledge('target',6,8,1),ledge('isolated',30,32,1)];
  assert.equal(platformRoute(platforms,platforms[0],'isolated'),null);
  const actor=new PlatformWalker(1);actor.setPlatforms(platforms);actor.platform=platforms[0];Object.assign(actor,supportAt(platforms[0],-8));actor.destinationId='target';
  let visited=false,returned=false;
  for(let f=0;f<18000;f++){
    actor.update(1/60);assert.ok(actor.visible,'Planned jumps land on physical surfaces');
    if(actor.state==='idle'&&actor.platform.id==='target'){visited=true;actor.destinationId='BURROW';actor.goal=null;}
    if(visited&&actor.state==='idle'&&actor.platform.id==='BURROW'){returned=true;break;}
  }
  assert.ok(visited&&returned);
});
