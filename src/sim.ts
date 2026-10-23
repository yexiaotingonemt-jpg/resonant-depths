import {relics, type Relic, type Route} from './data';
export const W=1280,H=800;
export const bounds={left:95,right:1185,top:138,bottom:690};
export type Phase='menu'|'playing'|'paused'|'reward'|'route'|'won'|'lost';
export type Vec={x:number;y:number};
export type Action=Vec & {dash:boolean;skill:boolean;ult:boolean};
export type Player=Vec & {id:number;hp:number;maxHp:number;dir:Vec;moving:boolean;shot:number;dash:number;dashTime:number;skill:number;inv:number;down:boolean;revive:number;trail:Vec[]};
export type Enemy=Vec & {id:number;kind:'chaser'|'ranged'|'brute'|'dasher'|'boss';hp:number;maxHp:number;r:number;speed:number;cd:number;hit:number;slow:number;windup:number;target:Vec;phase:number;facing:Vec;moving:boolean};
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
 stats={damage:1,rate:1,maxHp:100,speed:190,dashCd:2.2,skillCd:8,chain:1,linkRange:400,nova:1,roomCharge:0,pierce:0,shots:1,leech:0,armor:1,revive:1,reviveHp:.45,chargeRate:1,healUlt:0,frost:0,orbit:0,dashDamage:0,close:0,skill:1,magnet:0};
 constructor(){this.reset(true,1);this.phase='menu';}
 rand(){let t=this.randomState+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;}
 reset(ai:boolean,seed:number,difficulty='normal'){
  this.ai=ai;this.seed=seed>>>0;this.randomState=this.seed;this.difficulty=difficulty;this.phase='playing';this.room=0;this.time=0;this.nextId=1;this.kills=0;this.dust=0;this.combo=0;this.bestCombo=0;this.revives=0;this.inventory=[];this.eventQueue=[];this.charge=0;this.ultFlash=0;
  this.stats={damage:1,rate:1,maxHp:100,speed:190,dashCd:2.2,skillCd:8,chain:1,linkRange:400,nova:1,roomCharge:0,pierce:0,shots:1,leech:0,armor:1,revive:1,reviveHp:.45,chargeRate:1,healUlt:0,frost:0,orbit:0,dashDamage:0,close:0,skill:1,magnet:0};
  this.players=[0,1].map(id=>({id,x:570+id*140,y:420,hp:100,maxHp:100,dir:{x:0,y:1},moving:false,shot:0,dash:0,dashTime:0,skill:0,inv:1,down:false,revive:0,trail:[]}));this.enterRoom('battle');
 }
 notify(s:string){this.notice=s;this.noticeTime=3;}
 effect(kind:Fx['kind'],p:Vec,color:number,size=30,text?:string){const life=kind==='text'?1:kind==='spawn'?.8:.55;this.fx.push({...p,kind,color,size,life,max:life,text});}
 enterRoom(route:Route){
  this.route=route;this.phase='playing';this.enemies=[];this.bullets=[];this.pickups=[];this.fx=[];this.hazards=[];this.wave=0;this.roomTime=0;this.spawnTimer=1.6;this.intermission=0;this.waves=this.room%3===2?1:2+(this.room>=3?1:0);this.bossName='';
  this.players.forEach((p,i)=>{p.x=570+i*140;p.y=430;p.inv=2;p.dash=0;p.skill=Math.min(p.skill,2);p.trail=[];p.moving=false;if(p.down){p.down=false;p.hp=p.maxHp*.35;p.revive=0;}});
  if(route==='spring')this.healAll(this.stats.maxHp*.35);if(route==='elite')this.healAll(10);this.charge=clamp(this.charge+this.stats.roomCharge,0,100);this.notify(this.room%3===2?'守护者正在苏醒':'保持魂链连接，穿过黑暗');
 }
 togglePause(){if(this.phase==='paused')this.phase=this.beforePause;else if(this.phase==='playing'){this.beforePause=this.phase;this.phase='paused';}}
 nearest(p:Vec){return this.enemies.filter(e=>e.hp>0).sort((a,b)=>distance(a,p)-distance(b,p))[0];}
 aiAction():Action{
  const p=this.players[1],a=this.players[0];if(!p||p.down)return idle();let x=0,y=0;const add=(v:Vec,k:number)=>{x+=v.x*k;y+=v.y*k;};
  const d=distance(a,p),e=this.nearest(p);if(a.down||d>195)add({x:a.x-p.x,y:a.y-p.y},a.down?2:1);else if(d<100)add({x:p.x-a.x,y:p.y-a.y},1);
  if(e){const ed=distance(p,e);if(ed<135)add({x:p.x-e.x,y:p.y-e.y},2.2);else if(ed>275)add({x:e.x-p.x,y:e.y-p.y},.4);add({x:-(e.y-p.y),y:e.x-p.x},.25);}
  for(const b of this.bullets)if(b.owner<0&&distance(b,p)<95)add({x:p.x-b.x,y:p.y-b.y},4);
  const n=Math.hypot(x,y);return{x:n>15?x/n:0,y:n>15?y/n:0,dash:!!e&&distance(e,p)<65,skill:!!e&&distance(e,p)<220,ult:this.charge>=100&&(this.enemies.length>6||!!this.bossName)};
 }
 update(dt:number,actions:Action[]){
  if(this.phase!=='playing')return;dt=Math.min(dt,.04);this.time+=dt;this.roomTime+=dt;this.noticeTime-=dt;this.ultFlash=Math.max(0,this.ultFlash-dt);this.comboTimer-=dt;if(this.comboTimer<=0)this.combo=0;
  this.fx.forEach(f=>f.life-=dt);this.fx=this.fx.filter(f=>f.life>0);if(this.ai)actions[1]=this.aiAction();
  const [a,b]=this.players;this.link=!a.down&&!b.down&&distance(a,b)<=this.stats.linkRange;
  if(this.link)this.addCharge(dt*1.4);
  this.players.forEach((p,i)=>this.updatePlayer(p,actions[i]||idle(),dt));
  this.enemies.forEach(e=>this.updateEnemy(e,dt));
  for(const hazard of this.hazards){hazard.timer-=dt;if(hazard.timer<=0){this.effect('ring',hazard,0xec98b6,hazard.r);for(const p of this.players)if(!p.down&&distance(p,hazard)<hazard.r)this.hurtPlayer(p,24);}}
  this.hazards=this.hazards.filter(h=>h.timer>0);
  for(let i=0;i<this.enemies.length;i++)for(let j=i+1;j<this.enemies.length;j++){const e=this.enemies[i],f=this.enemies[j],d=distance(e,f),r=(e.r+f.r)*.8;if(d>0&&d<r){const k=(r-d)*.5;e.x+=(e.x-f.x)/d*k;e.y+=(e.y-f.y)/d*k;f.x-=(e.x-f.x)/d*k;f.y-=(e.y-f.y)/d*k;}}
  this.chainTick-=dt;if(this.link&&this.chainTick<=0){this.chainTick=.18;for(const e of this.enemies)if(segmentDistance(e,a,b)<e.r+7){this.hurtEnemy(e,8*this.stats.chain);this.addCharge(.7);}}
  for(const bullet of this.bullets){bullet.x+=bullet.vx*dt;bullet.y+=bullet.vy*dt;bullet.life-=dt;
   if(bullet.owner>=0){for(const e of this.enemies)if(e.hp>0&&!bullet.hit.includes(e.id)&&distance(e,bullet)<e.r+bullet.r){this.hurtEnemy(e,bullet.damage);e.slow=this.stats.frost?1.5:0;bullet.hit.push(e.id);if(bullet.pierce--<=0){bullet.life=0;break;}}}
   else for(const p of this.players)if(!p.down&&distance(p,bullet)<14+bullet.r){this.hurtPlayer(p,10+this.room*1.1);bullet.life=0;break;}
  }
  this.bullets=this.bullets.filter(b=>b.life>0&&b.x>45&&b.x<W-45&&b.y>75&&b.y<H-70);
  for(const p of this.players)if(!p.down){for(const orb of this.pickups){let d=distance(p,orb);if(d<70+this.stats.magnet){orb.x+=(p.x-orb.x)*dt*9;orb.y+=(p.y-orb.y)*dt*9;if(d<24){this.dust+=orb.value;orb.value=0;this.addCharge(1);}}}}
  this.pickups=this.pickups.filter(p=>p.value>0);this.enemies=this.enemies.filter(e=>e.hp>0);
  if(this.players.every(p=>p.down)){this.phase='lost';this.eventQueue.push('end');return;}
  if(this.enemies.length===0){this.spawnTimer-=dt;if(this.spawnTimer<=0){if(this.wave<this.waves)this.spawnWave();else{this.dust+=this.pickups.reduce((s,p)=>s+p.value,0)+20+(this.stats.magnet?20:0);this.pickups=[];this.phase='reward';this.choices=this.offerRelics();this.eventQueue.push('clear');if(this.room===8){this.phase='won';this.eventQueue.push('end');}}}}
 }
 updatePlayer(p:Player,input:Action,dt:number){
  p.moving=false;p.inv=Math.max(0,p.inv-dt);p.dash=Math.max(0,p.dash-dt);p.skill=Math.max(0,p.skill-dt);p.shot-=dt;p.dashTime=Math.max(0,p.dashTime-dt);
  if(p.down){const ally=this.players[1-p.id];if(!ally.down&&distance(ally,p)<78){p.revive+=dt*this.stats.revive;if(p.revive>=2.8){p.down=false;p.hp=p.maxHp*this.stats.reviveHp;p.inv=2;p.revive=0;this.revives++;this.effect('heal',p,0x8ee5c6,70);this.notify('重新点亮 · 搭档已获救');this.eventQueue.push('revive');}}else p.revive=Math.max(0,p.revive-dt*.5);return;}
  let n=Math.hypot(input.x,input.y);const mx=n>1?input.x/n:input.x,my=n>1?input.y/n:input.y;if(n>.1)p.dir={x:mx,y:my};p.moving=n>.1||p.dashTime>0;
  if(input.dash&&p.dash<=0){p.dash=this.stats.dashCd;p.dashTime=.18;p.inv=.32;this.eventQueue.push('dash');this.effect('dash',p,p.id?0x80dfcf:0xf6c778,40);if(this.stats.dashDamage)this.area(p,95,this.stats.dashDamage,0xf6c778);}
  const speed=this.stats.speed*(p.dashTime>0?4.8:1);p.x=clamp(p.x+(p.dashTime>0?p.dir.x:mx)*speed*dt,bounds.left,bounds.right);p.y=clamp(p.y+(p.dashTime>0?p.dir.y:my)*speed*dt,bounds.top,bounds.bottom);
  p.trail.unshift({x:p.x,y:p.y});p.trail.length=Math.min(p.trail.length,8);
  if(input.skill&&p.skill<=0){p.skill=this.stats.skillCd;this.eventQueue.push('skill');if(p.id===0){this.area(p,150,62*this.stats.skill,0xffc778);this.effect('ring',p,0xf9c978,150);}else{this.area(p,205,40*this.stats.skill,0x83e2cd);for(const ally of this.players)if(!ally.down&&distance(ally,p)<205){ally.inv=Math.max(ally.inv,1.4);ally.hp=Math.min(ally.maxHp,ally.hp+9);}this.effect('ring',p,0x83e2cd,205);}}
  if(input.ult&&this.charge>=100&&!this.players.some(x=>x.down)){this.charge=0;this.ultFlash=.8;this.area({x:640,y:400},2000,140*this.stats.nova,0xffedb4);this.bullets=this.bullets.filter(b=>b.owner>=0);this.healAll(this.stats.healUlt);this.eventQueue.push('ult');this.notify('双生共鸣 · 破晓');}
  const enemy=this.nearest(p);if(enemy&&p.shot<=0&&distance(p,enemy)<510){p.shot=(p.id===0?.66:.54)*this.stats.rate;const angle=Math.atan2(enemy.y-p.y,enemy.x-p.x);if(!p.moving)p.dir={x:Math.cos(angle),y:Math.sin(angle)};for(let s=0;s<this.stats.shots;s++){const t=angle+(s-(this.stats.shots-1)/2)*.17;this.bullets.push({id:this.nextId++,x:p.x,y:p.y,vx:Math.cos(t)*490,vy:Math.sin(t)*490,r:p.id?5:6,life:1.4,owner:p.id,damage:(p.id?15:20)*this.stats.damage*(this.stats.close&&this.link&&distance(p,this.players[1-p.id])<180?1.3:1),pierce:this.stats.pierce,hit:[]});}this.eventQueue.push('shot');}
  if(this.stats.orbit){const o={x:p.x+Math.cos(this.time*3+p.id*3)*55,y:p.y+Math.sin(this.time*3+p.id*3)*55};for(const e of this.enemies)if(distance(e,o)<e.r+12)this.hurtEnemy(e,30*this.stats.orbit*dt);}
 }
 addCharge(n:number){this.charge=clamp(this.charge+n*this.stats.chargeRate,0,100);}
 healAll(n:number){if(!n)return;for(const p of this.players)if(!p.down){p.hp=Math.min(p.maxHp,p.hp+n);this.effect('heal',p,0x89dbb7,45);}}
 hurtPlayer(p:Player,n:number){if(p.inv>0||p.down)return;p.hp=Math.max(0,p.hp-Math.max(1,n*this.stats.armor)*(this.difficulty==='gentle'?.65:1));p.inv=.7;this.effect('hit',p,0xfa9d87,30);this.eventQueue.push('hurt');if(p.hp<=0){p.down=true;p.revive=0;this.notify('搭档倒下！靠近光点，停留 2.8 秒救援');}}
 hurtEnemy(e:Enemy,n:number){if(e.hp<=0)return;e.hp-=n;e.hit=.1;if(n>=7)this.effect('text',e,0xf5dfb2,12,String(Math.round(n)));if(e.hp<=0){this.kills++;this.combo++;this.bestCombo=Math.max(this.bestCombo,this.combo);this.comboTimer=3;this.effect('death',e,e.kind==='boss'?0xf4c477:0xb880a4,e.r*2);this.pickups.push({x:e.x,y:e.y,value:(e.kind==='boss'?80:e.kind==='brute'?8:3)*(this.route==='elite'?2:1)});this.addCharge(2);this.eventQueue.push(e.kind==='boss'?'bosskill':'kill');if(this.stats.leech&&this.kills%6===0)this.healAll(3*this.stats.leech);}}
 area(p:Vec,r:number,damage:number,color:number){for(const e of this.enemies)if(distance(e,p)<r+e.r)this.hurtEnemy(e,damage);this.effect('ring',p,color,r);}
 spawnWave(){
  this.wave++;this.spawnTimer=2;const boss=this.room%3===2;if(boss){this.spawnEnemy('boss',640,240);this.bossName=['荆冠守卫','缚星祭司','无昼之心'][Math.floor(this.room/3)];this.notify(this.bossName+' · 守护者战');this.eventQueue.push('boss');return;}
  let count=5+this.room*2+this.wave*2;if(this.route==='spring')count=Math.ceil(count*.65);if(this.route==='elite')count=Math.ceil(count*1.35);
  for(let i=0;i<count;i++){const edge=Math.floor(this.rand()*4),x=edge===0?100:edge===1?1180:150+this.rand()*980,y=edge===2?145:edge===3?680:180+this.rand()*460;const roll=this.rand();const kind=roll<.15&&this.room>0?'brute':roll<.35&&this.room>0?'ranged':roll<.5&&this.room>2?'dasher':'chaser';this.spawnEnemy(kind,x,y);}this.notify(`暗潮 ${this.wave} / ${this.waves}`);
 }
 spawnEnemy(kind:Enemy['kind'],x:number,y:number){const scale=1+this.room*.17,hp=({chaser:35,ranged:32,brute:115,dasher:48,boss:650}[kind])*scale*(this.route==='elite'?1.2:1);this.enemies.push({x,y,id:this.nextId++,kind,hp,maxHp:hp,r:kind==='boss'?43:kind==='brute'?23:16,speed:kind==='boss'?40:kind==='brute'?48:kind==='ranged'?65:kind==='dasher'?105:72+this.room*3,cd:1.6+this.rand(),hit:0,slow:0,windup:0,target:{x:0,y:0},phase:0,facing:{x:0,y:1},moving:false});this.effect('spawn',{x,y},0xb08ba9,45);}
 updateEnemy(e:Enemy,dt:number){
  if(e.hp<=0)return;e.hit=Math.max(0,e.hit-dt);e.slow=Math.max(0,e.slow-dt);e.cd-=dt;const alive=this.players.filter(p=>!p.down);if(!alive.length)return;const p=alive.sort((a,b)=>distance(a,e)-distance(b,e))[0],d=distance(p,e),dx=(p.x-e.x)/(d||1),dy=(p.y-e.y)/(d||1);let move=1;
  if(e.kind==='ranged'){if(d<240)move=-.6;else if(d<330)move=0;if(e.cd<=0){this.enemyBullet(e,Math.atan2(dy,dx),180);e.cd=2.3;}}
  if(e.kind==='dasher'){if(e.windup>0){e.windup-=dt;move=0;if(e.windup<=0){const dd=distance(e,e.target)||1;e.x=clamp(e.x+(e.target.x-e.x)/dd*160,95,1185);e.y=clamp(e.y+(e.target.y-e.y)/dd*160,138,690);this.effect('dash',e,0xe2a2b6,65);if(distance(e,p)<65)this.hurtPlayer(p,19);}}else if(e.cd<=0){e.target={x:p.x,y:p.y};e.windup=.75;e.cd=3.5;}}
  if(e.kind==='boss'){
   if(e.windup>0){e.windup-=dt;move=0;if(e.windup<=0){this.effect('ring',e.target,0xdd91ac,100);for(const player of alive)if(distance(player,e.target)<100)this.hurtPlayer(player,26);}}
   if(e.cd<=0){
    e.phase++;const chapter=Math.floor(this.room/3),enraged=e.hp/e.maxHp<.45,n=10+chapter*3;
    if(chapter===1&&e.phase%2===1){for(const target of alive){const angle=Math.atan2(target.y-e.y,target.x-e.x);for(let i=-2;i<=2;i++)this.enemyBullet(e,angle+i*.16,180);}}
    else for(let i=0;i<n;i++)this.enemyBullet(e,i*Math.PI*2/n+this.time*(chapter===2?.65:.3),125+this.room*5);
    if(chapter===0&&e.phase%2===0){e.target={x:p.x,y:p.y};e.windup=1.1;}
    if(chapter===2){for(const target of alive)this.hazards.push({x:target.x,y:target.y,timer:1.35,duration:1.35,r:75});}
    if(e.phase%3===0&&this.enemies.length<15){const kind=chapter===0?'chaser':chapter===1?'ranged':'dasher';this.spawnEnemy(kind,e.x-85,e.y+60);this.spawnEnemy(kind,e.x+85,e.y+60);}
    e.cd=enraged?1.35:2.2;
   }
  }
  e.moving=Math.abs(move)>.01;e.facing={x:dx*(move<0?-1:1),y:dy*(move<0?-1:1)};e.x=clamp(e.x+dx*e.speed*move*dt*(e.slow>0?.65:1),85,1195);e.y=clamp(e.y+dy*e.speed*move*dt*(e.slow>0?.65:1),130,700);
  for(const player of alive)if(distance(e,player)<e.r+12)this.hurtPlayer(player,e.kind==='boss'?24:e.kind==='brute'?21:12);
 }
 enemyBullet(e:Enemy,angle:number,speed:number){this.bullets.push({id:this.nextId++,x:e.x,y:e.y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,r:7,life:6,owner:-1,damage:12,pierce:0,hit:[]});}
 offerRelics(){return [...relics].map(r=>({r,n:this.rand()})).sort((a,b)=>a.n-b.n).slice(0,3).map(x=>x.r);}
 choose(id:string){if(this.phase!=='reward'||!this.choices.some(r=>r.id===id))return;this.applyRelic(id);this.room++;if(this.room%3===2){this.routes=['battle'];}else this.routes=this.rand()<.5?['battle','elite']:['spring','elite'];this.phase='route';this.eventQueue.push('select');}
 applyRelic(id:string){this.inventory.push(id);const s=this.stats;switch(id){case'power':s.damage*=1.25;break;case'haste':s.rate*=.84;s.skillCd*=.88;break;case'health':s.maxHp+=25;this.players.forEach(p=>p.maxHp+=25);this.healAll(30);break;case'chain':s.chain*=1.5;s.linkRange+=45;break;case'nova':s.nova*=1.4;s.roomCharge+=15;break;case'speed':s.speed*=1.12;s.dashCd*=.82;break;case'pierce':s.pierce++;s.damage*=1.08;break;case'multishot':s.shots=Math.min(6,s.shots+1);break;case'leech':s.leech++;break;case'armor':s.armor*=.82;break;case'revive':s.revive*=1.6;s.reviveHp=.65;break;case'charge':s.chargeRate*=1.35;s.healUlt+=10;break;case'frost':s.frost=1;break;case'orbit':s.orbit++;break;case'dash':s.dashDamage+=45;break;case'close':s.close=1;break;case'skill':s.skill*=1.45;s.skillCd*=.85;break;case'magnet':s.magnet+=90;break;}}
}
