(() => {
  'use strict';

  /* ==================================================================
   * 1. 문장 — 글자 자리마다 "뜻이 같은 자리"의 다른 언어 글자를 짝지어 둔 표
   *
   *   안녕하세요,   →  Hello,       →  こんにちは、  →  你好呀，
   *   좋은          →  good         →  よい          →  美好
   *   하루          →  day          →  一日          →  一天
   *   보내세요.     →  have.        →  お過ごし。    →  度过。
   *
   * 한 줄이 글자 한 칸. 그 칸은 이 줄에 적힌 글자들끼리만 서로 바뀐다.
   * 중국어는 글자 수가 적어서 대응이 없는 칸은 비워 뒀다.
   * ================================================================ */

  const SENTENCE = '안녕하세요, 좋은 하루 보내세요.';

  const VARIANTS = [
    ['안',  'H',  'こ', '你'],
    ['녕',  'e',  'ん', '好'],
    ['하',  'l',  'に', '呀'],
    ['세',  'l',  'ち'],
    ['요',  'o',  'は'],
    [',',   '、', '，'],

    ['좋',  'go', 'よ', '美'],
    ['은',  'od', 'い', '好'],

    ['하',  'da', '一'],
    ['루',  'y',  '日', '天'],

    ['보',  'h',  'お', '度'],
    ['내',  'a',  '過', '过'],
    ['세',  'v',  'ご'],
    ['요',  'e',  'し'],
    ['.',   '。'],
  ];

  /* 깔끔하고 둥근 산세리프. name 은 폭 측정용, stack 은 실제 적용용. */
  const FONTS = [
    { name: "'Pretendard Variable'", stack: "'Pretendard Variable', Pretendard, 'Noto Sans KR', 'Noto Sans JP', 'Noto Sans SC', sans-serif", weight: 400 },
    { name: "'Outfit'",              stack: "'Outfit', 'Noto Sans KR', 'Noto Sans JP', 'Noto Sans SC', sans-serif",            weight: 400 },
    { name: "'Plus Jakarta Sans'",   stack: "'Plus Jakarta Sans', 'Noto Sans KR', 'Noto Sans JP', 'Noto Sans SC', sans-serif", weight: 400 },
    { name: "'Quicksand'",           stack: "'Quicksand', 'Noto Sans KR', 'Noto Sans JP', 'Noto Sans SC', sans-serif",         weight: 500 },
    { name: "'Nunito'",              stack: "'Nunito', 'Noto Sans KR', 'Noto Sans JP', 'Noto Sans SC', sans-serif",            weight: 400 },
    { name: "'M PLUS Rounded 1c'",   stack: "'M PLUS Rounded 1c', 'Noto Sans KR', 'Noto Sans SC', sans-serif",                 weight: 400 },
    { name: "'Zen Maru Gothic'",     stack: "'Zen Maru Gothic', 'Noto Sans KR', 'Noto Sans SC', sans-serif",                   weight: 400 },
  ];

  /* ==================================================================
   * 2. 라인아트 — 글자 자리마다 하나씩. 리사주 곡선.
   *
   *   x = rx · sin(a·t + δ)      y = ry · sin(b·t)
   *
   * δ 가 0 이면 사선 한 줄, π/2 면 타원. 그 사이를 천천히 오가면
   * 선이 스스로 열리고 닫히면서 살아 있는 형태가 된다.
   * a:b 비율이 형태를 결정한다 — 1:1 타원, 1:2 8자, 3:2·2:3 매듭.
   * ================================================================ */

  const ART = [
    { a: 2, b: 3, d: 0.50, rx: 47, ry: 68, rot: -10 },  // H   매듭
    { a: 1, b: 3, d: 0.50, rx: 57, ry: 61, rot:   6 },  // e   세 겹
    { a: 1, b: 1, d: 0.10, rx: 44, ry: 72, rot: -20 },  // l   사선 한 줄
    { a: 1, b: 2, d: 0.55, rx: 41, ry: 71, rot:  14 },  // l   8자
    { a: 1, b: 1, d: 0.50, rx: 60, ry: 57, rot: -26 },  // o   타원
    { a: 1, b: 1, d: 0.26, rx: 26, ry: 31, rot:  38 },  // ,   작은 획
    { a: 1, b: 2, d: 0.42, rx: 59, ry: 60, rot:  -8 },  // go  8자
    { a: 1, b: 1, d: 0.58, rx: 53, ry: 65, rot:  20 },  // od  타원
    { a: 2, b: 3, d: 0.36, rx: 54, ry: 61, rot: -14 },  // da  매듭
    { a: 1, b: 2, d: 0.62, rx: 47, ry: 71, rot:  10 },  // y   8자
    { a: 1, b: 1, d: 0.40, rx: 51, ry: 68, rot:  18 },  // h   타원
    { a: 1, b: 3, d: 0.46, rx: 56, ry: 58, rot: -22 },  // a   세 겹
    { a: 1, b: 2, d: 0.50, rx: 42, ry: 72, rot:  24 },  // v   8자
    { a: 1, b: 1, d: 0.52, rx: 62, ry: 54, rot: -12 },  // e   타원
    { a: 1, b: 1, d: 0.44, rx: 24, ry: 31, rot: -42 },  // .   작은 획
  ];

  const ART_WIDTH = 0.82;       // 굳은 칸의 폭 (em). 글자 폭과 비슷하게

  const SAMPLES = 132;          // 곡선을 몇 점으로 그릴지
  const DELTA_SWING = 0.20;     // δ 가 흔들리는 폭 (× π). 커지면 선이 납작하게 눌린다

  /* 알록달록하되 형광은 피한다. 참조 이미지의 주황·초록·올리브·보라·갈색·파랑 계열 */
  const PALETTE = [
    [ 22, 86, 48],  // 주황
    [130, 52, 39],  // 초록
    [ 48, 90, 35],  // 올리브
    [247, 70, 66],  // 보라
    [209, 72, 44],  // 파랑
    [ 25, 44, 42],  // 갈색
    [340, 60, 54],  // 자주
    [174, 56, 37],  // 청록
    [  8, 72, 51],  // 붉은 주황
    [268, 44, 52],  // 남보라
    [ 92, 46, 37],  // 연두
    [198, 64, 45],  // 하늘
    [ 38, 80, 45],  // 호박
    [318, 46, 51],  // 분홍
    [155, 44, 35],  // 에메랄드
  ];

  const STOP_HUE   = [-14, 0, 14, 28];    // 한 글자 안에서 색이 번지는 폭
  const STOP_LIGHT = [-7, 4, -3, 9];      // 밝기 차 (기준값에 더한다)
  const WHITE_LIGHT = [100, 74, 100, 82]; // 반전된 뒤 흰색 안에서 흐르는 광택

  const DUR = 440;          // style.css 의 --dur 과 같은 값
  const STAGGER = 55;       // 글자끼리 시차(ms)
  const MAX_CLICKS = 15;    // 이 횟수 안에 모든 글자가 라인아트가 된다
  const INVERT_FADE = 1500; // 색이 흰색으로 빠지는 시간(ms)

  /* 3막: 반전 → blur+축소 → 좌상단부터 글자로 채우기 */
  const INVERT_HOLD = 2200;   // 반전을 보여주는 시간(ms)
  const RECEDE_HOLD = 1300;   // 흐려지며 물러나는 시간(ms)
  const FILL_TOTAL  = 6.5;    // 화면을 다 채우는 데 걸리는 시간(초)
  const FILL_FIRST  = 0.35;   // 첫 글자가 확정되는 시각(초)

  const SHOVE_DELAY   = 900;  // 다 채운 뒤 밀기 시작까지(ms)
  const SHOVE_CHARS   = 10;   // 평균 몇 글자만큼 밀지
  const SHOVE_VARY    = 0.7;  // 줄마다 ±70% 로 흔들어 밀리는 양을 다르게
  const SHOVE_STAGGER = 30;   // 줄마다 시차(ms). 위에서부터 물결처럼

  /* 화면을 채울 글자들. 단어로 묶지 않고 한 글자씩 무작위로 뽑아 쓴다.
     인사말에만 갇히지 않도록 네 언어의 글자를 넓게 풀어 둔다. */
  const FILL_CHARS = (
    // 한글
    '안녕하세요좋은하루보내가나다라마바사아자차카타파하' +
    '그리고서로만이를에도한번더새벽빛꿈길바람물불꽃별달해숨결온기' +
    // 라틴
    'abcdefghijklmnopqrstuvwxyz' +
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ' +
    // 히라가나 / 가타카나
    'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん' +
    'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン' +
    // 한자
    '你好呀美天度過日月光風雨山水火土人心手目口白黑青空海花草木林森中大小上下左右生時間言語'
  ).split('');

  /* ==================================================================
   * 3. 유틸
   * ================================================================ */

  const rand = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
  const lerp = (a, b, t) => a + (b - a) * t;

  function pick(list, avoid) {
    if (list.length < 2) return list[0];
    let v, guard = 0;
    do { v = list[(Math.random() * list.length) | 0]; } while (v === avoid && ++guard < 16);
    return v;
  }

  function shuffled(list) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /* ==================================================================
   * 4. DOM 만들기 — 글자마다 슬롯머신 릴 하나씩
   * ================================================================ */

  const rootEl = document.documentElement;
  const stageEl = document.querySelector('.stage');
  const lineEl = document.getElementById('line');
  const hintEl = document.getElementById('hint');

  const ruler = document.createElement('span');
  ruler.className = 'ruler';
  ruler.setAttribute('aria-hidden', 'true');
  document.body.appendChild(ruler);

  const slots = [];
  const living = [];   // 애니메이션 중인 라인아트
  const colors = shuffled(PALETTE);   // 방문할 때마다 배색이 달라진다

  function makeGlyph(text, font) {
    const g = document.createElement('span');
    g.className = 'glyph';
    g.style.fontFamily = font.stack;
    g.style.fontWeight = font.weight;
    g.textContent = text;
    return g;
  }

  function build() {
    const frag = document.createDocumentFragment();
    let index = 0;

    SENTENCE.split(' ').forEach((word, wi) => {
      if (wi > 0) frag.appendChild(document.createTextNode(' '));

      const wordEl = document.createElement('span');
      wordEl.className = 'word';
      wordEl.setAttribute('aria-hidden', 'true');

      for (const ch of word) {
        const i = index++;

        const slotEl = document.createElement('span');
        slotEl.className = 'slot';

        const reel = document.createElement('span');
        reel.className = 'reel';

        const font = FONTS[0];
        reel.appendChild(makeGlyph(ch, font));
        slotEl.appendChild(reel);
        wordEl.appendChild(slotEl);

        const slot = {
          index: i,
          el: slotEl,
          reel,
          pool: VARIANTS[i] || [ch],
          text: ch,
          font,
          spinning: false,
          locked: false,
          timer: 0,
          onEnd: null,
        };
        slotEl.__slot = slot;
        slots.push(slot);
      }

      frag.appendChild(wordEl);
    });

    lineEl.appendChild(frag);

    if (index !== VARIANTS.length || index !== ART.length) {
      console.warn('표의 줄 수와 글자 수(' + index + ')가 맞지 않습니다.');
    }
  }

  /* ==================================================================
   * 5. 폭 측정 (폰트마다 글자 폭이 달라서 매번 재어 부드럽게 늘린다)
   * ================================================================ */

  let fontSizePx = 0;
  let glyphH = 0;

  function syncMetrics() {
    fontSizePx = parseFloat(getComputedStyle(lineEl).fontSize) || 16;
    ruler.style.fontSize = fontSizePx + 'px';
    const first = slots[0] && slots[0].reel.firstElementChild;
    glyphH = first ? first.getBoundingClientRect().height : fontSizePx * 1.6;
  }

  /* 라인아트가 늘어나면 줄이 길어진다. 줄바꿈 대신 전체를 줄여 한 밴드로 유지한다. */
  let fitScale = 1;
  let recedeScale = 1;

  function applyLineTransform() {
    lineEl.style.transform = 'scale(' + (fitScale * recedeScale).toFixed(4) + ')';
  }

  function fit() {
    const cs = getComputedStyle(stageEl);
    const avail = stageEl.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const natural = lineEl.offsetWidth;
    if (!natural || avail <= 0) return;
    const k = Math.min(1, avail / natural);
    if (Math.abs(k - fitScale) < 0.004) return;
    fitScale = k;
    applyLineTransform();
  }

  function widthOf(text, font) {
    ruler.style.fontFamily = font.stack;
    ruler.style.fontWeight = font.weight;
    ruler.textContent = text;
    return ruler.getBoundingClientRect().width;
  }

  /* ==================================================================
   * 6. 슬롯머신 — 아래에서 위로 딱 한 칸
   * ================================================================ */

  function settle(slot) {
    if (!slot.spinning) return;
    clearTimeout(slot.timer);
    slot.timer = 0;
    slot.spinning = false;
    if (slot.onEnd) {
      slot.reel.removeEventListener('transitionend', slot.onEnd);
      slot.onEnd = null;
    }

    const reel = slot.reel;
    while (reel.children.length > 1) reel.removeChild(reel.firstElementChild);

    reel.style.transition = 'none';
    reel.style.transform = 'translateY(0)';
    void reel.offsetWidth;          // 리플로우 강제 → 애니메이션 없이 즉시 리셋
    reel.style.transition = '';

    if (slot.locked) {
      slot.el.classList.add('is-art');   // 클리핑 해제 → 선이 칸 밖으로 피어난다
      if (slots.every(s => s.locked)) invert();
    }
    fit();
  }

  /* 새 글자(또는 라인아트)를 릴에 올리고 한 칸 굴린다 */
  function spin(slot, glyphEl, targetWidth) {
    settle(slot);
    slot.reel.appendChild(glyphEl);

    const startW = slot.el.getBoundingClientRect().width;
    slot.el.style.width = startW + 'px';
    void slot.el.offsetWidth;

    slot.el.style.width = targetWidth + 'px';
    slot.reel.style.transform = 'translateY(' + (-glyphH) + 'px)';
    slot.spinning = true;

    const done = (e) => {
      if (e && (e.target !== slot.reel || e.propertyName !== 'transform')) return;
      settle(slot);
    };
    slot.onEnd = done;
    slot.reel.addEventListener('transitionend', done);
    slot.timer = setTimeout(done, DUR + 300);
    fit();
  }

  function roll(slot) {
    if (slot.locked) return;
    const text = pick(slot.pool, slot.text);
    const font = pick(FONTS, slot.font);
    slot.text = text;
    slot.font = font;
    spin(slot, makeGlyph(text, font), widthOf(text, font));
  }

  function rollToArt(slot) {
    if (slot.locked) return;
    settle(slot);            // 굳히기 전에 이전 애니메이션부터 정리
    slot.locked = true;
    slot.text = null;
    spin(slot, makeArt(slot), fontSizePx * ART_WIDTH);
  }

  /* ==================================================================
   * 7. 라인아트 만들기 + 살아 움직이게 하기
   * ================================================================ */

  function makeArt(slot) {
    const p = ART[slot.index];
    const id = 'art-grad-' + slot.index;

    const g = document.createElement('span');
    g.className = 'glyph glyph--art';
    g.innerHTML =
      '<svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" aria-hidden="true">' +
        '<defs>' +
          '<linearGradient id="' + id + '" gradientUnits="objectBoundingBox" x1="0" y1="0" x2="1" y2="1">' +
            '<stop offset="0"/><stop offset="0.34"/><stop offset="0.67"/><stop offset="1"/>' +
          '</linearGradient>' +
        '</defs>' +
        '<g><path class="art-path" fill="none" vector-effect="non-scaling-stroke" stroke="url(#' + id + ')"/></g>' +
      '</svg>';

    // 리사주 곡선을 미리 계산해 둔다. δ 만 매 프레임 바뀌므로
    // sin(a·t + δ) = sin(a·t)·cosδ + cos(a·t)·sinδ 로 값싸게 다시 그린다.
    const sa = new Float32Array(SAMPLES);
    const ca = new Float32Array(SAMPLES);
    const sb = new Float32Array(SAMPLES);
    for (let i = 0; i < SAMPLES; i++) {
      const t = (i / SAMPLES) * Math.PI * 2;
      sa[i] = Math.sin(p.a * t);
      ca[i] = Math.cos(p.a * t);
      sb[i] = Math.sin(p.b * t);
    }

    living.push({
      p, sa, ca, sb,
      col: colors[slot.index % colors.length],
      path: g.querySelector('.art-path'),
      group: g.querySelector('g'),
      grad: g.querySelector('linearGradient'),
      stops: [].slice.call(g.querySelectorAll('stop')),
      phase: Math.random() * Math.PI * 2,
      swingSpeed: 0.24 + Math.random() * 0.34,        // δ 가 흔들리는 속도
      spin: (Math.random() < 0.5 ? -1 : 1) * (3.2 + Math.random() * 4),  // 초당 회전 각도
      drift: Math.random() * 360,                     // 그라데이션 시작 각도
    });

    return g;
  }

  let invertedAt = 0;
  let frame = 0;

  function invert() {
    if (invertedAt) return;
    invertedAt = performance.now();
    rootEl.classList.add('inverted');
    setTimeout(recede, INVERT_HOLD);
  }

  /* 라인아트가 흐려지며 뒤로 물러난다 */
  function recede() {
    rootEl.classList.add('receded');
    recedeScale = 0.55;
    applyLineTransform();
    setTimeout(startFill, RECEDE_HOLD);
  }

  /* ==================================================================
   * 8. 마지막 — 좌상단부터 글자로 화면을 채운다
   *
   * 처음에는 한 글자씩 천천히 확정되다가, 확정 속도가 지수적으로
   * 늘어나면서 화면이 순식간에 글자로 덮인다.
   * ================================================================ */

  const fillEl = document.getElementById('fill');
  const measureCtx = document.createElement('canvas').getContext('2d');

  let fillCells = [];
  let fillTimes = [];
  let fillActive = [];
  let fillNext = 0;
  let fillStartAt = 0;
  let fillStarted = false;
  let scramblePool = [];

  let fillRows = [];        // { el, end } — 한 줄씩. 밀 때 통째로 움직인다
  let fillWidth = 0;
  let avgCharW = 0;
  let shovePending = false;
  let shoved = false;

  function buildFill(instant) {
    const cs = getComputedStyle(fillEl);
    const fs = parseFloat(cs.fontSize) || 24;
    const W = fillEl.clientWidth;
    const H = fillEl.clientHeight;
    const lineH = Math.round(fs * 1.42);
    if (!W || !H) return;

    measureCtx.font = '400 ' + fs + 'px ' + cs.fontFamily;
    const widths = new Map();
    const widthOf = (ch) => {
      let w = widths.get(ch);
      if (w === undefined) { w = measureCtx.measureText(ch).width; widths.set(ch, w); }
      return w;
    };

    fillCells = [];
    fillTimes = [];
    fillActive = [];
    fillNext = 0;

    fillRows = [];
    fillWidth = W;

    const frag = document.createDocumentFragment();
    let x = 0, y = 0, guard = 0, widthSum = 0;

    const makeRow = (top) => {
      const r = document.createElement('div');
      r.className = 'row';
      r.style.top = top + 'px';
      r.style.height = lineH + 'px';
      return r;
    };

    let rowEl = makeRow(0);

    while (guard++ < 40000) {
      const ch = FILL_CHARS[(Math.random() * FILL_CHARS.length) | 0];
      const w = widthOf(ch);

      if (x + w > W) {                       // 줄 끝 → 다음 줄로
        frag.appendChild(rowEl);
        fillRows.push({ el: rowEl, end: x });
        x = 0; y += lineH;
        if (y >= H) { rowEl = null; break; }
        rowEl = makeRow(y);
      }

      const el = document.createElement('span');
      el.className = instant ? 'cell locked' : 'cell';
      el.style.left = x.toFixed(1) + 'px';
      el.style.width = w.toFixed(1) + 'px';
      el.style.lineHeight = lineH + 'px';
      el.textContent = ch;
      rowEl.appendChild(el);
      fillCells.push({ el, final: ch, until: 0, swap: 0 });

      x += w;
      widthSum += w;
    }
    if (rowEl) { frag.appendChild(rowEl); fillRows.push({ el: rowEl, end: x }); }

    avgCharW = fillCells.length ? widthSum / fillCells.length : fs;

    fillEl.textContent = '';
    fillEl.appendChild(frag);

    if (instant) {
      fillNext = fillCells.length;
      if (shoved) shove(true);              // 이미 민 상태였으면 그대로 재현
      return;
    }
    scheduleFill();
  }

  /* i 번째 글자가 확정되는 시각.  T(i) = total · ln(1+B·i) / ln(1+B·N)
     B 는 첫 글자가 FILL_FIRST 에 나오도록 이분법으로 찾는다. */
  function scheduleFill() {
    const N = fillCells.length;
    if (!N) return;
    const target = FILL_FIRST / FILL_TOTAL;
    let lo = 1e-6, hi = 1e6;
    for (let k = 0; k < 60; k++) {
      const B = Math.sqrt(lo * hi);
      if (Math.log(1 + B) / Math.log(1 + B * N) < target) lo = B; else hi = B;
    }
    const B = Math.sqrt(lo * hi);
    const denom = Math.log(1 + B * N);
    for (let i = 0; i < N; i++) {
      fillTimes.push(FILL_TOTAL * 1000 * Math.log(1 + B * (i + 1)) / denom);
    }
  }

  function startFill() {
    if (fillStarted) return;
    scramblePool = FILL_CHARS;
    buildFill(false);
    fillStartAt = performance.now();
    fillStarted = true;
  }

  /* 줄 단위로 왼/오 교차해서 민다. 비는 자리는 흰 네모가 자라며 채운다. */
  function shove(instantly) {
    shoved = true;
    const base = SHOVE_CHARS * avgCharW;
    if (instantly) fillEl.classList.add('no-anim');

    fillRows.forEach((row, i) => {
      const toLeft = (i % 2 === 0);
      // 평균은 base 그대로 두고 줄마다 밀리는 양을 흔든다
      const d = Math.round(base * (1 + (Math.random() * 2 - 1) * SHOVE_VARY));
      const block = document.createElement('div');
      block.className = 'shove-block';

      let target;
      if (toLeft) {                          // 왼쪽으로 밀림 → 오른쪽이 빈다
        block.style.left = row.end.toFixed(1) + 'px';
        target = fillWidth - row.end + d;
      } else {                               // 오른쪽으로 밀림 → 왼쪽이 빈다
        block.style.right = '100%';
        target = d;
      }
      row.el.appendChild(block);

      const run = () => {
        row.el.style.transform = 'translateX(' + (toLeft ? -d : d) + 'px)';
        block.style.width = target.toFixed(1) + 'px';
      };
      if (instantly) run();
      else setTimeout(run, i * SHOVE_STAGGER);
    });

    if (instantly) {
      requestAnimationFrame(() => requestAnimationFrame(() => fillEl.classList.remove('no-anim')));
    }
  }

  function updateFill(now) {
    const el = now - fillStartAt;

    while (fillNext < fillCells.length && fillTimes[fillNext] <= el) {
      const c = fillCells[fillNext++];
      c.el.classList.add('on');
      c.until = el + 200 + Math.random() * 420;
      c.swap = 0;
      fillActive.push(c);
    }

    for (let i = fillActive.length - 1; i >= 0; i--) {
      const c = fillActive[i];
      if (el >= c.until) {
        c.el.textContent = c.final;
        c.el.className = 'cell locked';
        fillActive.splice(i, 1);
      } else if (el >= c.swap) {
        c.el.textContent = scramblePool[(Math.random() * scramblePool.length) | 0];
        c.swap = el + 50 + Math.random() * 50;
      }
    }

    if (!shovePending && fillNext >= fillCells.length && !fillActive.length) {
      shovePending = true;
      setTimeout(shove, SHOVE_DELAY);
    }
  }

  function animate(now) {
    requestAnimationFrame(animate);

    frame++;
    if (fillStarted) updateFill(now);
    if (frame % 2 === 0) fit();
    if (!living.length) return;

    const t = now / 1000;

    // 모든 글자가 라인아트가 되면 색이 흰색으로 빠진다
    let white = 0;
    if (invertedAt) {
      const k = Math.min(1, (now - invertedAt) / INVERT_FADE);
      white = k * k * (3 - 2 * k);   // smoothstep
    }

    for (let n = 0; n < living.length; n++) {
      const a = living[n];
      const p = a.p;

      // --- 형태: δ 를 천천히 흔들어 선이 열리고 닫히게 한다 ---
      const delta = (p.d + DELTA_SWING * Math.sin(t * a.swingSpeed + a.phase)) * Math.PI;
      const cosD = Math.cos(delta);
      const sinD = Math.sin(delta);

      let d = '';
      for (let i = 0; i < SAMPLES; i++) {
        const x = 50 + p.rx * (a.sa[i] * cosD + a.ca[i] * sinD);
        const y = 50 + p.ry * a.sb[i];
        d += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1);
      }
      a.path.setAttribute('d', d + 'Z');

      // --- 회전: 아주 천천히 한 바퀴씩 ---
      a.group.setAttribute('transform', 'rotate(' + (p.rot + t * a.spin).toFixed(2) + ' 50 50)');

      // --- 색: 그라데이션이 흐르고 돈다 ---
      if (frame % 3 === 0) {
        const angle = a.drift + t * 22;
        a.grad.setAttribute('gradientTransform', 'rotate(' + angle.toFixed(1) + ' 0.5 0.5)');

        const slide = t * 7;
        for (let k = 0; k < 4; k++) {
          const hue = (((a.col[0] + STOP_HUE[k] + slide) % 360) + 360) % 360;
          const sat = lerp(a.col[1], 0, white);
          const light = lerp(a.col[2] + STOP_LIGHT[k], WHITE_LIGHT[k], white);
          a.stops[k].setAttribute('stop-color',
            'hsl(' + hue.toFixed(0) + ' ' + sat.toFixed(0) + '% ' + light.toFixed(0) + '%)');
        }
      }
    }
  }

  /* ==================================================================
   * 9. 인터랙션 — 클릭 / 스크롤 / 터치 / 키보드
   *
   * 어떤 글자가 몇 번째 클릭에서 라인아트로 굳을지 미리 뽑아 둔다.
   * 1 ~ MAX_CLICKS 사이 무작위라서 순서는 매번 다르지만,
   * 어떤 경우에도 MAX_CLICKS 번 안에 전부 굳는다.
   * ================================================================ */

  let order = [];
  let deadlines = [];

  function schedule() {
    order = shuffled(slots);
    deadlines = order.map(() => rand(1, MAX_CLICKS)).sort((x, y) => x - y);
  }

  let clicks = 0;
  let hintHidden = false;

  function hideHint() {
    if (hintHidden || !hintEl) return;
    hintHidden = true;
    hintEl.classList.add('is-gone');
  }

  function interact(normalCount, focus) {
    hideHint();
    if (slots.every(s => s.locked)) return;

    clicks++;

    const queue = [];
    const taken = new Set();

    // 이번 차례에 라인아트로 굳을 글자
    order.forEach((slot, i) => {
      if (!slot.locked && deadlines[i] <= clicks) {
        queue.push({ slot, art: true });
        taken.add(slot);
      }
    });

    // 클릭한 글자는 반드시 반응하게
    let normals = 0;
    if (focus && !focus.locked && !taken.has(focus)) {
      queue.push({ slot: focus, art: false });
      taken.add(focus);
      normals++;
    }

    // 나머지는 평소처럼 글자만 바뀐다
    for (const s of shuffled(slots)) {
      if (normals >= normalCount) break;
      if (!s.locked && !taken.has(s)) {
        queue.push({ slot: s, art: false });
        taken.add(s);
        normals++;
      }
    }

    shuffled(queue).forEach((q, i) => {
      const run = () => (q.art ? rollToArt(q.slot) : roll(q.slot));
      if (i === 0) run();
      else setTimeout(run, i * STAGGER);
    });
  }

  document.addEventListener('pointerdown', (e) => {
    const hit = e.target.closest ? e.target.closest('.slot') : null;
    interact(rand(2, 4), hit && hit.__slot);
  });

  let wheelAcc = 0;
  let lastFire = 0;
  window.addEventListener('wheel', (e) => {
    wheelAcc += Math.abs(e.deltaY) + Math.abs(e.deltaX);
    const now = performance.now();
    if (wheelAcc > 55 && now - lastFire > 220) {
      wheelAcc = 0;
      lastFire = now;
      interact(rand(1, 3));
    }
  }, { passive: true });

  let touchY = null;
  window.addEventListener('touchstart', (e) => {
    touchY = e.touches[0].clientY;
  }, { passive: true });
  window.addEventListener('touchmove', (e) => {
    if (touchY === null) return;
    const y = e.touches[0].clientY;
    const now = performance.now();
    if (Math.abs(y - touchY) > 26 && now - lastFire > 240) {
      touchY = y;
      lastFire = now;
      interact(rand(1, 3));
    }
  }, { passive: true });

  window.addEventListener('keydown', (e) => {
    if ([' ', 'Enter', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
      interact(rand(2, 4));
    }
  });

  /* ==================================================================
   * 10. 시작 / 리사이즈
   * ================================================================ */

  build();
  schedule();          // slots 가 다 만들어진 뒤에 순서를 뽑아야 한다
  syncMetrics();
  requestAnimationFrame(animate);

  // 폰트가 다 로드된 뒤에 폭을 다시 재야 정확하다
  if (document.fonts && document.fonts.load) {
    const sample = SENTENCE + ' Hello good day have こんにちは よい一日お過ごし 你好呀美好一天度过';
    Promise.all(
      FONTS.map(f => document.fonts.load(f.weight + ' ' + (fontSizePx || 16) + 'px ' + f.name, sample).catch(() => {}))
    ).then(() => document.fonts.ready).then(syncMetrics);
  }

  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      slots.forEach(s => { settle(s); s.el.style.width = ''; });
      syncMetrics();
      slots.forEach(s => { if (s.locked) s.el.style.width = fontSizePx * ART_WIDTH + 'px'; });
      fitScale = 1; applyLineTransform(); fit();
      if (fillStarted) buildFill(true);   // 채우기는 완성 상태로 다시 깐다
    }, 140);
  });
})();
