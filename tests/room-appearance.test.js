import test from 'node:test';
import assert from 'node:assert/strict';
import {appearanceError, displayDate, shiftDisplayMonth} from '../src/editor/widget-appearance.js';
import {parseRoom, patchObject, appendObject, RoomHistory} from '../src/editor/room-code.js';
import {INITIAL_ROOMS} from '../src/editor/templates.js';

test('display dates clamp month ends, reject impossible dates, and do not change the wall clock', () => {
  const now = new Date(2026, 4, 31, 18, 24), stamp = now.getTime();
  assert.equal(shiftDisplayMonth({date: '2026-01-31'}, 1).date, '2026-02-28');
  assert.equal(shiftDisplayMonth({date: '2024-01-31'}, 1).date, '2024-02-29');
  assert.equal(shiftDisplayMonth({date: '2026-12-31'}, 1).date, '2027-01-31');
  const date = displayDate(now, {date: '2026-08-18', time: '10:08'});
  assert.deepEqual([date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes()], [2026, 7, 18, 10, 8]);
  assert.equal(now.getTime(), stamp);
  for (const value of [{date: '2026-02-30'}, {date: '2026-13-01'}, {time: '24:00'}, {text: 'x'.repeat(49)}, {value: 'NaN'}, {date: null}, []]) assert.ok(appearanceError(value));
  assert.equal(appearanceError({date: '2024-02-29', time: '23:59', text: '<small room>', value: '-128.00'}), null);
});

test('display edits persist in room source and share undo without altering old content or comments', () => {
  const source = appendObject(INITIAL_ROOMS[0].source,'calendar',{appearance:{date:'2026-05-18'}}).code + '// keep this note\n', history = new RoomHistory(source);
  const object = parseRoom(source).scene.objects.find(o => o.kind === 'calendar');
  history.commit(patchObject(source, object.id, {appearance: {...object.appearance, date: '2026-08-18'}}));
  const saved = parseRoom(history.source).scene.objects.find(o => o.id === object.id);
  assert.equal(saved.appearance.date, '2026-08-18');
  assert.equal(saved.content, object.content); assert.deepEqual(saved.at, object.at);
  assert.match(history.source, /keep this note/);
  assert.ok(history.undo()); assert.equal(history.source, source);
  assert.ok(history.redo()); assert.equal(parseRoom(history.source).scene.objects.find(o => o.id === object.id).appearance.date, '2026-08-18');
  assert.throws(() => parseRoom(patchObject(source, object.id, {appearance: {date: '2026-02-30'}})), /날짜/);
});

