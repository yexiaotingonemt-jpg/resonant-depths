// Deterministic input-driven balance probes; these are not human win rates.
// Run: npx tsx scripts/balance-builds.ts [--campaign]
import {World,idle,distance,type Action,type Player,type Enemy} from '../src/sim';
import {buildPaths,buildLevel,type BuildPath,type Relic} from '../src/data';

const packages:Record<BuildPath,string[]>={
  relay:['relay_oath','relay_refund','relay_echo','relay_window','relay_handoff'],
  bulwark:['bulwark_oath','bulwark_capacity','bulwark_share','bulwark_thorns','bulwark_return'],
  vortex:['vortex_oath','vortex_thread','vortex_still','vortex_seed','vortex_reach'],
  rescue:['rescue_oath','rescue_mend','rescue_release','rescue_lifeline','rescue_courage']
};
const seeds=[42,1337,20261024];
function control(w:World,p:Player):Action {
  if(p.down)return idle();
  const ally=w.players[1-p.id];
  if(ally.down){const d=distance(p,ally);return {x:d>55?(ally.x-p.x)/d:0,y:d>55?(ally.y-p.y)/d:0,dash:d>350,skill:true,ult:false};}
  const live=w.enemies.filter(e=>e.hp>0),order=(list:Enemy[])=>list.sort((a,b)=>distance(a,p)-distance(b,p));
  const target=live.find(e=>e.snareTarget===1-p.id)??order(live.filter(e=>p.id===0?e.mark>0:e.fracture>0))[0]??order(live)[0];
  if(!target)return idle();
  const d=distance(p,target),range=p.id===0?95:240;
  let x=d>range+15?(target.x-p.x)/(d||1):d<range-30?(p.x-target.x)/(d||1):0;
  let y=d>range+15?(target.y-p.y)/(d||1):d<range-30?(p.y-target.y)/(d||1):0;
  x+=(target.y-p.y)/(d||1)*.35;y-=(target.x-p.x)/(d||1)*.35;
  let danger=false;
  for(const e of live){const ed=distance(e,p);if(ed<e.r+38){x+=(p.x-e.x)/(ed||1)*2;y+=(p.y-e.y)/(ed||1)*2;danger=true;}}
  for(const b of w.bullets){if(b.owner>=0)continue;const bd=distance(b,p);if(bd<70){x+=(p.x-b.x)/(bd||1)*1.8;y+=(p.y-b.y)/(bd||1)*1.8;danger=true;}}
  const n=Math.hypot(x,y);if(n>1){x/=n;y/=n;}
  const critical=ally.hp/ally.maxHp<=.45&&distance(ally,p)<390;
  const skill=p.id===0
    ?live.some(e=>distance(e,p)<165&&(e.mark>0||e.snareTarget===1))||critical||w.growth.storedGuard>=20
    :live.some(e=>distance(e,p)<390&&(e.fracture>0||e.snareTarget===0))||critical;
  return {x,y,dash:danger,skill,ult:w.charge>=100};
}
function playFrame(w:World,events:Record<string,number>){
  w.update(1/60,w.players.map(p=>control(w,p)));
  if(w.players.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)))throw new Error('Controller or simulation produced a nonfinite position');
  for(const event of w.eventQueue)events[event]=(events[event]||0)+1;
  w.eventQueue=[];
}
function metrics(w:World,events:Record<string,number>){
  return {outcome:w.phase,hp:w.players.map(p=>Math.round(p.hp)).join('/'),links:w.coop.links,bursts:w.coop.bursts,rescues:w.coop.rescues,revives:w.revives,skills:events.skill||0,events:Object.entries(events).filter(([event])=>!['shot','skill','hurt','kill','dash','boss','bosskill','select','clear','shatter','detonate','snare','rescue','ult','ult-ready','revive','end'].includes(event)).map(([k,v])=>`${k}:${v}`).join(',')};
}
function encounter(path:BuildPath|'generic',room:number,seed:number){
  const w=new World();w.reset(false,seed);
  // Every package spends exactly five selections. No health, invulnerability,
  // enemy position or cooldown overrides are used after normal room setup.
  const ids=path==='generic'?['health','power','haste','armor','charge']:packages[path];
  for(const id of ids)if(!w.applyRelic(id))throw new Error(`Rejected package relic ${id}`);
  w.room=room;w.enterRoom('battle');const events:Record<string,number>={};
  for(let frame=0;frame<180*60&&w.phase==='playing';frame++)playFrame(w,events);
  return {path,room:room+1,seed,seconds:Math.round(w.roomTime*10)/10,...metrics(w,events)};
}
const results=[];
for(const room of [1,2,5])for(const path of ['generic',...buildPaths.map(p=>p.id)] as const)for(const seed of seeds)results.push(encounter(path,room,seed));
console.table(results);

function draft(path:BuildPath,initialSeed:number){
  // A real draft offers only three of four oaths. Search deterministically for
  // the requested option; print the actual seed so every run can be reproduced.
  for(let offset=0;offset<100;offset++){
    const w=new World();w.reset(false,initialSeed+offset);w.beginDraft();
    const core=w.choices.find(r=>r.core&&r.path===path);
    if(core){w.choose(core.id);return w;}
  }
  throw new Error(`Could not draft ${path}`);
}
function chooseBuildReward(w:World,path:BuildPath){
  const rank=(r:Relic)=>w.inventory.filter(id=>id===r.id).length;
  const score=(r:Relic)=>(r.path===path?30:0)+(r.id==='health'?12:r.id==='armor'?8:r.id==='power'?6:0)-rank(r)*3;
  return [...w.choices].sort((a,b)=>score(b)-score(a))[0];
}
function campaign(path:BuildPath,seed:number){
  const w=draft(path,seed),events:Record<string,number>={};let frames=0;
  while(frames<9*180*60&&w.phase!=='lost'&&w.phase!=='won'){
    if(w.phase==='reward')w.choose(chooseBuildReward(w,path).id);
    else if(w.phase==='route')w.enterRoom(w.routes.includes('battle')?'battle':w.routes.includes('spring')?'spring':w.routes[0]);
    else if(w.phase==='playing'){playFrame(w,events);frames++;}
    else throw new Error(`Unexpected phase ${w.phase}`);
  }
  return {path,seed:w.seed,room:w.room+1,rank:buildLevel(w.inventory,path),seconds:Math.round(frames/6)/10,...metrics(w,events),relics:w.inventory.join(',')};
}
if(process.argv.includes('--campaign')){
  const runs=[];for(const path of buildPaths)for(const seed of seeds)runs.push(campaign(path.id,seed));
  console.table(runs);
}
