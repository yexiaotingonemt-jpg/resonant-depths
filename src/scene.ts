import Phaser from 'phaser';
import {World,W,H,type Enemy,type Action} from './sim';
import {Input} from './input';
import {Sound} from './audio';
import {assets} from './assets';
import {Actors,type ActorKind} from './actors';
import {facing8,type ActorPose} from './animation';
export class Arena extends Phaser.Scene {
 g!:Phaser.GameObjects.Graphics; background!:Phaser.GameObjects.Image;actors=new Actors(this); texts:Phaser.GameObjects.Text[]=[]; textCursor=0; clock=0;
 constructor(public world:World,public inputMap:Input,public soundBank:Sound,public onFrame:()=>void,public step:(dt:number,actions:Action[])=>void=(dt,actions)=>world.update(dt,actions),public onLoad:(progress:number,ready:boolean)=>void=()=>{}){super('arena');}
 preload(){this.load.on('progress',(progress:number)=>this.onLoad(progress,false));this.load.image('arena',assets.arena);this.actors.preload();}
 create(){this.background=this.add.image(W/2,H/2,'arena').setDisplaySize(W,H).setAlpha(.85);this.g=this.add.graphics();this.onLoad(1,true);}
 update(_time:number,delta:number){const dt=Math.min(delta/1000,.04);this.clock+=dt;this.step(dt,this.inputMap.read());const events=this.world.eventQueue.splice(0);for(const e of events){this.soundBank.play(e);if(e==='hurt')this.cameras.main.shake(80,.002);if(e==='ult')this.cameras.main.shake(250,.004);}this.soundBank.update(this.world.time,this.world.phase==='playing');this.renderWorld();this.onFrame();}
 ring(x:number,y:number,r:number,c:number,a=1,width=1){this.g.lineStyle(width,c,a);this.g.strokeCircle(x,y,r);}
 renderWorld(){const g=this.g,w=this.world,t=this.clock;g.clear();g.setDepth(900);this.texts.forEach(t=>t.setVisible(false));this.textCursor=0;
  const menu=w.phase==='menu';this.actors.begin(menu?'menu':w.seed+':'+w.room,this.clock,menu?this.clock:w.time);this.background.setTint(w.room<3?0xffffff:w.room<6?0xb4c1ee:0xd5b4d6);
  // Faint engraved circular geometry anchors the flat gameplay surface.
  this.ring(640,415,225,0x8caa92,.13);this.ring(640,415,231,0xc6b67d,.13);this.ring(640,415,165,0x839d89,.1);
  for(let i=0;i<12;i++){const a=i*Math.PI/6;g.lineStyle(1,0xbcbb91,.14);g.lineBetween(640+Math.cos(a)*220,415+Math.sin(a)*220,640+Math.cos(a)*235,415+Math.sin(a)*235);}
  for(let i=0;i<24;i++){const x=90+(i*157.7)%1100,y=145+(i*99.4)%545;g.fillStyle(i%3?0xa3edc7:0xffd38c,.18+.13*Math.sin(t+i));g.fillCircle(x+Math.sin(t*.35+i)*12,y+Math.cos(t*.5+i)*9,1.5);}
  if(menu){const a={x:770,y:420},b={x:930,y:460};this.drawLink(a,b,true,t);this.drawGuardian('menu0',0,a.x,a.y,false,0,1,1.5);this.drawGuardian('menu1',1,b.x,b.y,false,0,1,1.5);this.actors.finish();return;}
  const [a,b]=w.players;this.drawLink(a,b,w.link,t);
  for(const h of w.hazards){const progress=1-h.timer/h.duration;g.fillStyle(0xd4759c,.05+progress*.1);g.fillCircle(h.x,h.y,h.r);this.ring(h.x,h.y,h.r,0xef9fbc,.6,1);this.ring(h.x,h.y,h.r*progress,0xef9fbc,.8,2);g.lineStyle(1,0xe6a6bf,.6);g.lineBetween(h.x-10,h.y,h.x+10,h.y);g.lineBetween(h.x,h.y-10,h.x,h.y+10);}
  for(const o of w.pickups){g.fillStyle(0x80dbc5,.12);g.fillCircle(o.x,o.y,10);g.fillStyle(0x9ee8d5,.9);g.fillPoints([{x:o.x,y:o.y-5},{x:o.x+4,y:o.y},{x:o.x,y:o.y+5},{x:o.x-4,y:o.y}],true);}
  for(const e of w.enemies){
   if(e.snareTarget>=0&&e.snareTime>0){const victim=w.players[e.snareTarget];if(victim){g.lineStyle(8,0xc76ad9,.12);g.lineBetween(e.x,e.y-30,victim.x,victim.y-28);g.lineStyle(2,0xf0a6ff,.85);g.lineBetween(e.x,e.y-30,victim.x,victim.y-28);for(let n=0;n<7;n++){const u=(n/7+t*.25)%1;this.ring(e.x+(victim.x-e.x)*u,e.y-30+(victim.y-e.y+2)*u,4,0xe4a0f8,.9,1);}}}
   this.drawEnemy(e,t);
  }
  w.players.forEach(p=>{
   const c=p.id?0x89e0ce:0xf5c77d,snare=w.enemies.find(e=>e.snareTarget===p.id&&e.snareTime>0);
   g.fillStyle(c,.08);g.fillCircle(p.x,p.y,p.down?40:33);
   if(p.dashTime>0){p.trail.forEach((q,i)=>{g.fillStyle(c,.25*(1-i/8));g.fillCircle(q.x,q.y,13-i);});}
   this.drawGuardian('p'+p.id,p.id,p.x,p.y,p.down,p.inv,1);
   if(p.down){this.ring(p.x,p.y,32,c,.8,2);if(p.revive>0){g.lineStyle(5,0xb6f4d9,.9);g.beginPath();g.arc(p.x,p.y,32,-Math.PI/2,-Math.PI/2+p.revive/2.8*Math.PI*2);g.strokePath();}this.label(p.x,p.y-82,p.revive>0?'正在扶起':'队友靠近即可扶起',12,'#b3edda');}
   else{
    this.label(p.x,p.y+18,p.id===0?'P1 · 烬':w.ai?'P2 · 澜 / AI':'P2 · 澜',10,p.id?'#a4e4d4':'#f5d18a');
    if(p.barrier>0){g.lineStyle(2,0x96eddf,.55+.15*Math.sin(t*4));g.strokeEllipse(p.x,p.y-30,54,77);g.fillStyle(0x8ee9dc,.04);g.fillEllipse(p.x,p.y-30,54,77);this.label(p.x,p.y+33,'护盾 '+Math.ceil(p.barrier),9,'#a4f0df');}
    if(snare){this.ring(p.x,p.y,29,0xe39bfc,.9,3);this.label(p.x,p.y-86,`被绑住 ${snare.snareTime.toFixed(1)}秒`,12,'#f0b1ff');}
    else if(p.ultReady>0){this.ring(p.x,p.y,34+Math.sin(t*6)*3,0xffe3a5,.85,2);this.label(p.x,p.y-86,`等队友合击 ${p.ultReady.toFixed(1)}秒`,11,'#ffe7a6');}
    if(w.growth.watchTime>0){this.ring(p.x,p.y,39,0xbad6ff,.35+.12*Math.sin(t*5),2);}
    else if(w.growth.handoff>0){this.ring(p.x,p.y,39,0xffd885,.4+.12*Math.sin(t*6),2);}
    if(w.growth.relayWindow>0&&w.growth.relayOwner>=0&&p.id!==w.growth.relayOwner){g.fillStyle(0xffde9c,.8);for(let i=0;i<3;i++){const a=t*2+i*Math.PI*2/3;g.fillCircle(p.x+Math.cos(a)*28,p.y+Math.sin(a)*13,2.5);}}
    if(p.id===0&&w.growth.storedGuard>0)this.label(p.x,p.y+46,'已存伤害 '+Math.floor(w.growth.storedGuard),9,'#f7ca89');
    if(w.stats.orbit){const ox=p.x+Math.cos(w.time*3+p.id*3)*55,oy=p.y+Math.sin(w.time*3+p.id*3)*55;g.fillStyle(c,1);g.fillCircle(ox,oy,7);this.ring(ox,oy,11,c,.35);}
   }
  });
  for(const b of w.bullets){const c=b.owner<0?0xde8cae:b.owner?0x9cebdc:0xf7cd85;g.lineStyle(b.r*2,c,.18);g.lineBetween(b.x,b.y-28,b.x-b.vx*.035,b.y-28-b.vy*.035);g.fillStyle(c,1);g.fillCircle(b.x,b.y-28,b.r);g.fillStyle(0xffffff,.75);g.fillCircle(b.x-1,b.y-29,b.r*.4);}
  for(const f of w.fx){const a=f.life/f.max,k=1-a;if(f.kind==='text'){this.label(f.x,f.y-45-k*35,f.text||'',f.size,'#f1d8ac',a);continue;}if(f.kind==='ring'||f.kind==='spawn'){this.ring(f.x,f.y,f.size*(f.kind==='spawn'?a:.2+k*.8),f.color,a*.8,2);if(f.kind==='ring'){g.fillStyle(f.color,a*.035);g.fillCircle(f.x,f.y,f.size);}}else for(let i=0;i<8;i++){const angle=i*Math.PI/4,rr=k*f.size;g.fillStyle(f.color,a);g.fillCircle(f.x+Math.cos(angle)*rr,f.y+Math.sin(angle)*rr,Math.max(.5,3*a));}}
  if(w.ultFlash>0){g.fillStyle(0xe8f1c9,w.ultFlash*.2);g.fillRect(0,0,W,H);this.ring(640,415,(.8-w.ultFlash)*1000,0xf7e3a2,w.ultFlash,6);}
  const boss=w.enemies.find(e=>e.kind==='boss');if(boss){this.label(640,116,w.bossName,13,'#dfb5ca');g.fillStyle(0x2b242f,.9);g.fillRoundedRect(440,130,400,5,2);g.fillStyle(0xc68aa4,1);g.fillRoundedRect(440,130,400*Math.max(0,boss.hp/boss.maxHp),5,2);}
  this.actors.finish();
 }
 drawLink(a:{x:number;y:number},b:{x:number;y:number},active:boolean,t:number){a={x:a.x,y:a.y-28};b={x:b.x,y:b.y-28};const g=this.g;g.lineStyle(active?8:1,active?0x85d7bb:0x697b77,active?.08:.2);g.lineBetween(a.x,a.y,b.x,b.y);if(active){g.lineStyle(2,0xb6ddbd,.7);g.beginPath();g.moveTo(a.x,a.y);for(let i=1;i<=24;i++){const u=i/24;g.lineTo(a.x+(b.x-a.x)*u,a.y+(b.y-a.y)*u+Math.sin(u*Math.PI*4-t*4)*Math.sin(u*Math.PI)*5);}g.strokePath();for(let i=0;i<5;i++){const u=(t*.35+i/5)%1;g.fillStyle(i%2?0xf4cd7e:0xa5e9d5,.9);g.fillCircle(a.x+(b.x-a.x)*u,a.y+(b.y-a.y)*u,2);}}}
 drawGuardian(key:string,id:number,x:number,y:number,down:boolean,inv:number,alpha:number,size=1){
  const g=this.g,c=id?0x8fe7d4:0xf8c97f,p=this.world.players[id],menu=key.startsWith('menu');g.fillStyle(0x000000,.23);g.fillEllipse(x,y+2,38*size,12*size);
  const direction=menu?(id===0?5:7):facing8(p.dir);
  const pose:ActorPose=menu?'stance':down?'die':p.skill>this.world.stats.skillCd-.38?(id===0?'swing':'cast'):p.moving?'run':'stance';
  this.actors.draw(key,id===0?'ember':'tide',x,y,direction,pose,size,p.hp,alpha*(inv>0&&Math.floor(inv*15)%2?.65:1));
  if(!down){g.fillStyle(c,.8);g.fillCircle(x,y+6,2.4);}
 }
 drawEnemy(e:Enemy,t:number){const g=this.g,c=e.hit>0?0xffebcf:e.slow>0?0x8ecdda:e.kind==='boss'?0xd0a5bf:0xc580a4;g.fillStyle(0x000000,.4);g.fillEllipse(e.x,e.y+2,e.r*2.2,e.r*.65);if(e.windup>0){const p=e.kind==='boss'?e.target:e;g.fillStyle(0xd482a6,.12+.08*Math.sin(t*16));g.fillCircle(p.x,p.y,e.kind==='boss'?100:55);this.ring(p.x,p.y,e.kind==='boss'?100:55,0xed9fbe,.7,2);if(e.kind==='dasher'){g.lineStyle(2,0xf4adc3,.6);g.lineBetween(e.x,e.y,e.target.x,e.target.y);}}
  const kinds:Record<Enemy['kind'],ActorKind>={chaser:'undead',ranged:'cultist',brute:'brute',dasher:'stalker',boss:this.world.room<3?'warden':this.world.room<6?'oracle':'brute'};
  const scale=e.kind==='boss'?1.65:e.kind==='brute'?1.15:e.kind==='dasher'?.7:.8;
  const pose:ActorPose=e.hit>0?'hit':e.windup>0?'cast':e.moving?'run':'stance';
  this.actors.draw('e'+e.id,kinds[e.kind],e.x,e.y,facing8(e.facing),pose,scale,e.hp);
  const head=e.y-86*scale;
  if(e.guard&&e.fracture<=0){this.ring(e.x,e.y,e.r+7,0x99a5b4,.55,3);g.lineStyle(1,0xbed0df,.6);g.strokeTriangle(e.x-7,head-5,e.x+7,head-5,e.x,head+7);}
  if(e.fracture>0){
   g.fillStyle(0xf6b76b,.08);g.fillCircle(e.x,e.y,e.r+11);
   g.lineStyle(3,0xffc983,.9);for(let n=0;n<4;n++){g.beginPath();g.arc(e.x,e.y,e.r+8,n*Math.PI/2+.17,(n+1)*Math.PI/2-.17);g.strokePath();}
   this.label(e.x,head-12,e.kind==='boss'||e.kind==='brute'?`◇ 已破甲 ${e.fracture.toFixed(1)}秒`:'◇',e.kind==='boss'||e.kind==='brute'?10:16,'#ffd18d');
  }else if(e.mark>0){
   g.fillStyle(0x9bf0d9,.18);g.fillCircle(e.x,head-8,11);g.lineStyle(2,0x9bf0d9,1);g.strokePoints([{x:e.x,y:head-15},{x:e.x+6,y:head-8},{x:e.x,y:head-1},{x:e.x-6,y:head-8}],true);
   if(e.kind==='brute'||e.kind==='boss')this.label(e.x,head-29,'◆ 有标记 · 烬来打碎',10,'#a9f4de');
  }
  if(e.taunt>0)this.label(e.x+e.r+9,e.y-34,'↯',15,'#ffd296');
  if(e.snareTarget>=0&&e.snareTime>0)this.label(e.x,head-45,`队友打这里 · 还需 ${Math.max(0,this.world.rescueHitsNeeded()-e.snareHits)} 次`,11,'#efb5ff');
  if(e.hp<e.maxHp&&e.kind!=='boss'){g.fillStyle(0x191a21,1);g.fillRect(e.x-18,head,36,3);g.fillStyle(c,.9);g.fillRect(e.x-18,head,36*Math.max(0,e.hp/e.maxHp),3);}

 }
 label(x:number,y:number,text:string,size:number,color:string,alpha=1){let obj=this.texts[this.textCursor++];if(!obj){obj=this.add.text(x,y,text,{fontFamily:'"Microsoft YaHei", sans-serif',fontSize:size,color,stroke:'#102020',strokeThickness:3}).setOrigin(.5).setDepth(950);this.texts.push(obj);}obj.setPosition(x,y).setText(text).setFontSize(size).setColor(color).setAlpha(alpha).setVisible(true);}
}
