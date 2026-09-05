import { clamp, lerp, POP, TAU } from '../config.js';
import { registerTrack } from './registry.js';

const eye = { x: 0.5, y: 0.5 };

registerTrack({
  id: 'sun-machine',
  side: 'B1',
  title: 'Sun Machine',
  artist: 'Orange Parade',
  genre: 'SUNBURST FUNK',
  duration: '3:51',
  bpm: 112,
  hint: 'MOVE TO SWING THE SUN',
  wedges: [[20, 70, POP.yellow], [110, 160, POP.purple], [200, 250, POP.teal], [290, 340, POP.yellow]],
  label: { art: 'sunburst', paper: POP.yellow },
  scene: { ground: POP.yellow, ink: POP.purple },

  render({ context: g, width: W, height: H, time, beat, pulse, pointer, dt }) {
    const s = Math.min(W, H);
    const line = Math.max(3, s * 0.012);

    /* 해는 커서를 곧장 따라가지 않는다. 한 박자 늦게 끌려온다. */
    const k = clamp(dt / 190, 0, 1);
    eye.x = lerp(eye.x, pointer.x, k);
    eye.y = lerp(eye.y, pointer.y, k);
    const cx = W * (0.22 + eye.x * 0.56);
    const cy = H * (0.2 + eye.y * 0.6);

    /* 광선 — 스물넷으로 나뉘어 천천히 돈다 */
    const spin = time * 0.00016 + pulse * 0.05;
    const reach = Math.hypot(W, H);
    const rays = 24;
    for (let i = 0; i < rays; i += 1) {
      const a0 = spin + (i / rays) * TAU;
      const a1 = a0 + (TAU / rays) * (0.5 + pulse * 0.08);
      g.fillStyle = i % 2 ? POP.purple : POP.teal;
      g.globalAlpha = i % 2 ? 0.95 : 0.9;
      g.beginPath();
      g.moveTo(cx, cy);
      g.lineTo(cx + Math.cos(a0) * reach, cy + Math.sin(a0) * reach);
      g.lineTo(cx + Math.cos(a1) * reach, cy + Math.sin(a1) * reach);
      g.closePath();
      g.fill();
    }
    g.globalAlpha = 1;

    /* 하프톤 — 해에서 멀어질수록 점이 굵어진다 */
    const cell = s * 0.052;
    const far = Math.hypot(W, H) * 0.66;
    g.fillStyle = POP.yellow;
    for (let y = cell * 0.5; y < H + cell; y += cell) {
      for (let x = cell * 0.5; x < W + cell; x += cell) {
        const offset = (Math.round(y / cell) % 2) * cell * 0.5;
        const px = x + offset;
        const d = Math.hypot(px - cx, y - cy) / far;
        const value = clamp(d - 0.12 + Math.sin(beat * 1.4 - d * 6) * 0.09, 0, 1);
        if (value < 0.05) continue;
        g.beginPath();
        g.arc(px, y, cell * 0.5 * Math.sqrt(value), 0, TAU);
        g.fill();
      }
    }

    /* 해의 속 — 흰 원, 노란 원, 그리고 박자에 부푸는 테두리 */
    const core = s * (0.11 + pulse * 0.022);
    g.fillStyle = POP.white;
    g.strokeStyle = POP.black;
    g.lineWidth = line * 1.6;
    g.beginPath();
    g.arc(cx, cy, core, 0, TAU);
    g.fill();
    g.stroke();

    g.fillStyle = POP.yellow;
    g.beginPath();
    g.arc(cx, cy, core * 0.6, 0, TAU);
    g.fill();
    g.lineWidth = line * 1.2;
    g.stroke();

    /* 눈 — 해가 이쪽을 본다 */
    const look = core * 0.16;
    g.fillStyle = POP.black;
    [-1, 1].forEach((side) => {
      g.beginPath();
      g.ellipse(
        cx + side * core * 0.24 + (pointer.x - 0.5) * look,
        cy - core * 0.08 + (pointer.y - 0.5) * look,
        core * 0.075,
        core * 0.115,
        0,
        0,
        TAU,
      );
      g.fill();
    });
    g.strokeStyle = POP.black;
    g.lineWidth = line;
    g.lineCap = 'round';
    g.beginPath();
    g.arc(cx, cy + core * 0.06, core * 0.28, 0.28 * Math.PI, 0.72 * Math.PI);
    g.stroke();
  },
});
