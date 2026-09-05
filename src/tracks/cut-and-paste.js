import { clamp, POP, TAU } from '../config.js';
import { registerTrack } from './registry.js';

const BOLT = 'M58 4 L20 56h22l-12 42 44-56H50Z';
const boltPath = new Path2D(BOLT);
const rand = (i) => {
  const s = Math.sin(i * 91.3 + 47.7) * 24634.6345;
  return s - Math.floor(s);
};

registerTrack({
  id: 'cut-and-paste',
  side: 'B2',
  title: 'Cut & Paste',
  artist: 'Scissor Club',
  genre: 'CUT-UP PUNK',
  duration: '2:47',
  bpm: 146,
  hint: 'PRESS TO STRIKE',
  wedges: [[10, 60, POP.yellow], [96, 168, POP.teal], [210, 244, POP.purple], [280, 330, POP.teal]],
  label: { art: 'bolt', paper: POP.purple },
  scene: { ground: POP.purple, ink: POP.yellow },

  render({ context: g, width: W, height: H, time, beat, pulse, pointer }) {
    const s = Math.min(W, H);
    const line = Math.max(3, s * 0.013);
    const bar = Math.floor(beat);
    const cx = W * (0.3 + pointer.x * 0.4);
    const cy = H * (0.3 + pointer.y * 0.4);

    /* 벤데이 점 — 인쇄망이 통째로 한 칸씩 밀린다 */
    const cell = s * 0.042;
    const slide = (bar % 2) * cell * 0.5;
    g.fillStyle = POP.teal;
    for (let y = 0; y < H + cell; y += cell) {
      for (let x = 0; x < W + cell; x += cell) {
        const px = x + (Math.round(y / cell) % 2) * cell * 0.5 + slide;
        const d = Math.hypot(px - cx, y - cy) / (s * 0.8);
        const r = cell * 0.34 * clamp(1.15 - d, 0.12, 1);
        g.beginPath();
        g.arc(px, y, r, 0, TAU);
        g.fill();
      }
    }

    /* 속도선 — 가장자리에서 가운데를 향해 달려든다 */
    g.strokeStyle = POP.black;
    g.lineCap = 'butt';
    for (let i = 0; i < 44; i += 1) {
      const a = (i / 44) * TAU + bar * 0.13;
      const near = s * (0.34 + rand(i + bar) * 0.08);
      const far = near + s * (0.12 + rand(i) * 0.34);
      g.lineWidth = line * (0.35 + rand(i + 7) * 0.9);
      g.globalAlpha = 0.5 + rand(i + 3) * 0.5;
      g.beginPath();
      g.moveTo(cx + Math.cos(a) * near, cy + Math.sin(a) * near);
      g.lineTo(cx + Math.cos(a) * far, cy + Math.sin(a) * far);
      g.stroke();
    }
    g.globalAlpha = 1;

    /* 터짐 — 박자마다 새 각도로 다시 잘라 붙인다 */
    const burst = s * (0.3 + pulse * 0.07) * (pointer.down ? 1.14 : 1);
    const points = 14;
    g.save();
    g.translate(cx, cy);
    g.rotate(rand(bar) * TAU);
    g.beginPath();
    for (let i = 0; i < points * 2; i += 1) {
      const a = (i / (points * 2)) * TAU;
      const r = burst * (i % 2 ? 0.58 : 1) * (0.86 + rand(bar * 31 + i) * 0.28);
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.closePath();
    g.fillStyle = POP.white;
    g.fill();
    g.strokeStyle = POP.black;
    g.lineWidth = line * 1.7;
    g.lineJoin = 'round';
    g.stroke();

    /* 안쪽 노란 터짐 */
    g.beginPath();
    for (let i = 0; i < points * 2; i += 1) {
      const a = (i / (points * 2)) * TAU + 0.2;
      const r = burst * 0.74 * (i % 2 ? 0.55 : 1) * (0.86 + rand(bar * 17 + i) * 0.26);
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.closePath();
    g.fillStyle = POP.yellow;
    g.fill();
    g.lineWidth = line * 1.2;
    g.stroke();
    g.restore();

    /* 번개 — 박자마다 기울기가 바뀐다 */
    const tilt = (rand(bar * 5) - 0.5) * 0.5;
    const scale = (burst * 1.35) / 100;
    g.save();
    g.translate(cx, cy);
    g.rotate(tilt);
    g.scale(scale, scale);
    g.translate(-50, -50);

    g.save();
    g.translate(6, 7);
    g.fillStyle = POP.teal;
    g.fill(boltPath);
    g.restore();

    g.fillStyle = POP.purple;
    g.fill(boltPath);
    g.strokeStyle = POP.black;
    g.lineWidth = line * 1.6 / scale;
    g.lineJoin = 'round';
    g.stroke(boltPath);
    g.restore();
  },
});
