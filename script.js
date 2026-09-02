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

  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;

  const EASE = {
    out:    'cubic-bezier(0.23, 1, 0.32, 1)',
    inOut:  'cubic-bezier(0.77, 0, 0.175, 1)',
    drawer: 'cubic-bezier(0.32, 0.72, 0, 1)',
  };

  const MS = {
    flight: 520,   // 칩이 슬롯 위까지 이동하는 시간
    seat:   320,   // 슬롯 뒤로 내려가는 시간
    power:  220,   // 화면에 불이 드는 시간
    boot:   760,   // 마크가 내려와 머무는 시간
    zoom:   780,   // 화면 안으로 들어가는 시간
    fade:   200,   // 도트가 실물로 바뀌는 순간
    out:    620,   // 되돌아 나오는 시간
  };

  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const FACE_FONT = "'Quantico', 'Pretendard Variable', Pretendard, sans-serif";
  const GLYPHS = 'AERTNSOMU0123456789@#%&*';

  /* ---- 잉크 — 한 화면에 두 도까지 ---------------------------------- */
  const INK = {
    ultramarine: '#263E99', safetyOrange: '#E55D2B',
    cobalt: '#2148B8', terracotta: '#C65F38',
    botanicalGreen: '#008A4B', oxblood: '#8F3434',
    signalRed: '#C83232',
    mintGreen: '#5EB783', warmCharcoal: '#302D2E',
    cyan: '#159DDA', brickRed: '#B64032',
  };
  const PAPER = { white: '#FAFAF7', gray: '#E9E9E5', beige: '#F5F1E8' };

  /* ==================================================================
   * 카트리지 여섯 장
   *   body/fg  칩(과 카트리지)의 몸과 그 위의 글자
   *   ink/paper 화면 안에서 쓰는 잉크와 종이
   * ================================================================ */
  const CARTS = [
    {
      no: '01', title: 'Out of Register', scene: 'register',
      mode: 'OVERPRINT', palette: 'ULTRAMARINE + SAFETY ORANGE',
      hint: 'DRAG TO PULL THE PLATES APART',
      body: INK.ultramarine, fg: PAPER.white,
      ink: INK.ultramarine, paper: PAPER.white,
    },
    {
      no: '02', title: 'The Size of the Dot', scene: 'halftone',
      mode: 'DUOTONE', palette: 'COBALT + TERRACOTTA',
      hint: 'MOVE TO GROW THE DOTS',
      body: INK.terracotta, fg: PAPER.beige,
      ink: INK.cobalt, paper: PAPER.white,
    },
    {
      no: '03', title: 'Room on the Paper', scene: 'bars',
      mode: 'DUOTONE', palette: 'BOTANICAL GREEN + OXBLOOD',
      hint: 'MOVE TO PUSH THE TYPE ASIDE',
      body: INK.botanicalGreen, fg: PAPER.beige,
      ink: INK.botanicalGreen, paper: PAPER.beige,
    },
    {
      no: '04', title: 'Density of One Ink', scene: 'density',
      mode: 'ONE INK', palette: 'SIGNAL RED',
      hint: 'MOVE UP AND DOWN TO SET THE DENSITY',
      body: INK.signalRed, fg: PAPER.white,
      ink: INK.signalRed, paper: PAPER.white,
    },
    {
      no: '05', title: 'Order of the Plates', scene: 'overprint',
      mode: 'CHROMATIC + BLACK', palette: 'MINT GREEN + WARM CHARCOAL',
      hint: 'MOVE TO CHANGE WHICH PLATE LANDS FIRST',
      body: INK.mintGreen, fg: INK.warmCharcoal,
      ink: INK.warmCharcoal, paper: PAPER.gray,
    },
    {
      no: '06', title: 'The Body of a Letter', scene: 'type',
      mode: 'OVERPRINT', palette: 'CYAN + BRICK RED',
      hint: 'MOVE TO UNSETTLE THE LETTERS',
      body: INK.cyan, fg: PAPER.white,
      ink: INK.brickRed, paper: PAPER.gray,
    },
  ];

  /* ==================================================================
   * 장면 — 칩 위의 무늬, 화면 속 도트, 확대된 실물이 모두 같은 함수다.
   * 크기만 바뀐다.
   *
   *   g  캔버스, W×H  그리는 크기, t  시간(ms), ink  잉크 한 도
   *   p  손의 자리 { x, y: 0..1, dx, dy: -1..1, down }
   * ================================================================ */

  const IDLE = { x: 0.5, y: 0.5, dx: 0, dy: 0, down: false };

  const SCENES = {
    // 어긋난 판 — 같은 그림이 두 번, 조금 밀려서
    register(g, W, H, t, ink, p) {
      const S = Math.min(W, H);
      const ox = p.dx * S * 0.30 + Math.sin(t * 0.0006) * S * 0.014;
      const oy = p.dy * S * 0.30 + Math.cos(t * 0.0008) * S * 0.014;
      g.fillStyle = ink;
      g.strokeStyle = ink;
      g.lineWidth = S * 0.017;
      for (let k = 0; k < 2; k++) {
        const s = k ? 0.5 : -0.5;
        g.globalAlpha = 0.56;
        g.beginPath();
        g.arc(W * 0.5 + ox * s, H * 0.40 + oy * s, S * 0.19, 0, TAU);
        g.fill();
        for (let i = 0; i < 3; i++) {
          const y = H * 0.66 + i * S * 0.082 + oy * s;
          g.beginPath();
          g.moveTo(W * 0.14 + ox * s, y);
          g.lineTo(W * 0.86 + ox * s, y);
          g.stroke();
        }
      }
      g.globalAlpha = 1;
    },

    // 망점 — 점의 크기로만 어두워진다
    halftone(g, W, H, t, ink, p) {
      const cell = Math.min(W, H) / 9.5;
      const cols = Math.max(2, Math.round(W / cell));
      const rows = Math.max(2, Math.round(H / cell));
      const cw = W / cols, ch = H / rows;
      const px = p.x * W, py = p.y * H;
      const reach = Math.hypot(W, H) * 0.56;
      g.fillStyle = ink;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = (c + 0.5) * cw, y = (r + 0.5) * ch;
          const d = Math.hypot(x - px, y - py) / reach;
          const v = clamp(1.04 - d + 0.2 * Math.sin(t * 0.0012 - d * 5.5), 0, 1);
          if (v < 0.04) continue;
          g.beginPath();
          g.arc(x, y, Math.min(cw, ch) * 0.5 * Math.sqrt(v), 0, TAU);
          g.fill();
        }
      }
    },

    // 여백 — 막대가 밀리며 종이를 드러낸다
    bars(g, W, H, t, ink, p) {
      const rows = 11, h = H / rows;
      const push = (p.x - 0.5) * 2;
      g.fillStyle = ink;
      for (let r = 0; r < rows; r++) {
        const d = (push * 0.30 + Math.sin(t * 0.0009 + r * 0.7) * 0.10) * W;
        const w = W * (0.24 + 0.26 * Math.abs(Math.sin(r * 1.3)));
        g.globalAlpha = r % 2 ? 0.92 : 0.5;
        g.fillRect(W * 0.5 - w / 2 + d, r * h + h * 0.24, w, h * 0.52);
      }
      g.globalAlpha = 1;
    },

    // 한 도의 밀도 — 같은 잉크가 성기게, 짙게
    density(g, W, H, t, ink, p) {
      const rows = 9, h = H / rows;
      g.fillStyle = ink;
      for (let r = 0; r < rows; r++) {
        const u = (r + 0.5) / rows;
        const a = clamp(1.06 - Math.abs(u - p.y) * 2.2
          + 0.13 * Math.sin(t * 0.0007 + u * 6), 0.05, 1);
        g.globalAlpha = a;
        g.fillRect(0, r * h, W, h * 0.99);
      }
      g.globalAlpha = 1;
    },

    // 판의 차례 — 먼저 앉은 도 위에 다음 도가 얹힌다
    overprint(g, W, H, t, ink, p) {
      const S = Math.min(W, H);
      const w = S * 0.5;
      const d = S * 0.15;
      const a = t * 0.0006 + (p.x - 0.5) * 3.6;
      const n = Math.max(1, Math.round(W / (S * 0.92)));
      g.fillStyle = ink;
      g.globalAlpha = 0.5;
      for (let i = 0; i < n; i++) {
        const cx = W * (i + 0.5) / n;
        for (let k = 0; k < 2; k++) {
          const s = k ? 1 : -1;
          g.fillRect(cx - w / 2 + s * Math.cos(a + i) * d,
                     H / 2 - w / 2 + s * Math.sin(a + i) * d, w, w);
        }
      }
      g.globalAlpha = 1;
    },

    // 글자의 몸 — 낱말이 도형이 되는 자리
    type(g, W, H, t, ink, p) {
      const cell = Math.min(W, H) / 3.1;
      const cols = Math.max(1, Math.round(W / cell));
      const rows = Math.max(1, Math.round(H / cell));
      const cw = W / cols, ch = H / rows;
      const px = p.x * W, py = p.y * H;
      const reach = Math.hypot(W, H) * 0.42;
      g.fillStyle = ink;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = '700 ' + (Math.min(cw, ch) * 0.94).toFixed(1) + 'px ' + FACE_FONT;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = (c + 0.5) * cw, y = (r + 0.5) * ch;
          const near = clamp(1 - Math.hypot(x - px, y - py) / reach, 0, 1);
          const spin = t * 0.0007 * (1 + near * 8) + r * 13 + c * 7;
          g.globalAlpha = 0.26 + 0.64 * Math.abs(Math.sin(t * 0.0009 + (r + c) * 0.8));
          g.fillText(GLYPHS[Math.floor(Math.abs(spin)) % GLYPHS.length], x, y);
        }
      }
      g.globalAlpha = 1;
    },
  };

  /* ==================================================================
   * 자리
   * ================================================================ */

  const root = document.documentElement;
  const roomEl = document.getElementById('room');
  const stageEl = document.getElementById('stage');
  const railEl = document.getElementById('rail');
  const deckEl = document.getElementById('deck');
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

  const samp = document.createElement('canvas');
  const sampG = samp.getContext('2d', { willReadFrequently: true });

  /* ==================================================================
   * 칩 한 장 만들기 — 선반의 칩, 날아가는 칩, 꽂힌 카트리지가 모두 같다
   * ================================================================ */

  const SIGN = 'M3 27 C 9 9, 15 5, 17 15 C 19 25, 13 30, 12 23 C 11 15, 21 9, 30 19 '
             + 'C 36 25, 41 23, 45 13 C 48 5, 53 7, 51 17 C 49 27, 43 30, 45 21 '
             + 'C 47 12, 59 9, 67 18 C 73 24, 80 22, 97 11';

  function faceEl(cart, width) {
    const el = document.createElement('div');
    el.className = 'face';
    el.style.setProperty('--w', width + 'px');
    el.style.setProperty('--h', (width / 0.76) + 'px');
    el.style.setProperty('--body', cart.body);
    el.style.setProperty('--fg', cart.fg);
    el.innerHTML =
      '<span class="face-grip">' + '<i></i>'.repeat(14) + '</span>' +
      '<canvas class="face-art"></canvas>' +
      '<h3 class="face-title"><span>Interaction</span>' + cart.title + '</h3>' +
      '<div class="face-meta">' +
        '<span><b>MODE</b><em>' + cart.mode + '</em></span>' +
        '<span><b>CART</b><em>NO. ' + cart.no + '</em></span>' +
      '</div>' +
      '<svg class="face-sign" viewBox="0 0 100 34" preserveAspectRatio="xMinYMid meet" aria-hidden="true">' +
        '<path d="' + SIGN + '"/></svg>' +
      '<span class="face-rule"></span>' +
      '<span class="face-shade"></span>';
    return el;
  }

  /* 이미 그려진 칩을 그대로 복제한다. canvas는 cloneNode가 픽셀을
     복사하지 않으므로 비트맵까지 옮겨 패키지 모양을 유지한다. */
  function cloneFace(source) {
    const clone = source.cloneNode(true);
    const fromCanvases = source.querySelectorAll('canvas');
    clone.querySelectorAll('canvas').forEach((to, i) => {
      const from = fromCanvases[i];
      to.width = from.width;
      to.height = from.height;
      to.getContext('2d').drawImage(from, 0, 0);
    });
    return clone;
  }

  /* 칩 위의 무늬 — 장면을 낮은 해상도로 떠서 네모 칸으로 찍는다 */
  function paintChipArt(cv, cart) {
    const w = cv.clientWidth, h = cv.clientHeight;
    if (!w || !h) return;

    const cols = 30, rows = 13, SS = 4;
    samp.width = cols * SS;
    samp.height = rows * SS;
    sampG.clearRect(0, 0, samp.width, samp.height);
    sampG.save();
    SCENES[cart.scene](sampG, samp.width, samp.height, cart.seed || 0, '#ffffff', IDLE);
    sampG.restore();
    const px = sampG.getImageData(0, 0, samp.width, samp.height).data;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
    const g = cv.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);

    const cw = w / cols, ch = h / rows;
    const sq = Math.min(cw, ch) * 0.76;
    g.fillStyle = cart.fg;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        let acc = 0;
        for (let j = 0; j < SS; j++) {
          for (let i = 0; i < SS; i++) {
            acc += px[(((r * SS + j) * samp.width) + (c * SS + i)) * 4 + 3];
          }
        }
        const v = acc / (SS * SS * 255);
        if (v < 0.06) continue;
        g.globalAlpha = 0.2 + 0.8 * Math.min(1, v * 1.3);
        g.fillRect(c * cw + (cw - sq) / 2, r * ch + (ch - sq) / 2, sq, sq);
      }
    }
    g.globalAlpha = 1;
  }

  /* ==================================================================
   * 선반 — 부채처럼 겹친 칩
   * ================================================================ */

  const FAN = {
    gapNear: 0.98,   // 초점 카드와 바로 옆 카드 사이의 중심 간격
    gapFar: 0.34,    // 두 번째부터 같은 폭만 드러내며 겹친다
    yaw: 22,         // 좌우 카드 면이 중앙을 바라보는 Y축 원근 각도
    //
    // 초점 이외의 카드는 같은 크기다. 가운데 카드만 한 뼘 크게 두어
    // 양옆의 파일이 동일한 리듬으로 포개진다.
    base: 0.86,      // 원근 회전 뒤 레퍼런스와 같은 겉보기 크기를 만든다
    peak: 3.0,       // 초점만 커지는 좁기
    dim: 0.5,        // 뒤로 갈수록 어둑해지는 빠르기
    shade: 0.10,
  };

  /* 바로 옆 칩까지의 실제 거리 — 끌 때의 한 칸이기도 하다 */
  const stepPx = () => Math.abs(fanX(1)) || cardW;

  /* 초점만 한 뼘 앞으로 나온다. 나머지는 서로 같은 크기다. */
  function scaleOf(d) {
    return FAN.base + (1 - FAN.base) * Math.exp(-FAN.peak * Math.abs(d));
  }

  const INITIAL = Math.floor((CARTS.length - 1) / 2);
  const chips = [];
  const rail = { pos: INITIAL, target: INITIAL, drag: null, wheel: 0, wheelAt: 0 };
  let focus = INITIAL;
  let cardW = 0, cardH = 0;
  let state = 'shelf';     // shelf | inserting | play | ejecting

  CARTS.forEach((cart, i) => {
    cart.seed = 900 + i * 1700;
    const chip = document.createElement('div');
    chip.className = 'chip';
    chip.dataset.i = String(i);
    chip.setAttribute('role', 'option');
    chip.appendChild(faceEl(cart, 200));
    railEl.appendChild(chip);
    chip._shade = chip.querySelector('.face-shade');
    chip._art = chip.querySelector('.face-art');
    chips.push(chip);
  });

  const probe = document.createElement('div');
  probe.className = 'probe';
  railEl.appendChild(probe);

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
    chips.forEach((chip, i) => paintChipArt(chip._art, CARTS[i]));
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
    const i = clamp(Math.round(rail.pos), 0, CARTS.length - 1);
    if (i !== focus) setNow(i);
  }

  /* ==================================================================
   * 화면 — 도트 매트릭스 한 판
   * ================================================================ */

  const lcd = { power: 0, boot: -1, contrast: 0.17 };

  function paintLcd(now) {
    const cart = CARTS[focus];
    const on = lcd.power > 0.5;
    const ground = on ? cart.paper : '#151711';
    const ink = on ? cart.ink : '#8CA173';

    bufG.clearRect(0, 0, LCD_W, LCD_H);
    bufG.save();
    SCENES[cart.scene](bufG, LCD_W, LCD_H, now, ink, IDLE);
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
      const b = clamp((now - lcd.boot) / MS.boot, 0, 1);
      const slide = b < 0.62 ? b / 0.62 : 1;
      const e = 1 - Math.pow(1 - slide, 3);
      const y = lerp(-LCD_H * 0.14, LCD_H * 0.2, e);
      lcdG.fillStyle = ground;
      lcdG.fillRect(0, 0, LCD_W, LCD_H);
      lcdG.fillStyle = cart.ink;
      lcdG.textAlign = 'center';
      lcdG.textBaseline = 'middle';
      lcdG.font = '700 ' + (LCD_H * 0.125).toFixed(1) + 'px ' + FACE_FONT;
      lcdG.fillText('CRAFT BOY', LCD_W / 2, y);
      lcdG.font = '700 ' + (LCD_H * 0.055).toFixed(1) + 'px ' + FACE_FONT;
      lcdG.globalAlpha = b > 0.72 ? 1 : 0;
      lcdG.fillText('ADVANCE  ·  NO. ' + cart.no, LCD_W / 2, y + LCD_H * 0.13);
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
    const cart = CARTS[focus];
    const W = playW, H = playH;
    playG.fillStyle = cart.paper;
    playG.fillRect(0, 0, W, H);
    playG.save();
    SCENES[cart.scene](playG, W, H, now, cart.ink, ptr);
    playG.restore();
  }

  /* ==================================================================
   * 넣기 — 칩이 날아가 홈에 앉고, 불이 들어오고, 화면 안으로 들어간다
   * ================================================================ */

  const seq = { skip: false, timers: [], anims: [] };

  /* 자리는 언제나 중심으로 잰다 — 돌아간 칩의 rect 는 카드보다 크게 잡힌다.
     가운데 칩은 곧게 서 있으니 날아갈 때 펼 기울기는 없다. */
  const RAIL_TILT = 0;

  const midOf = (r) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });

  function poseAt(cx, cy, s, rot) {
    return 'translate(' + (cx - cardW / 2).toFixed(1) + 'px,'
      + (cy - cardH / 2).toFixed(1) + 'px) '
      + 'rotate(' + rot.toFixed(2) + 'deg) scale(' + s.toFixed(4) + ')';
  }

  function wait(ms) {
    if (seq.skip || REDUCED) return Promise.resolve();
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

  async function insert() {
    if (state !== 'shelf') return;
    state = 'inserting';
    seq.skip = false;

    const i = clamp(Math.round(rail.target), 0, CARTS.length - 1);
    if (i !== focus) setNow(i);
    const cart = CARTS[i];
    const chip = chips[i];

    const from = midOf(chip.getBoundingClientRect());
    const to = seatEl.getBoundingClientRect();
    const seat = midOf(to);
    const dockY = consoleEl.getBoundingClientRect().top - to.height * 0.5 - 2;
    const lift = seat.y - dockY;
    const sc = to.width / cardW;

    // 날아가는 동안 선반은 물러난다
    chip.classList.add('is-hidden');
    railEl.classList.add('is-gone');
    root.classList.add('is-leaving');

    const flier = cloneFace(chip.firstElementChild);
    flier.style.transform = poseAt(from.x, from.y, 1, RAIL_TILT);
    flightEl.appendChild(flier);

    const a1 = run(flier, [
      { transform: poseAt(from.x, from.y, 1, RAIL_TILT), easing: EASE.out },
      { transform: poseAt(lerp(from.x, seat.x, 0.26), from.y - cardH * 0.14, 1.04, 0),
        offset: 0.32, easing: EASE.inOut },
      { transform: poseAt(seat.x, dockY - to.height * 0.12, sc * 1.012, 0),
        offset: 0.74, easing: EASE.out },
      { transform: poseAt(seat.x, dockY, sc, 0) },
    ], { duration: REDUCED ? 1 : MS.flight });
    await a1.finished.catch(() => {});

    // 날아온 칩을 홈에 놓인 카트리지로 바꿔 단다 — 자리가 같아 티가 없다
    seatEl.innerHTML = '';
    const seatFace = cloneFace(chip.firstElementChild);
    seatFace.style.width = cardW + 'px';
    seatFace.style.height = cardH + 'px';
    seatFace.style.transformOrigin = '0 0';
    seatFace.style.transform = 'scale(' + sc.toFixed(4) + ')';
    seatFace.style.transition = 'none';
    seatEl.appendChild(seatFace);
    seatEl.style.transform = 'translateY(' + (-lift) + 'px)';
    seatEl.classList.add('is-in');
    flier.remove();

    const a2 = run(seatEl, [
      { transform: 'translateY(' + (-lift) + 'px)' },
      { transform: 'translateY(2px)', offset: 0.88, easing: EASE.drawer },
      { transform: 'translateY(0)' },
    ], { duration: REDUCED ? 1 : MS.seat });

    setTimeout(() => {
      if (REDUCED) return;
      consoleEl.animate([
        { transform: 'translateY(0)' },
        { transform: 'translateY(1.5px)' },
        { transform: 'translateY(0)' },
      ], { duration: 150, easing: 'ease-out' });
    }, MS.seat * 0.76);

    await a2.finished.catch(() => {});
    seatEl.style.transform = 'translateY(0)';
    a2.cancel();

    // 불이 든다
    ledEl.classList.add('is-on');
    lcd.power = 1;
    lcd.contrast = 1;
    lcd.boot = performance.now();
    await wait(MS.power + MS.boot);
    lcd.boot = -1;

    // 화면 안으로
    if (!REDUCED) {
      stageEl.style.transition = 'transform ' + MS.zoom + 'ms ' + EASE.inOut;
      stageEl.style.transform = zoomTransform();
      await wait(MS.zoom);
    }

    playTitleEl.textContent = cart.title;
    playHintEl.textContent = cart.hint;
    playEl.style.setProperty('--play-ink', cart.ink);
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
    await wait(MS.fade);

    if (!REDUCED) {
      stageEl.style.transition = 'transform ' + MS.out + 'ms ' + EASE.inOut;
      stageEl.style.transform = 'none';
      await wait(MS.out);
    } else {
      stageEl.style.transform = 'none';
    }

    // 슬롯의 칩이 삽입 때의 크기 변화를 거꾸로 밟아 제자리로 돌아간다.
    const chip = chips[focus];
    const slotRect = seatEl.getBoundingClientRect();
    const slot = midOf(slotRect);
    const dockY = consoleEl.getBoundingClientRect().top - slotRect.height * 0.5 - 2;
    const lift = slot.y - dockY;
    const sc = slotRect.width / cardW;

    // 먼저 실제 슬롯 안의 카트리지가 기기 뒤에서 위로 빠져나온다.
    const up = run(seatEl, [
      { transform: 'translateY(0)' },
      { transform: 'translateY(' + (-lift) + 'px)' },
    ], { duration: REDUCED ? 1 : 260, easing: EASE.out });
    await up.finished.catch(() => {});

    railEl.classList.remove('is-gone');
    root.classList.remove('is-leaving');

    const destination = midOf(chip.getBoundingClientRect());
    const flier = cloneFace(chip.firstElementChild);
    flier.style.transform = poseAt(slot.x, dockY, sc, 0);
    flightEl.appendChild(flier);
    seatEl.classList.remove('is-in');
    up.cancel();
    seatEl.style.transform = 'translateY(0)';
    seatEl.innerHTML = '';

    await (run(flier, [
      { transform: poseAt(slot.x, dockY, sc, 0) },
      { transform: poseAt(destination.x, destination.y, 1, RAIL_TILT) },
    ], { duration: REDUCED ? 1 : MS.flight, easing: EASE.inOut }).finished.catch(() => {}));

    chip.classList.remove('is-hidden');
    flier.remove();

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

  const LAST = CARTS.length - 1;

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
    if (state === 'play') {
      stageEl.style.transition = 'none';
      stageEl.style.transform = zoomTransform();
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
    root.classList.add('is-ready');
    if (!REDUCED) {
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
