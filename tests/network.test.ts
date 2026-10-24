import test from 'node:test';
import assert from 'node:assert/strict';
import {World,idle} from '../src/sim';
import {Authority,capture,cleanAction,displayCode,normalizeCode,roomCode,singleAction,validCode,validSnapshot} from '../src/net/protocol';
import {relics} from '../src/data';

test('room codes survive human formatting and have no ambiguous characters',()=>{const codes=Array.from({length:100},()=>roomCode());assert.equal(new Set(codes).size,100);for(const code of codes){assert.ok(validCode(code));assert.equal(normalizeCode(displayCode(code).toLowerCase()),code);}assert.ok(!validCode('123'));assert.ok(!validCode('IIII0000'));});
test('remote actions are bounded and malformed numbers are discarded',()=>{assert.equal(cleanAction({x:NaN,y:0}),null);assert.equal(cleanAction({x:1,y:Infinity}),null);assert.equal(cleanAction(null),null);assert.deepEqual(cleanAction({x:999,y:-10,dash:'true'}),{x:1,y:-1,dash:false,skill:false,ult:false});});
test('online players can use either keyboard layout or one local gamepad',()=>{assert.deepEqual(singleAction([idle(),{...idle(),x:1,skill:true}]),{...idle(),x:1,skill:true});assert.equal(singleAction([{...idle(),x:-1},{...idle(),x:1}]).x,-1);});
test('host is authoritative and remote inputs move only guardian two',()=>{const w=new World(),a=new Authority(w);a.start(42,'normal');w.spawnTimer=100;const[x,y]=w.players.map(p=>p.x);for(let i=1;i<=60;i++){a.input(i,{...idle(),x:1},1000+i*16);a.step(1/60,idle(),1000+i*16);w.eventQueue=[];}assert.equal(w.players[0].x,x);assert.ok(w.players[1].x>y+180);assert.equal(w.ai,false);});
test('stale or repeated input sequences cannot replay skill edges',()=>{const a=new Authority(new World());a.start(2,'normal');assert.ok(a.input(2,{...idle(),skill:true},1000));assert.equal(a.input(1,{...idle(),x:1},1010),false);assert.equal(a.input(2,idle(),1020),false);a.step(1/60,idle(),1030);assert.ok(a.world.players[1].skill>0);const cd=a.world.players[1].skill;a.world.eventQueue=[];a.step(1/60,idle(),1047);assert.ok(a.world.players[1].skill<cd);});
test('missing remote packets stop movement instead of leaving a key held',()=>{const a=new Authority(new World());a.start(1,'normal');a.input(1,{...idle(),x:1},1000);a.step(1/60,idle(),1010);const x=a.world.players[1].x;a.step(1/60,idle(),1500);assert.equal(a.world.players[1].x,x);});
test('fixed host ticks preserve short local skill taps at high display rates',()=>{const a=new Authority(new World());a.start(2,'normal');a.step(1/240,{...idle(),skill:true},1000);for(let i=0;i<4;i++)a.step(1/240,idle(),1001+i*4);assert.ok(a.world.players[0].skill>0);assert.equal(a.world.eventQueue.filter(e=>e==='skill').length,1);});
test('both peers pause and resume the same authoritative world',()=>{const a=new Authority(new World());a.start(1,'normal');assert.ok(a.command({kind:'pause',epoch:a.epoch},true));const time=a.world.time;a.step(.05,idle(),2000);assert.equal(a.world.time,time);assert.ok(a.command({kind:'resume',epoch:a.epoch},true));a.step(.05,idle(),2050);assert.ok(a.world.time>time);});
test('shared choices apply once and stale phase commands are rejected',()=>{const w=new World(),a=new Authority(w);a.start(1,'normal');w.phase='reward';w.choices=w.offerRelics();const epoch=a.epoch,relic=w.choices[0].id;assert.ok(a.command({kind:'relic',value:relic,epoch},true));assert.equal(w.inventory.length,1);assert.equal(a.command({kind:'relic',value:relic,epoch}),false);assert.equal(a.command({kind:'route',value:'invalid',epoch:a.epoch},true),false);const route=w.routes[0];assert.ok(a.command({kind:'route',value:route,epoch:a.epoch},true));assert.equal(w.phase,'playing');assert.equal(w.room,1);});
test('a guest cannot restart the run or return the host to lobby',()=>{const a=new Authority(new World());a.start(1,'normal');a.world.phase='lost';assert.equal(a.command({kind:'restart',epoch:a.epoch},true),false);assert.equal(a.command({kind:'lobby',epoch:a.epoch},true),false);assert.ok(a.command({kind:'restart',epoch:a.epoch}));assert.equal(a.run,2);});

test('network snapshots reject injected methods and arbitrary reward markup',()=>{const w=new World();w.choices=w.offerRelics();const state=capture(w);assert.ok(validSnapshot(state));assert.equal(validSnapshot({...state,togglePause:'override'}),false);assert.equal(validSnapshot({...state,seed:'<img src=x onerror=alert(1)>'}),false);assert.equal(validSnapshot({...state,choices:[{...state.choices[0],name:'<img src=x onerror=alert(1)>'}]}),false);assert.equal(validSnapshot({...state,inventory:['unknown-relic']}),false);});
test('snapshots include shared combat, revive, loot and final result without simulation methods',()=>{const a=new Authority(new World());a.start(5,'normal');a.world.players[1].down=true;a.world.players[1].revive=1.2;a.world.inventory=['power'];a.world.phase='won';const state=capture(a.world);assert.ok(validSnapshot(state));assert.equal(state.players[1].revive,1.2);assert.deepEqual(state.inventory,['power']);assert.equal(state.phase,'won');assert.equal('update' in state,false);state.players[0].hp=2;assert.equal(a.world.players[0].hp,100);assert.ok(!validSnapshot({...state,players:[]}));assert.ok(!validSnapshot({...state,room:999}));});

