import {supportAt} from './platform-motion.js';

export const FIGURE_WIDTH = 1.25;
export const FIGURE_HEIGHT = FIGURE_WIDTH * 4 / 3;
export const INK = '#161719', PAPER = '#ecebd7';
const ACCENTS = ['#edff52', '#ff7353', '#c2b3ed', '#ecebd7'];
const PX = 192 / FIGURE_WIDTH;

// Joint coordinates are measured from the planted foot, in the print's plane.
// The same cutout is used outdoors and inside the windows.
export function drawResident(canvas, actor, pose = {}) {
  const ctx = canvas.getContext('2d'), mode = pose.mode || actor.state, phase = actor.distance / .8;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save(); ctx.translate(96, 246); ctx.scale(pose.direction ?? actor.direction, 1);
  const crouch = actor.compression || 0, walking = mode === 'walk', air = mode === 'air';
  const stride = walking ? Math.sin(phase * Math.PI * 2) : 0;
  const bob = walking ? Math.abs(stride) * 3 : Math.sin(actor.time * 1.7) * .65;
  let hip = [0, -66 + crouch * 25 - bob], shoulder = [walking ? 5 : 0, hip[1] - 45];
  let head = [shoulder[0] + 1, shoulder[1] - 22];
  const foot = offset => {
    const p = (phase + offset) % 1, swing = p > .6, t = (p - .6) / .4;
    const x = walking ? (swing ? -.24 + .48 * t * t * (3 - 2 * t) : .24 - .48 * p / .6) : (offset ? .11 : -.1);
    const surface = actor.platform && !pose.mode ? supportAt(actor.platform, actor.x + x * actor.direction) : null;
    return [x * PX, ((surface?.z ?? actor.z) - actor.z - (walking && swing ? Math.sin(t * Math.PI) * .14 : 0)) * PX];
  };
  let knees = [[-13 + stride * 13 - crouch * 14, -33 + crouch * 8], [13 - stride * 14 + crouch * 16, -32 + crouch * 10]];
  let feet = air ? [[-24, -24], [28, -8]] : [foot(0), foot(.5)];
  let elbows = [[-20, shoulder[1] + (air ? -10 : 22) + stride * 9], [20, shoulder[1] + (air ? -3 : 23) - stride * 9]];
  let hands = [[-26 - stride * 9, shoulder[1] + (air ? -28 : 42)], [29 + stride * 10, shoulder[1] + (air ? -22 : 37)]];
  const standing={hip,shoulder,head,knees,feet,elbows,hands};
  if (mode === 'recline') {
    hip = [-23, -19]; shoulder = [-57, -43]; head = [-69, -63];
    knees = [[3, -20], [11, -14]]; feet = [[28, -3], [37, 0]];
    elbows = [[-81, -45], [-41, -68]]; hands = [[-70, -69], [-66, -69]];
  } else if (mode === 'read') {
    hip = [-10, -46]; shoulder = [-16, -94]; head = [-8, -115];
    knees = [[23, -43], [3, -33]]; feet = [[29, 1 + Math.sin(actor.time * 2.3) * 5], [9, -3]];
    elbows = [[-30, -67], [10, -69]]; hands = [[5, -72], [32, -73]];
  } else if (mode === 'dance') {
    const beat = Math.sin(actor.time * 3.3);
    hip = [beat * 10, -69 - Math.abs(beat) * 6]; shoulder = [-beat * 10, hip[1] - 45]; head = [shoulder[0] + 4, shoulder[1] - 22];
    knees = [[-21, -34], [22 + beat * 8, -38]]; feet = [[-23, -Math.max(0, beat) * 14], [27, Math.min(0, beat) * 14]];
    elbows = [[-34, -109], [35, -132]]; hands = [[-52, -94 + beat * 13], [29, -157 + beat * 9]];
  } else if (mode === 'pull' || mode === 'climb') {
    const fold=mode==='climb'&&pose.hand?Math.max(0,Math.min(1,(pose.hand[1]+130)/130)):0;
    hip = [-8, -65+30*fold]; shoulder = [-7, -106+48*fold]; head = [-11, shoulder[1]-22];
    knees = [[-27, -30+14*fold], [12, -36+18*fold]]; feet = [[-19, -5], [21, -10]];
    hands = pose.hand ? [[pose.hand[0] - 12, pose.hand[1] + 3], pose.hand] : [[18, -153], [29, -153]];
    elbows = [[-28, (shoulder[1] + hands[0][1]) / 2], [24, (shoulder[1] + hands[1][1]) / 2]];
  }
  if(pose.blend !== undefined) {
    const mix=(a,b)=>a.map((n,i)=>n+(b[i]-n)*pose.blend),pairs=(a,b)=>a.map((p,i)=>mix(p,b[i]));
    hip=mix(standing.hip,hip);shoulder=mix(standing.shoulder,shoulder);head=mix(standing.head,head);
    knees=pairs(standing.knees,knees);feet=pairs(standing.feet,feet);elbows=pairs(standing.elbows,elbows);hands=pairs(standing.hands,hands);
  }
  const stroke = (points, width, color = INK) => {
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath();
    points.forEach(([x,y],i) => i ? ctx.lineTo(x,y) : ctx.moveTo(x,y)); ctx.stroke();
  };
  const polygon = (points, fill) => { ctx.fillStyle = fill; ctx.beginPath(); points.forEach(([x,y],i) => i ? ctx.lineTo(x,y) : ctx.moveTo(x,y)); ctx.closePath(); ctx.fill(); };
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  // A slight paper keyline separates the ink from dark records and blue windows.
  for (let i = 0; i < 2; i++) {
    stroke([hip, knees[i], feet[i]], 11, PAPER);
    stroke([shoulder, elbows[i], hands[i]], 8, PAPER);
  }
  for (let i = 0; i < 2; i++) {
    stroke([hip, knees[i], feet[i]], i ? 7.5 : 8.5);
    stroke([feet[i], [feet[i][0] + 7, feet[i][1]]], 5);
    stroke([shoulder, elbows[i], hands[i]], 4.5);
  }
  const jacket = [[shoulder[0]-12,shoulder[1]-2],[shoulder[0]+12,shoulder[1]-2],[hip[0]+14,hip[1]+6],[hip[0]-17,hip[1]+4]];
  ctx.strokeStyle = PAPER; ctx.lineWidth = 1.6; polygon(jacket, INK); ctx.stroke();
  // Slanted hem, narrow collar, cap / beret / scarf: little editorial silhouettes.
  const accent = ACCENTS[actor.seed % ACCENTS.length];
  stroke([[shoulder[0]-7,shoulder[1]+6],[shoulder[0]+7,shoulder[1]+8]], 3.5, accent);
  if (actor.seed === 1) polygon([[shoulder[0]+6,shoulder[1]+5],[shoulder[0]+24+Math.sin(actor.time*3)*4,shoulder[1]+13],[shoulder[0]+12,shoulder[1]+17]], accent);
  ctx.fillStyle = INK; ctx.strokeStyle = PAPER; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.ellipse(head[0],head[1],10,13,-.18,0,Math.PI*2); ctx.fill(); ctx.stroke();
  if (actor.seed % 2 === 0) {
    polygon([[head[0]-12,head[1]-7],[head[0]-9,head[1]-16],[head[0]+8,head[1]-15],[head[0]+12,head[1]-7]], INK);
    stroke([[head[0]-12,head[1]-7],[head[0]+19,head[1]-7]], 3, INK);
  } else {
    ctx.beginPath(); ctx.ellipse(head[0]-2,head[1]-11,14,5,-.18,0,Math.PI*2); ctx.fill();
  }
  stroke([[head[0]+1,head[1]-2],[head[0]+10,head[1]-1]], 2, mode === 'recline' ? accent : PAPER);
  if (mode === 'read') {
    polygon([[-1,-84],[15,-80],[35,-88],[35,-66],[16,-61],[-1,-67]], PAPER);
    stroke([[-1,-84],[15,-80],[35,-88]], 1.6); stroke([[15,-80],[16,-61]], 1.5);
    stroke([[21,-77],[30,-80]], 1, INK); stroke([[21,-72],[30,-75]], 1, INK);
  }
  ctx.restore();
}
