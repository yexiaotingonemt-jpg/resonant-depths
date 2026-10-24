import {World,clamp,idle,type Action} from '../sim';
import {relics,type Route} from '../data';

export const PROTOCOL=4;
const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function roomCode(){const values=crypto.getRandomValues(new Uint8Array(8));return Array.from(values,n=>alphabet[n%alphabet.length]).join('');}
export const normalizeCode=(s:string)=>s.toUpperCase().replace(/[\s-]/g,'');
export const validCode=(s:string)=>new RegExp(`^[${alphabet}]{8}$`).test(s);
export const displayCode=(s:string)=>s.slice(0,4)+'-'+s.slice(4);
export function cleanAction(value:unknown):Action|null{
 if(!value||typeof value!=='object')return null;const v=value as Record<string,unknown>;
 if(typeof v.x!=='number'||typeof v.y!=='number'||!Number.isFinite(v.x)||!Number.isFinite(v.y))return null;
 return {x:clamp(v.x,-1,1),y:clamp(v.y,-1,1),dash:v.dash===true,skill:v.skill===true,ult:v.ult===true};
}
export function singleAction(actions:Action[]):Action{const [a=idle(),b=idle()]=actions;return{x:a.x||b.x,y:a.y||b.y,dash:a.dash||b.dash,skill:a.skill||b.skill,ult:a.ult||b.ult};}

