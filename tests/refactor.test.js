import test from 'node:test';
import assert from 'node:assert/strict';
import { ContourState } from '../src/vector-math.js';
import { settle, RenderState } from '../src/render-state.js';
import { recordSlots } from '../src/record-layout.js';
import { adaptFloor, floorView, objectQuad, cssProjection } from '../src/floor-scene.js';
import { catalog, pageItems } from '../src/content/catalog.js';
import { articles } from '../src/content/journal.js';
import { MusicPlayer } from '../src/activities/music-player.js';
import { roomMood } from '../src/room-mood.js';
import { FrameLoop } from '../src/frame-loop.js';

test('the final spring frame invalidates geometry, including reduced motion', () => {
  for (const reduced of [false, true]) {
    const state = new ContourState({ point: [0] }, reduced);
    state.to({ point: [100] });
    let moving;
    do { moving = state.step(16); } while (moving);
    assert.equal(state.value.point[0], 100);
    assert.equal(state.changed, true, 'the final snapped position must be painted');
    state.step(16);
    assert.equal(state.changed, false);
  }
});

test('settled geometry stops invalidating, but retargeting immediately invalidates', () => {
  const state = new RenderState();
  let value = 0;
  for (let i = 0; i < 1000; i++) { value = settle(value, 1, 16, 600); state.changed([value]); }
  assert.equal(value, 1);
  assert.equal(state.changed([value]), false);
  assert.equal(state.changed([settle(value, 0, 16, 600)]), true);
  assert.equal(settle(0, 1, 0, 600, true), 1);
});

test('1, 6, 7 and 100 records all have bounded, valid shelves in every selection', () => {
  for (const count of [1, 6, 7, 100]) {
    const reached = new Set();
    for (let selected = 0; selected < count; selected++) {
      reached.add(selected);
      const slots = recordSlots(count, selected);
      assert.equal(slots.size, Math.min(5, count - 1));
      assert.equal(slots.has(selected), false);
      for (const [index, pose] of slots) {
        assert.ok(index >= 0 && index < count);
        assert.ok(Object.values(pose).every(Number.isFinite));
        const matrix = cssProjection(objectQuad(adaptFloor(floorView('listen')).floor, pose), 200, 200);
        assert.doesNotMatch(matrix, /NaN|Infinity|undefined/);
      }
    }
    assert.equal(reached.size, count);
  }
});

test('article pagination reaches every item and handles empty and shortened editions', () => {
  const entries = Array.from({ length: 20 }, (_, i) => ({ ...articles[i % articles.length], id: `article-${i}` }));
  const items = catalog(entries, ['title', 'tag', 'intro', 'text']);
  const pages = Array.from({ length: 7 }, (_, page) => pageItems(items, page));
  assert.deepEqual(pages.flatMap(page => page.items), items);
  assert.ok(pages.every(page => page.items.length <= 3));
  assert.equal(pageItems(items.slice(0, 2), 6).index, 0);
  assert.deepEqual(pageItems([], 6), { index: 0, pages: 1, items: [] });
  assert.throws(() => catalog([entries[0], entries[0]], ['title']), /Duplicate/);
});

const deferred = () => {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
};
function player() {
  const button = { setAttribute() {} };
  const room = { dataset: {}, querySelector: () => button };
  const tracks = [0, 1, 2].map(i => ({ id: `track-${i}`, title: `Track ${i}`, durationMs: 1000 }));
  const music = new MusicPlayer({ room, tracks, reduced: false, say() {} });
  const operations = [];
  const operation = () => { const pending = deferred(); operations.push(pending); return pending.promise; };
  music.attach({ activity: 'music', view: 'listen', setArm() {}, setView(view) { this.view = view; }, select: operation, dock: operation, cue: operation });
  music.updateTitle = () => music.sync();
  music.state = 'cued';
  return { music, operations };
}

