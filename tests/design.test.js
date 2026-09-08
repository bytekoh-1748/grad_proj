import test from 'node:test';
import assert from 'node:assert/strict';
import {EDITIONS,EDITION_IDS,resolveDesign,rgb,easeColour} from '../src/design-data.js';
import {POSTERS,MOBILE_POSTERS} from '../src/activity-motion.js';
import {corners} from '../src/floor-scene.js';

const luminance=hex=>rgb(hex).map(n=>n/255).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4).reduce((sum,n,i)=>sum+n*[.2126,.7152,.0722][i],0);
const contrast=(a,b)=>{const x=luminance(a),y=luminance(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05);};

test('all nine palettes supply complete, contrasting text and surface tokens',()=>{
  const tokens=Object.keys(EDITIONS.expressive.palettes[0].colors).sort();
  assert.deepEqual(EDITION_IDS,['expressive','liquid','bauhaus']);
  for(const edition of Object.values(EDITIONS)){
    assert.equal(edition.palettes.length,3);
    for(const palette of edition.palettes){
      assert.deepEqual(Object.keys(palette.colors).sort(),tokens);
      Object.values(palette.colors).forEach(hex=>assert.match(hex,/^#[0-9a-f]{6}$/i));
      for(const [ink,fill]of[['ink','wash'],['ink','wall-paper'],['hud-ink','hud-fill'],...['music','film','journal'].map(n=>[n+'-ink',n+'-fill'])]){
        assert.ok(contrast(palette.colors[ink],palette.colors[fill])>=4.5,`${edition.name} / ${palette.name}: ${ink} on ${fill}`);
      }
    }
  }
});

test('stored and URL designs are whitelisted; damaged preferences safely fall back',()=>{
  const fallback={edition:'expressive',palette:0,solid:false};
  for(const input of[undefined,null,false,17,'liquid',[],{}, {edition:'__proto__',palette:-1}])assert.deepEqual(resolveDesign(input),fallback);
  for(const n of['NaN',-2,3,1.5,Infinity])assert.equal(resolveDesign({edition:'gallery',palette:n}).palette,0);
  assert.deepEqual(resolveDesign({edition:'liquid',palette:'2',solid:true}),{edition:'liquid',palette:2,solid:true});
  assert.equal(resolveDesign({solid:'true'}).solid,false);
});

test('palette interruption continues from the current colour without frame-rate drift',()=>{
  const a=rgb('#1d2e59'),b=rgb('#e7ddc7'),c=rgb('#d9df63');
  const expected=easeColour(a,b,480);
  for(const dt of[8,16,32,48]){
    let value=a;for(let t=0;t<480;t+=dt)value=easeColour(value,b,dt);
    value.forEach((n,i)=>assert.ok(Math.abs(n-expected[i])<1e-9));
  }
  const middle=easeColour(a,b,120);
  assert.deepEqual(easeColour(middle,c,0),middle);
  assert.deepEqual(easeColour(middle,c,0,true),c);
  const next=easeColour(middle,c,16);
  next.forEach((n,i)=>assert.ok(n>=Math.min(middle[i],c[i])&&n<=Math.max(middle[i],c[i])));
});

test('home posters use the same floor axes and do not overlap in floor coordinates',()=>{
  for(const layout of[POSTERS,MOBILE_POSTERS]){
    const poses=Object.values(layout);
    for(const p of poses){
      assert.equal(p.angle,0);
      assert.ok(p.v>0);
      const q=corners(p.u,p.v,p.width,p.depth,p.angle);
      assert.equal(q[0][1],q[1][1]);assert.equal(q[1][0],q[2][0]);
    }
    for(let i=0;i<poses.length;i++)for(let j=i+1;j<poses.length;j++){
      const a=poses[i],b=poses[j];
      assert.ok(a.u+a.width<=b.u||b.u+b.width<=a.u||a.v+a.depth<=b.v||b.v+b.depth<=a.v);
    }
  }
});
