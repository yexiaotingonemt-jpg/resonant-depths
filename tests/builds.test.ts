import test from 'node:test';
import assert from 'node:assert/strict';
import {World,idle,distance,type Enemy} from '../src/sim';
import {relics} from '../src/data';

function fixture(ids:string[]=[],kind:Enemy['kind']='brute'){
  const w=new World();w.reset(false,20261024);
  for(const id of ids)assert.equal(w.applyRelic(id),true,`valid fixture relic ${id}`);
  w.enterRoom('battle');w.spawnTimer=1000;
  for(const p of w.players){p.shot=1000;p.inv=0;}
  w.spawnEnemy(kind,640,430);
  const e=w.enemies[0];e.hp=e.maxHp=10000;e.speed=0;e.cd=1000;
  return {w,e,a:w.players[0],b:w.players[1]};
}
function tick(w:World,seconds:number){for(let frames=Math.ceil(seconds*60);frames>0;frames--)w.update(1/60,[idle(),idle()]);}
function primeBreak(w:World,e:Enemy){w.hurtEnemy(e,1,1,'basic');w.hurtEnemy(e,1,0,'basic');}
function primedSkills(ids:string[]){const f=fixture(ids);f.w.hurtEnemy(f.e,1,1,'basic');f.w.castSkill(f.a);return f;}

test('starting oath draft pauses combat and starts room one without spending its reward',()=>{
  const w=new World();w.reset(false,42);
  assert.equal(w.phase,'playing','reset stays useful to deterministic combat fixtures');
  w.beginDraft();
  assert.equal(w.phase,'reward');assert.equal(w.growth.drafting,true);
  assert.equal(w.choices.length,3);assert.equal(new Set(w.choices.map(r=>r.id)).size,3);
  assert.ok(w.choices.every(r=>r.id.endsWith('_oath')));
  const selected=w.choices[0];
  const time=w.time;tick(w,1);assert.equal(w.time,time);
  w.choose('power');assert.equal(w.growth.drafting,true);
  w.choose(selected.id);
  assert.equal(w.phase,'playing');assert.equal(w.room,0);
  assert.equal(w.growth.drafting,false);assert.equal(w.growth.path,selected.path);
  assert.deepEqual(w.inventory,[selected.id]);
  w.choose(selected.id);assert.equal(w.inventory.length,1,'replayed selection cannot stack the oath');
});

test('same seed produces identical drafts, reward offers and rerolls',()=>{
  const a=new World(),b=new World();a.reset(false,77);b.reset(false,77);
  a.beginDraft();b.beginDraft();assert.deepEqual(a.choices,b.choices);
  a.choose(a.choices[0].id);b.choose(b.choices[0].id);
  a.phase=b.phase='reward';a.choices=a.offerRelics();b.choices=b.offerRelics();
  assert.deepEqual(a.choices,b.choices);
  assert.equal(a.reroll(),true);assert.equal(b.reroll(),true);
  assert.deepEqual(a.choices,b.choices);assert.equal(a.randomState,b.randomState);
});

test('rank caps stop both inventory growth and further effects for every relic',()=>{
  for(const relic of relics){
    const w=new World();w.reset(false,7);
    for(let rank=0;rank<relic.maxRank;rank++)assert.equal(w.applyRelic(relic.id),true,`${relic.id} rank ${rank+1}`);
    const before=JSON.stringify({inventory:w.inventory,stats:w.stats,players:w.players,growth:w.growth});
    assert.equal(w.applyRelic(relic.id),false,`${relic.id} rejects rank above its cap`);
    assert.equal(JSON.stringify({inventory:w.inventory,stats:w.stats,players:w.players,growth:w.growth}),before);
  }
  const w=new World();const before=JSON.stringify(w);
  assert.equal(w.applyRelic('invented-relic'),false);assert.equal(JSON.stringify(w),before);
});

test('a primary oath cannot be replaced by collecting a second core',()=>{
  const w=new World();w.reset(false,7);assert.equal(w.applyRelic('relay_oath'),true);
  const before=JSON.stringify({inventory:w.inventory,growth:w.growth});
  assert.equal(w.applyRelic('rescue_oath'),false);
  assert.equal(JSON.stringify({inventory:w.inventory,growth:w.growth}),before);
});

