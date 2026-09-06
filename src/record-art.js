import { labelArt } from './label-art.js';

/* ==================================================================
 * 판 한 장 — 200 x 200 상자에 그린 12인치 비닐.
 *
 *   바깥 테두리(r=99) → 색 쐐기 → 홈 → 레이블 종이 → 스핀들 구멍
 *
 * 쐐기는 레이블 바깥에서 가장자리까지 뻗고, 홈은 쐐기 위에까지 그어진다.
 * 그래서 색이 들어간 자리에서도 골이 그대로 읽힌다.
 * ================================================================ */

const R_OUT = 99;
const R_LABEL = 46;
const RUN_IN = 92;      // 리드인 홈이 시작되는 자리
const RUN_OUT = 51;     // 마지막 홈

let serial = 0;

const pt = (angle, radius) => {
  const a = (angle - 90) * (Math.PI / 180);
  return `${(100 + Math.cos(a) * radius).toFixed(2)} ${(100 + Math.sin(a) * radius).toFixed(2)}`;
};

/* 고리 모양 쐐기 하나. 180도를 넘으면 큰 호 표시를 세운다. */
function wedge(from, to, inner, outer) {
  const large = Math.abs(to - from) > 180 ? 1 : 0;
  return `M${pt(from, inner)} L${pt(from, outer)} `
    + `A${outer} ${outer} 0 ${large} 1 ${pt(to, outer)} `
    + `L${pt(to, inner)} `
    + `A${inner} ${inner} 0 ${large} 0 ${pt(from, inner)} Z`;
}

function grooves() {
  let out = '';
  for (let r = RUN_IN; r >= RUN_OUT; r -= 2.6) {
    // 세 줄마다 한 번씩 밝은 골 — 곡과 곡 사이의 빈 띠처럼 보이게 한다
    const band = Math.round((RUN_IN - r) / 2.6) % 6 === 0;
    out += `<circle cx="100" cy="100" r="${r.toFixed(2)}" fill="none" `
      + `stroke="rgba(255,255,255,${band ? 0.3 : 0.13})" `
      + `stroke-width="${band ? 1.1 : 0.7}"/>`;
  }
  return out;
}

/**
 * 판 한 장을 만든다.
 * @param {object} track  registerTrack 로 등록된 곡
 * @param {object} [options]
 * @param {boolean} [options.sleeve]  뒤에 종이 재킷을 한 장 깔지 여부
 */
export function buildRecord(track, { sleeve = false } = {}) {
  const P = track.palette;
  serial += 1;
  const clip = `label-clip-${serial}`;
  const wedges = track.wedges
    .map(([from, to, color]) => `<path d="${wedge(from, to, R_LABEL - 1, R_OUT)}" fill="${color}"/>`)
    .join('');

  const el = document.createElement('div');
  el.className = 'record';
  el.style.setProperty('--label', track.label.paper);
  el.innerHTML = `
    <svg class="record-svg" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <clipPath id="${clip}"><circle cx="100" cy="100" r="${R_LABEL - 7}"/></clipPath>
      </defs>
      ${sleeve ? `<rect x="2" y="2" width="196" height="196" rx="4" fill="${track.label.paper}" stroke="${P.ink}" stroke-width="4"/>` : ''}
      <g class="record-spin">
        <circle cx="100" cy="100" r="${R_OUT}" fill="${P.ink}"/>
        ${wedges}
        ${grooves()}
        <circle cx="100" cy="100" r="${R_OUT}" fill="none" stroke="${P.ink}" stroke-width="4"/>
        <circle cx="100" cy="100" r="${R_LABEL}" fill="${P.paper}" stroke="${P.ink}" stroke-width="4.5"/>
        <g clip-path="url(#${clip})">
          <g transform="translate(${100 - (R_LABEL - 7)} ${100 - (R_LABEL - 7)}) scale(${((R_LABEL - 7) * 2) / 100})">
            ${labelArt(track.label.art, P)}
          </g>
        </g>
        <circle cx="100" cy="100" r="${R_LABEL - 7}" fill="none" stroke="${P.ink}" stroke-width="3"/>
        <circle cx="100" cy="100" r="4.6" fill="${P.ink}"/>
      </g>
    </svg>`;
  el.querySelector('.record-spin').dataset.spin = '';
  return el;
}
