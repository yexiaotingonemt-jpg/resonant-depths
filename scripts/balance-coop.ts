// A reproducible simulation probe, not a substitute for two-person playtesting.
// Run: npx tsx scripts/balance-coop.ts
import {World,idle,distance,type Action,type Player,type Enemy} from '../src/sim';

type Mode='stationary pair'|'P1 alone'|'P2 alone'|'independent pair'|'coordinated pair'|'P1 + AI';
const modes:Mode[]=['stationary pair','P1 alone','P2 alone','independent pair','coordinated pair'];

function control(w:World,p:Player,mode:Mode):Action {
  if(p.down||mode==='stationary pair')return idle();
  const team=mode==='coordinated pair'||mode==='P1 + AI';
  const ally=w.players[1-p.id];
  if(ally.down&&mode!=='P1 alone'&&mode!=='P2 alone'){
    const d=distance(p,ally);
    return {x:d>55?(ally.x-p.x)/d:0,y:d>55?(ally.y-p.y)/d:0,dash:d>350,skill:true,ult:false};
  }
  const live=w.enemies.filter(e=>e.hp>0);
  const order=(list:Enemy[])=>list.sort((a,b)=>distance(a,p)-distance(b,p));
  const binding=live.find(e=>e.snareTarget===1-p.id);
  const target=team?(binding??order(live.filter(e=>p.id===0?e.mark>0:e.fracture>0))[0]??order(live)[0]):order(live)[0];
  if(!target)return idle();
  const d=distance(p,target),range=p.id===0?95:240;
  let x=0,y=0;
  if(d>range+15){x=(target.x-p.x)/d;y=(target.y-p.y)/d;}
  if(d<range-30){x=(p.x-target.x)/(d||1);y=(p.y-target.y)/(d||1);}
  // Orbit while engaging and move away from incoming projectiles. Both modes
  // share identical evasion so the comparison isolates target/skill timing.
  x+=(target.y-p.y)/(d||1)*.35;y-=(target.x-p.x)/(d||1)*.35;
  let danger=false;
  for(const enemy of live){
    const ed=distance(enemy,p);
    if(ed<enemy.r+38){x+=(p.x-enemy.x)/(ed||1)*2;y+=(p.y-enemy.y)/(ed||1)*2;danger=true;}
  }
  for(const bullet of w.bullets){
    if(bullet.owner>=0)continue;
    const bd=distance(bullet,p);
    if(bd<70){x+=(p.x-bullet.x)/(bd||1)*1.8;y+=(p.y-bullet.y)/(bd||1)*1.8;danger=true;}
  }
  const n=Math.hypot(x,y);if(n>1){x/=n;y/=n;}
  const skill=p.id===0
    ?live.some(e=>distance(e,p)<165&&(!team||e.mark>0||e.snareTarget===1))
    :live.some(e=>distance(e,p)<390&&(!team||e.fracture>0||e.snareTarget===0));
  return {x,y,dash:danger,skill,ult:w.charge>=100};
}

function run(mode:Mode,room:number,seed:number){
  const w=new World();w.reset(false,seed);w.room=room;w.enterRoom('battle');
  if(room===2){w.applyRelic('health');w.applyRelic('power');}
  if(mode==='P1 alone'||mode==='P2 alone'){
    const disabled=w.players[mode==='P1 alone'?1:0];
    disabled.down=true;disabled.hp=0;disabled.x=1100;disabled.y=650;
  }
  for(let f=0;f<180*60&&w.phase==='playing';f++){
    w.update(1/60,w.players.map(p=>control(w,p,mode)));w.eventQueue=[];
    // Solo probes keep the second role absent rather than accidentally reviving
    // it by crossing the inactive guardian's position.
    if(mode==='P1 alone'||mode==='P2 alone'){
      const disabled=w.players[mode==='P1 alone'?1:0];disabled.down=true;disabled.hp=0;disabled.revive=0;
    }
  }
  return {mode,room:room+1,seed,outcome:w.phase,seconds:Math.round(w.roomTime*10)/10,hp:w.players.map(p=>Math.round(p.hp)).join('/'),kills:w.kills,links:w.coop.links,bursts:w.coop.bursts,rescues:w.coop.rescues,enemies:w.enemies.length};
}

const rows=[];
for(const room of [0,2])for(const mode of modes)for(const seed of [42,1337,20261023])rows.push(run(mode,room,seed));
console.table(rows);

function campaign(mode:Mode,seed:number){
  const w=new World();w.reset(mode==='P1 + AI',seed);
  const priority=['health','skill','power','armor','charge','haste','speed','revive','close','multishot','chain','nova','pierce','leech','magnet','frost','dash','orbit'];
  let frames=0;
  while(frames<9*180*60&&w.phase!=='lost'&&w.phase!=='won'){
    if(w.phase==='reward'){
      const offer=[...w.choices].sort((a,b)=>priority.indexOf(a.id)-priority.indexOf(b.id))[0];
      w.choose(offer.id);
    }else if(w.phase==='route'){
      w.enterRoom(w.routes.includes('battle')?'battle':w.routes.includes('spring')?'spring':w.routes[0]);
    }else if(w.phase==='playing'){
      w.update(1/60,w.players.map(p=>control(w,p,mode)));w.eventQueue=[];frames++;
    }else throw new Error(`Unexpected campaign phase: ${w.phase}`);
  }
  return {mode,seed,outcome:w.phase,room:w.room+1,seconds:Math.round(frames/6)/10,hp:w.players.map(p=>Math.round(p.hp)).join('/'),links:w.coop.links,bursts:w.coop.bursts,rescues:w.coop.rescues,revives:w.revives,relics:w.inventory.join(',')};
}

if(process.argv.includes('--campaign')){
  const campaigns=[];
  for(const mode of ['independent pair','coordinated pair','P1 + AI'] as Mode[])for(const seed of [42,1337,20261023])campaigns.push(campaign(mode,seed));
  console.table(campaigns);
}
