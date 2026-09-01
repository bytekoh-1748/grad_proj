(() => {
  'use strict';

  /* ==================================================================
   * 색 — mono-color 시스템 (github.com/yanliudesign/mono-color-skill)
   *
   * 종이(substrate)는 잉크로 세지 않는다. 한 화면에 잉크는 최대 두 도.
   * 진한 도가 바탕을 깔고, 보조 도가 구슬 안에서 내용을 그린다.
   * 종이는 반드시 드러나 있어야 한다 — 여기서는 구슬 자체가 종이다.
   * ================================================================ */

  const SUBSTRATE = {
    white: '#FAFAF7',   // Neutral White — 현대 편집물의 기본
    gray:  '#E9E9E5',   // Cool Gray — 건축·기술·차분한 브랜딩
    beige: '#F5F1E8',   // Pale Beige — 촉각적·기록적 주제
  };

  const INK = {
    cobalt:        '#2148B8',
    royalBlue:     '#2058D4',
    botanicalGreen:'#008A4B',
    mintGreen:     '#5EB783',
    terracotta:    '#C65F38',
    signalRed:     '#C83232',
    aubergine:     '#63365F',
    charcoal:      '#30343A',
    powderBlue:    '#9EB8D3',
    oxblood:       '#8F3434',
    ultramarine:   '#263E99',
    safetyOrange:  '#E55D2B',
    cyan:          '#159DDA',
    mintGreen2:    '#5EB783',
    warmCharcoal:  '#302D2E',
    brickRed:      '#B64032',
  };

  /* ==================================================================
   * 세부 인터랙션 — 구슬 하나가 인터랙션 하나다.
   *
   *   mode    카탈로그의 인쇄 방식 (한 도 / 듀오톤 / 겹쳐 찍기)
   *   ground  바탕을 까는 진한 도
   *   accent  구슬 안에서 내용을 그리는 보조 도
   *   paper   구슬(과 열린 화면)의 종이색
   *   art     구슬 안에서 도는 장면 (아래 SCENES 의 키)
   *   piece   눌렀을 때 열리는 인터랙션 (없으면 표지만 열린다)
   * ================================================================ */
  const INTERACTIONS = [
    {
      title: 'Out of Register',
      desc: 'Two plates never land in the same place twice. Pull them apart by hand and the overprint darkens where they still meet. Let go and they snap back into register.',
      palette: 'Ultramarine + Safety Orange',
      mode: 'overprint duotone',
      ground: INK.ultramarine,
      accent: INK.safetyOrange,
      paper: SUBSTRATE.white,
      art: 'register',
      piece: 'register',
    },
    {
      title: 'The Size of the Dot',
      desc: 'A photograph darkens by the size of its dots, never by more ink. Grow them and shrink them to see how far one plate can travel.',
      palette: 'Cobalt + Terracotta',
      mode: 'complementary duotone',
      ground: INK.cobalt,
      accent: INK.terracotta,
      paper: SUBSTRATE.white,
      art: 'halftone',
    },
    {
      title: 'Room on the Paper',
      desc: 'What is left blank holds the page up. Type and shape are pushed aside to measure the share the paper keeps for itself.',
      palette: 'Botanical Green + Oxblood',
      mode: 'complementary duotone',
      ground: INK.botanicalGreen,
      accent: INK.oxblood,
      paper: SUBSTRATE.beige,
      art: 'bars',
    },
    {
      title: 'Density of One Ink',
      desc: 'A single ink, only different densities. Heavy coverage reads near black, sparse screening sits close to the paper. A question of density, not of plates.',
      palette: 'Signal Red (one ink)',
      mode: 'pure one-ink',
      ground: INK.signalRed,
      accent: INK.signalRed,
      paper: SUBSTRATE.white,
      art: 'density',
    },
    {
      title: 'Order of the Plates',
      desc: 'Which ink goes down first changes the same palette. The second plate settles onto the first, and the overlap takes on a different character.',
      palette: 'Mint Green + Warm Charcoal',
      mode: 'chromatic + black',
      ground: INK.mintGreen,
      accent: INK.warmCharcoal,
      paper: SUBSTRATE.gray,
      art: 'overprint',
    },
    {
      title: 'The Body of a Letter',
      desc: 'A letter that has stopped being read stays on as a shape. Tracking and weight are pushed until the word turns into a form.',
      palette: 'Cyan + Brick Red',
      mode: 'overprint duotone',
      ground: INK.cyan,
      accent: INK.brickRed,
      paper: SUBSTRATE.gray,
      art: 'type',
    },
  ];

  /* ==================================================================
   * 실루엣 — 레퍼런스에서 그대로 딴 다섯 자리
   *
   *   x  화면 너비 대비 자리 (ANCHOR_X 를 기준으로 좌우로 벌어진다)
   *   y  화면 높이 대비 자리
   *   r  화면 높이 대비 반지름
   *
   * 위아래 끝의 두 자리는 반지름이 0 이다. 구슬이 거기서 오므라들어
   * 사라지고 거기서 부풀어 올라온다. 그래서 멈춰 섰을 때는 가운데
   * 다섯만 남고, 그 다섯이 레퍼런스의 실루엣이다.
   * 형태를 고치려면 이 표만 만지면 된다.
   * ================================================================ */
  const CHAIN_PATH = [
    { x: 0.612, y: -0.220, r: 0.000 },   // 위 끝 — 여기서 오므라들어 사라진다
    { x: 0.703, y:  0.061, r: 0.090 },
    { x: 0.816, y:  0.177, r: 0.141 },
    { x: 0.726, y:  0.502, r: 0.261 },   // ← 초점(메인). 여기가 가장 크다
    { x: 0.807, y:  0.757, r: 0.168 },   // 아래로 갈수록 작아진다
    { x: 0.860, y:  0.930, r: 0.138 },
    { x: 0.780, y:  1.059, r: 0.117 },
    { x: 0.720, y:  1.580, r: 0.000 },   // 아래 끝 — 여기서 부풀어 올라온다
  ];

  const CHAIN_FOCUS = 3;      // 지금 보는 인터랙션이 앉는 자리
  const CHAIN_ANCHOR = 0.726; // 표의 x 가 이 값일 때 화면 ANCHOR_X 에 온다
  const ANCHOR_X = 0.726;     // 덩어리가 앉는 가로 자리
  const CHAIN_AR = 1.54;      // 표를 뜬 화면의 가로세로비
  const CHAIN_FIT = 1.32;     // 화면이 높이의 이 배보다 좁아지면 통째로 줄인다

  /* 크기는 표가 이미 들고 있다. 더 키우거나 좌우로 벌리고 싶으면
     이 둘만 올린다 — 같이 올려야 물린 정도가 유지된다. */
  const CHAIN_SCALE  = 1.00;
  const CHAIN_SPREAD = 1.00;

  const SCROLL_EASE = 0.085;
  const SCROLL_GAIN = 0.0019;
  const SCROLL_SNAP = 220;    // 손을 뗀 뒤 제자리로 물리기까지(ms)

  const INTRO_MS = 900;       // 구슬이 부풀어 오르는 시간
  const INTRO_STEP = 70;      // 자리마다 시차(ms)

  /* 유동 — 구슬은 표의 자리를 스프링으로 뒤따른다.
     자리마다 힘이 조금씩 달라서 옮겨 다니는 동안 간격이 벌어졌다
     좁아지고, 그때 이음새가 늘었다 잘록해지며 액체처럼 흐른다.
     멈추면 정확히 표 위에 앉으므로 실루엣은 그대로다. */
  const FLOW_K     = 0.130;   // 목표를 따라가는 힘
  const FLOW_DAMP  = 0.775;   // 감쇠 — 낮을수록 빨리 잦아든다
  const FLOW_VARY  = 0.45;    // 자리마다 힘을 이만큼 흔든다
  const FLOW_WOBBLE = 0.075;  // 움직이는 동안 반지름이 출렁이는 폭
  const FLOW_SNAP  = 0.05;    // 이만큼 붙으면 표 위에 딱 앉힌다

  /* 구슬 안쪽 — 미리보기가 원을 꽉 채운다 */
  const ART_SIZE = 360;

  /* 구 안쪽 — 바탕과 같은 색인데 더 밝고 쨍하다.
     무늬는 종이 흰색으로 뚫린다. 두 값만 만지면 세기가 바뀐다. */
  const ORB_LIGHT = 0.20;   // 바탕보다 이만큼 밝게
  const ORB_SAT   = 0.42;   // 이만큼 더 쨍하게

  /* 미리보기의 가장자리를 어디서부터 흐릴지.
     메인은 흐리지 않아서 제 원 그대로 또렷하고,
     끝으로 갈수록 부드러워져 이웃과 서로 녹아든다. */
  const ART_EDGE_MAIN = 0.99;
  const ART_EDGE_END  = 0.55;
  const ART_EDGE_SPAN = 2.4;    // 몇 자리 만에 끝값에 닿는지

  /* 메타볼 — 이웃한 구슬은 오목한 목으로 이어져 한 덩어리가 된다 */
  const GOO_SPREAD = 1.70;
  const GOO_HANDLE = 2.40;

  /* 바닥 — 바탕 잉크의 밀도만 낮춘 곡선 하나. 도수를 늘리지 않는다 */
  const FLOOR_CX = 0.62;
  const FLOOR_CY = 0.784;
  const FLOOR_RX = 0.90;
  const FLOOR_RY = 0.374;
  const FLOOR_INK = 0.13;     // 바닥이 얼마나 더 짙은지

  const OPEN_MS  = 950;       // 물방울이 화면을 덮는 시간
  const TAP_SLOP = 6;

  /* 어긋난 판 — 열리는 인터랙션 */
  const REG_SPRING = 0.16;
  const REG_DAMP   = 0.78;
  const REG_RANGE  = 0.13;    // 최대로 벌어지는 폭 (화면 짧은 쪽 대비)

  /* 구슬 속 장면에 쓰는 글자들 */
  const FILL_CHARS = (
    'abcdefghijklmnopqrstuvwxyz' +
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ' +
    '0123456789'
  ).split('');

  /* ==================================================================
   * 유틸
   * ================================================================ */

  const TAU = Math.PI * 2;
  const HALF_PI = Math.PI / 2;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const wrap = (n) => ((n % INTERACTIONS.length) + INTERACTIONS.length) % INTERACTIONS.length;

  function rgbOf(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [n >> 16, (n >> 8) & 255, n & 255];
  }
  function mixRGB(a, b, t) {
    return [
      Math.round(a[0] + (b[0] - a[0]) * t),
      Math.round(a[1] + (b[1] - a[1]) * t),
      Math.round(a[2] + (b[2] - a[2]) * t),
    ];
  }
  /* 바탕 잉크를 그대로 두고 밝기와 채도만 올린다 —
     같은 색인데 한 단계 쨍한 면이 된다 */
  function rgbToHsl(c) {
    const r = c[0] / 255, g = c[1] / 255, b = c[2] / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    const l = (mx + mn) / 2;
    if (mx === mn) return [0, 0, l];
    const d = mx - mn;
    const sat = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    let h;
    if (mx === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    return [h / 6, sat, l];
  }

  function hslToRgb(h, s, l) {
    if (s === 0) { const v = Math.round(l * 255); return [v, v, v]; }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const f = (t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    return [Math.round(f(h + 1 / 3) * 255), Math.round(f(h) * 255), Math.round(f(h - 1 / 3) * 255)];
  }

  /* 채도는 언제나 끝까지 올린다. 밝기는 바탕이 어두우면 올리고
     밝으면 내린다 — 밝은 바탕에서 더 밝히면 하얗게 바래기만 한다. */
  function vividOf(c) {
    const hsl = rgbToHsl(c);
    const sat = clamp(hsl[1] + ORB_SAT, 0.6, 1);
    const li = hsl[2] < 0.52
      ? Math.min(0.72, hsl[2] + ORB_LIGHT)
      : Math.max(0.30, hsl[2] - ORB_LIGHT);
    return hslToRgb(hsl[0], sat, li);
  }

  const rgba = (c, a) => 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a.toFixed(3) + ')';
  const rgbs = (c) => 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')';

  // 색은 한 번만 풀어 둔다
  for (const it of INTERACTIONS) {
    it.gRGB = rgbOf(it.ground);
    it.aRGB = rgbOf(it.accent);
    it.pRGB = rgbOf(it.paper);
  }

  /* ==================================================================
   * DOM
   * ================================================================ */

  const rootEl = document.documentElement;
  const graphEl = document.getElementById('graph');
  const cv = document.getElementById('sheet');
  const cx = cv.getContext('2d');
  const closeEl = document.getElementById('close');
  const cursorEl = document.getElementById('cursor');

  const panelEl = document.getElementById('panel');
  const panelTitleEl = document.getElementById('panel-title');
  const panelDescEl = document.getElementById('panel-desc');
  const headAEl = document.getElementById('head-a');
  const headBEl = document.getElementById('head-b');
  const headCEl = document.getElementById('head-c');
  const stripNumEl = document.getElementById('strip-num');
  const stripOnEl = document.getElementById('strip-on');
  const stripOffEl = document.getElementById('strip-off');

  // 구슬 안 장면을 여기에 굽고 옮겨 그린다
  const art = document.createElement('canvas');
  const ax = art.getContext('2d');
  art.width = art.height = ART_SIZE;

  // 덩어리 가장자리 밀도를 굽는 곳
  const shade = document.createElement('canvas');
  const hx = shade.getContext('2d');

  // 바탕은 색이 바뀔 때만 다시 굽는다
  const room = document.createElement('canvas');
  const rx = room.getContext('2d');
  const ROOM_SCALE = 0.5;
  let roomKey = '';

  let graphW = 0, graphH = 0, dpr = 1;
  let unit = 0, halfDiag = 1, shapeS = 1;

  let beads = [];
  const bySlot = new Map();
  let order = [];
  const hot = {};

  let started = 0, lastNow = 0;
  let scroll = 0, scrollTo = 0, scrollAt = 0;
  let lastScroll = 0, flowRun = 0;
  let shownIndex = -1, panelTimer = 0;
  let hoverSlot = null;
  let drag = null;

  const open = { t: 0, dir: 0, x: 0, y: 0, r0: 26, it: null };
  const flow = new Map();   // 자리 번호 → 스프링 상태
  let inkNow = null;        // 지금 화면에 깔린 색

  function sizeCanvas() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    graphW = innerWidth;
    graphH = innerHeight;
    cv.width = Math.round(graphW * dpr);
    cv.height = Math.round(graphH * dpr);
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cv.style.width = graphW + 'px';
    cv.style.height = graphH + 'px';
    cx.textAlign = 'center';
    cx.textBaseline = 'middle';

    unit = Math.min(graphW, graphH);
    halfDiag = Math.hypot(graphW, graphH) * 0.5;
    shapeS = Math.min(graphH, graphW / CHAIN_FIT);
    roomKey = '';
    plateKey = '';
  }

  /* ==================================================================
   * 구슬 기둥 — 좌표표 위를 흐른다
   * ================================================================ */

  function pathX(px) {
    return graphW * ANCHOR_X + (px - CHAIN_ANCHOR) * CHAIN_SPREAD * CHAIN_AR * shapeS;
  }

  const catmull = (a, b, c, d, t) => {
    const t2 = t * t, t3 = t2 * t;
    return 0.5 * (2 * b + (c - a) * t
      + (2 * a - 5 * b + 4 * c - d) * t2
      + (3 * b - 3 * c + d - a) * t3);
  };

  function pathAt(t) {
    const P = CHAIN_PATH, n = P.length;
    if (t < 0 || t > n - 1) return null;
    const i = Math.min(n - 2, Math.floor(t));
    const u = t - i;
    const p0 = P[Math.max(0, i - 1)], p1 = P[i];
    const p2 = P[i + 1], p3 = P[Math.min(n - 1, i + 2)];
    return {
      x: pathX(catmull(p0.x, p1.x, p2.x, p3.x, u)),
      y: (catmull(p0.y, p1.y, p2.y, p3.y, u) - 0.5) * shapeS + graphH * 0.5,
      r: catmull(p0.r, p1.r, p2.r, p3.r, u) * CHAIN_SCALE * shapeS,
    };
  }

  /* 처음 들어올 때 가운데부터 차례로 부풀어 오른다 */
  function grown(n, t) {
    const g = clamp((t - Math.min(6, Math.abs(n)) * INTRO_STEP) / INTRO_MS, 0, 1);
    return easeOut(g) * (1 + 0.07 * Math.sin(g * TAU) * (1 - g));
  }

  /* 자리마다 조금씩 다른 스프링 — 흔들리지 않게 번호로 뽑는다 */
  function flowOf(n, x, y, r) {
    let st = flow.get(n);
    if (!st) {
      const h = Math.abs(Math.sin(n * 12.9898) * 43758.5453) % 1;
      st = { x, y, r, vx: 0, vy: 0, vr: 0,
             k: FLOW_K * (1 - FLOW_VARY / 2 + h * FLOW_VARY),
             ph: h * TAU };
      flow.set(n, st);
    }
    return st;
  }

  function layoutBeads(t, dt) {
    beads.length = 0;
    bySlot.clear();

    // 스크롤이 얼마나 빠른지 — 움직일 때만 형태가 출렁인다
    const speed = Math.abs(scroll - lastScroll);
    lastScroll = scroll;
    flowRun += (Math.min(1, speed / 0.018) - flowRun) * Math.min(1, dt / 90);

    const base = Math.floor(scroll);
    const lo = base - CHAIN_FOCUS - 2, hi = base + CHAIN_PATH.length + 1;
    for (const n of flow.keys()) if (n < lo || n > hi) flow.delete(n);

    for (let n = base - CHAIN_FOCUS - 1; n <= base + CHAIN_PATH.length; n++) {
      const p = pathAt(n - scroll + CHAIN_FOCUS);
      if (!p) { flow.delete(n); continue; }

      const tr = p.r * grown(n, t);
      const st = flowOf(n, p.x, p.y, tr);

      // 표를 뒤따른다. 자리마다 힘이 달라 간격이 늘었다 좁아진다
      st.vx = (st.vx + (p.x - st.x) * st.k) * FLOW_DAMP;
      st.vy = (st.vy + (p.y - st.y) * st.k) * FLOW_DAMP;
      st.vr = (st.vr + (tr - st.r) * st.k) * FLOW_DAMP;
      st.x += st.vx; st.y += st.vy; st.r += st.vr;

      // 다 잦아들면 표 위에 딱 앉힌다 — 멈춘 실루엣은 표 그대로다
      if (Math.abs(p.x - st.x) < FLOW_SNAP && Math.abs(st.vx) < FLOW_SNAP) { st.x = p.x; st.vx = 0; }
      if (Math.abs(p.y - st.y) < FLOW_SNAP && Math.abs(st.vy) < FLOW_SNAP) { st.y = p.y; st.vy = 0; }
      if (Math.abs(tr - st.r) < FLOW_SNAP && Math.abs(st.vr) < FLOW_SNAP) { st.r = tr; st.vr = 0; }

      // 움직이는 동안만 숨을 쉰다
      const r = st.r * (1 + FLOW_WOBBLE * flowRun * Math.sin(t * 0.0042 + st.ph));
      if (r < 1) continue;
      if (st.x + r < -80 || st.x - r > graphW + 80) continue;
      if (st.y + r < -80 || st.y - r > graphH + 80) continue;

      const idx = wrap(n);
      const b = { n, i: idx, it: INTERACTIONS[idx], x: st.x, y: st.y, r,
                  near: clamp(1 - Math.abs(n - scroll) * 0.8, 0, 1) };
      beads.push(b);
      bySlot.set(n, b);
    }
    order = beads.slice().sort((a, b) => a.r - b.r);
  }

  /* ==================================================================
   * 바탕 — 쨍한 잉크 한 도. 바닥은 같은 잉크의 밀도만 올린다
   * ================================================================ */

  /* 색은 지금 깔린 색에서 고른 인터랙션의 색으로 곧장 건너간다.
     사이에 놓인 인터랙션들의 색을 차례로 거치지 않는다. */
  let fadeFrom = null, fadeTo = 0, fadeAt = 0, fadeDur = 1;

  function nowColors(now) {
    const aim = wrap(Math.round(scrollTo));
    if (!fadeFrom) {
      const A = INTERACTIONS[aim];
      fadeFrom = { ground: A.gRGB, accent: A.aRGB, paper: A.pRGB };
      fadeTo = aim; fadeAt = now; fadeDur = 1;
    }
    if (aim !== fadeTo) {
      fadeFrom = inkNow;                     // 지금 화면에 깔린 색에서 이어 간다
      fadeTo = aim;
      fadeAt = now;
      fadeDur = clamp(420 + 130 * Math.abs(scrollTo - scroll), 420, 1100);
    }

    let p = clamp((now - fadeAt) / fadeDur, 0, 1);
    p = p * p * (3 - 2 * p);
    const B = INTERACTIONS[fadeTo];
    const ground = mixRGB(fadeFrom.ground, B.gRGB, p);
    inkNow = {
      ground,
      accent: mixRGB(fadeFrom.accent, B.aRGB, p),
      paper:  mixRGB(fadeFrom.paper,  B.pRGB, p),
      orb:    vividOf(ground),          // 구 안쪽 — 바탕과 같은 색, 한 단계 쨍하게
    };
    return inkNow;
  }

  function floorEdge(f) {
    const cxp = FLOOR_CX * graphW;
    const cyp = FLOOR_CY * graphH + FLOOR_RY * graphH;
    const rxp = FLOOR_RX * graphW, ryp = FLOOR_RY * graphH;
    const u = clamp((f * graphW - cxp) / rxp, -1, 1);
    return cyp - ryp * Math.sqrt(1 - u * u);
  }

  function bakeRoom(col, W, H) {
    // 한 도를 고르게 깐다. 위가 아주 살짝 옅어 공간이 열린다
    const g = rx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, rgbs(mixRGB(col.ground, col.paper, 0.10)));
    g.addColorStop(0.58, rgbs(col.ground));
    g.addColorStop(1, rgbs(mixRGB(col.ground, [0, 0, 0], 0.10)));
    rx.fillStyle = g;
    rx.fillRect(0, 0, W, H);

    // 바닥 — 같은 잉크를 한 겹 더 얹는다. 선은 긋지 않는다
    const kh = H / graphH;
    rx.beginPath();
    rx.moveTo(0, floorEdge(0) * kh);
    for (let i = 1; i <= 48; i++) rx.lineTo((i / 48) * W, floorEdge(i / 48) * kh);
    rx.lineTo(W, H);
    rx.lineTo(0, H);
    rx.closePath();
    rx.fillStyle = 'rgba(0,0,0,' + FLOOR_INK.toFixed(3) + ')';
    rx.fill();
  }

  function drawRoom(col) {
    const key = col.ground.join() + '|' + col.paper.join() + '|' + graphW + 'x' + graphH;
    if (key !== roomKey) {
      roomKey = key;
      room.width = Math.max(2, Math.round(graphW * ROOM_SCALE));
      room.height = Math.max(2, Math.round(graphH * ROOM_SCALE));
      bakeRoom(col, room.width, room.height);
    }
    cx.drawImage(room, 0, 0, graphW, graphH);
  }
  /* 이음새를 현재 path 에 얹는다 (beginPath 하지 않는다) */
  function neckSubPath(g, c1, c2) {
    const dx = c2.x - c1.x, dy = c2.y - c1.y;
    const d = Math.hypot(dx, dy);
    const r1 = c1.r, r2 = c2.r;
    const gap = Math.abs(r1 - r2);
    const maxD = (r1 + r2) * GOO_SPREAD;
    if (!d || d >= maxD || d <= gap) return;

    // 멀어질수록 목이 가늘어지다가 끊어진다
    const sep = clamp((d - gap) / (maxD - gap), 0, 1);
    const v = 0.5 * (1 - sep * sep);
    if (v < 0.02) return;

    let u1 = 0, u2 = 0;
    if (d < r1 + r2) {                       // 두 원이 이미 물려 있다
      u1 = Math.acos(clamp((r1 * r1 + d * d - r2 * r2) / (2 * r1 * d), -1, 1));
      u2 = Math.acos(clamp((r2 * r2 + d * d - r1 * r1) / (2 * r2 * d), -1, 1));
    }

    const A = Math.atan2(dy, dx);
    const maxSpread = Math.acos(clamp((r1 - r2) / d, -1, 1));

    const a1 = A + u1 + (maxSpread - u1) * v;
    const a2 = A - u1 - (maxSpread - u1) * v;
    const a3 = A + Math.PI - u2 - (Math.PI - u2 - maxSpread) * v;
    const a4 = A - Math.PI + u2 + (Math.PI - u2 - maxSpread) * v;

    const p1x = c1.x + Math.cos(a1) * r1, p1y = c1.y + Math.sin(a1) * r1;
    const p2x = c1.x + Math.cos(a2) * r1, p2y = c1.y + Math.sin(a2) * r1;
    const p3x = c2.x + Math.cos(a3) * r2, p3y = c2.y + Math.sin(a3) * r2;
    const p4x = c2.x + Math.cos(a4) * r2, p4y = c2.y + Math.sin(a4) * r2;

    const total = r1 + r2;
    const k = Math.min(v * GOO_HANDLE, Math.hypot(p3x - p1x, p3y - p1y) / total)
            * Math.min(1, d * 2 / total);
    const h1 = r1 * k, h2 = r2 * k;

    // 조종점 네 개
    const H1x = p1x + Math.cos(a1 - HALF_PI) * h1, H1y = p1y + Math.sin(a1 - HALF_PI) * h1;
    const H2x = p2x + Math.cos(a2 + HALF_PI) * h1, H2y = p2y + Math.sin(a2 + HALF_PI) * h1;
    const H3x = p3x + Math.cos(a3 + HALF_PI) * h2, H3y = p3y + Math.sin(a3 + HALF_PI) * h2;
    const H4x = p4x + Math.cos(a4 - HALF_PI) * h2, H4y = p4y + Math.sin(a4 - HALF_PI) * h2;

    // 원과 같은 방향으로 감아야 nonzero 에서 합집합이 된다.
    // 거꾸로 감으면 겹치는 자리가 서로 상쇄돼 구멍이 뚫린다.
    g.moveTo(p1x, p1y);
    g.arc(c1.x, c1.y, r1, a1, a2, true);
    g.bezierCurveTo(H2x, H2y, H4x, H4y, p4x, p4y);
    g.arc(c2.x, c2.y, r2, a4, a3, true);
    g.bezierCurveTo(H3x, H3y, H1x, H1y, p1x, p1y);
    g.closePath();
  }

  /* 덩어리 전체를 g 의 현재 path 로 만든다. grow 만큼 부풀릴 수 있다 */
  function silhouette(grow, g) {
    g = g || cx;
    g.beginPath();
    for (const b of beads) {
      const r = b.r + grow;
      if (r <= 0.3) continue;
      g.moveTo(b.x + r, b.y);
      g.arc(b.x, b.y, r, 0, TAU);
    }
    for (let i = 0; i < beads.length - 1; i++) {
      const a = beads[i], c = beads[i + 1];
      if (c.n !== a.n + 1) continue;
      neckSubPath(g,
        { x: a.x, y: a.y, r: a.r + grow },
        { x: c.x, y: c.y, r: c.r + grow });
    }
  }

  /* 덩어리를 감싸는 화면 위 사각형 */
  function chainBox(pad) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const b of beads) {
      x0 = Math.min(x0, b.x - b.r); x1 = Math.max(x1, b.x + b.r);
      y0 = Math.min(y0, b.y - b.r); y1 = Math.max(y1, b.y + b.r);
    }
    x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad);
    x1 = Math.min(graphW, x1 + pad); y1 = Math.min(graphH, y1 + pad);
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }

  /* ==================================================================
   * 종이 — 덩어리는 잉크가 아니라 종이다.
   * 바탕이 잉크 한 도이므로 구슬이 곧 드러난 종이 노릇을 한다.
   * ================================================================ */

  /* 덩어리 가장자리로 지는 그림자.
     합집합 path 를 stroke 하면 안쪽에 숨은 원호까지 그어져 구슬이
     다시 나뉘어 보인다. 그래서 실루엣을 통째로 칠한 뒤, 흐리게
     한 겹 파내서 테두리에만 어둠이 남게 한다. */
  function innerShadow(box, blur, alpha) {
    if (box.w < 6 || box.h < 6) return;

    const k = 0.5;                       // 그림자는 흐리니 절반이면 충분하다
    const w = Math.ceil(box.w * k), h = Math.ceil(box.h * k);
    if (shade.width < w || shade.height < h) { shade.width = w; shade.height = h; }
    hx.setTransform(1, 0, 0, 1, 0, 0);
    hx.clearRect(0, 0, shade.width, shade.height);
    hx.setTransform(k, 0, 0, k, -box.x * k, -box.y * k);

    hx.fillStyle = rgba(shadeInk, alpha);
    silhouette(0, hx);
    hx.fill();

    hx.globalCompositeOperation = 'destination-out';
    hx.filter = 'blur(' + (blur * k).toFixed(1) + 'px)';
    silhouette(-blur * 0.25, hx);
    hx.fill();
    hx.filter = 'none';
    hx.globalCompositeOperation = 'source-over';

    cx.drawImage(shade, 0, 0, w, h, box.x, box.y, box.w, box.h);
  }

  /* 종이는 평평하다. 유리처럼 반사시키지 않고, 가장자리에만
     같은 잉크를 아주 옅게 얹어 종이가 살짝 말린 것처럼 둔다. */
  let shadeInk = [0, 0, 0];

  function shadeChain(box, col) {
    shadeInk = mixRGB(col.ground, [0, 0, 0], 0.35);
    let span = 0;
    for (const b of beads) span = Math.max(span, b.r);
    if (span > 8) innerShadow(box, Math.max(4, span * 0.22), 0.26);
  }

  /* 덩어리 한 장 — 테두리 한 겹을 깔고, 채우고, 안에 미리보기를 깐다.
     stroke 를 쓰지 않는 것이 요점이다. 부풀린 실루엣을 먼저 칠하면
     바깥 경계 하나만 생기고 안쪽에는 선이 남지 않는다. */
  function drawChain(t, col) {
    if (!beads.length) return;

    const box = chainBox(2);

    silhouette(0, cx);
    cx.save();
    cx.fillStyle = rgbs(col.orb);
    cx.fill();
    cx.clip();

    // 미리보기는 원을 꽉 채우되 가장자리만 흐리다.
    // 그래서 겹치는 자리에서 서로 녹아들고 구슬 경계가 남지 않는다.
    for (const b of order) {
      if (b.r < 5) continue;
      const away = clamp(Math.abs(b.n - scroll) / ART_EDGE_SPAN, 0, 1);
      paintArt(b.it, t, col, ART_EDGE_MAIN + (ART_EDGE_END - ART_EDGE_MAIN) * away);
      cx.globalAlpha = Math.min(1, b.r / 12);
      cx.drawImage(art, b.x - b.r, b.y - b.r, b.r * 2, b.r * 2);
      cx.globalAlpha = 1;
    }

    shadeChain(box, col);
    cx.restore();
  }


  /* ==================================================================
   * 구슬 안 — 종이 위에 보조 잉크로 찍은 한 장면
   *
   * 잉크는 한 도뿐이다. 짙고 옅은 것은 밀도(망점 크기)로만 낸다.
   * ================================================================ */

  function ch(n) {
    return FILL_CHARS[((n % FILL_CHARS.length) + FILL_CHARS.length) % FILL_CHARS.length];
  }

  const SCENES = {
    // 어긋난 판 — 같은 도형이 두 번, 조금 밀려서
    register(g, S, t, ink) {
      const d = S * (0.055 + 0.022 * Math.sin(t * 0.0009));
      for (let k = 0; k < 2; k++) {
        g.globalAlpha = k ? 0.45 : 0.85;
        g.fillStyle = ink;
        g.beginPath();
        g.arc(S / 2 + (k ? d : -d), S / 2 + (k ? d * 0.6 : -d * 0.6), S * 0.26, 0, TAU);
        g.fill();
      }
      g.globalAlpha = 1;
      g.strokeStyle = ink;
      g.lineWidth = S * 0.012;
      for (let i = 0; i < 3; i++) {
        g.beginPath();
        g.moveTo(S * 0.12, S * (0.72 + i * 0.075));
        g.lineTo(S * 0.88 - d * (i + 1), S * (0.72 + i * 0.075));
        g.stroke();
      }
    },

    // 망점 — 점의 크기로만 어두워진다
    halftone(g, S, t, ink) {
      const n = 13, w = S / n;
      g.fillStyle = ink;
      for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
          const dx = (c + 0.5) / n - 0.5, dy = (r + 0.5) / n - 0.5;
          const dist = Math.hypot(dx, dy) * 2;
          const v = clamp(1 - dist + 0.28 * Math.sin(t * 0.0011 - dist * 5), 0, 1);
          if (v <= 0.02) continue;
          g.beginPath();
          g.arc(c * w + w / 2, r * w + w / 2, w * 0.5 * Math.sqrt(v), 0, TAU);
          g.fill();
        }
      }
    },

    // 여백 — 막대가 밀리며 종이를 드러낸다
    bars(g, S, t, ink) {
      const n = 11, h = S / n;
      g.fillStyle = ink;
      for (let r = 0; r < n; r++) {
        const d = Math.sin(t * 0.0009 + r * 0.7) * S * 0.26;
        const w = S * (0.30 + 0.30 * Math.abs(Math.sin(r * 1.3)));
        g.globalAlpha = r % 2 ? 0.9 : 0.55;
        g.fillRect(S * 0.5 - w / 2 + d, r * h + h * 0.26, w, h * 0.48);
      }
      g.globalAlpha = 1;
    },

    // 한 도의 밀도 — 같은 잉크가 성기게, 짙게
    density(g, S, t, ink) {
      const rows = 9;
      g.fillStyle = ink;
      for (let r = 0; r < rows; r++) {
        const u = (r + 0.5) / rows;
        const a = clamp(0.10 + 0.85 * Math.abs(Math.sin(t * 0.0006 + u * Math.PI)), 0, 1);
        g.globalAlpha = a;
        g.fillRect(0, r * (S / rows), S, S / rows);
      }
      g.globalAlpha = 1;
    },

    // 판의 차례 — 먼저 앉은 도 위에 다음 도가 얹힌다
    overprint(g, S, t, ink) {
      const d = S * 0.13;
      const a = t * 0.0007;
      // 흰 무늬라 곱하기로는 아무것도 안 나온다. 겹친 자리가 밝아지게 쌓는다
      g.fillStyle = ink;
      g.globalAlpha = 0.5;
      for (let k = 0; k < 2; k++) {
        const s2 = k ? 1 : -1;
        g.beginPath();
        g.rect(S * 0.5 - S * 0.30 + s2 * Math.cos(a) * d,
               S * 0.5 - S * 0.30 + s2 * Math.sin(a) * d,
               S * 0.60, S * 0.60);
        g.fill();
      }
      g.globalAlpha = 1;
    },

    // 글자의 몸 — 낱말이 도형이 되는 자리
    type(g, S, t, ink) {
      const n = 4, w = S / n;
      g.fillStyle = ink;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = '700 ' + (w * 0.94).toFixed(1) + 'px ' + FACE;
      for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
          g.globalAlpha = 0.28 + 0.62 * Math.abs(Math.sin(t * 0.0009 + (r + c) * 0.8));
          g.fillText(ch(r * 13 + c * 7 + Math.floor(t * 0.0006)), c * w + w / 2, r * w + w / 2);
        }
      }
      g.globalAlpha = 1;
    },
  };

  /* 활자는 Quantico 한 벌로 간다. 표제와 사실 정보를 굵기와
     자간으로만 가른다. 한글은 Pretendard 가 받는다. */
  const FACE = "'Quantico', 'Pretendard Variable', Pretendard, 'Noto Sans KR', sans-serif";

  /* 한 화면에 잉크는 두 도까지다. 그래서 구슬마다 제 색을 쓰지 않고,
     지금 펼쳐진 배색의 보조 도 하나로 다섯 장면을 모두 찍는다.
     구슬을 가르는 것은 색이 아니라 무늬다. */
  function paintArt(it, t, col, edge) {
    const S = ART_SIZE;
    const ink = rgbs(col.paper);        // 무늬는 종이 흰색으로 뚫린다
    ax.globalCompositeOperation = 'source-over';
    ax.clearRect(0, 0, S, S);

    // 구 안쪽 면 — 바탕과 같은 색을 한 단계 올린 것
    ax.fillStyle = rgbs(col.orb);
    ax.fillRect(0, 0, S, S);

    ax.save();
    (SCENES[it.art] || SCENES.halftone)(ax, S, t, ink);
    ax.restore();

    // 원 밖은 잘라 내고, 가장자리는 서서히 투명해지게 한다.
    // 이 흐린 띠가 이웃 구슬의 미리보기와 겹쳐 경계를 지운다.
    ax.globalCompositeOperation = 'destination-in';
    const m = ax.createRadialGradient(S / 2, S / 2, S * 0.5 * edge, S / 2, S / 2, S * 0.5);
    m.addColorStop(0, 'rgba(0,0,0,1)');
    m.addColorStop(1, 'rgba(0,0,0,0)');
    ax.fillStyle = m;
    ax.fillRect(0, 0, S, S);
    ax.globalCompositeOperation = 'source-over';
  }

  /* ==================================================================
   * 열리는 인터랙션 — 어긋난 판 (overprint duotone)
   *
   * 두 도를 따로 찍으면 판은 반드시 조금 어긋난다. 여기서는 그
   * 어긋남을 손으로 벌린다. 끌면 두 판이 갈라지고, 겹치는 자리는
   * 곱해져 짙어진다. 놓으면 스프링으로 제자리에 물린다.
   * ================================================================ */

  const plateA = document.createElement('canvas');
  const plateB = document.createElement('canvas');
  const pax = plateA.getContext('2d');
  const pbx = plateB.getContext('2d');
  let plateKey = '';

  const reg = { x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, held: false };

  function bakePlates(it) {
    const W = graphW, H = graphH;
    for (const c of [plateA, plateB]) { c.width = W; c.height = H; }
    for (const g of [pax, pbx]) {
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, W, H);
      g.textBaseline = 'alphabetic';
    }

    const M = Math.round(W * 0.045);          // 왼쪽 여백 — 표지와 같은 자리
    const disc = { x: W * 0.72, y: H * 0.48, r: Math.min(W, H) * 0.29 };

    /* --- 판 1 : 진한 도 — 망점 원판과 큰 글자 --- */
    pax.fillStyle = it.ground;
    const step = Math.max(6, disc.r / 15);
    for (let y = disc.y - disc.r; y <= disc.y + disc.r; y += step) {
      for (let x = disc.x - disc.r; x <= disc.x + disc.r; x += step) {
        const d = Math.hypot(x - disc.x, y - disc.y) / disc.r;
        if (d > 1) continue;
        pax.beginPath();
        pax.arc(x, y, step * 0.52 * Math.sqrt(1 - d * d * 0.72), 0, TAU);
        pax.fill();
      }
    }
    pax.textAlign = 'left';
    pax.font = '700 ' + Math.round(H * 0.135) + 'px ' + FACE;
    pax.fillText(it.title, M, H * 0.42);

    /* --- 판 2 : 보조 도 — 동심원과 사실 정보 --- */
    pbx.strokeStyle = it.accent;
    pbx.lineWidth = Math.max(1.5, disc.r * 0.018);
    for (let i = 1; i <= 7; i++) {
      pbx.beginPath();
      pbx.arc(disc.x, disc.y, disc.r * (i / 7), 0, TAU);
      pbx.stroke();
    }
    pbx.fillStyle = it.accent;
    pbx.textAlign = 'left';
    pbx.font = '700 ' + Math.round(H * 0.135) + 'px ' + FACE;
    pbx.globalAlpha = 0.55;
    pbx.fillText(it.title, M, H * 0.42);
    pbx.globalAlpha = 1;

    // Quantico 는 고정폭이 아니다. 공백으로 칸을 맞추면 어긋나므로
    // 라벨과 값을 각자 x 에 앉힌다.
    const facts = [
      ['PALETTE',   it.palette],
      ['MODE',      it.mode.toUpperCase()],
      ['SUBSTRATE', it.paper.toUpperCase()],
      ['PLATE 1',   it.ground.toUpperCase() + '  DOMINANT'],
      ['PLATE 2',   it.accent.toUpperCase() + '  ACCENT'],
    ];
    const fs = Math.max(10, Math.round(H * 0.0165));
    const col2 = M + fs * 7.6;
    pbx.font = '700 ' + fs + 'px ' + FACE;
    facts.forEach(([label, value], i) => {
      const y = H * 0.53 + i * fs * 1.9;
      pbx.globalAlpha = 0.62;
      pbx.fillText(label, M, y);
      pbx.globalAlpha = 1;
      pbx.fillText(value, col2, y);
    });

    plateKey = it.title + '|' + W + 'x' + H;
  }

  function drawPiece(now, it) {
    // 종이
    cx.fillStyle = it.paper;
    cx.fillRect(0, 0, graphW, graphH);

    if (plateKey !== it.title + '|' + graphW + 'x' + graphH) bakePlates(it);

    // 두 판을 곱해서 얹는다 — 겹치는 자리가 짙어진다
    cx.save();
    cx.globalCompositeOperation = 'multiply';
    cx.drawImage(plateA, -reg.x * 0.5, -reg.y * 0.5);
    cx.drawImage(plateB, reg.x * 0.5, reg.y * 0.5);
    cx.restore();

    // 안내 한 줄
    const off = Math.hypot(reg.x, reg.y) / (unit * REG_RANGE);
    cx.save();
    cx.textAlign = 'left';
    cx.textBaseline = 'alphabetic';
    cx.font = '700 ' + Math.max(10, Math.round(graphH * 0.0165)) + 'px ' + FACE;
    cx.fillStyle = it.ground;
    cx.globalAlpha = 0.55 + 0.45 * (1 - Math.min(1, off));
    cx.fillText(
      it.piece !== 'register' ? 'IN REGISTER'
      : off > 0.04 ? 'OUT OF REGISTER  ' + (off * 100).toFixed(0) + '%'
      : 'DRAG TO PULL THE PLATES APART',
      Math.round(graphW * 0.045), graphH * 0.95);
    cx.restore();
  }

  function stepRegister(dt) {
    if (!reg.held) { reg.tx = 0; reg.ty = 0; }
    const k = Math.min(1, dt / 16);
    reg.vx = (reg.vx + (reg.tx - reg.x) * REG_SPRING * k) * REG_DAMP;
    reg.vy = (reg.vy + (reg.ty - reg.y) * REG_SPRING * k) * REG_DAMP;
    reg.x += reg.vx;
    reg.y += reg.vy;
  }

  /* --- 액체처럼 퍼지는 원 — 눌린 구슬에서 종이가 번진다 --- */
  function drawBlob(t, it) {
    const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const far = Math.hypot(
      Math.max(open.x, graphW - open.x),
      Math.max(open.y, graphH - open.y)) * 1.06;
    const base = open.r0 + (far - open.r0) * e;
    const amp = 0.16 * Math.sin(Math.PI * t);
    const ph = performance.now() * 0.0016;

    const w = Math.min(1, t * 1.7);
    const gr = cx.createRadialGradient(open.x, open.y, 0, open.x, open.y, base * 1.2);
    gr.addColorStop(0, rgbs(mixRGB(it.pRGB, vividOf(it.gRGB), 1 - w)));
    gr.addColorStop(1, rgbs(mixRGB(it.pRGB, it.gRGB, (1 - w) * 0.85)));
    cx.fillStyle = gr;

    cx.beginPath();
    for (let i = 0; i <= 96; i++) {
      const a = (i / 96) * TAU;
      const k = 1 + amp * (Math.sin(a * 3 + ph) * 0.62 + Math.sin(a * 5 - ph * 1.4) * 0.38);
      const r = base * k;
      const px = open.x + Math.cos(a) * r;
      const py = open.y + Math.sin(a) * r;
      if (i === 0) cx.moveTo(px, py); else cx.lineTo(px, py);
    }
    cx.closePath();
    cx.fill();
  }

  /* ==================================================================
   * 왼쪽 글자 — 레퍼런스 자리 그대로
   * ================================================================ */

  const HEAD = ['HELLO, HAVE A GOOD DAY', 'MONO-COLOR EDITORIAL', 'INTERACTION ARCHIVE'];
  const STRIP_LEN = 44;

  function syncPanel(force) {
    const idx = wrap(Math.round(scroll));
    if (idx === shownIndex && !force) return;
    shownIndex = idx;

    const n = INTERACTIONS.length;
    const num = String(idx + 1).padStart(2, '0') + '/' + String(n).padStart(2, '0');

    headAEl.textContent = HEAD[0];
    headBEl.textContent = HEAD[1];
    headCEl.textContent = HEAD[2] + ' ' + num;

    const on = Math.max(1, Math.round(((idx + 1) / n) * STRIP_LEN));
    stripNumEl.textContent = num + ' ' + INTERACTIONS[idx].palette.toUpperCase() + ' ';
    stripOnEl.textContent = '1'.repeat(on);
    stripOffEl.textContent = '1'.repeat(STRIP_LEN - on);

    const write = () => {
      const it = INTERACTIONS[idx];
      panelTitleEl.textContent = it.title;
      panelDescEl.textContent = it.desc;
      panelEl.classList.remove('is-swap');
    };

    clearTimeout(panelTimer);
    if (force) { write(); return; }
    panelEl.classList.add('is-swap');
    panelTimer = setTimeout(write, 200);
  }

  /* ==================================================================
   * 매 프레임
   * ================================================================ */

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = lastNow ? Math.min(50, now - lastNow) : 16;
    lastNow = now;
    const t = now - started;

    // 손을 떼면 가장 가까운 자리로 물린다 — 표 위에 정확히 서야
    // 레퍼런스의 실루엣이 그대로 나온다
    if (!drag && now - scrollAt > SCROLL_SNAP) scrollTo = Math.round(scrollTo);
    scroll += (scrollTo - scroll) * SCROLL_EASE;
    if (Math.abs(scrollTo - scroll) < 0.0008) scroll = scrollTo;
    syncPanel(false);

    if (open.dir !== 0) {
      open.t = clamp(open.t + open.dir * dt / OPEN_MS, 0, 1);
      if (open.t === 1 || open.t === 0) open.dir = 0;
    }
    graphEl.classList.toggle('is-open', open.t > 0.72);
    stepRegister(dt);

    layoutBeads(t, dt);
    const col = nowColors(now);

    cx.clearRect(0, 0, graphW, graphH);

    if (open.t < 1) {
      drawRoom(col);
      drawChain(t, col);
    }
    if (open.t > 0) drawBlob(open.t, open.it || INTERACTIONS[0]);

    const pieceA = clamp((open.t - 0.86) / 0.14, 0, 1);
    if (pieceA > 0 && open.it) {
      cx.globalAlpha = pieceA;
      drawPiece(now, open.it);
      cx.globalAlpha = 1;
    }
  }

  /* ==================================================================
   * 입력
   * ================================================================ */

  function beadAt(x, y) {
    for (let i = order.length - 1; i >= 0; i--) {   // 큰 것부터
      const b = order[i];
      if (b.r > 8 && Math.hypot(x - b.x, y - b.y) <= b.r) return b;
    }
    return null;
  }

  const live = () => open.t === 0 && performance.now() - started > INTRO_MS * 0.6;

  function scrollBy(d) {
    scrollTo += d;
    scrollAt = performance.now();
  }

  window.addEventListener('pointermove', (e) => {
    cursorEl.style.transform = 'translate3d(' + e.clientX + 'px,' + e.clientY + 'px,0)';
    cursorEl.classList.add('is-on');

    // 열린 인터랙션 안에서는 판을 끈다
    if (open.t >= 1) {
      cursorEl.classList.remove('is-over');
      if (!drag || !open.it || open.it.piece !== 'register') return;
      const lim = unit * REG_RANGE;
      const dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
      const d = Math.hypot(dx, dy) || 1;
      const s = Math.min(1, lim / d);
      reg.tx = dx * s; reg.ty = dy * s;
      drag.moved = Math.max(drag.moved, d);
      return;
    }

    if (!live()) { hoverSlot = null; cursorEl.classList.remove('is-over'); return; }

    if (drag) {
      drag.moved = Math.max(drag.moved, Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0));
      scrollBy((drag.y - e.clientY) * SCROLL_GAIN * 2.4);
      drag.y = e.clientY;
      return;
    }

    const b = beadAt(e.clientX, e.clientY);
    hoverSlot = b ? b.n : null;
    cursorEl.classList.toggle('is-over', !!b);
  }, { passive: true });

  window.addEventListener('pointerdown', (e) => {
    if (open.t > 0 && open.t < 1) return;
    drag = { x0: e.clientX, y0: e.clientY, y: e.clientY, moved: 0 };
    if (open.t >= 1 && open.it && open.it.piece === 'register') reg.held = true;
  });

  window.addEventListener('pointerup', (e) => {
    if (!drag) return;
    const tapped = drag.moved < TAP_SLOP;
    drag = null;
    reg.held = false;
    scrollAt = performance.now();
    if (!tapped || !live()) return;

    const b = beadAt(e.clientX, e.clientY);
    if (!b) return;

    // 메인 자리에 선 구슬만 열린다. 다른 걸 누르면 열지 않고
    // 먼저 가운데로 데려온다 — 한 번 더 눌러야 안으로 들어간다.
    if (b.n !== Math.round(scrollTo)) {
      scrollTo = b.n;
      scrollAt = performance.now();
      hoverSlot = null;
      cursorEl.classList.remove('is-over');
      return;
    }

    open.x = b.x;
    open.y = b.y;
    open.it = b.it;
    open.r0 = Math.max(26, b.r * 0.34);
    open.dir = 1;
    scrollTo = b.n;
    hoverSlot = null;
    cursorEl.classList.remove('is-over');
  });

  document.addEventListener('pointerleave', () => cursorEl.classList.remove('is-on'));

  window.addEventListener('pointercancel', () => {
    drag = null;
    reg.held = false;
  });

  closeEl.addEventListener('click', (e) => {
    e.stopPropagation();
    if (open.t >= 1) { open.dir = -1; reg.held = false; }
  });

  window.addEventListener('wheel', (e) => {
    if (open.t > 0) return;
    scrollBy(e.deltaY * SCROLL_GAIN);
  }, { passive: true });

  let touchY = null;
  window.addEventListener('touchstart', (e) => { touchY = e.touches[0].clientY; }, { passive: true });
  window.addEventListener('touchmove', (e) => {
    if (touchY === null || open.t > 0) return;
    const y = e.touches[0].clientY;
    scrollBy((touchY - y) * SCROLL_GAIN * 2.4);
    touchY = y;
  }, { passive: true });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && open.t >= 1) { open.dir = -1; return; }
    if (open.t > 0) return;
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); scrollBy(-1); }
    else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); scrollBy(1); }
  });

  /* ==================================================================
   * 시작 / 리사이즈
   * ================================================================ */

  sizeCanvas();
  syncPanel(true);
  started = performance.now();
  lastNow = 0;
  requestAnimationFrame(frame);
  requestAnimationFrame(() => rootEl.classList.add('is-ready'));

  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(sizeCanvas, 140);
  });
})();
