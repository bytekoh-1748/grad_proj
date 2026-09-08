export const mix = (a, b, t) => a + (b - a) * t;
export const smooth = t => t * t * (3 - 2 * t);

// Analytic critically damped spring: retarget from the live position AND velocity.
// A second click or drag never restarts a contour from an old keyframe.
export function spring(value, velocity, target, dt, omega = .0105) {
  const offset = value - target, decay = Math.exp(-omega * dt);
  const impulse = velocity + omega * offset;
  return [target + (offset + impulse * dt) * decay, (velocity - omega * impulse * dt) * decay];
}

export class ContourState {
  constructor(initial, reduced = false) {
    this.value = structuredClone(initial);
    this.target = structuredClone(initial);
    this.velocity = Object.fromEntries(Object.entries(initial).map(([key, values]) => [key, values.map(() => 0)]));
    this.reduced = reduced;
  }
  to(target) { this.target = structuredClone(target); }
  step(dt) {
    let moving = false;
    this.changed = false;
    for (const key of Object.keys(this.value)) {
      this.value[key].forEach((value, i) => {
        const goal = this.target[key][i];
        const next = this.reduced ? [goal, 0] : spring(value, this.velocity[key][i], goal, dt);
        if (Math.abs(next[0] - goal) < .015 && Math.abs(next[1]) < .00015) { next[0] = goal; next[1] = 0; }
        this.value[key][i] = next[0];
        this.changed ||= next[0] !== value;
        this.velocity[key][i] = next[1];
        moving ||= next[0] !== goal;
      });
    }
    return moving;
  }
}

// A 2D projective mapping between four drawn corners; no world or camera exists.
export function homography(q, width = 760, height = 560) {
  const [x0,y0,x1,y1,x2,y2,x3,y3] = q;
  const dx1=x1-x2, dx2=x3-x2, dx3=x0-x1+x2-x3;
  const dy1=y1-y2, dy2=y3-y2, dy3=y0-y1+y2-y3;
  const denominator=dx1*dy2-dx2*dy1;
  if (Math.abs(denominator) < 1e-8) throw new RangeError('Collapsed vector plane');
  const g=(dx3*dy2-dx2*dy3)/denominator, h=(dx1*dy3-dx3*dy1)/denominator;
  return [(x1-x0+g*x1)/width,(y1-y0+g*y1)/width,(x3-x0+h*x3)/height,(y3-y0+h*y3)/height,x0,y0,g/width,h/height];
}
export function project(h, x, y) {
  const w = h[6]*x+h[7]*y+1;
  return [(h[0]*x+h[2]*y+h[4])/w,(h[1]*x+h[3]*y+h[5])/w];
}
export function affineAt(h, x, y, radius) {
  const p=project(h,x,y), u=project(h,x+radius,y), v=project(h,x,y+radius);
  return [u[0]-p[0],u[1]-p[1],v[0]-p[0],v[1]-p[1],...p];
}
export function multiply(a,b) {
  return [a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]];
}
export function inversePoint(m,x,y) {
  const det=m[0]*m[3]-m[1]*m[2], dx=x-m[4],dy=y-m[5];
  return [(m[3]*dx-m[2]*dy)/det,(-m[1]*dx+m[0]*dy)/det];
}
export const matrixText = m => `matrix(${m.map(n=>Number(n.toFixed(5))).join(' ')})`;