const snapshotKeys=['phase','beforePause','players','enemies','bullets','fx','pickups','hazards','room','time','roomTime','wave','waves','charge','ultFlash','link','bossName','seed','kills','dust','combo','bestCombo','revives','ai','difficulty','route','inventory','choices','routes','notice','noticeTime','stats','coop','growth'] as const;
export type Snapshot=Pick<World,typeof snapshotKeys[number]>;
export function capture(world:World):Snapshot{
 const out:Partial<Snapshot>={};for(const key of snapshotKeys)(out as Record<string,unknown>)[key]=world[key];
 return JSON.parse(JSON.stringify(out,(_key,value)=>typeof value==='number'?Math.round(value*1000)/1000:value)) as Snapshot;
}
export function validSnapshot(value:unknown):value is Snapshot{
 if(!value||typeof value!=='object')return false;const s=value as Snapshot;
 if(Object.keys(s).some(k=>!(snapshotKeys as readonly string[]).includes(k))||snapshotKeys.some(k=>!Object.hasOwn(s,k)))return false;
 if(!['seed','kills','dust','revives','charge','combo','bestCombo','roomTime','wave','waves','ultFlash','noticeTime','time'].every(k=>Number.isFinite((s as unknown as Record<string,unknown>)[k])))return false;
 if(!Array.isArray(s.inventory)||s.inventory.length>128||!s.inventory.every(id=>{const relic=relics.find(r=>r.id===id);return relic&&s.inventory.filter(item=>item===id).length<=relic.maxRank;})||!Array.isArray(s.routes)||!s.routes.every(r=>['battle','elite','spring'].includes(r)))return false;
 if(!Array.isArray(s.choices)||!s.choices.every(choice=>{const original=relics.find(r=>r.id===choice?.id);return original&&Object.entries(original).every(([key,v])=>(choice as unknown as Record<string,unknown>)[key]===v);}))return false;
 if(!s.coop||!['links','rescues','bursts','lastTime'].every(k=>Number.isFinite((s.coop as unknown as Record<string,unknown>)[k]))||typeof s.coop.last!=='string'||s.coop.last.length>160)return false;
 const growth=s.growth;
 if(!growth||typeof growth.drafting!=='boolean'||typeof growth.lifelineUsed!=='boolean'||!['','relay','bulwark','vortex','rescue'].includes(growth.path)||![-1,0,1].includes(growth.relayOwner))return false;
 if(!Number.isInteger(growth.rerolls)||growth.rerolls<0||growth.rerolls>2||!Number.isSafeInteger(growth.offerRevision)||growth.offerRevision<0)return false;
 const growthTimers=['relayWindow','relayCooldown','relayRefundCooldown','handoff','storedGuard','thornsCooldown','watchTime','watchCooldown','mendCooldown','seedCooldown'] as const;
 if(!growthTimers.every(k=>Number.isFinite(growth[k])&&growth[k]>=0&&growth[k]<=10000))return false;
 const cores=s.inventory.map(id=>relics.find(r=>r.id===id)!).filter(r=>r.core);
 if(cores.length>1||(cores[0]?.path||'')!==growth.path)return false;
 if(!Array.isArray(s.players)||!s.players.every(p=>p&&[p.barrier,p.barrierTime,p.ultReady].every(n=>Number.isFinite(n)&&n>=0)))return false;
 if(!Array.isArray(s.enemies)||!s.enemies.every(e=>e&&[e.mark,e.fracture,e.taunt,e.snareTime,e.snareHits].every(n=>Number.isFinite(n)&&n>=0)&&typeof e.guard==='boolean'&&[-1,0,1].includes(e.snareTarget)))return false;
 return ['menu','playing','paused','reward','route','won','lost'].includes(s.phase)&&Number.isFinite(s.time)&&Number.isInteger(s.room)&&s.room>=0&&s.room<=8&&Array.isArray(s.players)&&s.players.length===2&&s.players.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&Number.isFinite(p.hp)&&p.maxHp>0)&&Array.isArray(s.enemies)&&s.enemies.length<500&&Array.isArray(s.bullets)&&s.bullets.length<3000&&Array.isArray(s.fx)&&Array.isArray(s.pickups)&&Array.isArray(s.hazards)&&Array.isArray(s.inventory)&&Array.isArray(s.choices)&&Array.isArray(s.routes)&&!!s.stats;
}
export type Command={kind:'pause'|'resume'|'relic'|'reroll'|'route'|'restart'|'retry'|'lobby';epoch:string;value?:string};
export class Authority {
 run=0;inputSeq=0;inputAt=0;remote=idle();events:string[]=[];accumulator=0;private localEdges=idle();
 constructor(public world:World){}
 get epoch(){return `${this.run}:${this.world.room}:${this.world.phase}:${this.world.growth.offerRevision}`;}
 start(seed:number,difficulty:string,draft=false){this.run++;this.world.reset(false,seed,difficulty);if(draft)this.world.beginDraft();this.remote=idle();this.localEdges=idle();this.inputSeq=0;this.inputAt=0;this.accumulator=0;this.events=[];}
 input(seq:number,value:unknown,now:number){const a=cleanAction(value);if(!a||!Number.isSafeInteger(seq)||seq<=this.inputSeq)return false;this.inputSeq=seq;this.inputAt=now;this.remote={...a,dash:a.dash||this.remote.dash,skill:a.skill||this.remote.skill,ult:a.ult||this.remote.ult};return true;}
 step(dt:number,local:Action,now:number){
  if(now-this.inputAt>350)this.remote=idle();
  this.localEdges={...local,dash:local.dash||this.localEdges.dash,skill:local.skill||this.localEdges.skill,ult:local.ult||this.localEdges.ult};
  this.accumulator=Math.min(this.accumulator+dt,.1);
  while(this.accumulator>=1/60){this.world.update(1/60,[this.localEdges,this.remote]);this.remote={...this.remote,dash:false,skill:false,ult:false};this.localEdges={...local,dash:false,skill:false,ult:false};this.accumulator-=1/60;}
  this.events.push(...this.world.eventQueue);this.events=this.events.slice(-100);
 }
 command(command:Command,guest=false){
  if(command.epoch!==this.epoch)return false;const w=this.world;
  switch(command.kind){
   case'pause':if(w.phase!=='playing')return false;w.togglePause();this.remote=idle();break;
   case'resume':if(w.phase!=='paused')return false;w.togglePause();this.remote=idle();this.inputAt=0;break;
   case'relic':if(w.phase!=='reward'||!w.choices.some(r=>r.id===command.value))return false;w.choose(command.value!);break;
   case'reroll':if(w.phase!=='reward'||!w.reroll())return false;break;
   case'route':if(w.phase!=='route'||!w.routes.includes(command.value as Route))return false;w.enterRoom(command.value as Route);break;
   case'restart':case'retry':if(guest||!['lost','won'].includes(w.phase))return false;this.start(command.kind==='retry'?w.seed:crypto.getRandomValues(new Uint32Array(1))[0],w.difficulty,true);break;
   case'lobby':if(guest)return false;w.phase='menu';break;
   default:return false;
  }this.remote=idle();this.localEdges=idle();return true;
 }
 takeEvents(){const events=this.events;this.events=[];return events;}
}