test('rewards keep primary-path and alternative-path opportunities without offering capped ranks',()=>{
  const w=new World();w.reset(false,55);w.beginDraft();w.choose(w.choices[0].id);
  const path=w.growth.path,seen=new Set<string>();
  const capped=relics.find(r=>r.path===path&&!r.id.endsWith('_oath'))!;
  for(let i=0;i<capped.maxRank;i++)w.applyRelic(capped.id);
  for(let i=0;i<25;i++){
    const offer=w.offerRelics();
    assert.equal(offer.length,3);assert.equal(new Set(offer.map(r=>r.id)).size,3);
    assert.ok(offer.some(r=>r.path===path),'each offer advances the chosen style');
    assert.ok(offer.some(r=>r.path&&r.path!==path),'each offer leaves a hybrid route open');
    assert.ok(offer.every(r=>r.id!==capped.id));
    for(const r of offer){assert.ok(w.inventory.filter(id=>id===r.id).length<r.maxRank);seen.add(r.id);}
  }
  assert.ok(seen.size>=10,'repeated offers must not be trapped in one fixed trio');
});

test('two rerolls replace a reward choice, cannot reroll the oath, and remain spent across rooms',()=>{
  const w=new World();w.reset(false,77);
  assert.equal(w.reroll(),false);assert.equal(w.growth.rerolls,2);
  w.beginDraft();assert.equal(w.reroll(),false);assert.equal(w.growth.rerolls,2);
  w.choose(w.choices[0].id);w.phase='reward';w.choices=w.offerRelics();
  const previous=new Set(w.choices.map(r=>r.id));
  assert.equal(w.reroll(),true);assert.equal(w.growth.rerolls,1);
  assert.ok(w.choices.every(r=>!previous.has(r.id)),'reroll avoids every previous offer while alternatives exist');
  assert.equal(w.reroll(),true);assert.equal(w.growth.rerolls,0);
  const choices=w.choices.map(r=>r.id);assert.equal(w.reroll(),false);assert.deepEqual(w.choices.map(r=>r.id),choices);
  w.choose(w.choices[0].id);assert.equal(w.phase,'route');assert.equal(w.reroll(),false);
  w.enterRoom(w.routes[0]);assert.equal(w.growth.rerolls,0);
  w.reset(false,77);assert.equal(w.growth.rerolls,2);
});

test('relay rewards alternating partners with echo damage and a cooldown refund',()=>{
  const base=primedSkills([]),relay=primedSkills(['relay_oath']);
  const baseHp=base.e.hp,relayHp=relay.e.hp,cd=relay.a.skill;
  base.w.castSkill(base.b);relay.w.castSkill(relay.b);
  assert.ok(relay.a.skill<cd,'answering partner refunds the first caster');
  assert.ok(relay.a.skill<base.a.skill);
  assert.ok(relayHp-relay.e.hp>baseHp-base.e.hp,'alternation adds an echo rather than only changing a number in the UI');
  assert.equal(relay.w.coop.bursts,1,'the echo must not recursively count another detonation');
});

test('relay does not refund a repeated self cast or an expired handoff',()=>{
  const same=fixture(['relay_oath']);same.w.castSkill(same.a);
  same.a.skill=0;same.b.skill=5;same.w.castSkill(same.a);
  assert.equal(same.b.skill,5);
  const late=primedSkills(['relay_oath']);late.e.x=100;late.e.y=150;
  tick(late.w,4.2);
  const cd=late.a.skill;late.w.castSkill(late.b);
  assert.equal(late.a.skill,cd,'an expired partner window cannot refund an old cast');
});

test('relay third and fifth path ranks produce stronger cooperative skill timing',()=>{
  const two=primedSkills(['relay_oath','relay_echo']);
  const three=primedSkills(['relay_oath','relay_echo','relay_echo']);
  two.e.x=three.e.x=100;two.e.y=three.e.y=150;tick(two.w,4.2);tick(three.w,4.2);
  const cd2=two.a.skill,cd3=three.a.skill;two.w.castSkill(two.b);three.w.castSkill(three.b);
  assert.equal(two.a.skill,cd2);assert.ok(three.a.skill<cd3,'rank three keeps the six-second relay window alive');
  const four=primedSkills(['relay_oath','relay_echo','relay_echo','relay_handoff']);
  const five=primedSkills(['relay_oath','relay_echo','relay_echo','relay_handoff','relay_handoff']);
  four.w.castSkill(four.b);five.w.castSkill(five.b);
  assert.ok(five.b.skill<four.b.skill,'rank five refunds the responding caster too');
});

