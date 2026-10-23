import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {facing8,animationCell,type ActorPose} from '../src/animation';
import {actorManifest} from '../src/art-manifest';

test('eight movement directions select eight authored views instead of rotating one image',()=>{
 const views=[{x:-1,y:0},{x:-1,y:-1},{x:0,y:-1},{x:1,y:-1},{x:1,y:0},{x:1,y:1},{x:0,y:1},{x:-1,y:1}];assert.deepEqual(views.map(v=>facing8(v)),[0,1,2,3,4,5,6,7]);assert.equal(facing8({x:0,y:0},3),3);
});
test('running cycles through eight steps while hurt and death animations end on their last frame',()=>{
 const clip={frames:8,duration:.533};const frames=new Set(Array.from({length:8},(_,i)=>animationCell('run',2,i*.533/8+.00001,clip)));assert.equal(frames.size,8);assert.equal(animationCell('run',2,.534,clip),'run-2-0');assert.equal(animationCell('die',6,10,{frames:6,duration:.8}),'die-6-5');assert.equal(animationCell('hit',6,10,{frames:2,duration:.133}),'hit-6-1');
});
test('every published actor has all eight directions and stable trim anchors in all animation clips',()=>{
 for(const[key,actor]of Object.entries(actorManifest)){
  const atlas=JSON.parse(readFileSync(new URL('../public/assets/flare/'+actor.atlas,import.meta.url),'utf-8'));
  const image=readFileSync(new URL('../public/assets/flare/'+actor.file,import.meta.url));const width=image.readUInt32BE(16),height=image.readUInt32BE(20);let sourceSize='';let frames=0;
  for(const[pose,clip]of Object.entries(actor.clips))for(let dir=0;dir<8;dir++)for(let frame=0;frame<clip.frames;frame++){
   const cell=atlas.frames[`${pose}-${dir}-${frame}`];assert.ok(cell,`${key} ${pose}-${dir}-${frame}`);assert.ok(cell.frame.x+cell.frame.w<=width&&cell.frame.y+cell.frame.h<=height);const size=JSON.stringify(cell.sourceSize);sourceSize||=size;assert.equal(size,sourceSize,'the virtual canvas/ground anchor must stay fixed across every facing and pose');frames++;
  }
  assert.equal(frames,actor.frames);assert.deepEqual(actor.anchor,[.5,.75]);assert.ok(actor.clips.run.frames>=8);
 }
});
