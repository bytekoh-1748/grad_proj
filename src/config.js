export const TAU = Math.PI * 2;

export const clamp = (value, min, max) => (
  value < min ? min : value > max ? max : value
);

export const lerp = (from, to, amount) => from + (to - from) * amount;

export const EASE = Object.freeze({
  out: 'cubic-bezier(0.16, 1, 0.3, 1)',      // 멈춤이 긴 감속
  arc: 'cubic-bezier(0.34, 0.02, 0.2, 1)',   // 날아가는 판
  snap: 'cubic-bezier(0.2, 0.9, 0.25, 1)',   // 눌리는 버튼
  arm: 'cubic-bezier(0.5, 0, 0.2, 1)',       // 톤암 — 무겁게 들어가 조용히 내린다
});

export const TIMING = Object.freeze({
  shuffle: 540,   // 상자 안에서 초점이 옮겨 가는 시간
  pick: 1100,     // 상자 → 무대 한가운데
  type: 1100,     // 타이포가 서서히 드러나는 시간
  dock: 1000,     // 무대 → 턴테이블 플래터
  armIn: 1050,    // 톤암이 판 위로 들어온다
  armOut: 820,    // 톤암이 바깥 거치대로 돌아온다
  drop: 260,      // 바늘이 홈에 내려앉는다
  spinUp: 1100,   // 33⅓ 까지 올라가는 시간
  lead: 7200,     // 바늘이 앉는 순간부터 장면이 완성될 때까지
  fade: 2600,     // 장면에서 방으로 천천히 돌아오는 시간
  back: 950,
});

export const RPM = 33 + 1 / 3;
export const REDUCED_MOTION = matchMedia('(prefers-reduced-motion: reduce)').matches;

export const DISPLAY_FONT = "'Archivo Black', 'Pretendard Variable', Pretendard, sans-serif";
export const MONO_FONT = "'Quantico', 'Pretendard Variable', Pretendard, sans-serif";

export const IDLE_POINTER = Object.freeze({ x: 0.5, y: 0.5, dx: 0, dy: 0, down: false });
