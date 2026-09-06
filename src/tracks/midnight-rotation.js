import { clamp, TAU } from '../config.js';
import { registerTrack } from './registry.js';

/* 이 판의 레이블, 색 쐐기, 방과 인터랙션이 함께 쓰는 잉크. */
const P = Object.freeze({
  name: 'AFTER HOURS',
  wash: '#FFC20E',
  ground: '#8B22F0',
  ink: '#0D0D0D',
  paper: '#FFFFFF',
  primary: '#8B22F0',
  primaryDeep: '#5E10AE',
  secondary: '#12A98B',
  secondaryDeep: '#0B7A63',
  accent: '#FFC20E',
  accentDeep: '#F0A400',
  soft: '#F2A2AC',
});

/* 같은 자리에는 늘 같은 창이 켜지도록 씨앗 하나로 값을 뽑는다 */
const rand = (i) => {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

/* 뒤 겹은 낮고 느리게, 앞 겹은 높고 빠르게. 하늘이 화면의 위 절반을 갖는다. */
const LAYERS = [
  { fill: P.primaryDeep, floor: 0.80, base: 0.13, span: 0.15, width: 0.150, speed: 0.010, seed: 3, lit: false },
  { fill: P.secondary, floor: 0.89, base: 0.17, span: 0.19, width: 0.190, speed: 0.021, seed: 61, lit: false },
  { fill: P.ink, floor: 0.99, base: 0.23, span: 0.23, width: 0.245, speed: 0.038, seed: 137, lit: true },
];

registerTrack({
  id: 'midnight-rotation',
  palette: P,
  side: 'A1',
  title: 'Midnight Rotation',
  artist: 'The Velvet Loop',
  genre: 'NIGHT DUB',
  duration: '4:12',
  bpm: 92,
  hint: 'MOVE TO WALK THE CITY',
  wedges: [[6, 96, P.primary], [148, 198, P.secondary], [252, 302, P.primary]],
  label: { art: 'skyline', paper: P.primary },
  scene: { ground: P.ground, ink: P.accent },

  render({ context: g, width: W, height: H, time, beat, pulse, pointer }) {
    const s = Math.min(W, H);
    const drift = pointer.x - 0.5;
    const lift = pointer.y - 0.5;
    const line = Math.max(2, s * 0.009);

    /* 별 — 박자마다 한 칸씩 자리를 바꾼다 */
    g.fillStyle = P.accent;
    for (let i = 0; i < 46; i += 1) {
      const twinkle = 0.55 + Math.sin(time * 0.0007 + i * 2.37) * 0.35;
      const x = rand(i) * W - drift * s * 0.04;
      const y = rand(i + 900) * H * 0.55;
      const r = s * (0.0035 + twinkle * 0.004);
      g.beginPath();
      g.arc(x, y, r, 0, TAU);
      g.fill();
    }

    /* 달 — 커서를 따라 느리게 옮겨 앉는다 */
    const moonX = W * 0.74 - drift * s * 0.18;
    const moonY = H * 0.24 + lift * s * 0.12;
    const moonR = s * 0.135 + pulse * s * 0.007;
    g.fillStyle = P.paper;
    g.strokeStyle = P.ink;
    g.lineWidth = line * 1.4;
    g.beginPath();
    g.arc(moonX, moonY, moonR, 0, TAU);
    g.fill();
    g.stroke();
    g.fillStyle = 'rgba(13,13,13,0.13)';
    [[-0.34, -0.24, 0.20], [0.26, 0.12, 0.27], [-0.10, 0.42, 0.15]].forEach(([ox, oy, or]) => {
      g.beginPath();
      g.arc(moonX + moonR * ox, moonY + moonR * oy, moonR * or, 0, TAU);
      g.fill();
    });

    /* 달을 지나가는 판 한 장 — 천천히 돌며 밤을 가른다 */
    const spin = time * 0.00028;
    g.save();
    g.translate(W * 0.2 + drift * s * 0.06, H * 0.19 + lift * s * 0.05);
    g.rotate(spin);
    g.fillStyle = P.ink;
    g.beginPath();
    g.arc(0, 0, s * 0.1, 0, TAU);
    g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.34)';
    g.lineWidth = Math.max(1, s * 0.0035);
    for (let r = s * 0.09; r > s * 0.035; r -= s * 0.012) {
      g.beginPath();
      g.arc(0, 0, r, 0, TAU);
      g.stroke();
    }
    g.fillStyle = P.accent;
    g.beginPath();
    g.arc(0, 0, s * 0.03, 0, TAU);
    g.fill();
    g.strokeStyle = P.ink;
    g.lineWidth = line;
    g.stroke();
    g.restore();

    /* 스카이라인 세 겹 — 뒤일수록 느리게 흐른다 */
    LAYERS.forEach((layer) => {
      const cw = s * layer.width;
      const shift = (time * layer.speed * 0.06 + drift * s * layer.speed * 26) % cw;
      const columns = Math.ceil(W / cw) + 2;
      const floor = H * layer.floor;

      for (let i = -1; i < columns; i += 1) {
        const seed = layer.seed + Math.floor((time * layer.speed * 0.06) / cw) + i;
        const x = i * cw - shift;
        const top = floor - H * (layer.base + rand(seed) * layer.span);
        const w = cw * 0.86;

        g.fillStyle = layer.fill;
        g.strokeStyle = P.ink;
        g.lineWidth = line * 1.3;
        g.beginPath();
        g.rect(x, top, w, H - top);
        g.fill();
        g.stroke();

        /* 지붕 위 물탱크 */
        if (rand(seed + 500) > 0.72) {
          const tw = w * 0.3;
          g.beginPath();
          g.rect(x + w * 0.2, top - tw * 0.7, tw, tw * 0.7);
          g.fill();
          g.stroke();
        }

        if (!layer.lit) continue;

        /* 창 — 박자에 맞춰 몇 칸씩 꺼졌다 켜진다 */
        const cols = 3;
        const rows = Math.max(2, Math.floor((H - top) / (s * 0.062)));
        const ww = w / (cols * 2 + 1);
        for (let c = 0; c < cols; c += 1) {
          for (let r = 0; r < rows; r += 1) {
            const key = seed * 31 + c * 7 + r * 3;
            const on = rand(key + Math.floor(beat * 0.5) * 13) > 0.42;
            if (!on) continue;
            g.fillStyle = rand(key) > 0.82 ? P.secondary : P.accent;
            g.fillRect(
              x + ww * (1 + c * 2),
              top + s * 0.03 + r * s * 0.062,
              ww,
              s * 0.034,
            );
          }
        }
      }
    });

    /* 아래쪽 도로 — 밝기가 박자에 따라 숨 쉰다 */
    const glow = clamp(0.2 + pulse * 0.5, 0, 1);
    g.fillStyle = P.accent;
    g.globalAlpha = glow;
    g.fillRect(0, H - s * 0.03, W, s * 0.03);
    g.globalAlpha = 1;
    g.fillStyle = P.ink;
    g.fillRect(0, H - s * 0.036, W, s * 0.008);
  },
});
