// A side-on paper world uses room X/Z for movement, and room Y for layer depth.
// Gravity acts down the artwork (+Z); the camera projects everything together.
export const GRAVITY = 10;
export const STEP = 1 / 120;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export function supportAt(platform, x) {
  const points = platform.points;
  if (x < points[0].x - .001 || x > points.at(-1).x + .001) return null;
  for (let i = 1; i < points.length; i++) {
    if (x <= points[i].x + .001) {
      const a = points[i - 1], b = points[i], t = clamp((x - a.x) / (b.x - a.x), 0, 1);
      return {x, z: a.z + (b.z - a.z) * t, y: a.y + (b.y - a.y) * t};
    }
  }
  return {...points.at(-1)};
}
export function jumpVelocity(from, to) {
  const rise = Math.max(0, from.z - to.z), vz = -Math.sqrt(2 * GRAVITY * (rise + .7));
  const duration = (-vz + Math.sqrt(vz * vz + 2 * GRAVITY * (to.z - from.z))) / GRAVITY;
  return {vx: (to.x - from.x) / duration, vz, duration};
}
export function reachable(from, to) {
  const dx = Math.abs(to.x - from.x), dz = to.z - from.z;
  if (dx > 4.5 || dz < -4.5 || dz > 4.7) return false;
  return Math.abs(jumpVelocity(from, to).vx) <= 5.2;
}

/** Physical graph edges use the same reach and launch constraints as the walker. */
export function ledgeTransfer(from,to){
  const a=from.points[0].x+.27,b=from.points.at(-1).x-.27,c=to.points[0].x+.27,d=to.points.at(-1).x-.27;
  const candidates=[];
  for(const x of [c,(c+d)/2,d,clamp((a+b)/2,c,d)]){
    const takeoffX=clamp(x,a,b),start=supportAt(from,takeoffX),target=supportAt(to,x);
    if(start&&target&&reachable(start,target))candidates.push({platform:to,takeoffX,target,cost:Math.hypot(target.x-start.x,target.z-start.z)+1});
  }
  return candidates.sort((a,b)=>a.cost-b.cost)[0]||null;
}
export function platformRoute(platforms,start,destination){
  if(!start)return null;
  const matches=p=>p.id===destination||p.objectId===destination;
  if(matches(start))return [start];
  const distances=new Map([[start.id,0]]),paths=new Map([[start.id,[start]]]),queue=[start],done=new Set();
  while(queue.length){
    queue.sort((a,b)=>distances.get(a.id)-distances.get(b.id));const from=queue.shift();if(done.has(from.id))continue;done.add(from.id);
    if(matches(from))return paths.get(from.id);
    for(const to of platforms){if(done.has(to.id)||to===from)continue;const edge=ledgeTransfer(from,to);if(!edge)continue;
      const cost=distances.get(from.id)+edge.cost;if(cost>=(distances.get(to.id)??Infinity))continue;
      distances.set(to.id,cost);paths.set(to.id,[...paths.get(from.id),to]);queue.push(to);
    }
  }
  return null;
}