test('bulwark converts actual blocked damage into one frontline counterattack',()=>{
  const {w,e,a}=fixture(['bulwark_oath']);
  a.barrier=0;a.barrierTime=0;w.hurtPlayer(a,10);
  assert.equal(w.growth.storedGuard,0,'health damage must not generate shield energy');
  a.inv=0;w.grantBarrier(30);const hp=a.hp;w.hurtPlayer(a,20);
  assert.equal(a.hp,hp);assert.ok(w.growth.storedGuard>0);
  const before=e.hp;w.castSkill(a);const counter=before-e.hp;
  assert.equal(w.growth.storedGuard,0,'the counter spends its stored energy');
  a.skill=0;const after=e.hp;w.castSkill(a);
  assert.ok(counter>after-e.hp,'recasting cannot reuse consumed barrier damage');
});

test('bulwark third and fifth ranks improve real storage and the counter refunds protection',()=>{
  const three=fixture(['bulwark_oath','bulwark_capacity','bulwark_capacity']);
  const five=fixture(['bulwark_oath','bulwark_capacity','bulwark_capacity','bulwark_return','bulwark_return']);
  for(const f of [three,five])for(let i=0;i<6;i++){f.w.grantBarrier(55);f.a.inv=0;f.w.hurtPlayer(f.a,30);}
  assert.ok(five.w.growth.storedGuard>three.w.growth.storedGuard);
  for(const f of [three,five]){f.a.barrier=0;f.a.barrierTime=0;f.w.castSkill(f.a);}
  assert.ok(five.a.barrier>three.a.barrier,'rank five returns shield after releasing a counter');
});

test('vortex pulls ordinary enemies into a combo but cannot displace a boss',()=>{
  const {w,a}=fixture(['vortex_oath'],'chaser');w.enemies=[];
  w.spawnEnemy('chaser',a.x+250,a.y);w.spawnEnemy('boss',a.x+250,a.y+20);
  const normal=w.enemies[0],boss=w.enemies[1];normal.hp=boss.hp=10000;
  const normalDistance=distance(normal,a),bossPosition={x:boss.x,y:boss.y};
  w.castSkill(a);
  assert.ok(distance(normal,a)<normalDistance-40);
  assert.deepEqual({x:boss.x,y:boss.y},bossPosition);
  assert.equal(normal.fracture,0,'pulling cannot replace the ranged partner’s mark');
});

test('vortex splash damages nearby enemies without propagating into an endless detonation chain',()=>{
  const f=fixture(['vortex_oath']);
  f.w.spawnEnemy('chaser',f.e.x+75,f.e.y);const neighbor=f.w.enemies[1];neighbor.hp=neighbor.maxHp=10000;
  primeBreak(f.w,f.e);const hp=neighbor.hp;
  f.w.castSkill(f.b);
  assert.ok(neighbor.hp<hp,'detonating one broken enemy hurts its nearby companion');
  assert.ok(hp-neighbor.hp<200,'one splash must not recursively damage the same pack');
  assert.equal(neighbor.fracture,0,'splash does not forge the missing frontline step');
  assert.equal(f.w.coop.bursts,1);
});

test('vortex third rank reaches a new target and fifth rank spreads the partner’s marks',()=>{
  const two=fixture(['vortex_thread','vortex_thread'],'chaser');
  const three=fixture(['vortex_thread','vortex_thread','vortex_still'],'chaser');
  for(const f of [two,three]){f.e.x=f.a.x+205;f.e.y=f.a.y;f.w.castSkill(f.a);}
  assert.equal(two.e.hp,two.e.maxHp);
  assert.ok(three.e.hp<three.e.maxHp,'third-rank radius changes which enemies a skill can reach');
  for(const rank of [3,5]){
    const f=fixture(rank===3?['vortex_oath','vortex_thread','vortex_thread']:['vortex_oath','vortex_thread','vortex_thread','vortex_still','vortex_still']);
    for(let i=0;i<3;i++)f.w.spawnEnemy('chaser',f.e.x+45+i*20,f.e.y+35);
    primeBreak(f.w,f.e);
    const marked=f.w.enemies.filter(e=>e.id!==f.e.id&&e.mark>0).length;
    assert.equal(marked,rank===5?2:0);
    assert.equal(f.w.coop.links,1,'spreading marks must not invent extra completed partner combos');
  }
});

test('rescue oath can activate from supporting a living low-health partner',()=>{
  const {w,a,b}=fixture(['rescue_oath']);a.hp=40;
  w.castSkill(b);
  assert.equal(a.down,false);assert.ok(w.growth.watchTime>0);
  assert.equal(w.revives,0,'no intentional knockdown is required to use this build');
  const alone=fixture(['rescue_oath']);alone.b.hp=40;alone.w.castSkill(alone.b);
  assert.equal(alone.w.growth.watchTime,0,'the caster cannot turn their own low health into partner support');
});

