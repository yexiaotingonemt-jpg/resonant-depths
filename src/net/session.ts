import {RelayPeer,type RelayConnection} from './relay';
import {World,idle,type Action,type Vec} from '../sim';
import {Authority,PROTOCOL,capture,displayCode,normalizeCode,roomCode,singleAction,validCode,validSnapshot,type Command,type Snapshot} from './protocol';

export type NetStatus='idle'|'connecting'|'waiting'|'lobby'|'playing'|'disconnected'|'error';
type Role='host'|'guest';
type StateMessage={type:'state';version:number;seq:number;run:number;epoch:string;world:Snapshot;events:string[]};
export class OnlineSession {
 role:Role|null=null;status:NetStatus='idle';code='';message='';guestReady=false;connected=false;started=false;latency=0;run=0;
 private peer:RelayPeer|null=null;private connection:RelayConnection|null=null;private authority:Authority;
 private heartbeat:ReturnType<typeof setInterval>|null=null;private timeout:ReturnType<typeof setTimeout>|null=null;private generation=0;private lastSeen=0;private lastPing=0;
 private token='';private acceptedToken='';private stateSeq=0;private receivedSeq=0;private inputSeq=0;private sendClock=0;private guestInput=idle();private epoch='';
 private target:Snapshot|null=null;private everConnected=false;
 constructor(public world:World,private changed:()=>void){this.authority=new Authority(world);}
 get active(){return this.role!==null;}
 get isHost(){return this.role==='host';}
 get localPlayer(){return this.isHost?0:1;}
 get roomLabel(){return displayCode(this.code);}
 get canStart(){return this.isHost&&this.connected&&this.guestReady&&!this.started;}
 get invite(){const url=new URL(location.href);url.search='';url.searchParams.set('room',displayCode(this.code));url.hash='';return url.href;}
 private update(status:NetStatus,message=''){this.status=status;this.message=message;this.changed();}
 private laterTimeout(ms:number,message:string){this.clearTimeout();this.timeout=setTimeout(()=>{if(!this.connected)this.update('error',message);},ms);}
 private clearTimeout(){if(this.timeout)clearTimeout(this.timeout);this.timeout=null;}
 async create(){this.leave(false);this.role='host';this.code=roomCode();this.update('connecting','正在创建房间…');await this.openPeer();}
 async join(value:string){const code=normalizeCode(value);if(!validCode(code)){this.message='请输入完整的 8 位房间码，例如 ABCD-EFGH。';this.changed();return;}this.leave(false);this.role='guest';this.code=code;try{const url=new URL(location.href);url.searchParams.set('room',displayCode(code));history.replaceState(null,'',url);}catch{}try{this.token=sessionStorage.getItem('resonant-seat-'+code)||crypto.randomUUID();sessionStorage.setItem('resonant-seat-'+code,this.token);}catch{this.token=crypto.randomUUID();}this.update('connecting','正在连接房主…');await this.openPeer();}
 private async openPeer(){
  const generation=++this.generation;this.laterTimeout(25000,'连接超时。请检查网络，确认双方都打开了最新版本，然后重试。');
  try{
   const peer=new RelayPeer(this.isHost?'host':'guest',this.code);this.peer=peer;
   peer.on('open',()=>{if(generation!==this.generation)return;if(this.isHost){this.clearTimeout();if(!this.connected)this.update(this.started?'disconnected':'waiting',this.started?'等待原搭档重新连接':'房间已创建，等待搭档加入');}else this.connectGuest();});
   peer.on('connection',connection=>{if(!this.isHost||this.connection){connection.on('open',()=>{connection.send({type:'reject',reason:'房间已满，两人已经就位。'});setTimeout(()=>connection.close(),300);});return;}this.bind(connection);});
   peer.on('error',(error:{type?:string;message?:string})=>{
    if(generation!==this.generation)return;
    if(error.type==='unavailable-id'&&this.isHost&&!this.everConnected){peer.destroy();this.peer=null;this.code=roomCode();void this.openPeer();return;}
    if(this.connected)return;
    const message=error.message||'未能连接房间服务，请检查网络后重试。';
    this.clearTimeout();this.update(this.started?'disconnected':'error',message);
   });
   this.heartbeat=setInterval(()=>this.checkConnection(),1000);
  }catch{this.clearTimeout();this.update('error','无法初始化联网连接，请更新浏览器或更换网络后重试。');}
 }
 private connectGuest(){if(!this.peer||this.peer.destroyed)return;this.bind(this.peer.connect());}
 private bind(connection:RelayConnection){
  this.connection=connection;const generation=this.generation;let admitted=false;
  const admissionTimer=setTimeout(()=>{if(!admitted){connection.close();if(this.connection===connection){this.connection=null;this.clearTimeout();this.update(this.started?'disconnected':'error','握手超时，请重新连接房间。');}}},20000);
  connection.on('open',()=>{if(generation!==this.generation){connection.close();return;}this.lastSeen=Date.now();if(!this.isHost)this.send({type:'hello',version:PROTOCOL,token:this.token});});
  connection.on('data',raw=>{
   if(generation!==this.generation||this.connection!==connection||!raw||typeof raw!=='object')return;
   const data=raw as Record<string,unknown>;this.lastSeen=Date.now();
   if(data.type==='reject'){this.message=typeof data.reason==='string'?data.reason:'无法加入房间';this.clearTimeout();this.update('error',this.message);return;}
   if(this.isHost&&data.type==='hello'){
    if(admitted)return;
    if(data.version!==PROTOCOL||typeof data.token!=='string'||data.token.length<8){this.send({type:'reject',reason:'游戏版本不一致，请双方刷新页面后重试。'});setTimeout(()=>connection.close(),300);return;}
    if(this.acceptedToken&&this.acceptedToken!==data.token){this.send({type:'reject',reason:'这局远征保留给原搭档，请让原搭档重新连接，或重新创建房间。'});setTimeout(()=>connection.close(),300);return;}
    this.acceptedToken=data.token;this.authority.inputSeq=0;this.authority.remote=idle();admitted=true;clearTimeout(admissionTimer);this.connected=true;this.everConnected=true;this.guestReady=false;this.clearTimeout();this.update(this.started?'playing':'lobby',this.started?'搭档已重新连接，双方可继续远征。':'搭档已加入，等待准备');
    this.send({type:'welcome',version:PROTOCOL,started:this.started,ready:this.guestReady});this.sendState();return;
   }
   if(!this.isHost&&data.type==='welcome'){
    if(data.version!==PROTOCOL){this.update('error','游戏版本不一致，请刷新后重试。');return;}
    admitted=true;clearTimeout(admissionTimer);this.connected=true;this.everConnected=true;this.started=data.started===true;this.guestReady=false;this.clearTimeout();this.update(this.started?'playing':'lobby',this.started?'已重新连接，等待继续远征。':'连接成功，准备好后通知房主。');return;
   }
   if(!admitted)return;
   switch(data.type){
    case'ping':this.send({type:'pong',at:data.at});break;
    case'pong':if(typeof data.at==='number')this.latency=Math.max(0,Math.round(Date.now()-data.at));break;
    case'ready':if(this.isHost&&!this.started){this.guestReady=data.ready===true;this.send({type:'ready',ready:this.guestReady});this.changed();}else if(!this.isHost){this.guestReady=data.ready===true;this.changed();}break;
    case'input':if(this.isHost&&this.started)this.authority.input(Number(data.seq),data.action,Date.now());break;
    case'command':if(this.isHost&&this.started&&this.applyCommand(data.command as Command,true))this.sendState();break;
    case'state':if(!this.isHost)this.receiveState(data as unknown as StateMessage);break;
    case'closed':this.connection=null;connection.close();this.connected=false;this.clearTimeout();this.update('disconnected',this.isHost?'搭档已离开，重新连接前远征已暂停。':'房主已关闭房间，请返回营地重新创建或加入。');if(this.world.phase==='playing')this.world.togglePause();break;
   }
  });
  const closed=()=>{clearTimeout(admissionTimer);if(generation!==this.generation||this.connection!==connection)return;this.connection=null;if(this.status==='error')return;this.disconnected();};
  connection.on('close',closed);connection.on('error',closed);
 }
 private send(data:unknown){if(this.connection?.open)try{this.connection.send(data);}catch{this.disconnected();}}
 private disconnected(){this.connected=false;this.guestInput=idle();this.authority.remote=idle();if(this.world.phase==='playing')this.world.togglePause();this.update('disconnected',this.isHost?'搭档连接中断，远征已暂停。等待原搭档重新连接。':'与房主连接中断，远征已暂停。请尝试重新连接。');}
 private checkConnection(){if(!this.active||!this.connected)return;const now=Date.now();if(now-this.lastSeen>8000){const c=this.connection;this.connection=null;c?.close();this.disconnected();return;}if(now-this.lastPing>900){this.lastPing=now;this.send({type:'ping',at:now});}}
 ready(){if(!this.connected||this.started)return;if(!this.isHost)this.send({type:'ready',ready:!this.guestReady});}
 start(difficulty:string){if(!this.canStart)return;this.authority.start(crypto.getRandomValues(new Uint32Array(1))[0],difficulty,true);this.run=this.authority.run;this.started=true;this.update('playing');this.sendState();}
 command(kind:Command['kind'],value?:string){if(!this.connected||!this.started)return false;const command:Command={kind,value,epoch:this.isHost?this.authority.epoch:this.epoch};if(this.isHost){const applied=this.applyCommand(command);if(applied)this.sendState();return applied;}this.send({type:'command',command});return true;}
 private applyCommand(command:Command,guest=false){if(!command||typeof command!=='object'||!this.connected)return false;const applied=this.authority.command(command,guest);if(applied){this.run=this.authority.run;if(command.kind==='lobby'){this.started=false;this.guestReady=false;this.update('lobby');}this.changed();}return applied;}
 pause(){if(this.world.phase==='playing')this.command('pause');}
 reconnect(){if(this.isHost){this.message='等待原搭档使用同一房间码重新连接';this.changed();return;}const code=this.code;void this.join(code);}
 private sendState(){if(!this.isHost||!this.connected)return;this.send({type:'state',version:PROTOCOL,seq:++this.stateSeq,run:this.authority.run,epoch:this.authority.epoch,world:capture(this.world),events:this.authority.takeEvents()});}
 private receiveState(data:StateMessage){
  if(data.version!==PROTOCOL||!Number.isSafeInteger(data.seq)||data.seq<=this.receivedSeq||!validSnapshot(data.world))return;
  this.receivedSeq=data.seq;const previousPhase=this.world.phase,previousOffer=this.world.growth.offerRevision,newRun=data.run!==this.run;this.run=data.run;this.epoch=data.epoch;
  const oldPlayers=this.world.players,oldEnemies=this.world.enemies,oldBullets=this.world.bullets;
  Object.assign(this.world,data.world);this.world.eventQueue.push(...(Array.isArray(data.events)?data.events.filter(e=>typeof e==='string').slice(0,100):[]));
  this.target=JSON.parse(JSON.stringify(data.world));
  if(!newRun&&previousPhase===data.world.phase){this.world.players.forEach((p,i)=>{if(oldPlayers[i]&&Math.hypot(p.x-oldPlayers[i].x,p.y-oldPlayers[i].y)<180){p.x=oldPlayers[i].x;p.y=oldPlayers[i].y;}});const enemies=new Map(oldEnemies.map(e=>[e.id,e]));this.world.enemies.forEach(e=>{const old=enemies.get(e.id);if(old){e.x=old.x;e.y=old.y;}});const bullets=new Map(oldBullets.map(b=>[b.id,b]));this.world.bullets.forEach(b=>{const old=bullets.get(b.id);if(old&&Math.hypot(old.x-b.x,old.y-b.y)<40){b.x=old.x;b.y=old.y;}});}
  this.started=this.world.phase!=='menu';const status=this.started?'playing':'lobby';if(this.status!==status||newRun||previousPhase!==this.world.phase||previousOffer!==this.world.growth.offerRevision){this.status=status;this.changed();}
 }
 tick(dt:number,actions:Action[]){
  if(!this.active){this.world.update(dt,actions);return;}
  if(!this.connected||!this.started)return;
  const local=singleAction(actions);this.sendClock+=dt;
  if(this.isHost){this.authority.step(dt,local,Date.now());if(this.sendClock>=.05){this.sendClock=0;this.sendState();}}
  else{
   this.guestInput={...local,dash:local.dash||this.guestInput.dash,skill:local.skill||this.guestInput.skill,ult:local.ult||this.guestInput.ult};
   if(this.sendClock>=1/30){this.sendClock=0;this.send({type:'input',seq:++this.inputSeq,action:this.guestInput});this.guestInput={...local,dash:false,skill:false,ult:false};}
   this.interpolate(dt);
  }
 }
 private interpolate(dt:number){if(!this.target)return;const k=1-Math.exp(-dt*28),move=(a:Vec,b:Vec)=>{a.x+=(b.x-a.x)*k;a.y+=(b.y-a.y)*k;};this.world.players.forEach((p,i)=>move(p,this.target!.players[i]));const enemies=new Map(this.target.enemies.map(e=>[e.id,e]));for(const e of this.world.enemies){const target=enemies.get(e.id);if(target)move(e,target);}const bullets=new Map(this.target.bullets.map(b=>[b.id,b]));for(const b of this.world.bullets){const target=bullets.get(b.id);if(target)move(b,target);}}
 leave(notify=true){
  if(notify)this.send({type:'closed'});this.generation++;this.clearTimeout();if(this.heartbeat)clearInterval(this.heartbeat);this.heartbeat=null;
  const c=this.connection,p=this.peer;this.connection=null;this.peer=null;c?.close();p?.destroy();
  this.role=null;this.status='idle';this.connected=false;this.started=false;this.guestReady=false;this.code='';this.message='';this.token='';this.acceptedToken='';this.everConnected=false;this.target=null;this.stateSeq=0;this.receivedSeq=0;this.inputSeq=0;this.authority=new Authority(this.world);this.run=0;this.sendClock=0;this.world.phase='menu';this.changed();
 }
}