test('rapid selection discards stale completions', async () => {
  const { music, operations } = player();
  const first = music.choose(1), second = music.choose(2);
  operations[0].resolve(true);
  await first;
  assert.equal(music.state, 'cueing');
  operations[1].resolve(true);
  await second;
  assert.equal(music.state, 'cued');
  assert.equal(music.selected, 2);
});

test('leaving during docking or arm lowering cannot restart playback', async () => {
  for (const duringArm of [false, true]) {
    const { music, operations } = player();
    const play = music.play();
    if (duringArm) { operations[0].resolve(true); await play; assert.equal(music.armDelay, 750); }
    music.world.activity = 'home';
    music.reset();
    if (!duringArm) { operations[0].resolve(true); await play; }
    music.step(1000);
    assert.equal(music.state, 'cued');
    assert.equal(music.world.playing, false);
  }
});

test('pause preserves progress and track completion returns to cue', async () => {
  const { music, operations } = player();
  music.beginPlayback();
  music.step(400);
  await music.play();
  music.step(400);
  assert.equal(music.elapsed, 400);
  await music.play();
  music.step(600);
  assert.equal(music.state, 'returning');
  operations[0].resolve(true);
  await Promise.resolve();
  assert.equal(music.state, 'cued');
  assert.equal(music.elapsed, 0);
});

test('new LPs can own their moods while unspecified periods keep the time fallback', () => {
  const trackMoods = { day: { edition: 'expressive', palette: 2 } };
  const day = roomMood({ hour: 13, activity: 'music', trackId: 'new-lp', trackMoods });
  assert.equal(day.edition, 'expressive');
  assert.equal(day.palette, 2);
  const night = roomMood({ hour: 23, activity: 'music', trackId: 'new-lp', trackMoods });
  assert.equal(night.edition, roomMood({ hour: 23 }).edition);
});

test('changing LPs does not replace the outgoing artwork during its fade', () => {
  const { music } = player();
  const drawn = [];
  Object.assign(music.world, { artTarget: 0, artOpacity: .8, pointer: { x: .5, y: .5, dx: 0, dy: 0, down: false }, drawTrack: track => drawn.push(track.id) });
  music.selected = 1;
  music.artDirty = true;
  music.draw(100);
  assert.deepEqual(drawn, []);
  music.world.artTarget = 1;
  music.draw(101);
  assert.deepEqual(drawn, ['track-1']);
  music.draw(200);
  assert.deepEqual(drawn, ['track-1'], 'stationary artwork does not repaint');
});

test('background tabs cancel the loop and resume without adding hidden elapsed time', t => {
  const original = { document: globalThis.document, requestAnimationFrame: globalThis.requestAnimationFrame, cancelAnimationFrame: globalThis.cancelAnimationFrame };
  const document = Object.assign(new EventTarget(), { hidden: false });
  const pending = new Map(), frames = [];
  let id = 0;
  Object.assign(globalThis, { document, requestAnimationFrame: callback => { pending.set(++id, callback); return id; }, cancelAnimationFrame: id => pending.delete(id) });
  t.after(() => { for (const [key, value] of Object.entries(original)) { if (value === undefined) delete globalThis[key]; else globalThis[key] = value; } });
  const loop = new FrameLoop(dt => frames.push(dt), error => { throw error; });
  const advance = time => { const [key, callback] = pending.entries().next().value; pending.delete(key); callback(time); };
  loop.start(); loop.start();
  assert.equal(pending.size, 1);
  advance(100); advance(116);
  document.hidden = true; document.dispatchEvent(new Event('visibilitychange'));
  assert.equal(pending.size, 0);
  document.hidden = false; document.dispatchEvent(new Event('visibilitychange'));
  advance(100000);
  assert.deepEqual(frames, [0, 16, 0]);
  loop.destroy();
  document.dispatchEvent(new Event('visibilitychange'));
  assert.equal(pending.size, 0);
});
