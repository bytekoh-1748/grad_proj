import { clamp, POP, TAU } from '../config.js';
import { registerTrack } from './registry.js';

const RINGS = [
  { petals: 9, radius: 0.40, size: 0.19, speed: -0.000045, fill: POP.purpleDeep, phase: 0.0 },
  { petals: 7, radius: 0.30, size: 0.17, speed: 0.000075, fill: POP.purple, phase: 0.4 },
  { petals: 6, radius: 0.20, size: 0.14, speed: -0.00012, fill: POP.white, phase: 0.8 },
  { petals: 5, radius: 0.11, size: 0.10, speed: 0.00019, fill: POP.yellow, phase: 1.2 },
];

registerTrack({
  id: 'slow-bloom',
  side: 'B3',
  title: 'Slow Bloom',
  artist: 'Terra Garden',
  genre: 'AMBIENT FOLK',
  duration: '6:33',
  bpm: 72,
  hint: 'MOVE OUTWARD TO OPEN',
  wedges: [[24, 116, POP.purple], [140, 214, POP.white], [252, 316, POP.yellow]],
  label: { art: 'bloom', paper: POP.teal },
  scene: { ground: POP.teal, ink: POP.white },

  render({ context: g, width: W, height: H, time, beat, pulse, pointer }) {
    const s = Math.min(W, H);
    const cx = W * 0.5;
    const cy = H * 0.52;
    const line = Math.max(2.5, s * 0.0105);

    /* 커서가 가운데에서 멀어질수록 꽃이 벌어진다 */
    const reach = clamp(Math.hypot(pointer.x - 0.5, pointer.y - 0.5) * 2.1, 0, 1);
    const breath = 0.5 + 0.5 * Math.sin(time * 0.00042);
    const open = clamp(0.42 + reach * 0.5 + breath * 0.14 + pulse * 0.05, 0, 1.25);

    /* 바닥의 노란 띠 */
    g.fillStyle = POP.yellow;
    g.fillRect(0, H * 0.84, W, H * 0.16);
    g.fillStyle = POP.black;
    g.fillRect(0, H * 0.84 - line * 0.7, W, line * 1.4);

    /* 줄기 */
    g.strokeStyle = POP.black;
    g.lineWidth = line * 2.6;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(cx, H);
    g.quadraticCurveTo(cx + Math.sin(time * 0.0005) * s * 0.05, cy + s * 0.28, cx, cy);
    g.stroke();
    g.strokeStyle = POP.purpleDeep;
    g.lineWidth = line * 1.5;
    g.stroke();

    /* 잎 두 장 */
    [-1, 1].forEach((side) => {
      g.save();
      g.translate(cx, H * 0.78);
      g.rotate(side * (0.5 + Math.sin(time * 0.0005 + side) * 0.06));
      g.fillStyle = POP.purple;
      g.beginPath();
      g.ellipse(side * s * 0.11, 0, s * 0.11, s * 0.045, 0, 0, TAU);
      g.fill();
      g.strokeStyle = POP.black;
      g.lineWidth = line * 1.3;
      g.stroke();
      g.restore();
    });

    /* 꽃잎 — 안쪽 고리일수록 빠르게 돈다 */
    RINGS.forEach((ring, index) => {
      const spin = time * ring.speed * 1000 + ring.phase;
      const spread = ring.radius * open;
      for (let i = 0; i < ring.petals; i += 1) {
        const a = spin + (i / ring.petals) * TAU;
        const px = cx + Math.cos(a) * s * spread;
        const py = cy + Math.sin(a) * s * spread;
        g.save();
        g.translate(px, py);
        g.rotate(a + Math.PI / 2);
        g.fillStyle = ring.fill;
        g.beginPath();
        g.ellipse(0, 0, s * ring.size * 0.5, s * ring.size * (0.86 + pulse * 0.06), 0, 0, TAU);
        g.fill();
        g.strokeStyle = POP.black;
        g.lineWidth = line * 1.25;
        g.stroke();
        if (index < 2) {
          g.strokeStyle = 'rgba(13,13,13,0.28)';
          g.lineWidth = line * 0.7;
          g.beginPath();
          g.moveTo(0, -s * ring.size * 0.7);
          g.lineTo(0, s * ring.size * 0.7);
          g.stroke();
        }
        g.restore();
      }
    });

    /* 꽃술 */
    const core = s * (0.075 + pulse * 0.012);
    g.fillStyle = POP.yellow;
    g.beginPath();
    g.arc(cx, cy, core, 0, TAU);
    g.fill();
    g.strokeStyle = POP.black;
    g.lineWidth = line * 1.5;
    g.stroke();

    g.fillStyle = POP.black;
    for (let i = 0; i < 12; i += 1) {
      const a = (i / 12) * TAU + time * 0.0004;
      g.beginPath();
      g.arc(cx + Math.cos(a) * core * 0.55, cy + Math.sin(a) * core * 0.55, core * 0.11, 0, TAU);
      g.fill();
    }
  },
});
