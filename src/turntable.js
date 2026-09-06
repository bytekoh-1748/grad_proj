/* ==================================================================
 * 턴테이블 — 760 x 560 상자의 원본 도안. vector-room.js가 선을 샘플링하고
 * 각 구도의 네 모서리에 맞춰 SVG path 좌표를 연속 변형한다.
 *
 *   플래터(250,250)  ·  톤암 축(600,110)  ·  피치 페이더(오른쪽 앞 모서리)
 *
 * 판은 별도의 SVG 원반으로 이 그림 위에 얹힌다. 그래서 그림은
 * 바닥(.deck-base)과 톤암(.deck-arm) 두 장으로 나뉜다. 판은 그 사이에
 * 들어간다. viewBox 가 같으니 두 장의 좌표는 그대로 맞물린다.
 * ================================================================ */

export const DECK = Object.freeze({
  viewBox: '0 0 760 560',
  width: 760,
  height: 560,
  /* 판이 앉는 자리. r 은 판의 반지름이고, 그 바깥으로 매트가 조금 남는다. */
  platter: Object.freeze({ x: 250, y: 250, r: 176 }),
  pivot: Object.freeze({ x: 600, y: 110 }),
  /* 그려 둔 팔의 바늘 끝은 축에서 93.7도 방향, 339 만큼 떨어져 있다.
     아래 값은 거기서 잰 회전각이다.
       rest   앞쪽 거치대 위 (87.8도)
       lead   판의 첫 홈 — 플래터 중심에서 163 (132.6도)
       runOut 마지막 홈 — 중심에서 88 (145.5도)
     페이더와 단추는 이 부채꼴 바깥에 놓여 팔이 지나가지 않는다. */
  arm: Object.freeze({ rest: -5.7, lead: 38.9, runOut: 51.8 }),
});

const K = 'var(--ink)';

/* 플래터 밑판 — 판이 없을 때 보이는 검은 고무 매트 */
function platterWell() {
  let rings = '';
  for (let r = 176; r > 70; r -= 13) {
    rings += `<circle cx="250" cy="250" r="${r}" fill="none" stroke="var(--secondary-deep)" stroke-width="2" opacity="0.5"/>`;
  }
  return `
    <circle cx="250" cy="250" r="196" fill="var(--secondary-deep)" stroke="${K}" stroke-width="8"/>
    <circle cx="250" cy="250" r="186" fill="#101010" stroke="${K}" stroke-width="6"/>
    ${rings}
    <circle cx="250" cy="250" r="34" fill="var(--primary-deep)" stroke="${K}" stroke-width="5"/>
`;
}

/* 피치 페이더 — 보라 홈 안에 노란 눈금자와 회색 손잡이 */
function pitchFader() {
  let ticks = '';
  for (let i = 0; i <= 10; i += 1) {
    const y = 300 + i * 15.8;
    const long = i === 5;
    ticks += `<rect x="${long ? 678 : 685}" y="${y.toFixed(1)}" width="${long ? 32 : 18}" height="3.4" rx="1.7" fill="${K}" opacity="${long ? 1 : 0.72}"/>`;
  }
  return `
    <g class="tt-fader">
      <rect x="656" y="270" width="80" height="220" rx="20" fill="var(--primary)" stroke="${K}" stroke-width="7"/>
      <rect x="672" y="288" width="48" height="184" rx="12" fill="var(--accent)" stroke="${K}" stroke-width="5"/>
      ${ticks}
      <g class="tt-knob">
        <rect x="660" y="362" width="72" height="32" rx="8" fill="#D9D9D4" stroke="${K}" stroke-width="6"/>
        <rect x="660" y="373" width="72" height="9" fill="${K}" opacity="0.35"/>
      </g>
    </g>`;
}

