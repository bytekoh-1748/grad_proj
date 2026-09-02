import {
  clamp,
  EASE,
  FACE_FONT,
  FAN,
  IDLE_POINTER,
  lerp,
  PLUCK_EASE,
  REDUCED_MOTION,
  TIMING,
} from './src/config.js';
import { createCartridgeFace, paintCartridgeArt } from './src/cartridge-face.js';
import { getInteractions } from './src/interactions/index.js';

(() => {
  'use strict';

  /* ==================================================================
   * CRAFT BOY — 인터랙션 카트리지
   *
   *   1. 선반  같은 크기의 칩이 부채처럼 겹쳐 선다. 끌어서 넘긴다.
   *   2. 삽입  고른 칩이 날아가 게임기 위 홈으로 내려앉는다.
   *   3. 기동  화면에 불이 들어오고 마크가 내려온다.
   *   4. 확대  화면 안으로 밀고 들어가면 인터랙션이 시작된다.
   *
   * 움직임의 기준은 emilkowalski/skills 를 따른다. transform 과 opacity
   * 만 움직이고, 자주 하는 동작(넘기기)은 짧게, 드물게 보는 장면(삽입·
   * 확대)만 길게 간다. 도중에 아무 키나 누르면 끝으로 건너뛴다.
   * ================================================================ */

  const interactions = getInteractions();
  if (!interactions.length) throw new Error('No interactions have been registered.');

  /* 인터랙션의 메타데이터와 render()는 src/interactions에 독립 등록된다. */

  /* ==================================================================
   * 자리
   * ================================================================ */

  const roomEl = document.getElementById('room');
  const stageEl = document.getElementById('stage');
  const railEl = document.getElementById('rail');
  const seatEl = document.getElementById('seat');
  const consoleEl = document.getElementById('console');
  const ledEl = document.getElementById('led');
  const lcdEl = document.getElementById('lcd');
  const lcdCv = document.getElementById('lcd-cv');
  const flightEl = document.getElementById('flight');
  const playEl = document.getElementById('play');
  const playCv = document.getElementById('play-cv');
  const playTitleEl = document.getElementById('play-title');
  const playHintEl = document.getElementById('play-hint');
  const ejectEl = document.getElementById('eject');

  const LCD_W = 240, LCD_H = 160;      // 어드밴스의 도트 판
  lcdCv.width = LCD_W;
  lcdCv.height = LCD_H;
  const lcdG = lcdCv.getContext('2d');

  const lcdBuf = document.createElement('canvas');
  lcdBuf.width = LCD_W;
  lcdBuf.height = LCD_H;
  const bufG = lcdBuf.getContext('2d');

  const playG = playCv.getContext('2d');

  /* ==================================================================
   * 선반 — 부채처럼 겹친 칩
   * ================================================================ */

  /* 바로 옆 칩까지의 실제 거리 — 끌 때의 한 칸이기도 하다 */
  const stepPx = () => Math.abs(fanX(1)) || cardW;

  /* 초점만 한 뼘 앞으로 나온다. 나머지는 서로 같은 크기다. */
  function scaleOf(d) {
    return FAN.base + (1 - FAN.base) * Math.exp(-FAN.peak * Math.abs(d));
  }

  const INITIAL = Math.floor((interactions.length - 1) / 2);
  const chips = [];
  const rail = { pos: INITIAL, target: INITIAL, drag: null, wheel: 0, wheelAt: 0 };
  let focus = INITIAL;
  let cardW = 0, cardH = 0;
  let away = -1;           // 지금 선반을 떠나 있는 칩. layoutRail 이 손대지 않는다
  let state = 'shelf';     // shelf | inserting | play | ejecting

  interactions.forEach((interaction, i) => {
    const chip = document.createElement('div');
    chip.className = 'chip';
    chip.dataset.i = String(i);
    chip.setAttribute('role', 'option');
    chip.appendChild(createCartridgeFace(interaction, 200));
    railEl.appendChild(chip);
    chip._shade = chip.querySelector('.face-shade');
    chip._art = chip.querySelector('.face-art');
    chips.push(chip);
  });

  const probe = document.createElement('div');
  probe.className = 'probe';
  document.body.appendChild(probe);

  const cartProbe = document.createElement('div');
  cartProbe.className = 'probe probe-cart';
  document.body.appendChild(cartProbe);

  function readSizes() {
    cardW = probe.getBoundingClientRect().width || 160;
    cardH = cardW / 0.76;
    chips.forEach((chip) => {
      chip.style.setProperty('--w', cardW + 'px');
      chip.style.setProperty('--h', cardH + 'px');
      chip.firstChild.style.setProperty('--w', cardW + 'px');
      chip.firstChild.style.setProperty('--h', cardH + 'px');
    });
  }

  function repaintArt() {
    chips.forEach((chip, i) => paintCartridgeArt(chip._art, interactions[i]));
  }

  /* 초점에서 d 칸 떨어진 칩의 가로 자리.
     바로 옆은 거의 한 장 너비만큼 벌리고, 그 뒤는 같은 폭만 드러낸다. */
  function fanX(d) {
    const a = Math.abs(d), s = Math.sign(d);
    if (!a) return 0;
    const gap = a <= 1
      ? FAN.gapNear * a
      : FAN.gapNear + (a - 1) * FAN.gapFar;
    return s * gap * cardW;
  }

  function layoutRail() {
    // 선택 카드를 화면의 고정된 중심축에 두고 양옆을 같은 식으로 포갠다.
    for (let i = 0; i < chips.length; i++) {
      if (i === away) continue;      // 지금 기계 쪽에 가 있는 칩
      const d = i - rail.pos;
      const a = Math.abs(d);
      const x = fanX(d);
      const sc = scaleOf(d);
      // 양쪽은 각각 한 방향의 3D 스택이다. 왼쪽 면은 오른쪽(중앙)을,
      // 오른쪽 면은 왼쪽(중앙)을 보고 중앙으로 들어올 때만 정면으로 펴진다.
      const turn = Math.min(1, a);
      const ry = -Math.sign(d) * FAN.yaw * turn;
      const chip = chips[i];
      chip.style.transform =
        'translate3d(' + x.toFixed(2) + 'px,0,0) ' +
        'rotateY(' + ry.toFixed(2) + 'deg) scale(' + sc.toFixed(4) + ')';
      chip.style.zIndex = String(100 - Math.round(a * 10));
      chip.classList.toggle('is-focus', a < 0.5);
      chip._shade.style.opacity =
        (FAN.shade * (1 - Math.exp(-FAN.dim * a))).toFixed(3);
    }
  }

  function stepRail(dt) {
    if (rail.drag) return;
    const gap = rail.target - rail.pos;
    if (Math.abs(gap) < 0.0009) {
      rail.pos = rail.target;
      return;
    }
    // 180ms 안에 목표의 99.9%에 닿는 단방향 감속. 오버슈트가 없다.
    const snap = 1 - Math.pow(0.001, Math.min(dt, 48) / 180);
    rail.pos += gap * snap;
  }

  /* 지금 보고 있는 카트리지를 못박는다. */
  function setNow(i) {
    focus = i;
    chips.forEach((c, n) => c.setAttribute('aria-selected', n === i ? 'true' : 'false'));
  }

  function syncNow() {
    if (!Number.isFinite(rail.pos)) rail.pos = rail.target;
    const i = clamp(Math.round(rail.pos), 0, interactions.length - 1);
    if (i !== focus) setNow(i);
  }

  /* ==================================================================
   * 화면 — 도트 매트릭스 한 판
   * ================================================================ */

  const lcd = { power: 0, boot: -1, contrast: 0.17 };

  function paintLcd(now) {
    const interaction = interactions[focus];
    const on = lcd.power > 0.5;
    const ground = on ? interaction.screen.paper : '#151711';
    const ink = on ? interaction.screen.ink : '#8CA173';

    bufG.clearRect(0, 0, LCD_W, LCD_H);
    bufG.save();
    interaction.render({
      context: bufG,
      width: LCD_W,
      height: LCD_H,
      time: now,
      color: ink,
      pointer: IDLE_POINTER,
    });
    bufG.restore();

    lcdG.globalAlpha = 1;
    lcdG.fillStyle = ground;
    lcdG.fillRect(0, 0, LCD_W, LCD_H);
    lcdG.globalAlpha = lcd.contrast;
    lcdG.drawImage(lcdBuf, 0, 0);
    lcdG.globalAlpha = 1;

    if (!on) {
      lcdG.fillStyle = 'rgba(18,20,14,0.82)';
      lcdG.fillRect(0, LCD_H * 0.2 - LCD_H * 0.07, LCD_W, LCD_H * 0.14);
      lcdG.fillStyle = 'rgba(150,171,124,0.72)';
      lcdG.font = '700 ' + (LCD_H * 0.07).toFixed(1) + 'px ' + FACE_FONT;
      lcdG.textAlign = 'center';
      lcdG.textBaseline = 'middle';
      lcdG.fillText('INSERT CARTRIDGE', LCD_W / 2, LCD_H * 0.2);
      return;
    }

    // 기동 — 마크가 위에서 내려와 한 박자 머문다
    if (lcd.boot >= 0) {
      const b = clamp((now - lcd.boot) / TIMING.boot, 0, 1);
      const slide = b < 0.62 ? b / 0.62 : 1;
      const e = 1 - Math.pow(1 - slide, 3);
      const y = lerp(-LCD_H * 0.14, LCD_H * 0.2, e);
      lcdG.fillStyle = ground;
      lcdG.fillRect(0, 0, LCD_W, LCD_H);
      lcdG.fillStyle = interaction.screen.ink;
      lcdG.textAlign = 'center';
      lcdG.textBaseline = 'middle';
      lcdG.font = '700 ' + (LCD_H * 0.125).toFixed(1) + 'px ' + FACE_FONT;
      lcdG.fillText('CRAFT BOY', LCD_W / 2, y);
      lcdG.font = '700 ' + (LCD_H * 0.055).toFixed(1) + 'px ' + FACE_FONT;
      lcdG.globalAlpha = b > 0.72 ? 1 : 0;
      lcdG.fillText(
        'ADVANCE  ·  NO. ' + interaction.number,
        LCD_W / 2,
        y + LCD_H * 0.13,
      );
      lcdG.globalAlpha = 1;
      if (b >= 1) lcd.boot = -1;
    }
  }

  /* ==================================================================
   * 화면 안 — 확대가 끝난 뒤의 실물
   * ================================================================ */

  const ptr = { x: 0.5, y: 0.5, dx: 0, dy: 0, down: false, tx: 0, ty: 0, vx: 0, vy: 0 };

  // 캔버스의 실제 상자에서 크기를 딴다. 창이 바뀌는 도중에 잰 값으로
  // 뒷판을 잡아 두면 가장자리에 그리지 않은 띠가 남는다.
  let playW = 0, playH = 0;

  function sizePlay() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    playW = playCv.clientWidth || window.innerWidth;
    playH = playCv.clientHeight || window.innerHeight;
    playCv.width = Math.round(playW * dpr);
    playCv.height = Math.round(playH * dpr);
    playG.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function stepPtr(dt) {
    const k = Math.min(2, dt / 16.7);
    if (!ptr.down) { ptr.tx = 0; ptr.ty = 0; }
    ptr.vx = (ptr.vx + (ptr.tx - ptr.dx) * 0.17 * k) * Math.pow(0.78, k);
    ptr.vy = (ptr.vy + (ptr.ty - ptr.dy) * 0.17 * k) * Math.pow(0.78, k);
    ptr.dx += ptr.vx * k;
    ptr.dy += ptr.vy * k;
  }

  function paintPlay(now) {
    if (playCv.clientWidth !== playW || playCv.clientHeight !== playH) sizePlay();
    const interaction = interactions[focus];
    const W = playW, H = playH;
    playG.fillStyle = interaction.screen.paper;
    playG.fillRect(0, 0, W, H);
    playG.save();
    interaction.render({
      context: playG,
      width: W,
      height: H,
      time: now,
      color: interaction.screen.ink,
      pointer: ptr,
    });
    playG.restore();
  }

  /* ==================================================================
   * 넣기 — 칩이 날아가 홈에 앉고, 불이 들어오고, 화면 안으로 들어간다
   * ================================================================ */

  const seq = { skip: false, timers: [], anims: [] };

  /* 칩은 어느 부모에 들어가든 제 상자의 한가운데를 기준으로 앉는다.
     그래서 부모를 갈아 끼워도 그 중심만 다시 재면 화면 위 자리가
     어긋나지 않는다 — 카드 한 장이 선반·허공·슬롯을 그대로 건너간다.
     복제본이 없으니 패키지 도안도 하나뿐이다. */

  const midOf = (r) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });

  /* 변형을 걷어낸 맨 자리의 중심. 재고 바로 되돌리므로 화면에는 남지 않는다. */
  function restCenter(chip) {
    const prev = chip.style.transform;
    chip.style.transform = 'none';
    const r = chip.getBoundingClientRect();
    chip.style.transform = prev;
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  function poseAt(o, cx, cy, s) {
    return 'translate3d(' + (cx - o.x).toFixed(2) + 'px,'
      + (cy - o.y).toFixed(2) + 'px,0) scale(' + s.toFixed(4) + ')';
  }

  /* 부모를 바꿔 달되 화면 위 자리는 그대로 둔다 */
  function reparent(chip, parent, cx, cy, s) {
    parent.appendChild(chip);
    const o = restCenter(chip);
    chip.style.transform = poseAt(o, cx, cy, s);
    return o;
  }

  /* 끝난 자리를 인라인으로 못박고 애니메이션을 거둔다. 순서가 중요하다 —
     먼저 써 두어야 거두는 순간에 한 프레임도 튀지 않는다. */
  function land(chip, anim, pose) {
    chip.style.transform = pose;
    anim.cancel();
  }

  /* 슬롯에 앉은 칩의 자리. 잔줄과 무늬만 남기고 --cart-lip 만큼을
     기계가 문다 — 도안은 선반에서 보던 그 조판 그대로다. */
  function dockPose() {
    const c = consoleEl.getBoundingClientRect();
    const p = cartProbe.getBoundingClientRect();
    const s = p.width / cardW;
    return { x: c.left + c.width / 2, y: c.top + p.height - (cardH * s) / 2, s, lip: p.height };
  }

  /* 슬롯 바로 위 — 여기서 손을 떼고 아래로 눌러 넣는다 */
  const hoverY = (d) => d.y - d.lip - cardH * d.s * 0.11;

  /* 선반에서 칩이 서는 한 점. 모든 칩이 같은 자리를 기준으로 앉는다. */
  function railHome() {
    const r = railEl.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top };
  }

  function wait(ms) {
    if (seq.skip || REDUCED_MOTION) return Promise.resolve();
    return new Promise((res) => {
      const id = setTimeout(() => {
        const n = seq.timers.findIndex((t) => t.id === id);
        if (n >= 0) seq.timers.splice(n, 1);
        res();
      }, ms);
      seq.timers.push({ id, res });
    });
  }

  function run(el, frames, opts) {
    const a = el.animate(frames, Object.assign({ fill: 'forwards' }, opts));
    seq.anims.push(a);
    a.finished.catch(() => {}).then(() => {
      const n = seq.anims.indexOf(a);
      if (n >= 0) seq.anims.splice(n, 1);
    });
    if (seq.skip) a.finish();
    return a;
  }

  function skipSequence() {
    if (state !== 'inserting') return;
    seq.skip = true;
    seq.anims.slice().forEach((a) => { try { a.finish(); } catch (e) {} });
    seq.timers.splice(0).forEach((t) => { clearTimeout(t.id); t.res(); });
  }

  /* 화면(LCD)이 눈앞을 꽉 채우도록 stage 를 밀고 키우는 값 */
  function zoomTransform() {
    const prev = stageEl.style.transform;
    stageEl.style.transform = 'none';
    const r = lcdEl.getBoundingClientRect();
    stageEl.style.transform = prev;
    const k = Math.max(innerWidth / r.width, innerHeight / r.height) * 1.02;
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    return 'translate(' + (-k * (cx - innerWidth / 2)).toFixed(2) + 'px,'
      + (-k * (cy - innerHeight / 2)).toFixed(2) + 'px) scale(' + k.toFixed(4) + ')';
  }

  let zoomPose = '';

  async function insert() {
    if (state !== 'shelf') return;
    state = 'inserting';
    seq.skip = false;

    const i = clamp(Math.round(rail.target), 0, interactions.length - 1);
    if (i !== focus) setNow(i);
    const interaction = interactions[i];
    const chip = chips[i];

    // 이 칩만 선반의 손에서 뗀다 — layoutRail 이 매 프레임 덮어쓰지 않도록
    away = i;
    chip.classList.remove('is-focus');
    chip.setAttribute('role', 'presentation');
    chip.setAttribute('aria-hidden', 'true');

    const start = midOf(chip.getBoundingClientRect());
    const s0 = scaleOf(i - rail.pos);
    const dock = dockPose();
    const hover = hoverY(dock);

    // 남은 카드는 한 뼘 물러나고, 고른 한 장만 허공으로 옮겨 붙는다
    const o = reparent(chip, flightEl, start.x, start.y, s0);
    railEl.classList.add('is-gone');

    // 한 번 뽑아 들었다가 슬롯 위로 가져간다. 가는 길이 곧으므로
    // 마디마다 다른 이징을 섞지 않는다 — 위로 한 번, 아래로 한 번.
    const fly = run(chip, [
      { transform: poseAt(o, start.x, start.y, s0), easing: EASE.out },
      { transform: poseAt(o, start.x, start.y - cardH * 0.09, s0 * 1.03),
        offset: 0.26, easing: PLUCK_EASE },
      { transform: poseAt(o, dock.x, hover, dock.s) },
    ], { duration: REDUCED_MOTION ? 1 : TIMING.flight });
    await fly.finished.catch(() => {});
    land(chip, fly, poseAt(o, dock.x, hover, dock.s));

    // 여기서부터는 기계의 일부다. 아직 슬롯 위에 떠 있으므로
    // 콘솔 뒤로 넘어가도 눈에 보이는 변화가 없다.
    const so = reparent(chip, seatEl, dock.x, hover, dock.s);
    seatEl.classList.add('is-in');

    const push = run(chip, [
      { transform: poseAt(so, dock.x, hover, dock.s) },
      { transform: poseAt(so, dock.x, dock.y + 2, dock.s), offset: 0.84 },
      { transform: poseAt(so, dock.x, dock.y, dock.s) },
    ], { duration: REDUCED_MOTION ? 1 : TIMING.seat, easing: EASE.drawer });

    // 다 눌린 순간 기계가 한 번 받는다
    setTimeout(() => {
      if (REDUCED_MOTION || state !== 'inserting') return;
      consoleEl.animate([
        { transform: 'translateY(0)' },
        { transform: 'translateY(1.5px)' },
        { transform: 'translateY(0)' },
      ], { duration: 150, easing: 'ease-out' });
    }, TIMING.seat * 0.72);

    await push.finished.catch(() => {});
    land(chip, push, poseAt(so, dock.x, dock.y, dock.s));

    // 불이 든다
    ledEl.classList.add('is-on');
    lcd.power = 1;
    lcd.contrast = 1;
    lcd.boot = performance.now();
    await wait(TIMING.power + TIMING.boot);
    lcd.boot = -1;

    // 화면 안으로. 트랜지션이 아니라 애니메이션이라야 도중에 건너뛸 수 있다.
    zoomPose = zoomTransform();
    if (!REDUCED_MOTION) {
      const z = run(stageEl, [
        { transform: 'none' },
        { transform: zoomPose },
      ], { duration: TIMING.zoom, easing: EASE.out });
      await z.finished.catch(() => {});
      stageEl.style.transform = zoomPose;
      z.cancel();
    } else {
      stageEl.style.transform = zoomPose;
    }

    playTitleEl.textContent = interaction.title;
    playHintEl.textContent = interaction.hint;
    playEl.style.setProperty('--play-ink', interaction.screen.ink);
    playEl.setAttribute('aria-hidden', 'false');
    playEl.classList.add('is-on');
    roomEl.classList.add('is-inside');
    ptr.dx = 0; ptr.dy = 0; ptr.vx = 0; ptr.vy = 0;
    state = 'play';
  }

  async function eject() {
    if (state !== 'play') return;
    state = 'ejecting';
    seq.skip = false;

    playEl.classList.remove('is-on');
    playEl.setAttribute('aria-hidden', 'true');
    roomEl.classList.remove('is-inside');
    await wait(TIMING.fade);

    if (!REDUCED_MOTION && zoomPose) {
      const z = run(stageEl, [
        { transform: zoomPose },
        { transform: 'none' },
      ], { duration: TIMING.out, easing: EASE.out });
      await z.finished.catch(() => {});
      stageEl.style.transform = '';
      z.cancel();
    } else {
      stageEl.style.transform = '';
    }
    zoomPose = '';

    // 들어온 길을 그대로 되짚는다 — 슬롯에서 뽑히고, 선반으로 돌아간다
    const chip = chips[focus];
    const dock = dockPose();
    const hover = hoverY(dock);
    const so = restCenter(chip);

    const pull = run(chip, [
      { transform: poseAt(so, dock.x, dock.y, dock.s) },
      { transform: poseAt(so, dock.x, hover, dock.s) },
    ], { duration: REDUCED_MOTION ? 1 : TIMING.seat, easing: EASE.out });
    await pull.finished.catch(() => {});
    land(chip, pull, poseAt(so, dock.x, hover, dock.s));

    seatEl.classList.remove('is-in');
    const o = reparent(chip, flightEl, dock.x, hover, dock.s);
    railEl.classList.remove('is-gone');

    const home = railHome();
    const back = run(chip, [
      { transform: poseAt(o, dock.x, hover, dock.s) },
      { transform: poseAt(o, dock.x, hover - cardH * dock.s * 0.10, dock.s),
        offset: 0.24, easing: PLUCK_EASE },
      { transform: poseAt(o, home.x, home.y, 1) },
    ], { duration: REDUCED_MOTION ? 1 : TIMING.flight, easing: EASE.out });
    await back.finished.catch(() => {});

    // 선반이 다시 이 칩의 자리를 맡는다. 만든 차례 그대로 끼워 넣어야
    // 좌우 대칭인 이웃의 겹침 순서가 바뀌지 않는다.
    railEl.insertBefore(chip, chips[focus + 1] || null);
    chip.setAttribute('role', 'option');
    chip.removeAttribute('aria-hidden');
    away = -1;
    rail.pos = focus;
    rail.target = focus;
    layoutRail();
    back.cancel();

    ledEl.classList.remove('is-on');
    lcd.power = 0;
    lcd.contrast = 0.17;
    state = 'shelf';
  }

  /* ==================================================================
   * 한 판 — 그리기
   * ================================================================ */

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(48, now - last);
    last = now;

    if (state !== 'play') {
      stepRail(dt);
      layoutRail();
      if (state === 'shelf') syncNow();
    }
    if (state !== 'play') paintLcd(now);
    if (state === 'play') {
      stepPtr(dt);
      paintPlay(now);
    }
    requestAnimationFrame(frame);
  }

  /* ==================================================================
   * 입력
   * ================================================================ */

  const LAST = interactions.length - 1;

  function goto(i) {
    rail.target = clamp(i, 0, LAST);
  }

  stageEl.addEventListener('pointerdown', (e) => {
    if (state !== 'shelf') return;
    stageEl.setPointerCapture(e.pointerId);
    rail.drag = { x: e.clientX, from: rail.pos, moved: 0 };
    stageEl.classList.add('is-dragging');
  });

  stageEl.addEventListener('pointermove', (e) => {
    const d = rail.drag;
    if (!d) return;
    const dx = e.clientX - d.x;
    d.moved = Math.max(d.moved, Math.abs(dx));
    rail.pos = clamp(d.from - dx / stepPx(), 0, LAST);
  });

  function endDrag(e) {
    const d = rail.drag;
    if (!d) return;
    rail.drag = null;
    stageEl.classList.remove('is-dragging');
    if (stageEl.hasPointerCapture?.(e.pointerId)) stageEl.releasePointerCapture(e.pointerId);

    // 놓은 자리에서 가장 가까운 카드로 짧게 스냅한다. 관성·튕김은 없다.
    goto(Math.round(rail.pos));

    if (d.moved < 6) {
      const under = document.elementFromPoint(e.clientX, e.clientY);
      const chip = under && under.closest ? under.closest('.chip') : null;
      const i = chip ? Number(chip.dataset.i) : -1;
      if (i >= 0) {
        if (i === focus && Math.abs(rail.pos - focus) < 0.35) insert();
        else goto(i);
      }
    }
  }
  stageEl.addEventListener('pointerup', endDrag);
  stageEl.addEventListener('pointercancel', endDrag);

  stageEl.addEventListener('wheel', (e) => {
    if (state !== 'shelf') return;
    e.preventDefault();
    const now = performance.now();
    if (now - rail.wheelAt > 220) rail.wheel = 0;
    rail.wheelAt = now;
    rail.wheel += Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (Math.abs(rail.wheel) > 42) {
      goto(Math.round(rail.target) + Math.sign(rail.wheel));
      rail.wheel = 0;
    }
  }, { passive: false });

  addEventListener('keydown', (e) => {
    if (state === 'inserting') { skipSequence(); return; }
    if (e.key === 'Escape') { eject(); return; }
    if (state !== 'shelf') return;
    if (e.key === 'ArrowRight') { goto(Math.round(rail.target) + 1); e.preventDefault(); }
    else if (e.key === 'ArrowLeft') { goto(Math.round(rail.target) - 1); e.preventDefault(); }
    else if (e.key === 'Enter' || e.key === ' ') { insert(); e.preventDefault(); }
  });

  // 삽입 중에 화면을 누르면 끝으로 건너뛴다 — 기다리게 두지 않는다
  addEventListener('pointerdown', () => { if (state === 'inserting') skipSequence(); }, true);

  ejectEl.addEventListener('click', eject);

  playCv.addEventListener('pointerdown', (e) => {
    playCv.setPointerCapture(e.pointerId);
    ptr.down = true;
    ptr.ox = e.clientX;
    ptr.oy = e.clientY;
  });
  playCv.addEventListener('pointermove', (e) => {
    ptr.x = e.clientX / (playW || window.innerWidth);
    ptr.y = e.clientY / (playH || window.innerHeight);
    if (!ptr.down) return;
    const unit = Math.min(playW, playH) * 0.34;
    ptr.tx = clamp((e.clientX - ptr.ox) / unit, -1, 1);
    ptr.ty = clamp((e.clientY - ptr.oy) / unit, -1, 1);
  });
  function playUp(e) {
    ptr.down = false;
    playCv.releasePointerCapture?.(e.pointerId);
  }
  playCv.addEventListener('pointerup', playUp);
  playCv.addEventListener('pointercancel', playUp);

  addEventListener('resize', () => {
    readSizes();
    repaintArt();
    sizePlay();
    // 슬롯에 앉아 있는 칩은 창이 바뀌면 자리를 다시 잡아야 한다
    if (away >= 0 && chips[away].parentElement === seatEl) {
      const chip = chips[away];
      const d = dockPose();
      chip.style.transform = poseAt(restCenter(chip), d.x, d.y, d.s);
    }
    if (state === 'play') {
      zoomPose = zoomTransform();
      stageEl.style.transform = zoomPose;
    }
  });

  /* ==================================================================
   * 시작 — 칩이 차례로 자리를 잡는다
   * ================================================================ */

  readSizes();
  sizePlay();
  layoutRail();
  setNow(INITIAL);
  requestAnimationFrame(() => {
    repaintArt();
    if (!REDUCED_MOTION) {
      chips.forEach((chip, i) => {
        chip.animate([
          { opacity: 0, transform: chip.style.transform + ' translateY(14px)' },
          { opacity: 1, transform: chip.style.transform },
        ], { duration: 520, delay: 60 + Math.abs(i - focus) * 45, easing: EASE.out, fill: 'backwards' });
      });
    }
  });
  document.fonts?.ready.then(repaintArt);
  requestAnimationFrame(frame);
})();
