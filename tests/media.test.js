import test from 'node:test';
import assert from 'node:assert/strict';
import { CinemaPlayer } from '../src/activities/cinema-player.js';
import { SVGContext } from '../src/svg-context.js';

class Element extends EventTarget {
  constructor() { super(); this.attributes = new Map(); this.children = []; this.dataset = {}; this.writes = 0; this.paused = true; }
  setAttribute(key, value) { this.writes++; this.attributes.set(key, String(value)); }
  getAttribute(key) { return this.attributes.get(key) ?? null; }
  hasAttribute(key) { return this.attributes.has(key); }
  removeAttribute(key) { this.writes++; this.attributes.delete(key); }
  appendChild(child) { this.children.push(child); return child; }
  replaceChildren(...children) { this.children = children; }
  get firstChild() { return this.children[0]; }
  pause() { this.paused = true; this.dispatchEvent(new Event('pause')); }
  load() {}
  play() { this.paused = false; this.dispatchEvent(new Event('play')); return Promise.resolve(); }
}

test('video playlist keeps native media state, revokes replaced URLs and ignores stale failures', async t => {
  const oldOption = globalThis.Option;
  globalThis.Option = class { constructor(text, value) { Object.assign(this, { text, value }); } };
  t.after(() => { if (oldOption) globalThis.Option = oldOption; else delete globalThis.Option; });
  const revoked = [];
  let urls = 0;
  t.mock.method(URL, 'createObjectURL', () => `blob:fixture-${++urls}`);
  t.mock.method(URL, 'revokeObjectURL', url => revoked.push(url));
  const nodes = new Map();
  const root = { querySelector(key) { if (!nodes.has(key)) nodes.set(key, new Element()); return nodes.get(key); } };
  const player = new CinemaPlayer(root, [{ id: 'demo', title: 'Motion', kind: 'demo' }, { id: 'hosted', title: 'Hosted film', src: '/videos/test.mp4' }]);
  player.addFiles([{ name: 'one.mp4', type: 'video/mp4' }, { name: 'two.webm', type: 'video/webm' }]);
  assert.equal(player.entries.length, 4);
  assert.equal(player.video.src, 'blob:fixture-1');
  assert.equal(player.video.hidden, false);
  assert.equal(player.demo.hidden, true);
  await player.toggle();
  assert.equal(player.playing, true);
  player.video.dispatchEvent(new Event('ended'));
  assert.equal(player.playing, false);
  player.choose(player.entries[3].id);
  assert.deepEqual(revoked, ['blob:fixture-1']);
  let reject;
  t.mock.method(player.video, 'play', () => new Promise((_, fail) => { reject = fail; }));
  const pending = player.toggle();
  player.choose('demo');
  reject(new Error('interrupted source'));
  await pending;
  assert.equal(player.status.textContent, '');
  assert.equal(player.demo.hidden, false);
  assert.equal(player.video.hidden, true);
  assert.deepEqual(revoked, ['blob:fixture-1', 'blob:fixture-2']);
  player.choose('hosted');
  assert.equal(player.video.src, '/videos/test.mp4');
  player.video.error = { code: 4 };
  player.video.dispatchEvent(new Event('error'));
  assert.match(player.status.textContent, /재생할 수 없어요/);
  player.choose(player.entries[2].id);
  player.destroy();
  assert.equal(revoked.at(-1), 'blob:fixture-3');
  player.video.dispatchEvent(new Event('play'));
  assert.equal(player.playing, false, 'destroy removes media listeners');
  const empty = new CinemaPlayer(root, []);
  assert.equal(empty.playButton.disabled, true);
  await empty.toggle();
  empty.destroy();
});

test('identical SVG frames reuse paths and clips without DOM mutations', t => {
  const oldDocument = globalThis.document;
  globalThis.document = { createElementNS: () => new Element() };
  t.after(() => { if (oldDocument) globalThis.document = oldDocument; else delete globalThis.document; });
  const root = new Element(), context = new SVGContext(root);
  const draw = () => { context.reset(); context.rect(0, 0, 100, 100); context.clip(); context.fill(); context.commit(); };
  const writes = node => node.writes + node.children.reduce((sum, child) => sum + writes(child), 0);
  draw();
  const path = context.nodes[0].firstChild, count = writes(root);
  for (let i = 0; i < 120; i++) draw();
  assert.equal(context.nodes[0].firstChild, path);
  assert.equal(writes(root), count);
  const other = new SVGContext(new Element());
  assert.notEqual(context.prefix, other.prefix);
  context.reset(); context.commit();
  assert.equal(context.nodes[0].getAttribute('display'), 'none');
  draw();
  assert.equal(context.nodes[0].hasAttribute('display'), false);
});
