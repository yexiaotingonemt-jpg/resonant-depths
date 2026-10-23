import Phaser from 'phaser';
import './style.css';
import './net/online.css';
import {World,W,H} from './sim';
import {Arena} from './scene';
import {Input} from './input';
import {Sound} from './audio';
import {OnlineSession} from './net/session';
import {onlineMenu,onlineBadge,onlineOverlay} from './net/ui';
import {chapters,rooms,relics,routeInfo,type Route} from './data';
const world=new World(),sound=new Sound();
const ui=document.querySelector<HTMLDivElement>('#ui')!;
let roomValue=new URLSearchParams(location.search).get('room')||'';
let mode=roomValue?'online':'ai',difficulty='normal',lastPhase='',hudClock=0,guide=false,savedEnd=false;
let record={runs:0,wins:0,best:0,dust:0};try{record={...record,...JSON.parse(localStorage.getItem('resonant-record')||'{}')};}catch{}
let observedRun=0;const recordedOnlineRuns=new Set<string>();
const net=new OnlineSession(world,()=>{if(net.run!==observedRun){observedRun=net.run;savedEnd=false;guide=false;}render();});
function pauseGame(){if(guide){guide=false;render();return;}if(net.active)net.command(world.phase==='paused'?'resume':'pause');else world.togglePause();input.clear();render();}
const input=new Input(pauseGame);
function autoPause(){if(world.phase==='playing'){if(net.active)net.pause();else world.togglePause();render();}}
window.addEventListener('blur',autoPause);
document.addEventListener('visibilitychange',()=>{if(document.hidden)autoPause();});
window.addEventListener('pagehide',()=>net.leave());
const scene=new Arena(world,input,sound,()=>{if(world.phase!==lastPhase){render();lastPhase=world.phase;}if(performance.now()-hudClock>100){updateHud();hudClock=performance.now();}},(dt,actions)=>net.tick(dt,actions));
new Phaser.Game({type:Phaser.AUTO,parent:'game',width:W,height:H,backgroundColor:'#101c1d',scene:[scene],scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},render:{antialias:true},audio:{noAudio:true},banner:false});
function start(same=false){sound.start();input.clear();if(net.active){if(net.started)net.command(same?'retry':'restart');else net.start(difficulty);return;}world.reset(mode==='ai',same?world.seed:crypto.getRandomValues(new Uint32Array(1))[0],difficulty);savedEnd=false;guide=false;render();}

