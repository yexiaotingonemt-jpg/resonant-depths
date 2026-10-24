import {buildLevel,relicRank,type BuildPath} from './data';
import type {World,Player,Enemy,Vec} from './sim';

export const initialGrowth=()=>({drafting:false,path:'' as BuildPath|'',rerolls:2,offerRevision:0,relayOwner:-1,relayWindow:0,relayCooldown:0,relayRefundCooldown:0,handoff:0,storedGuard:0,thornsCooldown:0,watchTime:0,watchCooldown:0,mendCooldown:0,lifelineUsed:false,seedCooldown:0});
export const rank=(w:World,id:string)=>relicRank(w.inventory,id);
export const level=(w:World,path:BuildPath)=>buildLevel(w.inventory,path);
const dist=(a:Vec,b:Vec)=>Math.hypot(a.x-b.x,a.y-b.y);
const refund=(p:Player,n:number)=>p.skill=Math.max(0,p.skill-n);
export const markDuration=(w:World)=>(w.difficulty==='gentle'?8:6)+rank(w,'relay_window')*1.5;
export const fractureDuration=(w:World)=>(w.difficulty==='gentle'?7:5)+rank(w,'relay_window')*1.5;
export const skillRadius=(w:World,id:number)=>(id===0?175:400)+rank(w,'vortex_reach')*(id===0?30:40)+(level(w,'vortex')>=3?30:0);
export const barrierCap=(w:World)=>55+20*rank(w,'bulwark_capacity');
export const barrierDuration=(w:World)=>6+rank(w,'bulwark_capacity');
export const rescueHitsNeeded=(w:World)=>rank(w,'rescue_release')?2:3;
export const reviveRange=(w:World)=>78+25*rank(w,'rescue_release');
export const reviveRate=(w:World)=>w.stats.revive*(rank(w,'rescue_release')?1.3:1);

