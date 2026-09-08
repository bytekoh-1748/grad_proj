/** Bounded camera and ray/height-field intersection for the flat ROOM artworks. */
export function constrainView(view, baseHeight=24) {
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const target=[clamp(view.target?.[0]??0,-100,100),0,clamp(view.target?.[2]??0,-100,100)];
  const height=clamp(view.position?.[1]??baseHeight,baseHeight*.62,baseHeight*1.3);
  // A saved perspective view cannot turn this artwork into a free-orbit scene.
  return {position:[target[0]+clamp((view.position?.[0]??0)-target[0],-1.4,1.4),height,target[2]+clamp((view.position?.[2]??0)-target[2],-1.1,1.1)],target,fov:46};
}
/** Follow the shader's height trace when testing a cutout, so transparent margins
 * don't intercept a click meant for the background or another object. */
export function reliefContains(map, uv, eye, depth) {
  const clamp=n=>Math.max(0,Math.min(1,n));
  const sample=(data,u,v,channel)=>{
    const x=clamp(u)*(map.width-1),y=(1-clamp(v))*(map.height-1);
    const x0=Math.floor(x),y0=Math.floor(y),x1=Math.min(x0+1,map.width-1),y1=Math.min(y0+1,map.height-1);
    const read=(xx,yy)=>data[(yy*map.width+xx)*4+channel]/255;
    return (read(x0,y0)*(1-x+x0)+read(x1,y0)*(x-x0))*(1-y+y0)+(read(x0,y1)*(1-x+x0)+read(x1,y1)*(x-x0))*(y-y0);
  };
  const at=(u,v)=>1-sample(map.depth,u,v,0),layers=64-32*clamp(Math.abs(eye.z)),step=1/layers;
  const amount=depth*.24/layers/Math.max(Math.abs(eye.z),.2),dx=eye.x*amount,dy=eye.y*amount;
  let u=uv.x,v=uv.y,travel=0,surface=at(u,v);
  for(let i=0;i<64&&travel<surface;i++){u-=dx;v-=dy;travel+=step;surface=at(u,v);}
  const after=surface-travel,before=at(u+dx,v+dy)-travel+step,weight=clamp(after/Math.min(after-before,-.00001));
  u+=dx*weight;v+=dy*weight;
  return u>=0&&v>=0&&u<=1&&v<=1&&sample(map.alpha,u,v,3)>=.1;
}
export const reliefVertex=/* glsl */`
varying vec2 vUv;
varying vec3 vTangentView;
void main() {
  vUv = uv;
  vec4 p = modelViewMatrix * vec4(position, 1.0);
  vec3 eye = -p.xyz;
  vTangentView = vec3(dot(eye, normalize(mat3(modelViewMatrix) * vec3(1.,0.,0.))),
    dot(eye, normalize(mat3(modelViewMatrix) * vec3(0.,1.,0.))),
    dot(eye, normalize(mat3(modelViewMatrix) * vec3(0.,0.,1.))));
  gl_Position = projectionMatrix * p;
}`;
export const reliefFragment=/* glsl */`
uniform sampler2D uColor;
uniform sampler2D uHeight;
uniform float uDepth;
uniform float uLight;
uniform vec3 uTint;
uniform float uOpacity;
uniform vec2 uTexel;
varying vec2 vUv;
varying vec3 vTangentView;
float depthAt(vec2 uv) { return 1.0 - texture2D(uHeight, uv).r; }
vec2 intersectHeight(vec2 uv, vec3 eye) {
  // Reverse height-field tracing, followed by interpolation of the crossing.
  // This is POM, not a single height sample / simple texture translation.
  float layers = mix(64., 32., clamp(abs(eye.z), 0., 1.));
  float stepDepth = 1.0 / layers;
  vec2 delta = eye.xy / max(abs(eye.z), .2) * uDepth * .24 / layers;
  vec2 here = uv;
  float travel = 0.;
  float surface = depthAt(here);
  for (int i=0; i<64; i++) {
    if (travel >= surface) break;
    here -= delta;
    travel += stepDepth;
    surface = depthAt(here);
  }
  vec2 before = here + delta;
  float afterGap = surface - travel;
  float beforeGap = depthAt(before) - travel + stepDepth;
  float weight = clamp(afterGap / min(afterGap-beforeGap, -.00001), 0., 1.);
  return mix(here, before, weight);
}
void main() {
  vec2 ddx = dFdx(vUv), ddy = dFdy(vUv);
  vec2 uv = intersectHeight(vUv, normalize(vTangentView));
  if (uv.x<0. || uv.y<0. || uv.x>1. || uv.y>1.) discard;
  vec4 color = texture2DGradEXT(uColor, uv, ddx, ddy);
  if (color.a < .1) discard;
  float h = texture2D(uHeight, uv).r;
  float dx = texture2D(uHeight,uv+vec2(uTexel.x,0.)).r - h;
  float dy = texture2D(uHeight,uv+vec2(0.,uTexel.y)).r - h;
  float reliefLight = clamp(1. + (dy-dx)*uDepth*.6, .72, 1.16);
  gl_FragColor = vec4(color.rgb * reliefLight * uLight * mix(vec3(1.), uTint, .18), color.a * uOpacity);
  #include <colorspace_fragment>
}`;
