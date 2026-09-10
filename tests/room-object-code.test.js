import test from 'node:test';
import assert from 'node:assert/strict';
import {objectCode,mergeObjectCode} from '../src/editor/object-code.js';
import {parseRoom,RoomHistory} from '../src/editor/room-code.js';
const source=`// A room with comments and authored spacing\nroom "sample"\n  object "date-1" calendar {"at":[1,0,2],"scale":1.05,"appearance":{"date":"2026-08-18"}} // keep this\nobject "note-1" book {"content":"literal [ 1, 2, 3 ] and a \\\"quote\\\"; https://example.test/x y"}\n`;
test('one-object editing preserves other declarations, comments, spacing and string contents',()=>{
  const scope=objectCode(source,'date-1');assert.equal(scope.kind,'calendar');assert.ok(scope.code.includes('[1, 0, 2]'));
  const edited=scope.code.replace('2026-08-18','2026-05-12').replace('1.05','1.2'),merged=mergeObjectCode(scope,edited),objects=parseRoom(merged).scene.objects;
  assert.equal(objects[0].appearance.date,'2026-05-12');assert.equal(objects[0].scale,1.2);assert.deepEqual(objects[1],parseRoom(source).scene.objects[1]);
  assert.ok(merged.includes(' // keep this'));assert.equal(merged.split('\n')[3],source.split('\n')[3]);
  const note=objectCode(source,'note-1');assert.deepEqual(parseRoom(mergeObjectCode(note,note.code)).scene.objects[1],objects[1]);
});
test('invalid object code remains a recoverable draft and never changes the last rendered room',()=>{
  const history=new RoomHistory(source),scope=objectCode(source,'date-1');history.draft=mergeObjectCode(scope,scope.code.replace('1.05','oops'));
  assert.throws(()=>parseRoom(history.draft));assert.equal(history.source,source);assert.ok(history.dirty&&history.draft.includes('oops'));
  assert.equal(history.draft.split('\n')[3],source.split('\n')[3]);
  const saved=JSON.parse(JSON.stringify({source:history.source,draft:history.draft}));assert.equal(saved.draft,history.draft);
});
test('scoped edits and visual edits share undo while another object can be edited without losing the draft',()=>{
  const history=new RoomHistory(source);history.draft=mergeObjectCode(objectCode(source,'date-1'),objectCode(source,'date-1').code.replace('1.05','1.4'));
  const nextScope=objectCode(history.draft,'note-1');history.draft=mergeObjectCode(nextScope,nextScope.code.replace('literal','authored'));history.commit(history.draft);
  assert.equal(parseRoom(history.source).scene.objects[0].scale,1.4);assert.ok(parseRoom(history.source).scene.objects[1].content.startsWith('authored'));
  assert.ok(history.undo());assert.equal(history.source,source);assert.ok(history.redo());assert.equal(parseRoom(history.source).scene.objects[0].scale,1.4);
});
