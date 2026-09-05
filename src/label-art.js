import { POP } from './config.js';

/* ==================================================================
 * 레이블 그림 — 판 한가운데 붙는 동그란 종이 한 장.
 *
 * 모든 그림은 100 x 100 상자 안에서 그리고, 부르는 쪽에서 반지름 50의
 * 원으로 잘라 붙인다. 색은 팝아트 다섯 판만 쓰고, 윤곽은 항상 검정이다.
 * ================================================================ */

const K = POP.black;

/* 옆얼굴 하나. 0..100 상자 안에서 오른쪽을 본다. 레이블과 인터랙션이 함께 쓴다. */
export const FACE_PROFILE = 'M20 100V82C6 78 2 60 6 44 10 26 26 12 46 12 64 12 76 22 78 36L64 48 76 54 64 60 68 70 56 74 58 86 46 88V100Z';

/* 도시의 밤 — 보라 하늘, 흰 달, 검은 건물, 노란 창 */
function skyline() {
  let windows = '';
  const grid = [
    [30, 62], [38, 62], [46, 62], [30, 70], [46, 70], [38, 78], [30, 78],
    [58, 58], [66, 58], [58, 66], [66, 66], [58, 74], [66, 74], [74, 62], [74, 74],
  ];
  grid.forEach(([x, y]) => {
    windows += `<rect x="${x}" y="${y}" width="5" height="6" fill="${POP.yellow}"/>`;
  });
  return `
    <rect x="0" y="0" width="100" height="100" fill="${POP.purple}"/>
    <circle cx="63" cy="30" r="13" fill="${POP.white}"/>
    <rect x="0" y="86" width="100" height="14" fill="${POP.teal}"/>
    <path d="M4 100V64h14V52h12v12h10V44h14v20h12V56h12v14h10v30Z" fill="${K}"/>
    <path d="M52 44h14v56H52Z" fill="${K}"/>
    ${windows}
    <rect x="63" y="40" width="2.5" height="10" fill="${POP.yellow}"/>
    <circle cx="64.2" cy="39" r="2.4" fill="${K}"/>`;
}

/* 눈 — 노란 바탕, 청록 홍채, 보라 속눈썹 */
function eye() {
  let lashes = '';
  for (let i = 0; i < 7; i += 1) {
    const a = (-62 + i * 20.5) * (Math.PI / 180);
    const x = 50 + Math.cos(a) * 34;
    const y = 44 + Math.sin(a) * 30;
    lashes += `<path d="M${x.toFixed(1)} ${y.toFixed(1)} l${(Math.cos(a) * 13).toFixed(1)} ${(Math.sin(a) * 13).toFixed(1)}"
      stroke="${POP.purple}" stroke-width="6" stroke-linecap="round" fill="none"/>`;
  }
  return `
    <rect x="0" y="0" width="100" height="100" fill="${POP.yellow}"/>
    ${lashes}
    <path d="M6 54c14-24 30-34 44-34s30 10 44 34c-14 24-30 34-44 34S20 78 6 54Z" fill="${POP.white}" stroke="${K}" stroke-width="4"/>
    <circle cx="50" cy="54" r="19" fill="${POP.teal}" stroke="${K}" stroke-width="4"/>
    <circle cx="50" cy="54" r="8" fill="${K}"/>
    <circle cx="44" cy="47" r="3.6" fill="${POP.white}"/>
    <path d="M14 30c10-12 22-18 36-18" stroke="${POP.purple}" stroke-width="6" stroke-linecap="round" fill="none"/>`;
}

/* 마주 본 옆얼굴 — 보라와 청록이 노란 틈을 사이에 두고 겹친다 */
function profiles() {
  return `
    <rect x="0" y="0" width="100" height="100" fill="${POP.teal}"/>
    <rect x="50" y="0" width="50" height="100" fill="${POP.purple}"/>
    <g transform="translate(-16 8) scale(0.92)"><path d="${FACE_PROFILE}" fill="${POP.purple}" stroke="${K}" stroke-width="3.5"/></g>
    <g transform="translate(116 8) scale(-0.92 0.92)"><path d="${FACE_PROFILE}" fill="${POP.yellow}" stroke="${K}" stroke-width="3.5"/></g>
    <path d="M50 4v92" stroke="${K}" stroke-width="3"/>`;
}

/* 해 — 보라 광선이 노란 바탕을 가른다 */
function sunburst() {
  let rays = '';
  for (let i = 0; i < 12; i += 1) {
    const a = (i * 30) - 90;
    rays += `<path d="M50 50 L${(50 + Math.cos((a - 6) * Math.PI / 180) * 78).toFixed(1)} ${(50 + Math.sin((a - 6) * Math.PI / 180) * 78).toFixed(1)}
      L${(50 + Math.cos((a + 6) * Math.PI / 180) * 78).toFixed(1)} ${(50 + Math.sin((a + 6) * Math.PI / 180) * 78).toFixed(1)}Z"
      fill="${i % 2 ? POP.purple : POP.teal}"/>`;
  }
  return `
    <rect x="0" y="0" width="100" height="100" fill="${POP.yellow}"/>
    ${rays}
    <circle cx="50" cy="50" r="24" fill="${POP.white}" stroke="${K}" stroke-width="4"/>
    <circle cx="50" cy="50" r="14" fill="${POP.yellow}" stroke="${K}" stroke-width="3.5"/>`;
}

/* 번개 — 잘라 붙인 종이 한 장 */
function bolt() {
  return `
    <rect x="0" y="0" width="100" height="100" fill="${POP.purple}"/>
    <path d="M0 0h50v100H0Z" fill="${POP.teal}"/>
    <path d="M0 62 L100 38" stroke="${K}" stroke-width="3.5"/>
    <path d="M58 4 L20 56h22l-12 42 44-56H50Z" fill="${POP.yellow}" stroke="${K}" stroke-width="4.5" stroke-linejoin="round"/>`;
}

/* 꽃 — 다섯 장의 꽃잎이 청록 위에서 벌어진다 */
function bloom() {
  let petals = '';
  for (let i = 0; i < 6; i += 1) {
    petals += `<ellipse cx="50" cy="22" rx="13" ry="24" fill="${i % 2 ? POP.purple : POP.white}"
      stroke="${K}" stroke-width="3.5" transform="rotate(${i * 60} 50 50)"/>`;
  }
  return `
    <rect x="0" y="0" width="100" height="100" fill="${POP.teal}"/>
    <path d="M0 74h100v26H0Z" fill="${POP.yellow}"/>
    ${petals}
    <circle cx="50" cy="50" r="12" fill="${POP.yellow}" stroke="${K}" stroke-width="3.5"/>`;
}

const ART = { skyline, eye, profiles, sunburst, bolt, bloom };

export function labelArt(name) {
  const draw = ART[name];
  if (!draw) throw new Error(`Unknown label art: ${name}`);
  return draw();
}

export const LABEL_ART_NAMES = Object.freeze(Object.keys(ART));