test('rescue damage buff has an actual combat payoff and a support cooldown',()=>{
  const base=fixture(),rescue=fixture(['rescue_oath']);
  base.a.hp=rescue.a.hp=40;base.w.castSkill(base.b);rescue.w.castSkill(rescue.b);
  const normalHp=base.e.hp,buffedHp=rescue.e.hp;
  base.w.hurtEnemy(base.e,100,0,'basic');rescue.w.hurtEnemy(rescue.e,100,0,'basic');
  assert.ok(buffedHp-rescue.e.hp>normalHp-base.e.hp);
  const watch=rescue.w.growth.watchTime;
  rescue.e.x=100;rescue.e.y=150;tick(rescue.w,1);rescue.b.skill=0;rescue.w.castSkill(rescue.b);
  assert.ok(rescue.w.growth.watchTime<watch,'repeated low-health casts cannot refresh through the support cooldown');
});

test('a secondary rescue path can unlock its third-rank behavior without replacing the primary oath',()=>{
  const {w,e,a,b}=fixture(['relay_oath','rescue_mend','rescue_mend','rescue_release']);
  const path=w.growth.path;a.hp=40;b.hp=50;
  w.beginSnare(e,0);w.clearSnare(e,1);
  assert.ok(w.growth.watchTime>0);
  assert.ok(a.hp>40&&b.hp>50,'rank-three rescue heals both roles on a successful rescue');
  assert.equal(w.growth.path,path,'hybrid ranks do not silently replace the chosen oath');
});

test('fifth-rank rescue reduces incoming damage only during the earned support window',()=>{
  const three=fixture(['rescue_oath','rescue_mend','rescue_mend']);
  const five=fixture(['rescue_oath','rescue_mend','rescue_mend','rescue_courage','rescue_courage']);
  for(const f of [three,five]){f.a.hp=40;f.w.castSkill(f.b);assert.ok(f.w.growth.watchTime>0);f.a.hp=100;f.a.inv=0;f.w.hurtPlayer(f.a,20);}
  assert.ok(five.a.hp>three.a.hp);
  five.e.x=100;five.e.y=150;tick(five.w,8.2);five.a.hp=100;five.a.inv=0;five.w.hurtPlayer(five.a,20);
  assert.equal(five.a.hp,three.a.hp,'the extra resistance must expire with the cooperative window');
});

test('lifeline depends on a living nearby partner and can save the team only once per run',()=>{
  const nearby=fixture(['rescue_lifeline']);nearby.w.hurtPlayer(nearby.a,1000);
  assert.equal(nearby.a.down,false);assert.ok(nearby.a.hp>0);
  nearby.a.inv=0;nearby.w.hurtPlayer(nearby.a,1000);assert.equal(nearby.a.down,true);
  const alone=fixture(['rescue_lifeline']);alone.b.down=true;alone.b.hp=0;alone.w.hurtPlayer(alone.a,1000);
  assert.equal(alone.a.down,true,'the relic cannot act as an independent extra life');
});

test('room changes clear build combat triggers but keep owned ranks and spent rerolls',()=>{
  const {w,e,a,b}=fixture(['relay_oath','bulwark_capacity','bulwark_capacity','bulwark_share','rescue_mend','rescue_mend','rescue_release']);
  w.castSkill(a);a.hp=40;w.castSkill(b);w.grantBarrier(30);a.inv=0;w.hurtPlayer(a,10);
  assert.ok(w.growth.relayWindow>0||w.growth.watchTime>0||w.growth.storedGuard>0);
  const inventory=[...w.inventory],path=w.growth.path;w.growth.rerolls=1;
  w.enterRoom('battle');
  assert.equal(w.growth.relayOwner,-1);assert.equal(w.growth.relayWindow,0);
  assert.equal(w.growth.watchTime,0);assert.equal(w.growth.storedGuard,0);
  assert.equal(w.growth.rerolls,1);assert.equal(w.growth.path,path);assert.deepEqual(w.inventory,inventory);
  w.reset(false,2);assert.deepEqual(w.inventory,[]);assert.equal(w.growth.rerolls,2);
  assert.equal(w.growth.watchTime,0);assert.equal(w.growth.storedGuard,0);assert.equal(w.enemies.includes(e),false);
});
