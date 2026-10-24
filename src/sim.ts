import {relics, relicRank, type Relic, type Route} from './data';
import * as builds from './builds';
export const W=1280,H=800;
export const bounds={left:95,right:1185,top:138,bottom:690};
export type Phase='menu'|'playing'|'paused'|'reward'|'route'|'won'|'lost';
export type Vec={x:number;y:number};
export type Action=Vec & {dash:boolean;skill:boolean;ult:boolean};
export type Player=Vec & {id:number;hp:number;maxHp:number;dir:Vec;moving:boolean;shot:number;dash:number;dashTime:number;skill:number;inv:number;down:boolean;revive:number;trail:Vec[];barrier:number;barrierTime:number;ultReady:number};
export type Enemy=Vec & {id:number;kind:'chaser'|'ranged'|'brute'|'dasher'|'boss';hp:number;maxHp:number;r:number;speed:number;cd:number;hit:number;slow:number;windup:number;target:Vec;phase:number;facing:Vec;moving:boolean;mark:number;fracture:number;guard:boolean;taunt:number;snareTarget:number;snareTime:number;snareHits:number};
export type Bullet=Vec & {id:number;vx:number;vy:number;damage:number;life:number;r:number;owner:number;pierce:number;hit:number[]};
export type Fx=Vec & {kind:'ring'|'hit'|'heal'|'death'|'dash'|'text'|'spawn';life:number;max:number;color:number;size:number;text?:string};
export type Pickup=Vec & {value:number};
export type Hazard=Vec & {timer:number;duration:number;r:number};
export const distance=(a:Vec,b:Vec)=>Math.hypot(a.x-b.x,a.y-b.y);
export const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
export function segmentDistance(p:Vec,a:Vec,b:Vec){const dx=b.x-a.x,dy=b.y-a.y,l=dx*dx+dy*dy,t=l?clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/l,0,1):0;return Math.hypot(p.x-a.x-dx*t,p.y-a.y-dy*t);}
export const idle=():Action=>({x:0,y:0,dash:false,skill:false,ult:false});
export class World {
 phase:Phase='menu'; beforePause:Phase='playing'; players:Player[]=[];enemies:Enemy[]=[];bullets:Bullet[]=[];fx:Fx[]=[];pickups:Pickup[]=[];hazards:Hazard[]=[];
 room=0;time=0;roomTime=0;wave=0;waves=2;spawnTimer=1;intermission=0;charge=0;ultFlash=0;link=true;chainTick=0;bossName='';
 seed=1;randomState=1;nextId=1;kills=0;dust=0;combo=0;bestCombo=0;comboTimer=0;revives=0;ai=true;difficulty='normal';route:Route='battle';
 inventory:string[]=[];choices:Relic[]=[];routes:Route[]=[];eventQueue:string[]=[];notice='';noticeTime=0;
 coop={links:0,rescues:0,bursts:0,last:'',lastTime:0};
 growth=builds.initialGrowth();
 stats={damage:1,rate:1,maxHp:100,speed:190,dashCd:2.2,skillCd:8,chain:1,linkRange:400,nova:1,roomCharge:0,pierce:0,shots:1,leech:0,armor:1,revive:1,reviveHp:.45,chargeRate:1,healUlt:0,frost:0,orbit:0,dashDamage:0,close:0,skill:1,magnet:0};
 constructor(){this.reset(true,1);this.phase='menu';}
 rand(){let t=this.randomState+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;}
 reset(ai:boolean,seed:number,difficulty='normal'){
  this.ai=ai;this.seed=seed>>>0;this.randomState=this.seed;this.difficulty=difficulty;this.phase='playing';this.room=0;this.time=0;this.nextId=1;this.kills=0;this.dust=0;this.combo=0;this.bestCombo=0;this.revives=0;this.inventory=[];this.eventQueue=[];this.charge=0;this.ultFlash=0;this.coop={links:0,rescues:0,bursts:0,last:'',lastTime:0};this.growth=builds.initialGrowth();
  this.stats={damage:1,rate:1,maxHp:100,speed:190,dashCd:2.2,skillCd:8,chain:1,linkRange:400,nova:1,roomCharge:0,pierce:0,shots:1,leech:0,armor:1,revive:1,reviveHp:.45,chargeRate:1,healUlt:0,frost:0,orbit:0,dashDamage:0,close:0,skill:1,magnet:0};
  this.players=[0,1].map(id=>({id,x:570+id*140,y:420,hp:100,maxHp:100,dir:{x:0,y:1},moving:false,shot:0,dash:0,dashTime:0,skill:0,inv:1,down:false,revive:0,trail:[],barrier:0,barrierTime:0,ultReady:0}));this.enterRoom('battle');
 }
 notify(s:string){this.notice=s;this.noticeTime=3;}
 cooperate(s:string){this.coop.last=s;this.coop.lastTime=3.5;}
 effect(kind:Fx['kind'],p:Vec,color:number,size=30,text?:string){const life=kind==='text'?1:kind==='spawn'?.8:.55;this.fx.push({...p,kind,color,size,life,max:life,text});}
 enterRoom(route:Route){
  this.route=route;this.phase='playing';this.enemies=[];this.bullets=[];this.pickups=[];this.fx=[];this.hazards=[];this.wave=0;this.roomTime=0;this.spawnTimer=1.6;this.intermission=0;this.waves=this.room%3===2?1:2+(this.room>=3?1:0);this.bossName='';this.coop.last='';this.coop.lastTime=0;
  this.players.forEach((p,i)=>{p.x=570+i*140;p.y=430;p.inv=2;p.dash=0;p.skill=Math.min(p.skill,2);p.trail=[];p.moving=false;p.barrier=0;p.barrierTime=0;p.ultReady=0;if(p.down){p.down=false;p.hp=p.maxHp*.35;p.revive=0;}});
  builds.enterGrowthRoom(this);if(route==='spring')this.healAll(this.stats.maxHp*.35);if(route==='elite')this.healAll(10);this.charge=clamp(this.charge+this.stats.roomCharge,0,100);this.notify(this.room%3===2?'首领有护甲：澜先标记，再让烬破甲':'澜先标记 → 烬打破标记 → 澜用技能引爆');
 }
 togglePause(){if(this.phase==='paused')this.phase=this.beforePause;else if(this.phase==='playing'){this.beforePause=this.phase;this.phase='paused';}}
 nearest(p:Vec){return this.enemies.filter(e=>e.hp>0).sort((a,b)=>distance(a,p)-distance(b,p))[0];}
 attackTarget(p:Player){
  const range=p.id===0?240:490,candidates=this.enemies.filter(e=>e.hp>0&&distance(e,p)<range);
  const rescue=candidates.find(e=>e.snareTarget===1-p.id&&e.snareTime>0);if(rescue)return rescue;
  if(p.id===0)return candidates.sort((a,b)=>Number(b.mark>0)-Number(a.mark>0)||distance(a,p)-distance(b,p))[0];
  const ally=this.players[0];
  // Light the opponent the breaker can reach, so auto fire follows the shared plan.
  return candidates.sort((a,b)=>Number(distance(b,ally)<280)-Number(distance(a,ally)<280)||Number(a.mark>0)-Number(b.mark>0)||distance(a,ally)-distance(b,ally))[0];
 }
 aiAction():Action{
  const p=this.players[1],a=this.players[0];if(!p||p.down)return idle();let x=0,y=0;const add=(v:Vec,k:number)=>{x+=v.x*k;y+=v.y*k;};
  const d=distance(a,p),e=this.nearest(p),rescue=this.enemies.find(e=>e.snareTarget===0&&e.snareTime>0),fracture=this.enemies.find(e=>e.hp>0&&e.fracture>0);
  if(a.down){if(d>56)add({x:a.x-p.x,y:a.y-p.y},4);}
  else{if(d>230)add({x:a.x-p.x,y:a.y-p.y},1.4);else if(d<110)add({x:p.x-a.x,y:p.y-a.y},.8);
   const objective=rescue||fracture||this.nearest(a);if(objective&&distance(objective,p)>330)add({x:objective.x-p.x,y:objective.y-p.y},rescue?2:1);
   if(e){const ed=distance(p,e);if(ed<155)add({x:p.x-e.x,y:p.y-e.y},2.8);else if(ed>370)add({x:e.x-p.x,y:e.y-p.y},.25);}
  }
  for(const b of this.bullets)if(b.owner<0&&distance(b,p)<95)add({x:p.x-b.x,y:p.y-b.y},4);
  const needsSupport=!a.down&&a.hp<=a.maxHp*.45&&distance(a,p)<=400&&(builds.rank(this,'rescue_oath')||builds.rank(this,'rescue_mend')||builds.level(this,'rescue')>=3);
  const relayReply=this.growth.relayOwner===0&&this.growth.relayWindow>0&&!!e;
  const n=Math.hypot(x,y);return{x:n>15?x/n:0,y:n>15?y/n:0,dash:!a.down&&!!e&&distance(e,p)<70,skill:!!needsSupport||relayReply||this.enemies.some(e=>e.hp>0&&distance(e,p)<builds.skillRadius(this,1)+e.r&&(e.fracture>0||e.snareTarget===0)),ult:this.charge>=100&&a.ultReady>0};
 }
 update(dt:number,actions:Action[]){
  if(this.phase!=='playing')return;dt=Math.min(dt,.04);this.time+=dt;this.roomTime+=dt;this.noticeTime-=dt;this.coop.lastTime=Math.max(0,this.coop.lastTime-dt);this.ultFlash=Math.max(0,this.ultFlash-dt);this.comboTimer-=dt;if(this.comboTimer<=0)this.combo=0;builds.tickGrowth(this,dt);
  this.fx.forEach(f=>f.life-=dt);this.fx=this.fx.filter(f=>f.life>0);if(this.ai)actions[1]=this.aiAction();
  const [a,b]=this.players;this.link=!a.down&&!b.down&&distance(a,b)<=this.stats.linkRange+60*builds.rank(this,'vortex_thread');
  this.players.forEach((p,i)=>this.updatePlayer(p,actions[i]||idle(),dt));
  this.enemies.forEach(e=>this.updateEnemy(e,dt));
  for(const hazard of this.hazards){hazard.timer-=dt;if(hazard.timer<=0){this.effect('ring',hazard,0xec98b6,hazard.r);for(const p of this.players)if(!p.down&&distance(p,hazard)<hazard.r)this.hurtPlayer(p,24);}}
  this.hazards=this.hazards.filter(h=>h.timer>0);
  for(let i=0;i<this.enemies.length;i++)for(let j=i+1;j<this.enemies.length;j++){const e=this.enemies[i],f=this.enemies[j],d=distance(e,f),r=(e.r+f.r)*.8;if(d>0&&d<r){const k=(r-d)*.5;e.x+=(e.x-f.x)/d*k;e.y+=(e.y-f.y)/d*k;f.x-=(e.x-f.x)/d*k;f.y-=(e.y-f.y)/d*k;}}
  this.chainTick=Math.max(0,this.chainTick-dt);
  for(const bullet of this.bullets){bullet.x+=bullet.vx*dt;bullet.y+=bullet.vy*dt;bullet.life-=dt;
   if(bullet.owner>=0){for(const e of this.enemies)if(e.hp>0&&!bullet.hit.includes(e.id)&&distance(e,bullet)<e.r+bullet.r){this.hurtEnemy(e,bullet.damage,bullet.owner,'basic');if(this.stats.frost)e.slow=Math.max(e.slow,1.5*this.stats.frost);bullet.hit.push(e.id);if(bullet.pierce--<=0){bullet.life=0;break;}}}
   else for(const p of this.players)if(!p.down&&distance(p,bullet)<14+bullet.r){this.hurtPlayer(p,10+this.room*1.1);bullet.life=0;break;}
  }
  this.bullets=this.bullets.filter(b=>b.life>0&&b.x>45&&b.x<W-45&&b.y>75&&b.y<H-70);
  for(const p of this.players)if(!p.down){for(const orb of this.pickups){let d=distance(p,orb);if(d<70+this.stats.magnet){orb.x+=(p.x-orb.x)*dt*9;orb.y+=(p.y-orb.y)*dt*9;if(d<24){this.dust+=orb.value;orb.value=0;}}}}
  this.pickups=this.pickups.filter(p=>p.value>0);this.enemies=this.enemies.filter(e=>e.hp>0);
  if(this.players.every(p=>p.down)){this.phase='lost';this.eventQueue.push('end');return;}
  if(this.enemies.length===0){this.spawnTimer-=dt;if(this.spawnTimer<=0){if(this.wave<this.waves)this.spawnWave();else{this.dust+=this.pickups.reduce((s,p)=>s+p.value,0)+20+(this.stats.magnet?20:0);this.pickups=[];this.phase='reward';this.choices=this.offerRelics();this.eventQueue.push('clear');if(this.room===8){this.phase='won';this.eventQueue.push('end');}}}}
 }
 updatePlayer(p:Player,input:Action,dt:number){
  p.moving=false;p.inv=Math.max(0,p.inv-dt);p.dash=Math.max(0,p.dash-dt);p.skill=Math.max(0,p.skill-dt);p.shot-=dt;p.dashTime=Math.max(0,p.dashTime-dt);p.barrierTime=Math.max(0,p.barrierTime-dt);if(p.barrierTime<=0)p.barrier=0;p.ultReady=Math.max(0,p.ultReady-dt);
  if(p.down){p.ultReady=0;const ally=this.players[1-p.id];if(!ally.down&&distance(ally,p)<this.reviveRange()){p.revive+=dt*builds.reviveRate(this);if(p.revive>=2.8){p.down=false;p.hp=p.maxHp*this.stats.reviveHp;p.inv=2;p.revive=0;this.revives++;this.coop.rescues++;this.addCharge(15);builds.rescued(this,p);this.cooperate('搭档已扶起 · 合击能量 +15');this.effect('heal',p,0x8ee5c6,70);this.notify('搭档站起来了！');this.eventQueue.push('revive');}}else p.revive=Math.max(0,p.revive-dt*.5);return;}
  let n=Math.hypot(input.x,input.y);const mx=n>1?input.x/n:input.x,my=n>1?input.y/n:input.y;if(n>.1)p.dir={x:mx,y:my};p.moving=n>.1||p.dashTime>0;
  if(input.dash&&p.dash<=0){p.dash=this.stats.dashCd;p.dashTime=.18;p.inv=Math.max(p.inv,.32);this.eventQueue.push('dash');this.effect('dash',p,p.id?0x80dfcf:0xf6c778,40);if(this.stats.dashDamage)this.area(p,95,this.stats.dashDamage,0xf6c778,p.id);}
  const snared=this.enemies.some(e=>e.hp>0&&e.snareTarget===p.id&&e.snareTime>0),speed=this.stats.speed*(p.dashTime>0?4.8:1)*(snared?.55:1);p.x=clamp(p.x+(p.dashTime>0?p.dir.x:mx)*speed*dt,bounds.left,bounds.right);p.y=clamp(p.y+(p.dashTime>0?p.dir.y:my)*speed*dt,bounds.top,bounds.bottom);
  p.trail.unshift({x:p.x,y:p.y});p.trail.length=Math.min(p.trail.length,8);
  if(input.skill&&p.skill<=0)this.castSkill(p);
  if(input.ult&&this.charge>=100&&!this.players.some(x=>x.down)){
   if(p.ultReady<=0){p.ultReady=4;this.eventQueue.push('ult-ready');this.cooperate(`${p.id===0?'烬':'澜'}准备合击 · 搭档请在 4 秒内按合击键`);}
   if(this.players.every(x=>x.ultReady>0)){this.players.forEach(x=>x.ultReady=0);this.charge=0;this.ultFlash=.8;this.area({x:640,y:400},2000,220*this.stats.nova,0xffedb4,-1,true);this.bullets=this.bullets.filter(b=>b.owner>=0);this.healAll(15+this.stats.healUlt);this.grantBarrier(35);this.eventQueue.push('ult');this.cooperate('两人都已确认，释放合击！');this.notify('双人合击！');}
  }
  const enemy=this.attackTarget(p);if(enemy&&p.shot<=0){p.shot=(p.id===0?.7:.65)*this.stats.rate;const angle=Math.atan2(enemy.y-p.y,enemy.x-p.x);if(!p.moving)p.dir={x:Math.cos(angle),y:Math.sin(angle)};for(let s=0;s<this.stats.shots;s++){const t=angle+(s-(this.stats.shots-1)/2)*.17;this.bullets.push({id:this.nextId++,x:p.x,y:p.y,vx:Math.cos(t)*490,vy:Math.sin(t)*490,r:p.id?5:6,life:p.id?1.06:.53,owner:p.id,damage:(p.id?7:12)*this.stats.damage,pierce:this.stats.pierce,hit:[]});}this.eventQueue.push('shot');}
  if(this.stats.orbit){const o={x:p.x+Math.cos(this.time*3+p.id*3)*55,y:p.y+Math.sin(this.time*3+p.id*3)*55};for(const e of this.enemies)if(distance(e,o)<e.r+12)this.hurtEnemy(e,30*this.stats.orbit*dt,p.id);}
 }
 addCharge(n:number){this.charge=clamp(this.charge+n*this.stats.chargeRate,0,100);}
 rescueHitsNeeded(){return builds.rescueHitsNeeded(this);}
 reviveRange(){return builds.reviveRange(this);}
 reviveSeconds(){return 2.8/builds.reviveRate(this);}
 healAll(n:number){if(!n)return;for(const p of this.players)if(!p.down){p.hp=Math.min(p.maxHp,p.hp+n);this.effect('heal',p,0x89dbb7,45);}}
 grantBarrier(n:number){const p=this.players[0];if(p.down||n<=0)return;p.barrier=Math.min(builds.barrierCap(this),p.barrier+n);p.barrierTime=builds.barrierDuration(this);this.effect('heal',p,0x85e2d1,40);const share=builds.rank(this,'bulwark_share'),ally=this.players[1];if(share&&!ally.down){ally.barrier=Math.min(builds.barrierCap(this),ally.barrier+n*.35*share);ally.barrierTime=p.barrierTime;this.effect('heal',ally,0x85e2d1,35);}}
 shatter(e:Enemy){e.mark=0;e.fracture=builds.fractureDuration(this);this.coop.links++;this.addCharge(8);this.cooperate('敌人已破甲！澜用技能引爆，给烬加盾');this.effect('ring',e,0xffca77,e.r+25);this.effect('text',e,0xffca77,16,'破甲');this.eventQueue.push('shatter');builds.shattered(this,e);}
 castSkill(p:Player){
  if(p.down||p.skill>0)return;p.skill=this.stats.skillCd;this.eventQueue.push('skill');builds.skillStarted(this,p);const radius=builds.skillRadius(this,p.id);
  if(p.id===0){
   for(const e of this.enemies)if(e.hp>0&&distance(e,p)<radius+e.r){const marked=e.mark>0;e.taunt=5;if(marked)this.shatter(e);this.hurtEnemy(e,(marked?60*(1+this.stats.close*.3):24)*this.stats.skill*this.stats.damage,p.id,'skill',marked);}
   this.effect('ring',p,0xf9c978,radius);
  }else{
   let detonations=0;
   for(const e of this.enemies)if(e.hp>0&&distance(e,p)<radius+e.r){
    if(e.fracture>0){e.fracture=0;e.mark=0;detonations++;this.coop.bursts++;this.addCharge(12);builds.detonated(this,e,detonations);this.hurtEnemy(e,90*this.stats.skill*this.stats.damage*(1+this.stats.close*.3),p.id,'skill',true);this.effect('ring',e,0x83e2cd,e.r+40);this.effect('text',e,0x83e2cd,16,'引爆');}
    else{e.mark=builds.markDuration(this);this.hurtEnemy(e,0,p.id,'skill');}
   }
   if(detonations){this.grantBarrier(detonations*(18+builds.rank(this,'bulwark_return')*5));p.hp=Math.min(p.maxHp,p.hp+detonations*4);this.cooperate(`引爆 ${detonations} 名敌人 · 烬获得护盾，澜恢复生命`);this.eventQueue.push('detonate');}
   this.effect('ring',p,0x83e2cd,radius);
  }
 }
 beginSnare(e:Enemy,targetId:number){
  const target=this.players[targetId];if(e.hp<=0||!target||target.down||e.snareTime>0||this.enemies.some(other=>other!==e&&other.hp>0&&other.snareTarget===targetId&&other.snareTime>0))return;
  e.snareTarget=targetId;e.snareTime=this.difficulty==='gentle'?7:5.5;e.snareHits=0;this.effect('ring',target,0xe5a0cb,42);this.cooperate(`P${targetId+1} 被紫链困住！搭档攻击紫链另一头的敌人 ${this.rescueHitsNeeded()} 次，或用技能命中 1 次`);this.eventQueue.push('snare');
 }
 clearSnare(e:Enemy,rescuer=-1){
  const target=e.snareTarget,active=e.snareTime>0&&target>=0;e.snareTarget=-1;e.snareTime=0;e.snareHits=0;
  if(active&&rescuer>=0&&rescuer!==target){this.coop.rescues++;this.addCharge(8);this.effect('heal',this.players[target],0x9ae4cf,65);this.effect('text',e,0x9ae4cf,14,'解救');this.cooperate(`P${rescuer+1} 救出搭档 · 合击能量 +8`);this.eventQueue.push('rescue');builds.rescued(this,this.players[target]);}
 }
 hurtPlayer(p:Player,n:number){
  if(p.inv>0||p.down)return;let damage=Math.max(1,n*this.stats.armor)*(this.difficulty==='gentle'?.65:1)*(this.growth.watchTime>0&&builds.level(this,'rescue')>=5?.8:1);
  if(p.barrier>0&&p.barrierTime>0){const blocked=Math.min(p.barrier,damage);p.barrier-=blocked;damage-=blocked;this.effect('text',p,0x95e6ce,13,`护盾挡下 ${Math.round(blocked)}`);builds.blocked(this,p,blocked);}
  p.hp=Math.max(0,p.hp-damage);p.inv=.7;this.effect('hit',p,0xfa9d87,30);this.eventQueue.push('hurt');if(p.hp<=0){if(builds.lifeline(this,p))return;p.down=true;p.revive=0;p.barrier=0;p.barrierTime=0;this.players.forEach(ally=>ally.ultReady=0);this.notify(`搭档倒下了！走到他身边，停留 ${this.reviveSeconds().toFixed(1)} 秒扶起`);}
 }
 hurtEnemy(e:Enemy,n:number,owner=-1,kind:'basic'|'skill'|'other'='other',bypass=false){
  if(e.hp<=0)return;
  if(e.snareTime>0&&owner>=0&&owner!==e.snareTarget){if(kind==='skill')this.clearSnare(e,owner);else if(kind==='basic'&&++e.snareHits>=this.rescueHitsNeeded())this.clearSnare(e,owner);}
  if(kind==='skill')builds.skillHit(this,e);
  if(kind==='basic'&&owner===1)e.mark=builds.markDuration(this);
  if(kind==='basic'&&owner===0&&e.mark>0){this.shatter(e);n+=32*this.stats.damage*(1+this.stats.close*.3);bypass=true;}
  const damage=n*(e.guard&&e.fracture<=0&&!bypass?.25:1)*builds.damageGrowth(this,owner);e.hp-=damage;
  if(damage>0){e.hit=.1;if(damage>=2)this.effect('text',e,0xf5dfb2,12,String(Math.round(damage)));}
  if(e.hp<=0){this.clearSnare(e,owner);this.kills++;this.combo++;this.bestCombo=Math.max(this.bestCombo,this.combo);this.comboTimer=3;this.effect('death',e,e.kind==='boss'?0xf4c477:0xb880a4,e.r*2);this.pickups.push({x:e.x,y:e.y,value:(e.kind==='boss'?80:e.kind==='brute'?8:3)*(this.route==='elite'?2:1)});this.eventQueue.push(e.kind==='boss'?'bosskill':'kill');if(this.stats.leech&&this.kills%6===0)this.healAll(3*this.stats.leech);}
 }
 area(p:Vec,r:number,damage:number,color:number,owner=-1,bypass=false){for(const e of this.enemies)if(distance(e,p)<r+e.r)this.hurtEnemy(e,damage,owner,'other',bypass);this.effect('ring',p,color,r);}
 spawnWave(){
  this.wave++;this.spawnTimer=2;const boss=this.room%3===2;if(boss){this.spawnEnemy('boss',640,240);this.bossName=['荆冠守卫','缚星祭司','无昼之心'][Math.floor(this.room/3)];this.notify(this.bossName+' · 守护者战');this.eventQueue.push('boss');return;}
  let count=4+this.room*2+this.wave*2;if(this.route==='spring')count=Math.ceil(count*.7);if(this.route==='elite')count=Math.ceil(count*1.35);
  for(let i=0;i<count;i++){
   const edge=Math.floor(this.rand()*4),x=edge===0?100:edge===1?1180:150+this.rand()*980,y=edge===2?145:edge===3?680:180+this.rand()*460,roll=this.rand();
   let kind:Enemy['kind']=roll<.18&&this.room>0?'brute':roll<.38&&this.room>0?'ranged':roll<.58&&this.room>0?'dasher':'chaser';
   if(i===0&&(this.wave>=2||this.room===0))kind='brute';else if(this.wave>=2&&i===1)kind='dasher';else if(i===count-1)kind='ranged';
   this.spawnEnemy(kind,x,y);
   if(this.room===0&&this.wave===1&&i===0)this.enemies[this.enemies.length-1].cd=6.5;
  }this.notify(this.room===0&&this.wave===2?'重甲敌人来了：澜先标记，烬破甲；注意紫链救援':`暗潮 ${this.wave} / ${this.waves}`);
 }
 spawnEnemy(kind:Enemy['kind'],x:number,y:number){const scale=1+this.room*.17,hp=({chaser:72,ranged:54,brute:170,dasher:78,boss:850}[kind])*scale*(this.route==='elite'?1.2:1);this.enemies.push({x,y,id:this.nextId++,kind,hp,maxHp:hp,r:kind==='boss'?43:kind==='brute'?23:16,speed:kind==='boss'?48:kind==='brute'?65:kind==='ranged'?78:kind==='dasher'?120:94+this.room*4,cd:(kind==='brute'?3.2:1.6)+this.rand(),hit:0,slow:0,windup:0,target:{x:0,y:0},phase:0,facing:{x:0,y:1},moving:false,mark:0,fracture:0,guard:kind==='brute'||kind==='boss',taunt:0,snareTarget:-1,snareTime:0,snareHits:0});this.effect('spawn',{x,y},0xb08ba9,45);}
 updateEnemy(e:Enemy,dt:number){
  if(e.hp<=0){this.clearSnare(e);return;}e.hit=Math.max(0,e.hit-dt);e.slow=Math.max(0,e.slow-dt);e.mark=Math.max(0,e.mark-dt);e.fracture=Math.max(0,e.fracture-dt);e.taunt=Math.max(0,e.taunt-dt);e.cd-=dt;
  if(e.snareTime>0){const target=this.players[e.snareTarget];e.snareTime=Math.max(0,e.snareTime-dt);if(!target||target.down)this.clearSnare(e);else if(e.snareTime<=0){this.clearSnare(e);this.hurtPlayer(target,26);this.cooperate('没能及时解救，搭档受伤了');}}
  const alive=this.players.filter(p=>!p.down);if(!alive.length)return;const p=e.taunt>0&&!this.players[0].down?this.players[0]:e.kind==='dasher'&&!this.players[1].down?this.players[1]:alive.sort((a,b)=>distance(a,e)-distance(b,e))[0],d=distance(p,e),dx=(p.x-e.x)/(d||1),dy=(p.y-e.y)/(d||1);let move=1;
  if(e.kind==='ranged'){if(d<240)move=-.6;else if(d<330)move=0;if(e.cd<=0){this.enemyBullet(e,Math.atan2(dy,dx),205);e.cd=2.1;}}
  if(e.kind==='brute'){if(e.cd<=0){if(d<480){const target=alive.find(p=>p.id===e.phase%2)||p;this.beginSnare(e,target.id);e.phase++;e.cd=8.5;}else e.cd=.8;}if(e.snareTime>0)move=0;}
  if(e.kind==='dasher'){if(e.windup>0){e.windup-=dt;move=0;if(e.windup<=0){const dd=distance(e,e.target)||1;e.x=clamp(e.x+(e.target.x-e.x)/dd*160,95,1185);e.y=clamp(e.y+(e.target.y-e.y)/dd*160,138,690);this.effect('dash',e,0xe2a2b6,65);for(const player of alive)if(distance(e,player)<65)this.hurtPlayer(player,19);}}else if(e.cd<=0){e.target={x:p.x,y:p.y};e.windup=.75;e.cd=3.5;}}
  if(e.kind==='boss'){
   if(e.windup>0){e.windup-=dt;move=0;if(e.windup<=0){this.effect('ring',e.target,0xdd91ac,100);for(const player of alive)if(distance(player,e.target)<100)this.hurtPlayer(player,26);}}
   if(e.cd<=0){
    e.phase++;const chapter=Math.floor(this.room/3),enraged=e.hp/e.maxHp<.45,n=10+chapter*3;
    if(e.phase%4===1){const target=alive.find(p=>p.id===Math.floor(e.phase/4)%2)||p;this.beginSnare(e,target.id);}
    if(chapter===1&&e.phase%2===1){for(const target of alive){const angle=Math.atan2(target.y-e.y,target.x-e.x);for(let i=-2;i<=2;i++)this.enemyBullet(e,angle+i*.16,180);}}
    else for(let i=0;i<n;i++)this.enemyBullet(e,i*Math.PI*2/n+this.time*(chapter===2?.65:.3),125+this.room*5);
    if(chapter===0&&e.phase%2===0){e.target={x:p.x,y:p.y};e.windup=1.1;}
    if(chapter===2){for(const target of alive)this.hazards.push({x:target.x,y:target.y,timer:1.35,duration:1.35,r:75});}
    if(e.phase%3===0&&this.enemies.length<15){const kind=chapter===0?'chaser':chapter===1?'ranged':'dasher';this.spawnEnemy(kind,e.x-85,e.y+60);this.spawnEnemy(kind,e.x+85,e.y+60);}
    e.cd=enraged?1.35:2.2;
   }
  }
  if(e.kind==='boss'&&e.snareTime>0)move*=.35;
  const tethered=this.link&&segmentDistance(e,this.players[0],this.players[1])<e.r+7+8*builds.rank(this,'vortex_thread'),slow=Math.min(tethered?clamp(.82/this.stats.chain,.4,.82):1,e.slow>0?.65:1);
  e.moving=Math.abs(move)>.01;e.facing={x:dx*(move<0?-1:1),y:dy*(move<0?-1:1)};e.x=clamp(e.x+dx*e.speed*move*dt*slow,85,1195);e.y=clamp(e.y+dy*e.speed*move*dt*slow,130,700);
  for(const player of alive)if(distance(e,player)<e.r+12)this.hurtPlayer(player,e.kind==='boss'?24:e.kind==='brute'?21:12);
 }
 enemyBullet(e:Enemy,angle:number,speed:number){this.bullets.push({id:this.nextId++,x:e.x,y:e.y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,r:7,life:6,owner:-1,damage:12,pierce:0,hit:[]});}
 beginDraft(){
  if(this.room!==0||this.roomTime>0||this.inventory.length||this.growth.drafting)return false;
  this.growth.drafting=true;this.phase='reward';this.growth.offerRevision++;this.choices=relics.filter(r=>r.core).map(r=>({r,n:this.rand()})).sort((a,b)=>a.n-b.n).slice(0,3).map(x=>x.r);return true;
 }
 offerRelics(avoid:string[]=[]){
  this.growth.offerRevision++;
  const pool=relics.filter(r=>!r.core&&relicRank(this.inventory,r.id)<r.maxRank).map(r=>({r,n:this.rand()})).sort((a,b)=>a.n-b.n).map(x=>x.r),offers:Relic[]=[];
  const take=(match:(r:Relic)=>boolean)=>{let i=pool.findIndex(r=>match(r)&&!avoid.includes(r.id));if(i<0)i=pool.findIndex(match);if(i<0)return;offers.push(pool.splice(i,1)[0]);};
  if(this.growth.path)take(r=>r.path===this.growth.path);
  take(r=>!!r.path&&r.path!==this.growth.path);
  if(this.rand()<.65)take(r=>!r.path);else take(()=>true);
  while(offers.length<3&&pool.length)take(()=>true);
  return offers;
 }
 reroll(){if(this.phase!=='reward'||this.growth.drafting||this.growth.rerolls<=0)return false;const previous=this.choices.map(r=>r.id);this.choices=this.offerRelics(previous);this.growth.rerolls--;this.eventQueue.push('select');return true;}

