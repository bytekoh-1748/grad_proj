import test from 'node:test';
import assert from 'node:assert/strict';
import {KINDS,WIDGETS,widgetSize} from '../src/editor/widget-catalog.js';
import {parseRoom,appendObject,patchObject,RoomHistory} from '../src/editor/room-code.js';
import {INITIAL_ROOMS} from '../src/editor/templates.js';
import {encodeProject,decodeProject} from '../src/editor/storage.js';
import {Calculator,monthCells,decodePixels} from '../src/editor/widget-utils.js';
test('every widget can be authored, restored and undone without changing existing objects',()=>{
  const original=INITIAL_ROOMS[0].source,h=new RoomHistory(original);let code=original;
  for(const kind of KINDS){assert.ok(WIDGETS[kind].size.every(n=>n>0));code=appendObject(code,kind,{content:WIDGETS[kind].content||''}).code;}
  h.commit(code);const rooms=INITIAL_ROOMS.map(r=>({...r,history:r.id==='master'?h:new RoomHistory(r.source)}));const saved=decodeProject(JSON.parse(JSON.stringify(encodeProject(rooms,'master'))));const added=parseRoom(saved.rooms[0].history.source).scene.objects.slice(parseRoom(original).scene.objects.length);assert.deepEqual(added.map(o=>o.kind),KINDS);for(const object of added)assert.equal(object.action,WIDGETS[object.kind].action);h.undo();assert.equal(h.source,original);
});
test('calendar accounts for leap years and months starting at either end of a week',()=>{assert.equal(monthCells(2024,1).filter(Boolean).length,29);assert.equal(monthCells(2025,1).filter(Boolean).length,28);assert.equal(monthCells(2026,7)[6],1);assert.equal(monthCells(2026,2)[0],1);assert.equal(monthCells(2026,7)[36],31);});
test('calculator handles chained operations, repeated equals, decimals and division by zero',()=>{const c=new Calculator(),run=keys=>{for(const key of keys)c.input(key);return c.display;};assert.equal(run(['2','+','3','=','=']),'8');assert.equal(run(['4','=']),'4');assert.equal(run(['AC','0','.','1','+','0','.','2','=']),'0.3');assert.equal(run(['AC','8','÷','0','=']),'Error');assert.equal(run(['7','×','3','−','1','=']),'20');assert.equal(run(['AC','2','0','0','%']),'2');assert.equal(run(['±']),'-2');assert.equal(run(['AC','9','+','×','2','=']),'18');});
test('pixel drawings validate their format and survive source save, restore and undo',()=>{assert.equal(decodePixels('bad').length,256);const original=appendObject(INITIAL_ROOMS[0].source,'sketch').code,h=new RoomHistory(original),pixels='4'.repeat(256);h.commit(patchObject(original,'sketch-1',{content:pixels}));assert.deepEqual(decodePixels(parseRoom(h.source).scene.objects.at(-1).content),Array(256).fill(4));h.undo();assert.equal(h.source,original);});
test('design changes survive save and undo while preserving pose, content and comments',()=>{
  const original=appendObject(INITIAL_ROOMS[0].source,'calendar',{at:[-4,2,3],rotate:[0,32,0],scale:1.6,content:'my date'}).code.trimEnd()+' // keep this note\n';
  const h=new RoomHistory(original),before=parseRoom(original).scene.objects.at(-1);
  assert.equal(before.variant,'classic');
  h.commit(patchObject(original,before.id,{variant:'ticket'}));
  const saved=decodeProject(JSON.parse(JSON.stringify(encodeProject([{id:'master',name:'master.room',history:h}],'master'))));
  const restored=saved.rooms[0].history.source,after=parseRoom(restored).scene.objects.at(-1);
  assert.deepEqual(after,{...before,variant:'ticket'});assert.ok(restored.endsWith('// keep this note\n'));
  h.undo();assert.equal(h.source,original);h.redo();assert.equal(parseRoom(h.source).scene.objects.at(-1).variant,'ticket');
});
test('every design can be authored with its aspect ratio, invalid kind/design pairs fail',()=>{
  for(const kind of KINDS)for(const design of WIDGETS[kind].variants){
    const source=appendObject(INITIAL_ROOMS[0].source,kind,{variant:design.id}).code;
    assert.equal(parseRoom(source).scene.objects.at(-1).variant,design.id);
    assert.ok(widgetSize(kind,design.id).every(n=>Number.isFinite(n)&&n>0));
  }
  for(const variant of ['dial','unknown',null,23,{}])assert.throws(()=>appendObject(INITIAL_ROOMS[0].source,'calendar',{variant}));
});
