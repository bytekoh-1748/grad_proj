import {
  clamp,
  EASE,
  IDLE_POINTER,
  lerp,
  POP,
  REDUCED_MOTION,
  RPM,
  TIMING,
} from './src/config.js';
import { buildRecord } from './src/record-art.js';
import { DECK, deckArm, deckBase } from './src/turntable.js';
import { getTracks } from './src/tracks/index.js';

(() => {
  'use strict';

  /* ==================================================================
   * HOT WAX — 팝아트 턴테이블
   *
   *   1. 상자   판이 오른쪽에서 대각선으로 겹쳐 선다. 굴려서 넘긴다.
   *   2. 큐     고른 판이 활을 그리며 무대 한가운데로 들어오고,
   *             그 박자에 맞춰 제목과 아티스트가 비스듬히 밀려 들어온다.
   *   3. 재생   판이 플래터로 옮겨 앉고 톤암이 안쪽으로 들어온다.
   *   4. 넘김   바늘이 앉고 5초 뒤 무대가 사라지고 곡의 화면이 올라온다.
   *   5. 정지   톤암이 바깥으로 나가고 판은 왔던 자리로 돌아간다.
   *
   * 움직이는 것은 transform 과 opacity 뿐이다. 자주 하는 동작(넘기기)은
   * 짧게, 드물게 보는 장면(큐·도킹)만 길게 간다.
   * ================================================================ */

  const tracks = getTracks();
  if (!tracks.length) throw new Error('No tracks have been registered.');

  /* ------------------------------------------------------------------
   * 자리
   * ---------------------------------------------------------------- */

  const roomEl = document.getElementById('room');
  const deckBaseEl = document.getElementById('deck-base');
  const deckArmEl = document.getElementById('deck-arm');
  const recordsEl = document.getElementById('records');
  const billboardEl = document.getElementById('billboard');
  const transportEl = document.getElementById('transport');
  const cueEl = document.getElementById('cue');

  const spotAnchor = document.getElementById('anchor-spot');
  const headAnchor = document.getElementById('anchor-crate-head');
  const tailAnchor = document.getElementById('anchor-crate-tail');

  const visualEl = document.getElementById('visual');
  const visualCv = document.getElementById('visual-cv');
  const visualG = visualCv.getContext('2d');
  const liftEl = document.getElementById('lift');

  const bb = {
    side: billboardEl.querySelector('.bb-side [data-slide]'),
    title: billboardEl.querySelector('.bb-title [data-slide]'),
    artist: billboardEl.querySelector('.bb-artist [data-slide]'),
    meta: billboardEl.querySelector('.bb-meta [data-slide]'),
  };

  const vh = {
    side: document.getElementById('vh-side'),
    title: document.getElementById('vh-title'),
    artist: document.getElementById('vh-artist'),
    hint: document.getElementById('vh-hint'),
    bpm: document.getElementById('vh-bpm'),
    needle: document.getElementById('vh-needle'),
  };

  /* innerHTML 로 갈아 끼우면 마크업에 심어 둔 자리표까지 지워진다.
     그림만 앞에 끼워 넣고 자리표는 그대로 둔다. */
  deckBaseEl.insertAdjacentHTML('afterbegin', deckBase());
  deckArmEl.innerHTML = deckArm();
  const platterMark = deckBaseEl.querySelector('#platter-mark');

  /* ------------------------------------------------------------------
   * 판 — 한 장이 상자·무대·플래터를 그대로 건너간다
   * ---------------------------------------------------------------- */

  const cards = tracks.map((track, i) => {
    const card = buildRecord(track);
    card.dataset.i = String(i);
    card.setAttribute('role', 'option');
    card.setAttribute('aria-label', `${track.title} — ${track.artist}`);
    recordsEl.appendChild(card);
    card._spin = card.querySelector('.record-spin');
    return card;
  });

  const CRATE_SCALE = 1;
  const SPOT_SCALE = 1.2;

  /* ------------------------------------------------------------------
   * 잰 값 — 레이아웃은 CSS 가 정하고 여기서는 재기만 한다
   * ---------------------------------------------------------------- */

  const geo = {
    D: 200,
    spot: { x: 0, y: 0 },
    head: { x: 0, y: 0 },
    axis: { x: 0, y: 1 },
    perp: { x: -1, y: 0 },
    step: 100,
    platter: { x: 0, y: 0, scale: 1 },
  };

  const centerOf = (el) => {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  };

  function measure() {
    geo.D = cards[0].offsetWidth || 200;
    geo.spot = centerOf(spotAnchor);
    geo.head = centerOf(headAnchor);

    const tail = centerOf(tailAnchor);
    const dx = tail.x - geo.head.x;
    const dy = tail.y - geo.head.y;
    const len = Math.hypot(dx, dy) || 1;
    geo.axis = { x: dx / len, y: dy / len };
    geo.perp = { x: -geo.axis.y, y: geo.axis.x };   // 상자에서 무대 쪽을 가리킨다
    geo.step = len / 6.2;      // 판끼리 절반쯤 겹친다

    /* 자리는 크기 없는 점에서, 크기는 데크의 레이아웃 너비에서 잰다.
       판의 검은 원은 200짜리 상자 안에서 지름 198을 차지한다. */
    const mark = centerOf(platterMark);
    const deckPx = deckBaseEl.offsetWidth || 1;
    const discPx = (DECK.platter.r * 2) * (deckPx / DECK.width);
    geo.platter = { x: mark.x, y: mark.y, scale: discPx / 0.99 / geo.D };
  }

  /* ------------------------------------------------------------------
   * 상자 — 대각선 위에 놓인 자리들
   * ---------------------------------------------------------------- */

  const FOCUS_SLOT = 1.9;          // 초점이 서는 자리 (머리에서 몇 칸 아래)
  const crate = { pos: 0, target: 0, drag: null, wheel: 0, wheelAt: 0 };
  const gap = { value: 0, target: 0 };   // 판이 빠져나간 자리를 닫는 정도

  let focus = 0;
  let out = -1;                    // 지금 상자를 떠나 있는 판
  let state = 'idle';              // idle | cueing | cued | docking | playing | paused | screen | returning
  let gen = 0;                     // 지나간 순서를 무효로 만드는 표

  function slotOf(i, closed = gap.value) {
    return i - (out >= 0 && i > out ? closed : 0);
  }

  function cratePlace(i, pos = crate.pos, closed = gap.value) {
    const d = slotOf(i, closed) - slotOf(pos, closed);
    const near = Math.abs(d);
    const along = (d + FOCUS_SLOT) * geo.step;
    const pop = Math.exp(-near * near * 1.5) * geo.D * 0.2;
    return {
      x: geo.head.x + geo.axis.x * along + geo.perp.x * pop,
      y: geo.head.y + geo.axis.y * along + geo.perp.y * pop,
      s: CRATE_SCALE * (1 + 0.05 * Math.exp(-near * near * 1.5)),
      near,
    };
  }

  const spotPlace = () => ({ x: geo.spot.x, y: geo.spot.y, s: SPOT_SCALE });
  const platterPlace = () => ({ x: geo.platter.x, y: geo.platter.y, s: geo.platter.scale });

  function poseAt(x, y, s) {
    return `translate3d(${(x - geo.D / 2).toFixed(2)}px, ${(y - geo.D / 2).toFixed(2)}px, 0) `
      + `scale(${s.toFixed(4)})`;
  }

  const flying = new Set();     // 지금 활을 그리며 옮겨 가는 중인 판

  function layoutCrate() {
    for (let i = 0; i < cards.length; i += 1) {
      if (i === out || flying.has(i)) continue;
      const place = cratePlace(i);
      const card = cards[i];
      card.style.transform = poseAt(place.x, place.y, place.s);
      card.style.zIndex = String(100 + i);
      card.style.opacity = place.near > 3.4 ? String(clamp(4.4 - place.near, 0, 1)) : '1';
      card.classList.toggle('is-focus', place.near < 0.5);
      card.classList.add('is-pickable');
    }
  }

  function stepCrate(dt) {
    const ease = (from, to) => {
      const delta = to - from;
      if (Math.abs(delta) < 0.0009) return to;
      return from + delta * (1 - Math.pow(0.001, Math.min(dt, 48) / TIMING.shuffle));
    };
    gap.value = ease(gap.value, gap.target);
    if (crate.drag) return;
    crate.pos = ease(crate.pos, crate.target);
  }

  let followTimer = 0;

  function syncFocus() {
    const i = clamp(Math.round(crate.pos), 0, tracks.length - 1);
    if (i === focus) return;
    focus = i;
    cards.forEach((card, n) => card.setAttribute('aria-selected', n === i ? 'true' : 'false'));

    /* 상자가 멎으면 무대 위의 판도 그 자리로 갈아탄다 */
    if (state !== 'idle' && state !== 'cueing' && state !== 'cued') return;
    clearTimeout(followTimer);
    followTimer = setTimeout(() => {
      if ((state === 'idle' || state === 'cued') && out !== focus) cue(focus);
    }, 180);
  }

  /* ------------------------------------------------------------------
   * 톤암 — 각도 하나로만 말한다
   * ---------------------------------------------------------------- */

  const armEl = deckArmEl.querySelector('#tonearm');
  let armDeg = DECK.arm.rest;

  /* 지금 화면에 그려진 각도. 재생 중에는 톤암이 4분에 걸쳐 안쪽으로
     기어들어 가므로, 멈출 때는 목표값이 아니라 이 값을 붙잡아야 한다. */
  function liveArmDeg() {
    const m = new DOMMatrixReadOnly(getComputedStyle(armEl).transform);
    return (Math.atan2(m.b, m.a) * 180) / Math.PI;
  }

  function setArm(deg, ms, easing = EASE.arm, lifted = false) {
    armDeg = deg;
    deckArmEl.style.setProperty('--arm-time', `${REDUCED_MOTION ? 1 : ms}ms`);
    deckArmEl.style.setProperty('--arm-ease', easing);
    deckArmEl.style.setProperty('--arm', `${deg.toFixed(2)}deg`);
    deckArmEl.style.setProperty('--arm-scale', lifted ? '1.035' : '1');
  }

  /* ------------------------------------------------------------------
   * 회전 — 33⅓ 까지 천천히 올라갔다 천천히 내려온다
   * ---------------------------------------------------------------- */

  const FULL_RATE = (RPM * 360) / 60000;      // ms 당 각도
  const spin = { deg: 0, rate: 0, target: 0 };

  function stepSpin(dt) {
    const k = 1 - Math.pow(0.001, Math.min(dt, 48) / TIMING.spinUp);
    spin.rate = lerp(spin.rate, spin.target, k);
    if (spin.rate < 0.0004 && spin.target === 0) spin.rate = 0;
    if (!spin.rate) return;
    spin.deg = (spin.deg + spin.rate * dt) % 360;
    if (out >= 0) {
      cards[out]._spin.setAttribute('transform', `rotate(${spin.deg.toFixed(2)} 100 100)`);
    }
  }

  /* ------------------------------------------------------------------
   * 날기 — 활을 그리며 자리를 옮긴다
   * ---------------------------------------------------------------- */

  const wait = (ms) => new Promise((resolve) => {
    setTimeout(resolve, REDUCED_MOTION ? 0 : ms);
  });

  const inFlight = new WeakMap();

  function flyTo(card, from, to, ms, easing, bow) {
    inFlight.get(card)?.cancel();          // 앞선 비행은 여기서 끝난다
    const mid = {
      x: (from.x + to.x) / 2 + bow.x,
      y: (from.y + to.y) / 2 + bow.y,
      s: ((from.s + to.s) / 2) * 1.06,
    };
    const anim = card.animate(
      [
        { transform: poseAt(from.x, from.y, from.s) },
        { transform: poseAt(mid.x, mid.y, mid.s), offset: 0.5 },
        { transform: poseAt(to.x, to.y, to.s) },
      ],
      { duration: REDUCED_MOTION ? 1 : ms, easing, fill: 'forwards' },
    );
    inFlight.set(card, anim);

    /* 도착했을 때만 자리를 못박는다. 도중에 끊긴 비행은 아무것도 쓰지 않는다 —
       그래야 뒤이은 비행이 지금 위치에서 이어받는다. */
    return anim.finished.then(() => {
      card.style.transform = poseAt(to.x, to.y, to.s);
      anim.cancel();
      inFlight.delete(card);
    }).catch(() => {});
  }

  /* ------------------------------------------------------------------
   * 대각선 타이포
   * ---------------------------------------------------------------- */

  function showBillboard(track) {
    billboardEl.classList.remove('is-on');
    void billboardEl.offsetWidth;                 // 되감아 다시 밀어 넣는다
    bb.side.textContent = `SIDE ${track.side}`;
    bb.title.textContent = track.title;
    bb.artist.textContent = track.artist;
    bb.meta.textContent = `${track.genre} · ${track.duration} · ${track.bpm} BPM`;
    billboardEl.classList.add('is-on');
  }

  const hideBillboard = () => billboardEl.classList.remove('is-on');

  function say(text, muted = false) {
    cueEl.textContent = text;
    cueEl.classList.toggle('is-hidden', muted);
  }

  /* ------------------------------------------------------------------
   * 트랜스포트
   * ---------------------------------------------------------------- */

  const keys = {};
  transportEl.querySelectorAll('.tkey').forEach((key) => {
    keys[key.dataset.act] = key;
  });

  function syncTransport() {
    const playing = state === 'playing' || state === 'screen';
    const cued = state === 'cued' || state === 'paused';
    keys.play.disabled = playing || state === 'cueing' || state === 'docking';
    keys.pause.disabled = !playing;
    keys.stop.disabled = !(playing || cued);
    keys.play.classList.toggle('is-live', playing);
    keys.pause.classList.toggle('is-live', state === 'paused');
  }

  function hit(key) {
    key.classList.add('is-hit');
    setTimeout(() => key.classList.remove('is-hit'), 130);
  }

  /* ------------------------------------------------------------------
   * 순서 — 큐 · 도킹 · 재생 · 정지
   * ---------------------------------------------------------------- */

  /* 무대에 나와 있던 판을 상자로 돌려보낸다. 기다리지 않는다 —
     새 판이 나오는 동안 옛 판은 제 갈 길로 돌아간다. */
  function sendBack(index) {
    const card = cards[index];
    const from = readPlace(card);
    const to = cratePlace(index, crate.pos, 0);

    flying.add(index);
    card.classList.remove('is-docked');
    card.style.zIndex = String(100 + index);
    card._spin.removeAttribute('transform');

    return flyTo(card, from, to, TIMING.back, EASE.out, {
      x: (to.x - from.x) * 0.08,
      y: -geo.D * 0.16,
    }).then(() => {
      flying.delete(index);
      card.classList.add('is-pickable');
      card.style.opacity = '1';
    });
  }

  /* 지금 화면 위에 서 있는 자리를 그대로 읽어 온다.
     상자를 재지 않고 변형 행렬에서 곧장 뽑는다 — SVG 가 상자 밖으로 조금
     넘쳐 그려지는 탓에 getBoundingClientRect 는 판보다 넓게 나온다.
     판은 왼쪽 위 (0,0) 에 놓이므로 제자리 중심은 늘 (D/2, D/2) 이고,
     크기 변화는 그 중심을 움직이지 않는다. */
  function readPlace(card) {
    const m = new DOMMatrixReadOnly(getComputedStyle(card).transform);
    const half = geo.D / 2;
    return { x: m.e + half, y: m.f + half, s: m.a || 1 };
  }

  async function cue(index) {
    if (index === out && state === 'cued') return;
    const my = ++gen;

    if (state === 'screen') leaveScreen();
    if (state === 'playing' || state === 'paused' || state === 'screen') {
      setArm(DECK.arm.rest, TIMING.armOut, EASE.arm, false);
    }

    const leaving = out;
    spin.target = 0;
    spin.deg = 0;
    state = 'cueing';
    syncTransport();

    const track = tracks[index];
    const card = cards[index];
    const from = readPlace(card);      // 지금 서 있는 자리에서 이어 간다

    out = index;
    gap.value = leaving >= 0 ? gap.value : 0;
    gap.target = 1;
    crate.target = index;
    if (leaving >= 0 && leaving !== index) sendBack(leaving);

    card.classList.remove('is-pickable', 'is-focus', 'is-docked');
    card.style.opacity = '1';
    card.style.zIndex = '900';

    const to = spotPlace();
    say('CUEING', true);

    const flight = flyTo(card, from, to, TIMING.pick, EASE.arc, {
      x: (from.x - to.x) * 0.1,
      y: -geo.D * 0.26,
    });
    setTimeout(() => { if (my === gen) showBillboard(track); }, TIMING.pick * 0.42);

    await flight;
    if (my !== gen) return;

    state = 'cued';
    syncTransport();
    say('PRESS PLAY · THE ARM SWINGS IN');
  }

  async function play() {
    if (state === 'playing' || state === 'screen') return;

    /* 멈춰 있던 자리에서 다시 이어 간다 */
    if (state === 'paused') {
      const my = ++gen;
      state = 'playing';
      syncTransport();
      setArm(liveArmDeg(), TIMING.drop, EASE.out, false);   // 들었던 바늘을 그 자리에 내린다
      spin.target = FULL_RATE;
      await wait(TIMING.drop);
      if (my !== gen) return;
      startTrack(my);
      return;
    }

    if (state !== 'cued') {
      await cue(focus);
      if (state !== 'cued') return;
    }

    const my = ++gen;
    state = 'docking';
    syncTransport();
    say('LOADING THE PLATTER', true);

    const card = cards[out];
    const from = readPlace(card);
    const to = platterPlace();

    card.classList.add('is-docked');
    card.style.zIndex = '';

    await flyTo(card, from, to, TIMING.dock, EASE.arc, {
      x: (to.x - from.x) * 0.06,
      y: -geo.D * 0.3,
    });
    if (my !== gen) return;

    /* 판이 앉자마자 돌기 시작하고, 톤암이 뒤따라 안쪽으로 들어온다 */
    spin.target = FULL_RATE;
    setArm(DECK.arm.lead, TIMING.armIn, EASE.arm, true);
    say('THE ARM SWINGS IN', true);
    await wait(TIMING.armIn);
    if (my !== gen) return;

    /* 바늘이 홈에 내려앉는다 */
    setArm(DECK.arm.lead, TIMING.drop, EASE.out, false);
    await wait(TIMING.drop);
    if (my !== gen) return;

    state = 'playing';
    syncTransport();
    startTrack(my);
  }

  /* 바늘이 앉은 뒤 — 톤암이 아주 느리게 안쪽으로 파고들고,
     5초를 세고 나면 무대가 사라지고 곡의 화면이 올라온다. */
  async function startTrack(my) {
    const track = tracks[out];
    playedAt = performance.now();
    setArm(DECK.arm.runOut, 240000, 'linear', false);

    const beats = Math.max(1, Math.round(TIMING.lead / 1000));
    for (let n = beats; n > 0; n -= 1) {
      say(`${track.title.toUpperCase()} · ${track.artist.toUpperCase()} · ${n}`);
      await wait(TIMING.lead / beats);
      if (my !== gen) return;
    }

    enterScreen(track);
  }

  function enterScreen(track) {
    state = 'screen';
    syncTransport();
    sizeVisual();

    vh.side.textContent = `SIDE ${track.side}`;
    vh.title.textContent = track.title;
    vh.artist.textContent = track.artist;
    vh.hint.textContent = track.hint;
    vh.bpm.textContent = `${track.bpm} BPM`;
    vh.needle.style.background = track.scene.ink;

    hideBillboard();
    roomEl.classList.add('is-gone');
    visualEl.classList.add('is-on');
    visualEl.setAttribute('aria-hidden', 'false');
  }

  function leaveScreen() {
    visualEl.classList.remove('is-on');
    visualEl.setAttribute('aria-hidden', 'true');
    roomEl.classList.remove('is-gone');
  }

  function pause() {
    if (state !== 'playing' && state !== 'screen') return;
    gen += 1;
    if (state === 'screen') leaveScreen();
    state = 'paused';
    syncTransport();
    spin.target = 0;
    setArm(liveArmDeg(), TIMING.drop * 1.8, EASE.out, true);   // 파고들던 자리에서 멈춰 든다
    say('PAUSED · THE ARM IS HELD');
  }

  async function stop() {
    if (state === 'idle' || state === 'returning' || out < 0) return;
    const my = ++gen;
    if (state === 'screen') leaveScreen();

    state = 'returning';
    syncTransport();
    hideBillboard();
    say('THE ARM SWINGS OUT', true);

    spin.target = 0;
    setArm(DECK.arm.rest, TIMING.armOut, EASE.arm, false);
    await wait(TIMING.armOut * 0.55);
    if (my !== gen) return;

    const index = out;
    out = -1;
    gap.target = 0;
    crate.target = index;
    await sendBack(index);
    if (my !== gen) return;

    state = 'idle';
    syncTransport();
    say('SCROLL OR DRAG THE CRATE · CLICK A RECORD TO CUE');
  }

  function skip(direction) {
    const live = state === 'playing' || state === 'screen' || state === 'paused';
    /* 재생 중이면 지금 도는 판을, 아니면 상자가 향하는 곳을 기준으로 삼는다 —
       그래야 연달아 누른 만큼 계속 넘어간다. */
    const here = live ? out : Math.round(crate.target);
    const next = clamp(here + direction, 0, tracks.length - 1);
    if (next === here) return;

    crate.target = next;
    if (!live) return;                            // 상자만 넘기면 무대가 따라온다
    cue(next).then(() => play());
  }

  /* ------------------------------------------------------------------
   * 화면 안 — 곡의 인터랙션
   * ---------------------------------------------------------------- */

  const ptr = { x: 0.5, y: 0.5, dx: 0, dy: 0, down: false, tx: 0, ty: 0, vx: 0, vy: 0 };
  let playedAt = 0;
  let visualW = 0;
  let visualH = 0;

  function sizeVisual() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    visualW = visualCv.clientWidth || window.innerWidth;
    visualH = visualCv.clientHeight || window.innerHeight;
    visualCv.width = Math.round(visualW * dpr);
    visualCv.height = Math.round(visualH * dpr);
    visualG.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function stepPointer(dt) {
    const k = Math.min(2, dt / 16.7);
    if (!ptr.down) { ptr.tx = 0; ptr.ty = 0; }
    ptr.vx = (ptr.vx + (ptr.tx - ptr.dx) * 0.17 * k) * Math.pow(0.78, k);
    ptr.vy = (ptr.vy + (ptr.ty - ptr.dy) * 0.17 * k) * Math.pow(0.78, k);
    ptr.dx += ptr.vx * k;
    ptr.dy += ptr.vy * k;
  }

  function paintVisual(now, dt) {
    if (visualCv.clientWidth !== visualW || visualCv.clientHeight !== visualH) sizeVisual();
    const track = tracks[out];
    if (!track) return;

    const beat = ((now - playedAt) / (60000 / track.bpm));
    const pulse = Math.pow(1 - (beat % 1), 3);

    visualG.fillStyle = track.scene.ground;
    visualG.fillRect(0, 0, visualW, visualH);
    visualG.save();
    track.render({
      context: visualG,
      width: visualW,
      height: visualH,
      time: now,
      dt,
      beat,
      pulse,
      pointer: ptr,
      palette: POP,
    });
    visualG.restore();

    vh.needle.style.transform = `scale(${(1 + pulse * 0.34).toFixed(3)})`;
  }

  /* ------------------------------------------------------------------
   * 한 프레임
   * ---------------------------------------------------------------- */

  let last = performance.now();

  function frame(now) {
    const dt = Math.min(64, now - last);
    last = now;

    stepCrate(dt);
    syncFocus();
    layoutCrate();
    stepSpin(dt);

    if (state === 'screen') {
      stepPointer(dt);
      paintVisual(now, dt);
    }
    requestAnimationFrame(frame);
  }

  /* ------------------------------------------------------------------
   * 입력
   * ---------------------------------------------------------------- */

  /* 포인터를 붙잡지 않는다. 붙잡으면 pointerup 이 방으로 되돌려져
     판 위에서 뗀 손가락이 클릭으로 이어지지 않는다. 방은 화면을 다 덮으니
     창에서 듣는 것으로 충분하다. */
  roomEl.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || event.target.closest('.tkey')) return;
    crate.drag = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      from: crate.pos,
      moved: 0,
    };
  });

  addEventListener('pointermove', (event) => {
    const drag = crate.drag;
    if (!drag || drag.id !== event.pointerId) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    drag.moved = Math.max(drag.moved, Math.hypot(dx, dy));
    /* 상자의 대각선 위로 손가락을 투영한다 */
    const along = dx * geo.axis.x + dy * geo.axis.y;
    crate.pos = clamp(drag.from - along / geo.step, -0.6, tracks.length - 0.4);
  });

  let lastDragMoved = 0;

  function endDrag(event) {
    const drag = crate.drag;
    if (!drag || drag.id !== event.pointerId) return;
    lastDragMoved = drag.moved;
    crate.drag = null;
    crate.target = clamp(Math.round(crate.pos), 0, tracks.length - 1);
  }

  addEventListener('pointerup', endDrag);
  addEventListener('pointercancel', endDrag);

  roomEl.addEventListener('wheel', (event) => {
    event.preventDefault();
    const now = performance.now();
    const delta = Math.abs(event.deltaY) > Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
    crate.wheel += delta;
    if (now - crate.wheelAt < 90 || Math.abs(crate.wheel) < 26) return;
    crate.wheelAt = now;
    crate.target = clamp(
      crate.target + Math.sign(crate.wheel),
      0,
      tracks.length - 1,
    );
    crate.wheel = 0;
  }, { passive: false });

  cards.forEach((card, i) => {
    card.addEventListener('click', () => {
      if (crate.drag || lastDragMoved > 6) return;
      crate.target = i;
      cue(i);
    });
  });

  roomEl.addEventListener('click', (event) => {
    if (event.target.closest('.record, .tkey') || lastDragMoved > 6) return;
    if (state === 'idle') cue(focus);
  });

  transportEl.addEventListener('click', (event) => {
    const key = event.target.closest('.tkey');
    if (!key || key.disabled) return;
    hit(key);
    ({ prev: () => skip(-1), next: () => skip(1), play, pause, stop }[key.dataset.act])();
  });

  liftEl.addEventListener('click', stop);

  addEventListener('keydown', (event) => {
    const map = {
      ArrowLeft: () => skip(-1),
      ArrowUp: () => skip(-1),
      ArrowRight: () => skip(1),
      ArrowDown: () => skip(1),
      Escape: stop,
    };
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      hit(state === 'playing' || state === 'screen' ? keys.pause : keys.play);
      (state === 'playing' || state === 'screen' ? pause : play)();
      return;
    }
    const run = map[event.key];
    if (!run) return;
    event.preventDefault();
    run();
  });

  visualCv.addEventListener('pointerdown', (event) => {
    ptr.down = true;
    ptr.px = event.clientX;
    ptr.py = event.clientY;
    visualCv.setPointerCapture?.(event.pointerId);
  });

  visualCv.addEventListener('pointermove', (event) => {
    ptr.x = clamp(event.clientX / window.innerWidth, 0, 1);
    ptr.y = clamp(event.clientY / window.innerHeight, 0, 1);
    if (!ptr.down) return;
    ptr.tx = clamp((event.clientX - ptr.px) / (window.innerWidth * 0.32), -1, 1);
    ptr.ty = clamp((event.clientY - ptr.py) / (window.innerHeight * 0.32), -1, 1);
  });

  function releasePointer(event) {
    ptr.down = false;
    visualCv.releasePointerCapture?.(event.pointerId);
  }

  visualCv.addEventListener('pointerup', releasePointer);
  visualCv.addEventListener('pointercancel', releasePointer);

  addEventListener('resize', () => {
    measure();
    layoutCrate();
    if (out >= 0) {
      const place = state === 'playing' || state === 'screen' || state === 'paused'
        ? platterPlace()
        : spotPlace();
      cards[out].style.transform = poseAt(place.x, place.y, place.s);
    }
    if (state === 'screen') sizeVisual();
  });

  /* ------------------------------------------------------------------
   * 시작
   * ---------------------------------------------------------------- */

  Object.assign(ptr, IDLE_POINTER);
  measure();
  setArm(DECK.arm.rest, 1, EASE.out, false);
  layoutCrate();
  syncTransport();
  requestAnimationFrame(frame);

  document.fonts?.ready.then(() => { measure(); layoutCrate(); });

  /* 첫 인상 — 판 한 장은 이미 무대에 나와 있다 */
  setTimeout(() => { if (state === 'idle') cue(0); }, 420);

  /* 확인용 — 지금 무대가 어떤 상태인지 한 줄로 읽는다 */
  window.__hotwax = () => ({
    state,
    focus,
    out,
    arm: armDeg,
    spin: Number(spin.rate.toFixed(4)),
    track: out >= 0 ? tracks[out].title : null,
    billboard: billboardEl.classList.contains('is-on'),
    screen: visualEl.classList.contains('is-on'),
  });
})();
