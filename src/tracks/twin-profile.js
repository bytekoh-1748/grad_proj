import { clamp, POP, TAU } from '../config.js';
import { FACE_PROFILE } from '../label-art.js';
import { registerTrack } from './registry.js';

/* 레이블에 붙은 옆얼굴과 같은 윤곽. 0..100 상자 안에서 오른쪽을 본다. */
const facePath = new Path2D(FACE_PROFILE);

registerTrack({
  id: 'twin-profile',
  side: 'A3',
  title: 'Twin Profile',
  artist: 'Duo Mirage',
  genre: 'OFFSET SOUL',
  duration: '5:04',
  bpm: 104,
  hint: 'DRAG TO PULL THE PLATES APART',
  wedges: [[0, 90, POP.teal], [90, 180, POP.purple], [270, 360, POP.yellow]],
  label: { art: 'profiles', paper: POP.teal },
  scene: { ground: POP.teal, ink: POP.purple },

  render({ context: g, width: W, height: H, time, beat, pulse, pointer }) {
    const s = Math.min(W, H);
    const cx = W * 0.5;
    const cy = H * 0.53;
    const unit = (s * 0.66) / 100;          // 얼굴 한 장의 크기
    const line = Math.max(3, s * 0.012);

    /* 어긋남 — 끌면 두 판이 벌어지고, 놓으면 박자에 맞춰 다시 겹친다 */
    const pull = clamp(pointer.dx, -1, 1) * s * 0.12;
    const sway = Math.sin(time * 0.0009) * s * 0.01 + pulse * s * 0.016;
    const gap = s * 0.03 + pull + sway;
    const drop = clamp(pointer.dy, -1, 1) * s * 0.045;

    /* 뒤로 깔리는 노란 원 — 두 얼굴이 서 있는 자리 */
    g.fillStyle = POP.yellow;
    g.beginPath();
    g.arc(cx, cy, s * (0.4 + pulse * 0.012), 0, TAU);
    g.fill();
    g.strokeStyle = POP.black;
    g.lineWidth = line * 1.4;
    g.stroke();

    /* 배경의 결 — 원 밖으로 뻗은 방사선 */
    g.save();
    g.translate(cx, cy);
    g.rotate(time * 0.00008);
    g.strokeStyle = 'rgba(13,13,13,0.16)';
    g.lineWidth = Math.max(1, s * 0.005);
    for (let i = 0; i < 36; i += 1) {
      const a = (i / 36) * TAU;
      g.beginPath();
      g.moveTo(Math.cos(a) * s * 0.41, Math.sin(a) * s * 0.41);
      g.lineTo(Math.cos(a) * s * 0.62, Math.sin(a) * s * 0.62);
      g.stroke();
    }
    g.restore();

    /* dir 1 은 오른쪽을 보는 얼굴, -1 은 뒤집어 마주 보게 한 얼굴.
       두 얼굴의 코끝이 가운데에서 gap 만큼 떨어져 마주 선다. */
    const drawFace = (dir, dx, dy, fill, outline) => {
      g.save();
      g.translate(cx + dir * (gap + dx), cy + dy);
      g.scale(dir * unit, unit);
      g.translate(-78, -56);               // 코끝(78)을 원점에, 세로 가운데 맞춤
      g.fillStyle = fill;
      g.fill(facePath);
      if (outline) {
        g.strokeStyle = POP.black;
        g.lineWidth = line / unit;
        g.lineJoin = 'round';
        g.stroke(facePath);
      }
      g.restore();
    };

    /* 어긋나 찍힌 색판 — 본판보다 조금 밀려 앉는다 */
    drawFace(-1, s * 0.026, -drop, POP.purpleDeep, false);
    drawFace(1, s * 0.026, drop, POP.purpleDeep, false);
    drawFace(-1, s * 0.013, -drop * 0.5, POP.white, false);
    drawFace(1, s * 0.013, drop * 0.5, POP.white, false);

    /* 본판 */
    drawFace(-1, 0, 0, POP.white, true);
    drawFace(1, 0, 0, POP.purple, true);

    /* 두 얼굴 사이의 틈 — 벌어질수록 검은 기둥이 선다 */
    if (gap > s * 0.02) {
      g.fillStyle = POP.black;
      g.fillRect(cx - line * 0.4, cy - unit * 48, line * 0.8, unit * 92);
    }
  },
});
