import test from 'node:test';
import assert from 'node:assert/strict';
import {World, idle, type Action, type Enemy} from '../src/sim';

// These fixtures disable automatic attacks so each cooperative action has one
// identifiable cause. Separate integration coverage below uses real projectiles.
function fixture(kind:Enemy['kind']='brute') {
  const w=new World();
  w.reset(false,20261023);
  w.spawnTimer=1000;
  for(const p of w.players){p.shot=1000;p.inv=0;}
  w.spawnEnemy(kind,640,430);
  const e=w.enemies[0];
  e.hp=e.maxHp=10000;e.speed=0;e.cd=1000;
  return {w,e,a:w.players[0],b:w.players[1]};
}
function tick(w:World,seconds:number,actions:Action[]=[idle(),idle()]) {
  for(let frames=Math.ceil(seconds*60);frames>0;frames--)w.update(1/60,actions.map(a=>({...a})));
}

test('proximity alone supplies neither tether damage nor resonance charge',()=>{
  const {w,e}=fixture();
  const hp=e.hp;
  tick(w,2);
  assert.equal(w.link,true);
  assert.equal(e.hp,hp);
  assert.equal(w.charge,0);
  e.speed=100;
  const origin={x:e.x,y:e.y};
  w.updateEnemy(e,.03);
  const tetherTravel=Math.hypot(e.x-origin.x,e.y-origin.y);
  e.x=origin.x;e.y=origin.y;
  w.players.forEach(p=>p.y=600);
  w.updateEnemy(e,.03);
  const freeTravel=Math.hypot(e.x-origin.x,e.y-origin.y);
  assert.ok(tetherTravel<freeTravel*.9,'crossing the tether slows movement');
  assert.ok(freeTravel>2.9,'leaving the tether restores enemy movement immediately');
});

test('independent attacks cannot manufacture the other role’s combo',()=>{
  const first=fixture(),second=fixture();
  for(let i=0;i<5;i++)first.w.hurtEnemy(first.e,20,0,'basic');
  for(let i=0;i<5;i++)second.w.hurtEnemy(second.e,20,1,'basic');
  assert.equal(first.e.fracture,0);
  assert.equal(first.e.mark,0);
  assert.equal(first.w.coop.links,0);
  assert.equal(second.e.fracture,0);
  assert.ok(second.e.mark>0);
  assert.equal(second.w.coop.links,0);
  assert.equal(first.w.charge,0);
  assert.equal(second.w.charge,0);
});

test('P2 primes a target, P1 opens its guard, and P2 cashes out for both players',()=>{
  const {w,e,a,b}=fixture();
  b.hp=50;
  w.hurtEnemy(e,20,1,'basic');
  assert.ok(e.mark>0);
  assert.equal(e.fracture,0);
  w.hurtEnemy(e,20,0,'basic');
  assert.ok(e.fracture>0);
  assert.equal(e.mark,0,'shattering consumes the prime');
  assert.equal(w.coop.links,1);
  assert.ok(w.charge>0);
  const charge=w.charge,hp=e.hp;
  w.castSkill(b);
  assert.ok(e.hp<hp);
  assert.equal(w.coop.bursts,1);
  assert.ok(a.barrier>0,'the frontline player receives protection');
  assert.ok(b.hp>50,'the ranged player earns healing');
  assert.ok(w.charge>charge);
  assert.equal(e.fracture,0,'the detonation consumes the damage window');
});

test('P2 cannot receive detonation rewards by casting alone on an unbroken guard',()=>{
  const {w,e,a,b}=fixture();b.hp=50;
  w.castSkill(b);
  assert.ok(e.mark>0,'the cast can start a new cooperative sequence');
  assert.equal(e.fracture,0);
  assert.equal(a.barrier,0);
  assert.equal(b.hp,50);
  assert.equal(w.coop.bursts,0);
  assert.equal(w.charge,0);
});