 choose(id:string){if(this.phase!=='reward'||!this.choices.some(r=>r.id===id)||!this.applyRelic(id))return;if(this.growth.drafting){this.growth.drafting=false;this.choices=[];this.enterRoom('battle');this.eventQueue.push('select');return;}this.room++;if(this.room%3===2){this.routes=['battle'];}else this.routes=this.rand()<.5?['battle','elite']:['spring','elite'];this.phase='route';this.eventQueue.push('select');}
 applyRelic(id:string){const relic=relics.find(r=>r.id===id);if(!relic||relicRank(this.inventory,id)>=relic.maxRank||(relic.core&&this.inventory.some(owned=>relics.find(r=>r.id===owned)?.core)))return false;const before=relic.path?builds.level(this,relic.path):0;this.inventory.push(id);if(relic.core&&relic.path)this.growth.path=relic.path;const s=this.stats;switch(id){case'power':s.damage*=1.25;break;case'haste':s.rate*=.84;s.skillCd*=.88;break;case'health':s.maxHp+=25;this.players.forEach(p=>p.maxHp+=25);this.healAll(30);break;case'chain':s.chain*=1.5;s.linkRange+=45;break;case'nova':s.nova*=1.4;s.roomCharge+=15;break;case'speed':s.speed*=1.12;s.dashCd*=.82;break;case'pierce':s.pierce++;s.damage*=1.08;break;case'multishot':s.shots=Math.min(6,s.shots+1);break;case'leech':s.leech++;break;case'armor':s.armor*=.82;break;case'revive':s.revive*=1.6;s.reviveHp=.65;break;case'charge':s.chargeRate*=1.35;s.healUlt+=10;break;case'frost':s.frost++;break;case'orbit':s.orbit++;break;case'dash':s.dashDamage+=45;break;case'close':s.close++;break;case'skill':s.skill*=1.45;s.skillCd*=.85;break;case'magnet':s.magnet+=90;break;}if(relic.path){const after=builds.level(this,relic.path);if((before<3&&after>=3)||(before<5&&after>=5)){this.notify(`流派升至 ${after} 级，解锁新效果`);this.eventQueue.push('upgrade');}}return true;}
}