function controls(){return `<div class="control-columns"><div class="control-player amber"><b>01 <span>烬 · 逐火者</span></b><p>近距离爆燃，守住前线。</p><dl><dt>移动</dt><dd><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></dd><dt>冲刺</dt><dd><kbd>Space</kbd></dd><dt>焰环 · 范围爆燃</dt><dd><kbd>E</kbd></dd><dt>共鸣合击</dt><dd><kbd>Q</kbd></dd></dl></div><div class="control-player teal"><b>02 <span>澜 · 引潮者</span></b><p>涟漪护盾，为彼此续航。</p><dl><dt>移动</dt><dd><kbd>↑</kbd><kbd>←</kbd><kbd>↓</kbd><kbd>→</kbd></dd><dt>冲刺</dt><dd><kbd>Shift</kbd></dd><dt>潮汐 · 治疗与护盾</dt><dd><kbd>Enter</kbd></dd><dt>共鸣合击</dt><dd><kbd>/</kbd></dd></dl></div></div><div class="guide-rules"><p><b>自动攻击</b>进入射程后自动锁定最近敌人，专注走位与协作。</p><p><b>魂链灼烧</b>保持 400 距离内连接，让敌人穿过魂链，持续造成伤害。</p><p><b>守望救援</b>靠近倒地队友，停留 2.8 秒即可救援。两人同时倒地，远征结束。</p><p><b>双生共鸣</b>连接与击杀积累共鸣，满槽后任一玩家可释放全屏合击。</p><p><b>手柄支持</b>左摇杆移动 · A 冲刺 · X 技能 · Y 合击；一、二号手柄对应两位玩家。</p></div><small class="muted">联网双人：两人各用 WASD / 方向键、Space、E、Q 或自己的手柄。Esc / P 同步暂停。<br>同屏双人仍使用上方两套按键。</small>`;}
function render(){
 const phase=world.phase;ui.className=phase+(mode==='online'?' online-menu':'');ui.innerHTML=`<div class="topline"><a class="wordmark" href="#" data-action="brand">◈ <span>RESONANT</span></a><span class="edition">共鸣深井 <i>/</i> 双人协作肉鸽</span>${net.active?onlineBadge(net):''}<div class="utilities"><button class="utility" data-action="sound" aria-label="切换声音" title="切换声音">${sound.enabled?'♫':'♪̸'}</button><button class="utility" data-action="fullscreen" aria-label="全屏" title="全屏">⛶</button>${phase!=='menu'?'<button class="utility" data-action="pause" aria-label="暂停游戏" title="暂停 Esc">Ⅱ</button>':''}</div></div>`;
 if(phase==='menu')ui.innerHTML+=`<section class="title-screen"><div class="title-copy"><div class="title-sigil">✧</div><h1>共鸣深井</h1><div class="english-title">R E S O N A N T</div><div class="fine-line"></div><p class="poem">两道微光，一条归途。<br>与另一位守灯人，走进无昼之地。</p><div class="mode-select" role="group" aria-label="搭档模式"><button data-mode="ai" class="${mode==='ai'?'active':''}">独自启程 <small>AI 搭档</small></button><button data-mode="duo" class="${mode==='duo'?'active':''}">同屏双人 <small>本地协作</small></button><button data-mode="online" class="${mode==='online'?'active':''}">联网双人 <small>房间协作</small></button></div>${mode==='online'?onlineMenu(net,roomValue):'<button class="primary start" data-action="start">开始远征 <span>↗</span></button>'}<button class="text-button" data-action="guide">操作指南 <span>→</span></button><div class="difficulty"><label for="difficulty">远征难度</label><select id="difficulty"><option value="normal" ${difficulty==='normal'?'selected':''}>标准 · 守灯人</option><option value="gentle" ${difficulty==='gentle'?'selected':''}>轻松 · 初行者</option></select></div></div><div class="world-caption"><span class="ornament">◇ ─── ◇</span><p>苔光庭院</p><small>THE GARDEN OF ECHOES</small></div><footer class="menu-footer"><span>三章九境 · 随机遗物 · 灵魂相连 · <a href="https://github.com/yexiaotingonemt-jpg/resonant-depths/blob/main/ART.md" target="_blank" rel="noopener">美术：Flare 团队 · CC BY-SA 3.0</a></span><span>${record.runs?`远征 ${record.runs} 次 · 通关 ${record.wins} 次`:'为两位旅人而作'} <i>✧</i></span></footer></section>`;
 else ui.innerHTML+=`<header class="hud"><div class="player-hud amber"><div class="portrait">♨</div><div class="player-info"><div class="player-name"><b>烬</b><span>P1 · ${net.active?(net.isHost?'你 · 房主':'搭档 · 房主'):'逐火者'}</span><em id="hp0"></em></div><div class="hp-track"><div id="bar0"></div></div><div class="player-status" id="status0"></div></div></div><div class="room-hud"><span id="chapter">${chapters[Math.floor(world.room/3)]}</span><div class="route-dots">${Array.from({length:9},(_,i)=>`<i class="${i===world.room?'current':i<world.room?'done':''} ${i%3===2?'boss-dot':''}"></i>`).join('')}</div><small id="room-count">${String(world.room+1).padStart(2,'0')} / 09 · ${rooms[world.room]}</small></div><div class="player-hud teal"><div class="portrait">☽</div><div class="player-info"><div class="player-name"><b>澜</b><span>P2 · ${net.active?(net.isHost?'搭档':'你'):world.ai?'AI 搭档':'引潮者'}</span><em id="hp1"></em></div><div class="hp-track"><div id="bar1"></div></div><div class="player-status" id="status1"></div></div></div></header><div class="combat-note" id="notice" aria-live="polite"></div><aside class="run-info"><span id="timer">00:00</span><span>◈ <b id="dust">0</b></span><span>击败 <b id="kills">0</b></span><span id="wave"></span></aside><div class="bottom-hud"><div class="abilities amber"><div class="ability"><span>↯</span><b id="dash0"></b><small><kbd>Space</kbd> 冲刺</small></div><div class="ability"><span>✺</span><b id="skill0"></b><small><kbd>E</kbd> 焰环</small></div></div><div class="resonance"><div class="link-label" id="link-label">魂链连接</div><button id="ult" data-action="ult" aria-label="释放共鸣合击"><span class="resonance-fill" id="charge-fill"></span><i>⋈</i><strong>双生共鸣</strong><em id="charge">0%</em></button><small><kbd>Q</kbd> ${net.active?'两人都可释放':'/ <kbd>/</kbd> 满槽释放'} · 自动攻击</small></div><div class="abilities teal"><div class="ability"><span>☽</span><b id="skill1"></b><small><kbd>${net.active?'E':'Enter'}</kbd> 潮汐</small></div><div class="ability"><span>↯</span><b id="dash1"></b><small><kbd>${net.active?'Space':'Shift'}</kbd> 冲刺</small></div></div></div><div class="inventory">${world.inventory.map(id=>{const r=relics.find(r=>r.id===id)!;return `<span title="${r.name}：${r.desc}" class="${r.color}">${r.glyph}</span>`;}).join('')}</div>`;
 if(phase==='paused')ui.innerHTML+=`<div class="scrim"><section class="modal pause-modal"><div class="modal-symbol">Ⅱ</div><h2>微光，稍作停留</h2><p>黑暗会等待你们。</p><button class="primary" data-action="resume">继续远征 <span>→</span></button><button class="secondary" data-action="guide">操作指南</button><button class="text-button" data-action="menu">返回营地</button></section></div>`;
 if(phase==='reward')ui.innerHTML+=`<div class="scrim"><section class="modal reward-modal"><div class="modal-symbol">✧</div><div class="overline">ROOM CLEARED · ${String(world.room+1).padStart(2,'0')}</div><h2>拾起长夜中的馈赠</h2><p>为两位守灯人选择一件遗物 · 效果本次远征全程生效，可叠加</p><div class="relic-choices">${world.choices.map((r,i)=>`<button class="relic ${r.color}" data-relic="${r.id}"><span class="relic-index">0${i+1} <i>↗</i></span><span class="relic-glyph">${r.glyph}</span><span class="relic-type">${r.type}</span><h3>${r.name}</h3><p>${r.desc}</p><span class="relic-flavor">${r.flavor}</span></button>`).join('')}</div><small class="muted">${net.active?'任意一人选择 · 同步给双方':'共享构筑 · 两人同时获得强化'}</small></section></div>`;
 if(phase==='route')ui.innerHTML+=`<div class="scrim"><section class="modal route-modal"><div class="modal-symbol">◇</div><div class="overline">THE PATH AHEAD</div><h2>下一道回声</h2><p>${chapters[Math.floor(world.room/3)]} · 第 ${world.room+1} 境 · ${rooms[world.room]}</p><div class="route-choices">${world.routes.map(r=>`<button class="route-option" data-route="${r}"><span>${world.room%3===2?'♜':routeInfo[r].glyph}</span><h3>${world.room%3===2?'守护者之门':routeInfo[r].name}</h3><p>${world.room%3===2?'击败本章守护者，深入下一层':routeInfo[r].desc}</p><b>循光前行 →</b></button>`).join('')}</div></section></div>`;
 if(phase==='lost'||phase==='won'){
  const onlineKey=net.code+':'+net.run;
  if(!savedEnd&&(!net.active||!recordedOnlineRuns.has(onlineKey))){if(net.active)recordedOnlineRuns.add(onlineKey);record.runs++;if(phase==='won')record.wins++;record.best=Math.max(record.best,world.room+1);record.dust+=world.dust;try{localStorage.setItem('resonant-record',JSON.stringify(record));}catch{}savedEnd=true;}
  ui.innerHTML+=`<div class="scrim"><section class="modal end-modal"><div class="modal-symbol">${phase==='won'?'☼':'☾'}</div><div class="overline">${phase==='won'?'DAWN RETURNS':'UNTIL WE MEET AGAIN'}</div><h2>${phase==='won'?'你们把黎明带了回来':'微光暂歇，余烬未熄'}</h2><p>${phase==='won'?'深井之心已平息。两道微光，终成破晓。':'每一段同行，都让下一次启程更加勇敢。'}</p><div class="results"><div><b>${world.room+1}<small>/ 9</small></b><span>抵达深境</span></div><div><b>${formatTime(world.time)}</b><span>远征时间</span></div><div><b>${world.kills}</b><span>驱散暗影</span></div><div><b>${world.revives}</b><span>守望救援</span></div></div><p class="seed">远征种子 ${world.seed} · 获得 ${world.inventory.length} 件遗物 · 星尘 ${world.dust}</p>${net.active&&!net.isHost?'<p class="muted">等待房主重新启程，或返回营地离开房间。</p>':'<button class="primary" data-action="restart">重新启程 <span>↗</span></button><button class="secondary" data-action="retry">重试相同种子</button>'}<button class="text-button" data-action="menu">返回营地</button></section></div>`;
 }
 ui.innerHTML+=onlineOverlay(net);
 if(guide)ui.innerHTML+=`<div class="scrim guide-scrim"><section class="modal guide-modal"><button class="close utility" data-action="close-guide" aria-label="关闭操作指南">×</button><div class="overline">A LIGHT FOR EACH OTHER</div><h2>同行者手册</h2>${controls()}<button class="primary" data-action="close-guide">记住了，出发吧 <span>→</span></button></section></div>`;
 updateHud();
}
function formatTime(t:number){return `${String(Math.floor(t/60)).padStart(2,'0')}:${String(Math.floor(t%60)).padStart(2,'0')}`;}
function updateHud(){const lag=document.getElementById('net-lag');if(lag)lag.textContent=net.connected?`${net.latency} ms`:'连接中';if(world.phase==='menu')return;const text=(id:string,value:string)=>{const e=document.getElementById(id);if(e)e.textContent=value;};world.players.forEach((p,i)=>{text('hp'+i,`${Math.ceil(p.hp)} / ${p.maxHp}`);const bar=document.getElementById('bar'+i);if(bar)bar.style.width=`${p.hp/p.maxHp*100}%`;text('status'+i,p.down?`等待救援 · ${Math.round(p.revive/2.8*100)}%`:p.inv>1?'护盾生效':'自动索敌 · '+(i?'潮汐之杖':'余烬之刃'));text('dash'+i,p.dash>0?p.dash.toFixed(1):'就绪');text('skill'+i,p.skill>0?p.skill.toFixed(1):'就绪');});text('timer',formatTime(world.time));text('dust',String(world.dust));text('kills',String(world.kills));text('wave',world.bossName?'守护者战':`暗潮 ${world.wave} / ${world.waves}`);text('notice',world.noticeTime>0?world.notice:'');text('charge',`${Math.floor(world.charge)}%`);text('link-label',world.players.some(p=>p.down)?'靠近倒地搭档即可救援':world.link?'魂链连接 · 灼烧与共鸣积累':'魂链断开 · 靠近彼此');const fill=document.getElementById('charge-fill');if(fill)fill.style.width=world.charge+'%';const ult=document.getElementById('ult') as HTMLButtonElement|null;if(ult){ult.classList.toggle('ready',world.charge>=100);ult.disabled=world.phase!=='playing'||world.charge<100;}}
ui.addEventListener('input',e=>{if((e.target as HTMLElement).id==='room-code')roomValue=(e.target as HTMLInputElement).value;});
ui.addEventListener('change',e=>{if((e.target as HTMLElement).id==='difficulty')difficulty=(e.target as HTMLSelectElement).value;});
ui.addEventListener('keydown',e=>{if(e.key==='Enter'&&(e.target as HTMLElement).id==='room-code'){e.preventDefault();sound.start();void net.join(roomValue);}});
async function copyRoom(link:boolean){let message='已复制'+(link?'邀请链接':'房间码');try{await navigator.clipboard.writeText(link?net.invite:net.roomLabel);}catch{message='复制失败，请手动选中房间码复制。';}const hint=document.getElementById('copy-status');if(hint)hint.textContent=message;}
ui.addEventListener('click',e=>{
 const button=(e.target as HTMLElement).closest<HTMLButtonElement>('button,a');if(!button||button.disabled||button.tagName==='A'&&!button.dataset.action)return;e.preventDefault();
 if(button.dataset.mode){if(net.active)return;mode=button.dataset.mode;render();return;}
 if(button.dataset.relic){if(net.active)net.command('relic',button.dataset.relic);else world.choose(button.dataset.relic);input.clear();render();return;}
 if(button.dataset.route){if(net.active)net.command('route',button.dataset.route);else world.enterRoom(button.dataset.route as Route);input.clear();render();return;}
 switch(button.dataset.action){
  case'net-create':mode='online';sound.start();input.clear();void net.create();break;
  case'net-join':sound.start();input.clear();void net.join(roomValue);break;
  case'net-ready':sound.start();net.ready();break;
  case'net-start':start();break;
  case'net-reconnect':sound.start();net.reconnect();break;
  case'net-copy-code':void copyRoom(false);break;
  case'net-copy-link':void copyRoom(true);break;
  case'net-leave':net.leave();input.clear();guide=false;render();break;
  case'start':case'restart':start();break;case'retry':start(true);break;
  case'guide':if(world.phase==='playing'){if(net.active)net.pause();else world.togglePause();}guide=true;render();break;
  case'close-guide':guide=false;render();break;
  case'resume':sound.start();pauseGame();break;case'pause':pauseGame();break;
  case'menu':if(net.active)net.leave();else world.phase='menu';guide=false;render();break;
  case'sound':sound.start();sound.enabled=!sound.enabled;render();break;
  case'fullscreen':if(document.fullscreenElement)void document.exitFullscreen();else void document.documentElement.requestFullscreen().catch(()=>{});break;
  case'ult':input.pressed.add('KeyQ');break;
 }
});
function fit(){const app=document.getElementById('app')!;const scale=Math.min(innerWidth/W,innerHeight/H);app.style.width=W+'px';app.style.height=H+'px';app.style.transform=`translate(-50%,-50%) scale(${scale})`;}
window.addEventListener('resize',fit);fit();render();
if(import.meta.env.DEV)(window as unknown as {resonant:unknown}).resonant={world,start,input,sound,net,scene};