export class PlatformWalker {
  constructor(seed = 0) { this.seed = seed; this.time = 0; this.distance = seed * .19; this.visits = new Map(); this.state = 'idle'; this.visible = false; this.accumulator = 0; }
  setPlatforms(platforms) {
    this.platforms = platforms;
    if (!platforms.length) { this.visible = false; return; }
    const previous = platforms.find(p => p.id === this.platform?.id);
    if (this.visible && previous && supportAt(previous, this.x) && this.state !== 'air') {
      this.platform = previous; Object.assign(this, supportAt(previous, this.x)); this.goal = null; this.state = 'idle'; this.elapsed = 0; return;
    }
    // Enter from the top of the big type, never from an arbitrary point in a widget.
    const platform = platforms.find(p => p.kind === 'type' && p.points.at(-1).x - p.points[0].x > 1.2) || platforms[0];
    this.platform = platform; Object.assign(this, supportAt(platform, platform.points[0].x + Math.min(.35, (platform.points.at(-1).x - platform.points[0].x) / 2)));
    this.direction = 1; this.vx = this.vz = 0; this.elapsed = 0; this.state = 'idle'; this.goal = null; this.visible = true; this.entered = this.time;
  }
  chooseGoal() {
    const current = this.platform, candidates = [];
    if(this.destinationId){
      const route=platformRoute(this.platforms,current,this.destinationId);this.routeBlocked=!route;
      if(route?.length>1)return ledgeTransfer(current,route[1]);
      const center=this.destinationX??(current.points[0].x+current.points.at(-1).x)/2;
      return {platform:current,takeoffX:clamp(center,current.points[0].x+.27,current.points.at(-1).x-.27)};
    }
    for (const platform of this.platforms) {
      if (platform === current) continue;
      const x = clamp(this.x + this.direction * (1.1 + this.seed * .13), platform.points[0].x + .27, platform.points.at(-1).x - .27), target = supportAt(platform, x);
      const takeoffX = clamp(x, current.points[0].x + .27, current.points.at(-1).x - .27), takeoff = supportAt(current, takeoffX);
      if (!reachable(takeoff, target)) continue;
      const recency = this.visits.get(platform.id) ?? -100;
      const score = Math.hypot(target.x - this.x, target.z - this.z) + Math.max(0, 35 - (this.time - recency)) * .35 + (Math.sign(target.x - this.x) !== this.direction ? 1 : 0);
      candidates.push({platform, target, takeoffX, score});
    }
    candidates.sort((a, b) => a.score - b.score);
    if (candidates.length) return candidates[0];
    return {platform: current, takeoffX: this.direction > 0 ? current.points.at(-1).x - .27 : current.points[0].x + .27};
  }
  update(dt) {
    if (!this.visible) return;
    this.accumulator += Math.min(.1, Math.max(0, dt));
    while (this.accumulator >= STEP) { this.step(STEP); this.accumulator -= STEP; }
  }
  step(dt) {
    this.time += dt; this.elapsed += dt;
    if (this.state === 'idle') {
      if (this.elapsed > 1.25 + this.seed * .13) { this.goal = this.chooseGoal(); this.direction = Math.sign(this.goal.takeoffX - this.x) || this.direction; this.state = 'walk'; this.elapsed = 0; }
    } else if (this.state === 'walk') {
      const gap = this.goal.takeoffX - this.x;
      const speed = Math.min(1.35 - this.seed * .08, Math.sqrt(Math.abs(gap) * 5));
      const dx = Math.sign(gap) * Math.min(Math.abs(gap), speed * dt);
      this.vx = dx / dt; this.distance += Math.abs(dx); this.x += dx;
      Object.assign(this, supportAt(this.platform, this.x));
      if (Math.abs(gap) < .018) { this.vx = 0; this.state = this.goal.platform === this.platform ? 'idle' : 'crouch'; this.elapsed = 0; if (this.state === 'idle') this.direction *= -1; }
    } else if (this.state === 'crouch') {
      if (this.elapsed > .32) {
        const launch = jumpVelocity(this, this.goal.target);
        this.vx = launch.vx; this.vz = launch.vz; this.flightDuration = launch.duration; this.flightStart = {x: this.x, z: this.z, y: this.y};
        this.direction = Math.sign(this.vx) || this.direction; this.state = 'air'; this.elapsed = 0;
      }
    } else if (this.state === 'air') {
      const old = {x: this.x, z: this.z, y: this.y};
      this.x += this.vx * dt; this.z += this.vz * dt + GRAVITY * dt * dt / 2; this.vz += GRAVITY * dt;
      const t = clamp(this.elapsed / this.flightDuration, 0, 1);
      this.y = this.flightStart.y + (this.goal.target.y - this.flightStart.y) * t;
      if (this.vz >= 0) {
        // Crossed surfaces, not a elapsed-time trigger, determine actual landing.
        const hits = this.platforms.map(platform => ({platform, point: supportAt(platform, this.x), previous: supportAt(platform, old.x)}))
          .filter(hit => hit.point && hit.previous && old.z <= hit.previous.z + .005 && this.z >= hit.point.z && (hit.platform.id === this.goal.platform.id || Math.abs(hit.point.y - this.y) < .35))
          .sort((a, b) => a.point.z - b.point.z);
        if (hits.length) {
          const hit = hits[0]; this.impact = Math.min(1, this.vz / 7); this.platform = hit.platform; Object.assign(this, hit.point); this.vx = this.vz = 0;
          this.visits.set(this.platform.id, this.time); this.state = 'land'; this.elapsed = 0;
        }
      }
      if (this.elapsed > this.flightDuration + 2) { this.visible = false; }
    } else if (this.state === 'land' && this.elapsed > .48) { this.state = 'idle'; this.elapsed = 0; }
  }
  get compression() { return this.state === 'crouch' ? Math.sin(Math.min(1, this.elapsed / .32) * Math.PI / 2) : this.state === 'land' ? Math.exp(-this.elapsed * 9) * (this.impact ?? 1) : 0; }
}
