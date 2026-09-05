import { clamp, POP, TAU } from '../config.js';
import { registerTrack } from './registry.js';

registerTrack({
  id: 'eye-of-the-needle',
  side: 'A2',
  title: 'Eye of the Needle',
  artist: 'Suzi & The Static',
  genre: 'ACID POP',
  duration: '3:28',
  bpm: 124,
  hint: 'MOVE TO BE LOOKED AT',
  wedges: [[34, 128, POP.teal], [186, 232, POP.purple], [300, 348, POP.yellow]],
  label: { art: 'eye', paper: POP.yellow },
  scene: { ground: POP.yellow, ink: POP.purple },

  render({ context: g, width: W, height: H, time, beat, pulse, pointer }) {
    const s = Math.min(W, H);
    const cx = W * 0.5;
    const cy = H * 0.5;
    const line = Math.max(3, s * 0.013);

    /* 박자마다 바깥으로 퍼지는 고리 */
    g.strokeStyle = POP.purple;
    for (let i = 0; i < 4; i += 1) {
      const age = (beat - i) % 4;
      if (age < 0) continue;
      const t = age / 4;
      g.globalAlpha = (1 - t) * 0.5;
      g.lineWidth = line * (1.6 - t);
      g.beginPath();
      g.arc(cx, cy, s * (0.24 + t * 0.5), 0, TAU);
      g.stroke();
    }
    g.globalAlpha = 1;

    /* 눈꺼풀 — 여덟 박에 한 번 깜빡인다 */
    const phase = beat % 8;
    const blink = phase > 7.5 ? clamp(1 - Math.abs(phase - 7.75) / 0.25, 0, 1) : 0;
    const openY = s * 0.24 * (1 - blink * 0.94);
    const openX = s * 0.42;

    /* 아몬드 — 양 끝점을 잇는 두 개의 이차 곡선. 가운데가 가장 크게 벌어진다. */
    const almond = () => {
      g.beginPath();
      g.moveTo(cx - openX, cy);
      g.quadraticCurveTo(cx, cy - openY * 2.05, cx + openX, cy);
      g.quadraticCurveTo(cx, cy + openY * 2.05, cx - openX, cy);
      g.closePath();
    };

    /* 아몬드 위의 한 점 — 위 곡선은 -1, 아래 곡선은 1 */
    const onLid = (t, side) => ({
      x: cx + openX * (2 * t - 1),
      y: cy + side * 4.1 * openY * t * (1 - t),
    });

    /* 속눈썹 — 눈꺼풀 바깥으로 뻗는다. 박자에 맞춰 길이가 숨 쉰다. */
    g.strokeStyle = POP.purple;
    g.lineCap = 'round';
    [[-1, 11], [1, 7]].forEach(([side, count]) => {
      for (let i = 1; i <= count; i += 1) {
        const t = i / (count + 1);
        const from = onLid(t, side);
        const reach = s * (0.055 + 0.028 * Math.sin(i * 1.7 + beat * 1.1)) * (1 - blink * 0.7);
        const nx = (from.x - cx) / (openX * 1.6);
        const ny = (from.y - cy) / (openY * 0.9) + side * 0.55;
        const norm = Math.hypot(nx, ny) || 1;
        g.lineWidth = line * (0.75 + 0.35 * Math.sin(i * 2.1));
        g.beginPath();
        g.moveTo(from.x, from.y);
        g.lineTo(from.x + (nx / norm) * reach, from.y + (ny / norm) * reach);
        g.stroke();
      }
    });

    /* 어긋나 찍힌 청록 판 — 팝아트의 오프셋 */
    g.save();
    g.translate(s * 0.012, s * 0.014);
    g.fillStyle = POP.teal;
    almond();
    g.fill();
    g.restore();

    g.fillStyle = POP.white;
    almond();
    g.fill();
    g.strokeStyle = POP.black;
    g.lineWidth = line * 1.5;
    g.stroke();

    /* 홍채 — 커서를 좇되 눈 밖으로는 못 나간다 */
    g.save();
    almond();
    g.clip();

    const reach = s * 0.16;
    const ix = cx + clamp((pointer.x - 0.5) * 2.4, -1, 1) * reach;
    const iy = cy + clamp((pointer.y - 0.5) * 2.4, -1, 1) * reach * 0.42;
    const ir = s * (0.115 + pulse * 0.012);

    g.fillStyle = POP.teal;
    g.beginPath();
    g.arc(ix, iy, ir, 0, TAU);
    g.fill();

    /* 홍채 결 */
    g.strokeStyle = 'rgba(13,13,13,0.34)';
    g.lineWidth = Math.max(1, s * 0.004);
    for (let i = 0; i < 26; i += 1) {
      const a = (i / 26) * TAU + time * 0.00022;
      g.beginPath();
      g.moveTo(ix + Math.cos(a) * ir * 0.42, iy + Math.sin(a) * ir * 0.42);
      g.lineTo(ix + Math.cos(a) * ir * 0.96, iy + Math.sin(a) * ir * 0.96);
      g.stroke();
    }

    g.strokeStyle = POP.black;
    g.lineWidth = line * 1.2;
    g.beginPath();
    g.arc(ix, iy, ir, 0, TAU);
    g.stroke();

    /* 동공 — 누르면 조인다 */
    const pr = ir * (pointer.down ? 0.26 : 0.44 - pulse * 0.06);
    g.fillStyle = POP.black;
    g.beginPath();
    g.arc(ix, iy, pr, 0, TAU);
    g.fill();

    g.fillStyle = POP.white;
    g.beginPath();
    g.arc(ix - ir * 0.34, iy - ir * 0.36, ir * 0.16, 0, TAU);
    g.fill();
    g.restore();

    /* 위 눈꺼풀 선 */
    g.strokeStyle = POP.black;
    g.lineWidth = line * 1.5;
    almond();
    g.stroke();

    /* 눈썹 — 눈 위로 한 획 */
    g.strokeStyle = POP.purple;
    g.lineWidth = line * 2.2;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(cx - openX * 0.86, cy - openY * 1.75);
    g.quadraticCurveTo(cx - openX * 0.1, cy - openY * 2.9, cx + openX * 0.72, cy - openY * 1.95);
    g.stroke();
  },
});