test('a heavy enemy’s guard cuts solo damage, and a teammate-created opening removes it',()=>{
  const {w,e}=fixture();
  let hp=e.hp;
  w.hurtEnemy(e,100,0,'basic');
  assert.equal(hp-e.hp,25);
  w.hurtEnemy(e,1,1,'basic');
  w.hurtEnemy(e,1,0,'basic');
  hp=e.hp;
  w.hurtEnemy(e,100,-1,'other');
  assert.ok(hp-e.hp>=100,'unbroken guard reduction must no longer apply');
  e.x=100;e.y=150;
  tick(w,5.2);
  assert.equal(e.fracture,0);
  hp=e.hp;
  w.hurtEnemy(e,100,-1,'other');
  assert.equal(hp-e.hp,25,'the guard returns when the cooperation window expires');
});

test('P1’s close skill consumes allied marks and draws enemies off the ranged partner',()=>{
  const {w,e,a,b}=fixture('chaser');
  e.x=700;a.x=560;b.x=720;
  w.hurtEnemy(e,1,1,'basic');
  w.castSkill(a);
  assert.ok(e.fracture>0);
  assert.ok(e.taunt>0);
  e.speed=100;
  const x=e.x;
  w.updateEnemy(e,1/60);
  assert.ok(e.x<x,'taunted enemy approaches P1 despite P2 being much closer');
});

test('hunters pressure the distant ranged player until the frontline partner intervenes',()=>{
  const {w,e,a,b}=fixture('dasher');
  a.x=600;b.x=900;e.x=640;e.speed=100;
  const origin=e.x;
  w.updateEnemy(e,1/60);
  assert.ok(e.x>origin,'the hunter deliberately bypasses nearby P1 to pressure P2');
  w.castSkill(a);
  const redirected=e.x;
  w.updateEnemy(e,1/60);
  assert.ok(e.taunt>0);
  assert.ok(e.x<redirected,'P1 can actively pull the hunter away from P2');
});

test('earned frontline barrier absorbs damage before health and expires',()=>{
  const {w,e,a,b}=fixture();
  w.hurtEnemy(e,1,1,'basic');w.hurtEnemy(e,1,0,'basic');w.castSkill(b);
  const barrier=a.barrier,hp=a.hp;
  assert.ok(barrier>0);
  w.hurtPlayer(a,barrier/2);
  assert.equal(a.hp,hp);
  assert.ok(a.barrier<barrier);
  e.x=100;e.y=150;
  tick(w,6.2);
  assert.equal(a.barrier,0);
});

test('a snared player cannot rescue themself; three partner basics break the caster’s bind',()=>{
  const {w,e}=fixture();
  w.beginSnare(e,0);
  assert.equal(e.snareTarget,0);
  for(let i=0;i<3;i++)w.hurtEnemy(e,1,0,'basic');
  w.hurtEnemy(e,1,0,'skill');
  assert.equal(e.snareTarget,0,'self attacks and own skills cannot clear the bind');
  for(let i=0;i<2;i++)w.hurtEnemy(e,1,1,'basic');
  assert.equal(e.snareTarget,0);
  w.hurtEnemy(e,1,1,'basic');
  assert.equal(e.snareTarget,-1);
  assert.equal(w.coop.rescues,1);
  assert.ok(w.charge>0);
});

test('either role can free a bound partner with one skill hit',()=>{
  for(const boundId of [0,1]){
    const {w,e}=fixture();
    w.beginSnare(e,boundId);
    w.castSkill(w.players[1-boundId]);
    assert.equal(e.snareTarget,-1,`P${2-boundId} must be able to rescue P${boundId+1}`);
    assert.equal(w.coop.rescues,1);
  }
});

test('binds slow the target, cannot stack on one player, and punish a missed rescue',()=>{
  const {w,e,a}=fixture();
  const x=a.x;
  w.updatePlayer(a,{...idle(),x:1},1/60);
  const normal=a.x-x;a.x=x;
  w.beginSnare(e,0);
  w.updatePlayer(a,{...idle(),x:1},1/60);
  assert.ok(a.x-x<normal*.6);
  w.spawnEnemy('brute',100,150);
  const second=w.enemies[1];second.speed=0;second.cd=1000;
  w.beginSnare(second,0);
  assert.equal(second.snareTarget,-1,'one player cannot receive overlapping binds');
  e.x=100;e.y=650;
  const hp=a.hp;
  tick(w,5.6);
  assert.ok(a.hp<hp,'ignoring the rescue has a health cost');
  assert.equal(e.snareTarget,-1);
  assert.equal(w.coop.rescues,0);
});