test('cooperative windows, enemy rescue targets and barriers survive network snapshots',()=>{
 const w=new World();w.reset(false,12);w.spawnEnemy('brute',640,300);
 const e=w.enemies[0];e.mark=3;e.fracture=4;e.taunt=2;w.beginSnare(e,0);
 w.players[0].barrier=25;w.players[0].barrierTime=5;w.players[1].ultReady=3;
 w.coop.links=2;w.coop.rescues=1;w.coop.bursts=1;w.coop.last='搭档已破甲';w.coop.lastTime=2;
 const state=capture(w);assert.ok(validSnapshot(state));assert.deepEqual(state.coop,w.coop);
 assert.equal(state.enemies[0].snareTarget,0);assert.equal(state.enemies[0].fracture,4);
 assert.equal(state.players[0].barrier,25);assert.equal(state.players[1].ultReady,3);
 assert.equal(validSnapshot({...state,coop:undefined}),false);
 assert.equal(validSnapshot({...state,coop:{...state.coop,links:NaN}}),false);
 assert.equal(validSnapshot({...state,players:state.players.map(p=>({...p,ultReady:Infinity}))}),false);
 assert.equal(validSnapshot({...state,enemies:[{...state.enemies[0],snareTarget:8}]}),false);
});

test('a remote ultimate vote is held until the host independently confirms',()=>{
 const w=new World(),a=new Authority(w);a.start(4,'normal');w.spawnTimer=100;w.charge=100;
 a.input(1,{...idle(),ult:true},1000);a.step(1/60,idle(),1001);
 assert.equal(w.charge,100);assert.ok(w.players[1].ultReady>3);assert.equal(w.players[0].ultReady,0);
 const state=capture(w);assert.ok(validSnapshot(state));assert.ok(state.players[1].ultReady>3);
 a.step(1/60,{...idle(),ult:true},1018);assert.equal(w.charge,0);assert.equal(w.ultFlash,.8);
 assert.ok(w.players.every(p=>p.ultReady===0));
});

test('online oath draft is a shared choice and starts the first room exactly once',()=>{
 const w=new World(),a=new Authority(w);a.start(731,'normal',true);
 assert.equal(w.phase,'reward');assert.equal(w.growth.drafting,true);assert.equal(w.room,0);
 const epoch=a.epoch,choice=w.choices[0];assert.equal(choice.core,true);
 assert.ok(a.command({kind:'relic',value:choice.id,epoch},true));
 assert.equal(w.phase,'playing');assert.equal(w.growth.drafting,false);assert.equal(w.room,0);
 assert.equal(w.growth.path,choice.path);assert.deepEqual(w.inventory,[choice.id]);
 assert.equal(a.command({kind:'relic',value:choice.id,epoch}),false);
});

test('reroll revisions reject a delayed teammate choice and prevent repeated spending',()=>{
 const w=new World(),a=new Authority(w);a.start(34,'normal',true);
 const draftEpoch=a.epoch;assert.equal(a.command({kind:'reroll',epoch:draftEpoch},true),false);
 assert.equal(w.growth.rerolls,2);a.command({kind:'relic',value:w.choices[0].id,epoch:draftEpoch});
 w.phase='reward';w.choices=w.offerRelics();const epoch=a.epoch,old=w.choices.map(r=>r.id);
 assert.ok(a.command({kind:'reroll',epoch},true));assert.equal(w.growth.rerolls,1);
 assert.notEqual(a.epoch,epoch);assert.equal(a.command({kind:'reroll',epoch}),false);
 assert.equal(a.command({kind:'relic',value:old[0],epoch},true),false);
 assert.equal(w.inventory.length,1);assert.equal(w.phase,'reward');
 assert.ok(a.command({kind:'reroll',epoch:a.epoch}));assert.equal(w.growth.rerolls,0);
 assert.equal(a.command({kind:'reroll',epoch:a.epoch},true),false);
});

test('new run and same-seed retry return to a synchronized oath draft',()=>{
 const w=new World(),a=new Authority(w);a.start(1729,'normal',true);
 const first=w.choices.map(r=>r.id);a.command({kind:'relic',value:first[0],epoch:a.epoch});
 w.growth.rerolls=0;w.phase='lost';assert.ok(a.command({kind:'retry',epoch:a.epoch}));
 assert.equal(w.phase,'reward');assert.equal(w.growth.drafting,true);assert.equal(w.room,0);
 assert.equal(w.growth.rerolls,2);assert.deepEqual(w.choices.map(r=>r.id),first);assert.equal(w.inventory.length,0);
});

test('growth snapshots preserve archetypes and reject malformed ranks and reroll tokens',()=>{
 const w=new World();w.reset(false,34);w.beginDraft();w.choose(w.choices[0].id);
 w.applyRelic('relay_refund');w.applyRelic('bulwark_capacity');
 const state=capture(w);assert.ok(validSnapshot(state));assert.deepEqual(state.growth,w.growth);
 assert.equal(validSnapshot({...state,growth:{...state.growth,rerolls:-1}}),false);
 assert.equal(validSnapshot({...state,growth:{...state.growth,rerolls:7}}),false);
 assert.equal(validSnapshot({...state,growth:{...state.growth,path:'unknown'}}),false);
 assert.equal(validSnapshot({...state,growth:{...state.growth,offerRevision:NaN}}),false);
 assert.equal(validSnapshot({...state,inventory:Array(4).fill('relay_refund')}),false);
 const core=relics.filter(r=>r.core).slice(0,2).map(r=>r.id);
 assert.equal(validSnapshot({...state,inventory:core}),false);
});
