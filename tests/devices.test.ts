import test from 'node:test';
import assert from 'node:assert/strict';
import {Input} from '../src/input';
import {Sound} from '../src/audio';
const globals=globalThis as unknown as Record<string,unknown>;
globals.window={addEventListener:()=>{}};
function setPads(getter?:()=>unknown){Object.defineProperty(globalThis,'navigator',{configurable:true,value:{getGamepads:getter}});}
test('blocked gamepad polling preserves both keyboards across frames and is tried only once',()=>{
 let calls=0;setPads(()=>{calls++;throw new DOMException('Blocked by Permissions Policy','SecurityError');});const input=new Input(()=>{});input.keys.add('KeyD');input.keys.add('ArrowUp');input.pressed.add('KeyE');
 const first=input.read();assert.equal(first[0].x,1);assert.equal(first[1].y,-1);assert.equal(first[0].skill,true);
 const second=input.read();assert.equal(second[0].x,1);assert.equal(second[1].y,-1);assert.equal(second[0].skill,false);assert.equal(calls,1);
});
test('missing gamepad API leaves keyboard dash and ultimate working',()=>{setPads();const input=new Input(()=>{});input.pressed.add('Space');input.pressed.add('Slash');const a=input.read();assert.ok(a[0].dash);assert.ok(a[1].ult);});
test('normal gamepad path maps two connected pads and ignores empty slots',()=>{
 const pad=(axes:number[],buttons:boolean[])=>({axes,buttons:buttons.map(pressed=>({pressed}))});setPads(()=>[null,pad([.8,-.6],[true,false,true,false]),null,pad([.1,.1],[false,false,false,true])]);const input=new Input(()=>{});input.keys.add('ArrowLeft');const a=input.read();assert.equal(a[0].x,.8);assert.equal(a[0].y,-.6);assert.ok(a[0].dash&&a[0].skill);assert.equal(a[1].x,-1);assert.ok(a[1].ult);
});
test('temporary device errors do not disable later successful gamepad polling',()=>{let calls=0;setPads(()=>{if(calls++===0)throw new Error('device temporarily unavailable');return [{axes:[1,0],buttons:[]}];});const input=new Input(()=>{});assert.doesNotThrow(()=>input.read());assert.equal(input.read()[0].x,1);});
test('unavailable or rejected audio initialization does not throw',async()=>{
 const original=Object.getOwnPropertyDescriptor(globalThis,'AudioContext');try{
  globals.AudioContext=undefined;assert.doesNotThrow(()=>new Sound().start());
  globals.AudioContext=class{constructor(){throw new DOMException('Denied','SecurityError');}};const denied=new Sound();assert.doesNotThrow(()=>denied.start());assert.equal(denied.ctx,null);
  globals.AudioContext=class{state='suspended';resume(){return Promise.reject(new DOMException('Not allowed','NotAllowedError'));}};const suspended=new Sound();assert.doesNotThrow(()=>suspended.start());assert.doesNotThrow(()=>suspended.tone(440,.1));await new Promise(resolve=>setTimeout(resolve,0));
 }finally{if(original)Object.defineProperty(globalThis,'AudioContext',original);else delete globals.AudioContext;}
});
