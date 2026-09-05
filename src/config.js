export const TAU = Math.PI * 2;

export const clamp = (value, min, max) => (
  value < min ? min : value > max ? max : value
);

export const lerp = (from, to, amount) => from + (to - from) * amount;

/* 팝아트 인쇄판 — 다섯 색만 쓴다. 겹치지 않는 평면 색과 검정 윤곽. */
export const POP = Object.freeze({
  yellow: '#FFC20E',
  yellowDeep: '#F0A400',
  purple: '#8B22F0',
  purpleDeep: '#5E10AE',
  teal: '#12A98B',
  tealDeep: '#0B7A63',
  pink: '#F2A2AC',
  black: '#0D0D0D',
  white: '#FFFFFF',
});

export const EASE = Object.freeze({
  out: 'cubic-bezier(0.16, 1, 0.3, 1)',      // 멈춤이 긴 감속
  arc: 'cubic-bezier(0.34, 0.02, 0.2, 1)',   // 날아가는 판
  snap: 'cubic-bezier(0.2, 0.9, 0.25, 1)',   // 눌리는 버튼
  arm: 'cubic-bezier(0.5, 0, 0.2, 1)',       // 톤암 — 무겁게 들어가 조용히 내린다
});

export const TIMING = Object.freeze({
  shuffle: 340,   // 상자 안에서 초점이 옮겨 가는 시간
  pick: 700,      // 상자 → 무대 한가운데
  type: 520,      // 대각선 타이포가 들어오는 시간
  dock: 620,      // 무대 → 턴테이블 플래터
  armIn: 1050,    // 톤암이 판 위로 들어온다
  armOut: 820,    // 톤암이 바깥 거치대로 돌아온다
  drop: 260,      // 바늘이 홈에 내려앉는다
  spinUp: 1100,   // 33⅓ 까지 올라가는 시간
  lead: 5000,     // 재생 뒤 화면이 넘어가기까지의 리드인
  fade: 760,      // 무대가 사라지고 인터랙션이 올라온다
  back: 620,
});

export const RPM = 33 + 1 / 3;
export const REDUCED_MOTION = matchMedia('(prefers-reduced-motion: reduce)').matches;

export const DISPLAY_FONT = "'Archivo Black', 'Pretendard Variable', Pretendard, sans-serif";
export const MONO_FONT = "'Quantico', 'Pretendard Variable', Pretendard, sans-serif";

export const IDLE_POINTER = Object.freeze({ x: 0.5, y: 0.5, dx: 0, dy: 0, down: false });
