import test from 'node:test';
import assert from 'node:assert/strict';
import {resizeWindow} from '../src/editor/window-geometry.js';
const box={x:220,y:140,w:600,h:420},bounds={width:1440,height:900,minWidth:300,minHeight:240};
test('dragging a side changes only that side, with its opposite anchored',()=>{
  const right=resizeWindow(box,'e',120,70,bounds);assert.deepEqual(right,{...box,w:720});
  const left=resizeWindow(box,'w',80,70,bounds);assert.equal(left.x,300);assert.equal(left.x+left.w,820);assert.equal(left.y,box.y);assert.equal(left.h,box.h);
  const top=resizeWindow(box,'n',90,60,bounds);assert.equal(top.y,200);assert.equal(top.y+top.h,560);assert.equal(top.w,box.w);
  assert.deepEqual(resizeWindow(box,'s',90,60,bounds),{...box,h:480});
});
test('all corners preserve their opposite corner',()=>{
  for(const corner of ['nw','ne','sw','se']){const next=resizeWindow(box,corner,35,26,bounds);assert.equal(corner.includes('w')?next.x+next.w:next.x,corner.includes('w')?box.x+box.w:box.x);assert.equal(corner.includes('n')?next.y+next.h:next.y,corner.includes('n')?box.y+box.h:box.y);}
});
test('minimum sizes and viewport limits stop the dragged edge without moving the window',()=>{
  const small=resizeWindow(box,'se',-2000,-2000,bounds);assert.deepEqual(small,{...box,w:300,h:240});
  const large=resizeWindow(box,'se',2000,2000,bounds);assert.equal(large.x,box.x);assert.equal(large.y,box.y);assert.equal(large.x+large.w,1428);assert.equal(large.y+large.h,814);
  const topLeft=resizeWindow(box,'nw',-2000,-2000,bounds);assert.equal(topLeft.x,12);assert.equal(topLeft.y,12);assert.equal(topLeft.x+topLeft.w,820);assert.equal(topLeft.y+topLeft.h,560);
});
test('a pointer returning from a limit restores the original geometry with no drift',()=>{
  resizeWindow(box,'nw',5000,5000,bounds);assert.deepEqual(resizeWindow(box,'nw',0,0,bounds),box);
  const fitted={x:12,y:12,w:500,h:200};const tiny=resizeWindow(fitted,'se',300,300,{width:524,height:298,minWidth:560,minHeight:360});assert.deepEqual(tiny,fitted);
});