/* 정지 / 속도 버튼 — 앞쪽 왼편에 놓인 노란 단추 두 개 */
function deckButtons() {
  return `
    <g class="tt-dots">
      <circle cx="96" cy="486" r="30" fill="var(--accent)" stroke="${K}" stroke-width="7"/>
      <circle cx="96" cy="486" r="13" fill="var(--primary)" stroke="${K}" stroke-width="4"/>
      <circle cx="196" cy="512" r="20" fill="var(--accent)" stroke="${K}" stroke-width="6"/>
      <rect x="286" y="486" width="112" height="34" rx="17" fill="var(--primary)" stroke="${K}" stroke-width="6"/>
      <circle cx="312" cy="503" r="8" fill="var(--accent)"/>
      <circle cx="372" cy="503" r="8" fill="var(--secondary)"/>
    </g>`;
}

/* 톤암 거치대 — 팔이 쉬는 자리 */
function armRest() {
  return `
    <g class="tt-rest">
      <rect x="586" y="400" width="54" height="94" rx="16" fill="var(--primary)" stroke="${K}" stroke-width="7"/>
      <rect x="598" y="416" width="30" height="20" rx="6" fill="var(--accent)" stroke="${K}" stroke-width="4"/>
    </g>`;
}

export function deckBase() {
  return `
  <svg class="deck-svg deck-base" viewBox="${DECK.viewBox}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <!-- 몸통 옆면 — 아래로 밀어 둔 보라 판이 두께가 된다 -->
    <rect x="14" y="42" width="726" height="512" rx="52" fill="var(--primary-deep)" stroke="${K}" stroke-width="9"/>
    <rect x="20" y="20" width="720" height="514" rx="50" fill="var(--secondary)" stroke="${K}" stroke-width="9"/>
    <rect x="42" y="42" width="676" height="470" rx="38" fill="none" stroke="${K}" stroke-width="3.5" opacity="0.45"/>
    ${platterWell()}
    ${pitchFader()}
    ${armRest()}
    ${deckButtons()}
    <!-- 축 받침 — 톤암이 이 위에서 돈다 -->
    <circle cx="600" cy="110" r="62" fill="var(--secondary)" stroke="${K}" stroke-width="7"/>
    <circle cx="600" cy="110" r="44" fill="var(--primary)" stroke="${K}" stroke-width="6"/>
  </svg>`;
}

export function deckArm() {
  return `
  <svg class="deck-svg deck-arm" viewBox="${DECK.viewBox}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <g class="tt-arm" id="tonearm">
      <!-- 평형추 — 축 뒤쪽으로 뻗은 짧은 팔 -->
      <rect x="588" y="24" width="24" height="70" rx="10" fill="${K}"/>
      <ellipse cx="600" cy="30" rx="40" ry="30" fill="var(--soft)" stroke="${K}" stroke-width="7"/>
      <ellipse cx="600" cy="30" rx="18" ry="12" fill="var(--primary)" stroke="${K}" stroke-width="4"/>

      <!-- 팔 — 축에서 아래로 길게 뻗다가 헤드셸 앞에서 한 번 꺾인다 -->
      <path d="M600 110 L600 366 Q600 400 586 416 L578 426"
            fill="none" stroke="${K}" stroke-width="25" stroke-linecap="round"/>
      <path d="M600 110 L600 366 Q600 400 586 416 L578 426"
            fill="none" stroke="var(--primary)" stroke-width="14" stroke-linecap="round"/>

      <!-- 헤드셸 + 카트리지 + 바늘. 바늘 끝은 축에서 93.7도 방향에 놓인다 -->
      <g transform="rotate(-14 578 426)">
        <rect x="542" y="402" width="72" height="46" rx="12" fill="var(--primary)" stroke="${K}" stroke-width="7"/>
        <rect x="555" y="440" width="46" height="24" rx="6" fill="var(--accent)" stroke="${K}" stroke-width="6"/>
        <path d="M578 462 L576 476" stroke="${K}" stroke-width="7" stroke-linecap="round"/>
        <circle cx="576" cy="479" r="6" fill="var(--accent)" stroke="${K}" stroke-width="4"/>
      </g>

      <!-- 축머리 -->
      <circle cx="600" cy="110" r="30" fill="var(--accent)" stroke="${K}" stroke-width="7"/>
      <circle cx="600" cy="110" r="10" fill="${K}"/>
    </g>
  </svg>`;
}