test('killing the binding caster always frees its target',()=>{
  const {w,e}=fixture();
  w.beginSnare(e,1);
  w.hurtEnemy(e,1e6);
  assert.equal(e.snareTarget,-1);
  assert.equal(e.snareTime,0);
});

test('one Q arms a limited offer without spending charge; expiry needs a new confirmation',()=>{
  const {w,a,b}=fixture();w.charge=100;
  w.update(1/60,[{...idle(),ult:true},idle()]);
  assert.ok(a.ultReady>0);
  assert.equal(b.ultReady,0);
  assert.equal(w.charge,100);
  assert.equal(w.coop.bursts,0);
  tick(w,4.2);
  assert.equal(a.ultReady,0);
  assert.equal(w.charge,100);
  w.update(1/60,[idle(),{...idle(),ult:true}]);
  assert.equal(w.charge,100,'an expired offer cannot approve the partner’s later Q');
  assert.equal(w.eventQueue.filter(e=>e==='ult').length,0);
});

test('two living players confirm Q inside the window and spend once',()=>{
  const {w,e,a,b}=fixture();w.charge=100;a.hp=b.hp=50;
  w.enemyBullet(e,0,100);
  w.update(1/60,[{...idle(),ult:true},idle()]);
  tick(w,.5);
  const hp=e.hp;
  w.update(1/60,[idle(),{...idle(),ult:true}]);
  assert.equal(w.charge,0);
  assert.equal(a.ultReady,0);assert.equal(b.ultReady,0);
  assert.ok(e.hp<hp);
  assert.ok(a.hp>50&&b.hp>50);
  assert.ok(a.barrier>0);
  assert.equal(w.bullets.filter(bullet=>bullet.owner<0).length,0);
  assert.equal(w.eventQueue.filter(event=>event==='ult').length,1);
});

test('a downed partner prevents both confirmations from launching the ultimate',()=>{
  const {w,a,b}=fixture();w.charge=100;
  w.update(1/60,[{...idle(),ult:true},idle()]);
  b.down=true;b.hp=0;b.x=1100;
  w.update(1/60,[{...idle(),ult:true},{...idle(),ult:true}]);
  assert.equal(w.charge,100);
  assert.equal(w.eventQueue.filter(event=>event==='ult').length,0);
  assert.equal(a.hp,100);
});

test('AI responds to a partner’s ultimate invitation and uses a fracture opportunity',()=>{
  const {w,e,a,b}=fixture();w.ai=true;w.charge=100;a.ultReady=2;
  assert.equal(w.aiAction().ult,true);
  w.charge=0;a.ultReady=0;
  e.fracture=4;b.skill=0;
  assert.equal(w.aiAction().skill,true);
});

test('real auto-projectiles preserve owner roles in the mark and shatter sequence',()=>{
  const {w,e,a,b}=fixture();
  a.x=570;b.x=450;e.x=650;
  b.shot=0;
  tick(w,.48);b.shot=1000;
  assert.ok(e.mark>0);
  assert.equal(e.fracture,0);
  a.shot=0;
  tick(w,.3);a.shot=1000;
  assert.ok(e.fracture>0);
  assert.ok(w.coop.links>=1);
});

test('room transition clears temporary cooperation state while a new run resets totals',()=>{
  const {w,e,a,b}=fixture();
  w.hurtEnemy(e,1,1,'basic');w.hurtEnemy(e,1,0,'basic');w.castSkill(b);
  w.beginSnare(e,1);w.clearSnare(e,0);a.ultReady=2;
  assert.ok(w.coop.links>0&&w.coop.bursts>0&&w.coop.rescues>0);
  const links=w.coop.links;
  w.enterRoom('battle');
  assert.equal(w.enemies.length,0);
  assert.ok(w.players.every(p=>p.ultReady===0&&p.barrier===0));
  assert.equal(w.coop.links,links);
  w.reset(false,42);
  assert.equal(w.coop.links,0);assert.equal(w.coop.rescues,0);assert.equal(w.coop.bursts,0);
  assert.ok(w.players.every(p=>p.ultReady===0&&p.barrier===0));
});
