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

  /* 파일 스택에서 바로 옆 칩까지의 세로 거리 — 끌 때의 한 칸이기도 하다. */
  const stepPx = () => cardH * 0.1144 || cardW;

  /* 초점만 한 뼘 앞으로 나온다. 나머지는 서로 같은 크기다. */
  function scaleOf(d) {
    return FAN.base + (1 - FAN.base) * Math.exp(-FAN.peak * Math.abs(d));
  }

  const INITIAL = Math.min(1, interactions.length - 1);
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
    chip.dataset.tab = 'NO. ' + interaction.number;
    chip.setAttribute('role', 'option');
    chip.style.setProperty('--body', interaction.cartridge.body);
    chip.style.setProperty('--tab-x', [6, 31, 50, 14, 42, 24][i % 6] + '%');
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

  function layoutRail() {
    // 선택 카드를 오른쪽 고정축에 두고 위아래의 카드를 파일처럼 포갠다.
    for (let i = 0; i < chips.length; i++) {
      if (i === away) continue;      // 지금 기계 쪽에 가 있는 칩
      const d = i - rail.pos;
      const a = Math.abs(d);
      const x = Math.min(3, a) * cardW * 0.018;
      const y = d * stepPx();
      const sc = scaleOf(d);
      const chip = chips[i];
      chip.style.transform =
        'translate3d(' + x.toFixed(2) + 'px,' + y.toFixed(2) + 'px,0) ' +
        'scale(' + sc.toFixed(4) + ')';
      chip.style.zIndex = String(a < 0.5 ? 200 : 100 - Math.round(a * 10));
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
        'SIDE LOAD  ·  NO. ' + interaction.number,
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

  function poseAt(o, cx, cy, s, rotation = 0) {
    return 'translate3d(' + (cx - o.x).toFixed(2) + 'px,'
      + (cy - o.y).toFixed(2) + 'px,0) rotate(' + rotation.toFixed(2) + 'deg) '
      + 'scale(' + s.toFixed(4) + ')';
  }

  /* 부모를 바꿔 달되 화면 위 자리는 그대로 둔다 */
  function reparent(chip, parent, cx, cy, s, rotation = 0) {
    parent.appendChild(chip);
    const o = restCenter(chip);
    chip.style.transform = poseAt(o, cx, cy, s, rotation);
    return o;
  }

  /* 끝난 자리를 인라인으로 못박고 애니메이션을 거둔다. 순서가 중요하다 —
     먼저 써 두어야 거두는 순간에 한 프레임도 튀지 않는다. */
  function land(chip, anim, pose) {
    chip.style.transform = pose;
    anim.cancel();
  }

  /* 오른쪽 옆면 슬롯의 자리. 세로 카드를 90도 돌린 뒤 왼쪽으로 밀어
     전체 길이의 약 1/4만 손잡이처럼 본체 밖에 남긴다. */
  function dockPose() {
    const c = consoleEl.getBoundingClientRect();
    const p = cartProbe.getBoundingClientRect();
    const s = p.width / cardW;
    const total = cardH * s;
    const visible = total * 0.58;
    return {
      x: c.right + visible - total / 2,
      approach: c.right + 22 + total / 2,
      y: c.top + c.height * 0.527,
      s,
      total,
    };
  }

  /* 파일 스택에서 선택 칩이 서는 한 점. */
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
  let interactionHistoryActive = false;
  let historyReturnPending = false;
  let returnAfterInsert = false;

  /* 인터랙션은 별도 페이지처럼 느껴지지만 실제 URL은 그대로다. 같은 URL의
     히스토리 항목을 한 칸 쌓아 브라우저 뒤로가기를 홈 복귀에 사용한다. */
  function pushInteractionHistory() {
    if (interactionHistoryActive) return;
    try {
      history.pushState({ craftBoyInteraction: true }, '', location.href);
      interactionHistoryActive = true;
    } catch (error) {
      interactionHistoryActive = false;
    }
  }

  async function insert() {
    if (state !== 'shelf') return;
    state = 'inserting';
    seq.skip = false;
    returnAfterInsert = false;
    pushInteractionHistory();

    const i = clamp(Math.round(rail.target), 0, interactions.length - 1);
    if (i !== focus) setNow(i);
    const interaction = interactions[i];
    const chip = chips[i];

    // 이 칩만 선반의 손에서 뗀다 — layoutRail 이 매 프레임 덮어쓰지 않도록
    away = i;
    chip.classList.add('is-active');
    chip.classList.remove('is-focus');
    chip.setAttribute('role', 'presentation');
    chip.setAttribute('aria-hidden', 'true');

    const start = midOf(chip.getBoundingClientRect());
    const s0 = scaleOf(i - rail.pos);
    const dock = dockPose();

    // 남은 파일은 오른쪽으로 물러나고, 고른 한 장만 허공으로 옮겨 붙는다.
    const o = reparent(chip, flightEl, start.x, start.y, s0);
    railEl.classList.add('is-gone');

    // 파일을 스택에서 왼쪽으로 뽑으며 가로로 돌려 포트 앞에 정렬한다.
    const fly = run(chip, [
      { transform: poseAt(o, start.x, start.y, s0), easing: EASE.out },
      { transform: poseAt(o, start.x - cardW * 0.12, start.y - cardW * 0.03, s0 * 1.02, 24),
        offset: 0.26, easing: PLUCK_EASE },
      { transform: poseAt(o, dock.approach, dock.y, dock.s, 90) },
    ], { duration: REDUCED_MOTION ? 1 : TIMING.flight });
    await fly.finished.catch(() => {});
    land(chip, fly, poseAt(o, dock.approach, dock.y, dock.s, 90));

    // 포트 바깥에 정렬된 순간 본체 뒤 레이어로 넘겨 왼쪽으로 밀어 넣는다.
    const so = reparent(chip, seatEl, dock.approach, dock.y, dock.s, 90);
    seatEl.classList.add('is-in');

    const push = run(chip, [
      { transform: poseAt(so, dock.approach, dock.y, dock.s, 90) },
      { transform: poseAt(so, dock.x - 2, dock.y, dock.s, 90), offset: 0.84 },
      { transform: poseAt(so, dock.x, dock.y, dock.s, 90) },
    ], { duration: REDUCED_MOTION ? 1 : TIMING.seat, easing: EASE.drawer });

    // 다 눌린 순간 기계가 한 번 받는다
    setTimeout(() => {
      if (REDUCED_MOTION || state !== 'inserting') return;
      consoleEl.animate([
        { transform: 'translateX(0)' },
        { transform: 'translateX(-1.5px)' },
        { transform: 'translateX(0)' },
      ], { duration: 150, easing: 'ease-out' });
    }, TIMING.seat * 0.72);

    await push.finished.catch(() => {});
    land(chip, push, poseAt(so, dock.x, dock.y, dock.s, 90));

    // 불이 든다
    ledEl.classList.add('is-on');
    lcdEl.classList.add('is-on');
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

    // 삽입 애니메이션 중 뒤로가기를 눌렀다면 도착하자마자 홈으로 돌아간다.
    if (returnAfterInsert) {
      returnAfterInsert = false;
      eject();
    }
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
    const so = restCenter(chip);

    const pull = run(chip, [
      { transform: poseAt(so, dock.x, dock.y, dock.s, 90) },
      { transform: poseAt(so, dock.approach, dock.y, dock.s, 90) },
    ], { duration: REDUCED_MOTION ? 1 : TIMING.seat, easing: EASE.out });
    await pull.finished.catch(() => {});
    land(chip, pull, poseAt(so, dock.approach, dock.y, dock.s, 90));

    seatEl.classList.remove('is-in');
    const o = reparent(chip, flightEl, dock.approach, dock.y, dock.s, 90);
    railEl.classList.remove('is-gone');

    const home = railHome();
    const back = run(chip, [
      { transform: poseAt(o, dock.approach, dock.y, dock.s, 90) },
      { transform: poseAt(o, dock.approach + dock.total * 0.08, dock.y, dock.s, 72),
        offset: 0.24, easing: PLUCK_EASE },
      { transform: poseAt(o, home.x, home.y, 1) },
    ], { duration: REDUCED_MOTION ? 1 : TIMING.flight, easing: EASE.out });
    await back.finished.catch(() => {});

    // 선반이 다시 이 칩의 자리를 맡는다. 만든 차례 그대로 끼워 넣어야
    // 좌우 대칭인 이웃의 겹침 순서가 바뀌지 않는다.
    railEl.insertBefore(chip, chips[focus + 1] || null);
    chip.classList.remove('is-active');
    chip.setAttribute('role', 'option');
    chip.removeAttribute('aria-hidden');
    away = -1;
    rail.pos = focus;
    rail.target = focus;
    layoutRail();
    back.cancel();

    ledEl.classList.remove('is-on');
    lcdEl.classList.remove('is-on');
    lcd.power = 0;
    lcd.contrast = 0.17;
    state = 'shelf';
  }

  /* 닫기 버튼과 Escape도 브라우저 뒤로가기와 같은 히스토리 한 칸을
     소비한다. 그래야 닫힌 뒤에 인터랙션용 항목이 남지 않는다. */
  function requestEject() {
    if (state !== 'play') return;
    if (interactionHistoryActive) {
      if (historyReturnPending) return;
      historyReturnPending = true;
      history.back();
      return;
    }
    eject();
  }

  addEventListener('popstate', () => {
    if (!interactionHistoryActive) return;
    interactionHistoryActive = false;
    historyReturnPending = false;

    if (state === 'inserting') {
      returnAfterInsert = true;
      skipSequence();
      return;
    }
    if (state === 'play') eject();
  });

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
    rail.drag = { y: e.clientY, from: rail.pos, moved: 0 };
    stageEl.classList.add('is-dragging');
  });

  stageEl.addEventListener('pointermove', (e) => {
    const d = rail.drag;
    if (!d) return;
    const dy = e.clientY - d.y;
    d.moved = Math.max(d.moved, Math.abs(dy));
    rail.pos = clamp(d.from - dy / stepPx(), 0, LAST);
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
    if (e.key === 'Escape') { requestEject(); return; }
    if (state !== 'shelf') return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      goto(Math.round(rail.target) + 1); e.preventDefault();
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      goto(Math.round(rail.target) - 1); e.preventDefault();
    }
    else if (e.key === 'Enter' || e.key === ' ') { insert(); e.preventDefault(); }
  });

  // 삽입 중에 화면을 누르면 끝으로 건너뛴다 — 기다리게 두지 않는다
  addEventListener('pointerdown', () => { if (state === 'inserting') skipSequence(); }, true);

  ejectEl.addEventListener('click', requestEject);

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
      chip.style.transform = poseAt(restCenter(chip), d.x, d.y, d.s, 90);
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
          { opacity: 0, transform: chip.style.transform + ' translateX(16px)' },
          { opacity: 1, transform: chip.style.transform },
        ], { duration: 520, delay: 60 + Math.abs(i - focus) * 45, easing: EASE.out, fill: 'backwards' });
      });
    }
  });
  document.fonts?.ready.then(repaintArt);
  requestAnimationFrame(frame);
})();