export function tickGrowth(w:World,dt:number){
 for(const key of ['relayWindow','relayCooldown','relayRefundCooldown','handoff','thornsCooldown','watchTime','watchCooldown','mendCooldown','seedCooldown'] as const)w.growth[key]=Math.max(0,w.growth[key]-dt);
 if(w.growth.relayWindow<=0)w.growth.relayOwner=-1;
}
export function enterGrowthRoom(w:World){
 const saved=w.growth;w.growth={...initialGrowth(),path:saved.path,rerolls:saved.rerolls,offerRevision:saved.offerRevision,lifelineUsed:saved.lifelineUsed};
 if(rank(w,'bulwark_oath'))w.grantBarrier(20);
}
export function damageGrowth(w:World,owner:number){
 let bonus=0;if(w.growth.handoff>0)bonus+=.12*rank(w,'relay_handoff')+(level(w,'relay')>=5?.2:0);
 if(w.growth.watchTime>0)bonus+=.25;
 if(owner===0||owner===1){const ally=w.players[1-owner];if(ally.down||ally.hp<=ally.maxHp*.45)bonus+=.12*rank(w,'rescue_courage');}
 return 1+bonus;
}
export function watch(w:World){
 const g=w.growth,l=level(w,'rescue');if((!rank(w,'rescue_oath')&&l<3)||g.watchCooldown>0)return;
 g.watchTime=l>=3?8:6;g.watchCooldown=l>=5?8:12;w.cooperate('支援成功！两人的伤害提高 25%');w.eventQueue.push('watch');
 for(const p of w.players)if(!p.down)w.effect('ring',p,0xf3d083,60);
}
function mend(w:World,target:Player){const n=rank(w,'rescue_mend');if(!n||target.down||w.growth.mendCooldown>0)return;target.hp=Math.min(target.maxHp,target.hp+8*n);w.growth.mendCooldown=10;w.effect('heal',target,0x8ce0bb,65);}
export function rescued(w:World,target:Player){watch(w);mend(w,target);if(level(w,'rescue')>=3)w.healAll(8);}
function pull(w:World,center:Vec,radius:number){
 let moved=false;
 for(const e of w.enemies){const d=dist(e,center);if(e.hp<=0||e.kind==='boss'||d<=100||d>radius)continue;const remaining=Math.max(100,d-150);e.x=center.x+(e.x-center.x)/d*remaining;e.y=center.y+(e.y-center.y)/d*remaining;moved=true;}
 if(moved){w.effect('ring',center,0x8db9e7,radius);w.eventQueue.push('vortex');}
}
export function skillStarted(w:World,p:Player){
 const g=w.growth,ally=w.players[1-p.id],rl=level(w,'relay'),vl=level(w,'vortex');
 if(!ally.down&&ally.hp<=ally.maxHp*.45&&dist(p,ally)<=400){watch(w);mend(w,ally);}
 if(rank(w,'relay_oath')||rank(w,'relay_echo')||rank(w,'relay_handoff')||rl>=3){
  if(g.relayOwner>=0&&g.relayOwner!==p.id&&g.relayWindow>0&&g.relayCooldown<=0){
   const previous=w.players[g.relayOwner];refund(previous,(rank(w,'relay_oath')?1.2:0)+(rl>=3?1:0));
   if(rl>=5)for(const player of w.players)refund(player,1);
   if(rank(w,'relay_handoff')||rl>=5)g.handoff=5;
   const echo=(rank(w,'relay_oath')?24:0)+rank(w,'relay_echo')*16;if(echo)w.area(p,160,echo*w.stats.damage,0xffbf72,p.id,true);
   g.relayCooldown=1.5;w.cooperate('搭档接上了技能！');w.eventQueue.push('relay');
  }
  g.relayOwner=p.id;g.relayWindow=rl>=3?6:4;
 }
 if(p.id===0){
  if(rank(w,'vortex_oath'))pull(w,p,300+rank(w,'vortex_reach')*30+(vl>=3?30:0));
  if(g.storedGuard>0&&(rank(w,'bulwark_oath')||level(w,'bulwark')>=3)){
   const l=level(w,'bulwark'),stored=g.storedGuard;g.storedGuard=0;w.area(p,l>=5?260:200,stored*(l>=3?1.25:1),0x89dfd3,0,true);
   if(l>=5)w.grantBarrier(20);w.cooperate(`释放反击！消耗 ${Math.round(stored)} 点蓄能`);w.eventQueue.push('counter');
  }
 }
}
export function skillHit(w:World,e:Enemy){const n=rank(w,'vortex_still');if(n)e.slow=Math.max(e.slow,n*2);}
export function shattered(w:World,e:Enemy){
 const g=w.growth,n=rank(w,'relay_refund');if(n&&g.relayRefundCooldown<=0){refund(w.players[1],.35*n);g.relayRefundCooldown=.6;}
 const spread=rank(w,'vortex_seed')*2+(level(w,'vortex')>=5?2:0);
 if(spread&&g.seedCooldown<=0){
  const targets=w.enemies.filter(other=>other!==e&&other.hp>0&&other.mark<=0&&dist(other,e)<=150).sort((a,b)=>dist(a,e)-dist(b,e)).slice(0,spread);
  if(targets.length){for(const other of targets){other.mark=markDuration(w);w.effect('ring',other,0x8adccb,other.r+12);}g.seedCooldown=1.2;w.eventQueue.push('vortex');}
 }
}
export function detonated(w:World,e:Enemy,count:number){
 if(count===1)refund(w.players[0],rank(w,'relay_refund')*.6+rank(w,'bulwark_return')*.4);
 if(count>3)return;
 const l=level(w,'vortex');if(l>=5)pull(w,e,260);
 const damage=(rank(w,'vortex_oath')?30:0)+(l>=3?15:0);
 // Splash is an ordinary hit: it cannot recursively mark, fracture or detonate.
 if(damage){for(const other of w.enemies)if(other!==e&&other.hp>0&&dist(e,other)<140+other.r)w.hurtEnemy(other,damage*w.stats.damage,1,'other',true);w.effect('ring',e,0x90c9e8,140);w.eventQueue.push('vortex');}
}
export function blocked(w:World,p:Player,n:number){
 const g=w.growth,l=level(w,'bulwark');if(rank(w,'bulwark_oath')||l>=3)g.storedGuard=Math.min(l>=5?100:l>=3?80:60,g.storedGuard+n);
 const thorns=rank(w,'bulwark_thorns');if(thorns&&g.thornsCooldown<=0){g.thornsCooldown=.8;w.area(p,160,Math.min(25,n*.5*thorns),0x9bd7c6,p.id,true);}
}
export function lifeline(w:World,p:Player){
 const ally=w.players[1-p.id];if(!rank(w,'rescue_lifeline')||w.growth.lifelineUsed||ally.down||dist(p,ally)>500)return false;
 w.growth.lifelineUsed=true;p.hp=p.maxHp*.3;p.inv=2;w.effect('heal',p,0xffe0a2,80);w.cooperate('保命成功！生命回到 30%，本局机会已用掉');w.eventQueue.push('watch');return true;
}
