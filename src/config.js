export const TAU = Math.PI * 2;

export const clamp = (value, min, max) => (
  value < min ? min : value > max ? max : value
);

export const lerp = (from, to, amount) => from + (to - from) * amount;

export const EASE = Object.freeze({
  out: 'cubic-bezier(0.23, 1, 0.32, 1)',
  drawer: 'cubic-bezier(0.32, 0.72, 0, 1)',
});

export const TIMING = Object.freeze({
  flight: 460,
  seat: 300,
  power: 180,
  boot: 560,
  zoom: 640,
  fade: 200,
  out: 560,
});

export const PLUCK_EASE = 'cubic-bezier(0.45, 0, 0.2, 1)';
export const REDUCED_MOTION = matchMedia('(prefers-reduced-motion: reduce)').matches;

export const FACE_FONT = "'Quantico', 'Pretendard Variable', Pretendard, sans-serif";

export const INK = Object.freeze({
  ultramarine: '#263E99',
  cobalt: '#2148B8',
  terracotta: '#C65F38',
  botanicalGreen: '#008A4B',
  signalRed: '#C83232',
  mintGreen: '#5EB783',
  warmCharcoal: '#302D2E',
  cyan: '#159DDA',
  brickRed: '#B64032',
});

export const PAPER = Object.freeze({
  white: '#FAFAF7',
  gray: '#E9E9E5',
  beige: '#F5F1E8',
});

export const IDLE_POINTER = Object.freeze({
  x: 0.5,
  y: 0.5,
  dx: 0,
  dy: 0,
  down: false,
});

export const FAN = Object.freeze({
  gapNear: 0.98,
  gapFar: 0.34,
  yaw: 22,
  base: 0.95,
  peak: 2.6,
  dim: 0.45,
  shade: 0.06,
});
