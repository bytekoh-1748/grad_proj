/* ==================================================================
 * 카트리지의 겉선
 *
 * 카드는 늘 같은 비(가로/세로 = 0.76)로 선다. 그래서 자리는 가로를 1로
 * 놓은 고른 자에서 잡고, 마지막에 세로만 눌러 0..1 상자로 옮긴다 —
 * 그래야 빗변이 정확히 45도로 떨어지고 모서리도 정원으로 말린다.
 *
 * clip-path 의 polygon() 은 모서리를 굴리지 못한다. 그래서 겉선 한 벌을
 * SVG 로 만들어 두고 CSS 가 url(#cartridge-shape) 로 가져다 쓴다.
 * ================================================================ */

export const CLIP_ID = 'cartridge-shape';

const RATIO = 0.76;               // 카드의 가로/세로
const TALL = 1 / RATIO;           // 고른 자에서의 세로 길이

const EAR = 0.06;                 // 오른쪽 위로 내민 귀의 폭
const EAR_DEPTH = 0.165 * TALL;   // 귀가 끝나고 턱이 시작되는 자리
const CUT_TOP = 0.07;             // 오른쪽 위를 45도로 자른 길이
const CUT_BOTTOM = 0.1;           // 왼쪽 아래를 45도로 자른 길이
const ROUND = 0.032;              // 바깥으로 도는 모서리
const ROUND_EAR = 0.02;           // 귀의 턱 — 짧은 변이라 덜 굴린다
const ROUND_IN = 0.012;           // 안으로 패인 모서리

/* [x, y, 모서리 반지름]. 시계 방향으로, 왼쪽 위에서 출발한다. */
const OUTLINE = [
  [0, 0, ROUND],
  [1 - CUT_TOP, 0, ROUND],
  [1, CUT_TOP, ROUND],
  [1, EAR_DEPTH, ROUND_EAR],
  // 귀의 턱도 45도로 떨어진다 — 내민 폭만큼 아래로 물러선다
  [1 - EAR, EAR_DEPTH + EAR, ROUND_IN],
  [1 - EAR, TALL, ROUND],
  [CUT_BOTTOM, TALL, ROUND],
  [0, TALL - CUT_BOTTOM, ROUND],
];

const span = (from, to) => [to[0] - from[0], to[1] - from[1]];
const length = (v) => Math.hypot(v[0], v[1]);
const unit = (v) => { const l = length(v); return [v[0] / l, v[1] / l]; };
const step = (p, dir, by) => [p[0] + dir[0] * by, p[1] + dir[1] * by];

/* 고른 자에서 잰 자리를 0..1 상자로 옮긴다 — 세로만 눌린다. */
const place = (p) => `${p[0].toFixed(4)},${(p[1] * RATIO).toFixed(4)}`;

/* 반지름 하나가 눌린 상자 안에서는 축이 다른 타원이 된다. */
const radii = (r) => `${r.toFixed(4)},${(r * RATIO).toFixed(4)}`;

function buildOutline(points) {
  const count = points.length;

  const corners = points.map((point, i) => {
    const prev = points[(i - 1 + count) % count];
    const next = points[(i + 1) % count];
    const back = unit(span(point, prev));
    const ahead = unit(span(point, next));

    // 두 변이 이루는 각의 절반. 여기서 접점까지 물러날 길이가 나온다.
    const dot = Math.min(1, Math.max(-1, back[0] * ahead[0] + back[1] * ahead[1]));
    const half = Math.acos(dot) / 2;

    // 들어온 방향에서 나가는 방향으로 어느 쪽으로 도는가 —
    // 시계 방향(바깥 모서리)이면 1, 반시계(안으로 패인 자리)면 0.
    const inbound = span(prev, point);
    const outbound = span(point, next);
    const turn = inbound[0] * outbound[1] - inbound[1] * outbound[0];

    return { point, back, ahead, half, sweep: turn > 0 ? 1 : 0, trim: point[2] / Math.tan(half) };
  });

  // 한 변을 양쪽에서 깎은 길이가 변보다 길면 둘을 같은 비로 줄인다.
  // 짧은 변(귀의 턱)에서 모서리끼리 겹쳐 선이 뒤집히는 것을 막는다.
  for (let pass = 0; pass < 3; pass += 1) {
    for (let i = 0; i < count; i += 1) {
      const j = (i + 1) % count;
      const edge = length(span(points[i], points[j]));
      const need = corners[i].trim + corners[j].trim;
      if (need <= edge) continue;
      const shrink = edge / need;
      corners[i].trim *= shrink;
      corners[j].trim *= shrink;
    }
  }

  return corners.reduce((d, corner, i) => {
    const enter = step(corner.point, corner.back, corner.trim);
    const leave = step(corner.point, corner.ahead, corner.trim);
    const r = corner.trim * Math.tan(corner.half);
    return `${d}${i ? ' L' : 'M'}${place(enter)}`
      + ` A${radii(r)} 0 0,${corner.sweep} ${place(leave)}`;
  }, '') + ' Z';
}

/** Publishes the cartridge silhouette once so CSS can clip every card with it. */
export function installCartridgeClip() {
  if (document.getElementById(CLIP_ID)) return;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'shape-defs');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = `<defs><clipPath id="${CLIP_ID}" clipPathUnits="objectBoundingBox">`
    + `<path d="${buildOutline(OUTLINE)}" /></clipPath></defs>`;
  document.body.appendChild(svg);
}
