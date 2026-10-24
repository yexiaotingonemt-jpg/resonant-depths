export type Route = 'battle'|'elite'|'spring';
export const chapters = ['苔光庭院','沉星回廊','无昼圣所'];
export const rooms = ['失落的门庭','萤火花园','守门者','回声祭坛','碎月长廊','缚星者','静默之渊','终焉阶梯','深井之心'];
export type BuildPath='relay'|'bulwark'|'vortex'|'rescue';
export interface Relic { id:string; name:string; glyph:string; type:string; desc:string; flavor:string; color:string; maxRank:number; path?:BuildPath; core?:boolean; }
const baseRelics:Omit<Relic,'maxRank'>[] = [
 {id:'power',name:'余烬之刃',glyph:'✧',type:'攻击',desc:'两位守灯人的攻击伤害提高 25%。',flavor:'熄灭之处，仍有火种。',color:'amber'},
 {id:'haste',name:'流光沙漏',glyph:'⌛',type:'攻击',desc:'自动攻击间隔缩短 16%，技能冷却缩短 12%。',flavor:'让时间比黑暗先行一步。',color:'teal'},
 {id:'health',name:'常青之心',glyph:'❧',type:'生存',desc:'最大生命 +25，并为两人恢复 30 生命。',flavor:'根系记得每一次春天。',color:'teal'},
 {id:'chain',name:'缠星金线',glyph:'⋈',type:'共鸣',desc:'魂链减速效果增强，有效连接距离增加 45。',flavor:'命运不是枷锁，是另一只手。',color:'amber'},
 {id:'nova',name:'月轮残片',glyph:'☽',type:'共鸣',desc:'合击伤害提高 40%，每个房间初始共鸣 +15。',flavor:'月亮破碎后，也有圆满。',color:'teal'},
 {id:'speed',name:'旅风之羽',glyph:'≋',type:'机动',desc:'移动速度 +12%，冲刺冷却缩短 18%。',flavor:'风从不独自远行。',color:'teal'},
 {id:'pierce',name:'穿林之矢',glyph:'➶',type:'攻击',desc:'弹体额外穿透 1 个敌人，伤害提高 8%。',flavor:'穿过迷雾，奔向彼此。',color:'amber'},
 {id:'multishot',name:'双生棱镜',glyph:'◇',type:'攻击',desc:'每次攻击额外发射 1 枚偏转弹体。',flavor:'一束光，也能有两个归处。',color:'amber'},
 {id:'leech',name:'赤露花',glyph:'✿',type:'生存',desc:'每击败 6 个敌人，为存活的两人恢复 3 生命。',flavor:'伤口里也会开花。',color:'amber'},
 {id:'armor',name:'旧日护符',glyph:'⬡',type:'生存',desc:'受到的伤害减少 18%，至少保留 1 点伤害。',flavor:'被守护过的人，更懂得守护。',color:'teal'},
 {id:'revive',name:'归途灯芯',glyph:'♧',type:'协作',desc:'救援速度提高 60%，复起时恢复 65% 生命。',flavor:'你在的地方，就是归途。',color:'teal'},
 {id:'charge',name:'永燃烛火',glyph:'♨',type:'共鸣',desc:'协作获得的共鸣提高 35%，双人合击额外为两人恢复 10 生命。',flavor:'两朵火焰，照亮同一个长夜。',color:'amber'},
 {id:'frost',name:'霜语之种',glyph:'❄',type:'控制',desc:'攻击命中使敌人减速 35%，持续时间每级增加 1.5 秒。',flavor:'请黑暗，走慢一点。',color:'teal'},
 {id:'orbit',name:'环星之石',glyph:'⊙',type:'攻击',desc:'两人各获得一颗环绕星，对接触敌人持续造成伤害。',flavor:'总有星辰，为你环绕。',color:'teal'},
 {id:'dash',name:'烬行足迹',glyph:'↯',type:'机动',desc:'冲刺产生爆燃，对周围敌人造成 45 点伤害。',flavor:'身后留火，身前留路。',color:'amber'},
 {id:'close',name:'同心誓约',glyph:'∞',type:'协作',desc:'破印与引爆伤害每级提高 30%，奖励连续的双人配合。',flavor:'你创造破口，我接住回响。',color:'amber'},
 {id:'skill',name:'苏醒纹章',glyph:'✺',type:'技能',desc:'主动技能伤害提高 45%，技能冷却缩短 15%。',flavor:'石头的梦里，还有晨曦。',color:'amber'},
 {id:'magnet',name:'拾光贝壳',glyph:'◈',type:'成长',desc:'自动拾取半径 +90，每次清房额外获得 20 星尘。',flavor:'把一路的光，都装进口袋。',color:'teal'}
];
export const buildPaths:{id:BuildPath;name:string;glyph:string;color:string;summary:string;bonus3:string;bonus5:string}[]=[
 {id:'relay',name:'流火接力',glyph:'↯',color:'amber',summary:'交替交出技能，让上一棒更快回来。',bonus3:'接力窗口延长至 6 秒，上一位施法者额外返还 1 秒冷却。',bonus5:'接力后双方技能再减 1 秒，且 5 秒内伤害额外提高 20%。'},
 {id:'bulwark',name:'双生壁垒',glyph:'⬡',color:'teal',summary:'织灯返盾，破阵接伤，再把压力还给敌人。',bonus3:'护盾格挡可蓄能至 80，破阵技能消耗蓄能反击，反击伤害提高 25%。',bonus5:'蓄能上限 100，反击半径增至 260，释放反击后返还 20 护盾。'},
 {id:'vortex',name:'星涡织阵',glyph:'⊙',color:'teal',summary:'把敌人聚到一起，让一次破印传到整片敌群。',bonus3:'双方技能半径 +30；引爆产生 15 点额外扩散伤害。',bonus5:'破印额外传播 2 个标记，引爆还会先牵引周围普通敌人。'},
 {id:'rescue',name:'逆境守望',glyph:'♧',color:'amber',summary:'回应搭档的危险，把救援变成反攻时机。',bonus3:'解救或回应低血搭档可触发 8 秒守望；解救后双方各恢复 8 生命。',bonus5:'守望期间受伤减少 20%，守望触发冷却由 12 秒降至 8 秒。'}
];
const pathRelics:Relic[]=[
 {id:'relay_oath',path:'relay',core:true,maxRank:1,name:'交棒誓约',glyph:'↯',type:'起始誓约',desc:'双方在 4 秒内交替施放技能：上一人冷却返还 1.2 秒，后一人周围产生 24 点回响。回响有 1.5 秒触发间隔。',flavor:'把余火交给下一双手。',color:'amber'},
 {id:'relay_refund',path:'relay',maxRank:3,name:'回流刻印',glyph:'⌛',type:'接力',desc:'破印返还织灯者 0.35 秒技能冷却，引爆返还破阵者 0.6 秒。每级增加等量；破印回流间隔 0.6 秒，引爆每次施法仅返还一次。',flavor:'你的出手，为我争来下一刻。',color:'amber'},
 {id:'relay_echo',path:'relay',maxRank:3,name:'叠焰铜铃',glyph:'♨',type:'接力',desc:'交替技能触发的回响增加 16 点伤害/级，作用于后出手者周围 160 范围；没有誓约也能产生回响。',flavor:'第二声，总是回应。',color:'amber'},
 {id:'relay_window',path:'relay',maxRank:2,name:'不熄引线',glyph:'∞',type:'接力',desc:'标记与破印窗口各延长 1.5 秒/级，给搭档更多接招时间。',flavor:'为迟来的一步留灯。',color:'amber'},
 {id:'relay_handoff',path:'relay',maxRank:2,name:'同拍双针',glyph:'⋈',type:'接力',desc:'交替技能后，双方 5 秒内伤害提高 12%/级；再次接力刷新持续时间。',flavor:'不必同时，却要相接。',color:'amber'},
 {id:'bulwark_oath',path:'bulwark',core:true,maxRank:1,name:'承压誓约',glyph:'⬡',type:'起始誓约',desc:'每间房破阵者获得 20 护盾。实际格挡伤害转为蓄能，最多 60；破阵者下一次技能释放等量反击震波。',flavor:'把最重的一击交给我。',color:'teal'},
 {id:'bulwark_capacity',path:'bulwark',maxRank:3,name:'层叠鳞甲',glyph:'◇',type:'壁垒',desc:'护盾上限增加 20、持续时间增加 1 秒，每级叠加。',flavor:'一片鳞，是一次信任。',color:'teal'},
 {id:'bulwark_share',path:'bulwark',maxRank:2,name:'并肩壁灯',glyph:'◈',type:'壁垒',desc:'破阵者获得护盾时，织灯者同时获得其 35%/级的护盾。',flavor:'盾后，也该有你的位置。',color:'teal'},
 {id:'bulwark_thorns',path:'bulwark',maxRank:3,name:'返棘护环',glyph:'✺',type:'壁垒',desc:'格挡时向周围 160 范围反伤，伤害为格挡量的 50%/级，单次最多 25；触发间隔 0.8 秒。',flavor:'不让守护只留下伤痕。',color:'teal'},
 {id:'bulwark_return',path:'bulwark',maxRank:2,name:'回护契石',glyph:'❧',type:'壁垒',desc:'每次引爆额外返还 5 护盾/级；有成功引爆的技能为破阵者返还 0.4 秒冷却/级。',flavor:'每个破口，都能铸成盾。',color:'teal'},
 {id:'vortex_oath',path:'vortex',core:true,maxRank:1,name:'引星誓约',glyph:'⊙',type:'起始誓约',desc:'破阵技能牵引 300 范围内的普通敌人，保留 100 间距；织灯引爆向周围 140 范围扩散 30 点伤害，每次施法最多 3 次扩散。',flavor:'让散落的星，回到同一片天。',color:'teal'},
 {id:'vortex_thread',path:'vortex',maxRank:2,name:'宽弦星索',glyph:'≋',type:'星涡',desc:'魂链距离增加 60、减速带加宽 8，每级叠加。',flavor:'把战场织成我们的形状。',color:'teal'},
 {id:'vortex_still',path:'vortex',maxRank:2,name:'凝波镜片',glyph:'❄',type:'星涡',desc:'技能命中的敌人减速 35%，持续 2 秒/级，帮助搭档追上连携。',flavor:'这一瞬，留给你。',color:'teal'},
 {id:'vortex_seed',path:'vortex',maxRank:2,name:'传星花种',glyph:'✿',type:'星涡',desc:'破印将织灯标记传播给 150 范围内另外 2 个敌人/级，传播间隔 1.2 秒。',flavor:'一人点灯，两人铺开星海。',color:'teal'},
 {id:'vortex_reach',path:'vortex',maxRank:2,name:'广域星盘',glyph:'☽',type:'星涡',desc:'破阵技能半径增加 30、织灯技能半径增加 40，每级叠加；牵引范围同步增加。',flavor:'让你创造的机会，再大一点。',color:'teal'},
 {id:'rescue_oath',path:'rescue',core:true,maxRank:1,name:'守望誓约',glyph:'♧',type:'起始誓约',desc:'解救、扶起搭档，或在生命不高于 45% 的搭档 400 范围内施放技能，触发 6 秒守望：双方伤害 +25%。触发冷却 12 秒。',flavor:'你的险境，就是我的出手时刻。',color:'amber'},
 {id:'rescue_mend',path:'rescue',maxRank:3,name:'回春结绳',glyph:'❧',type:'守望',desc:'解救搭档，或在低血搭档 400 范围内施放技能，为其恢复 8 生命/级；治疗间隔 10 秒。',flavor:'先把你拉回来，再一起往前。',color:'amber'},
 {id:'rescue_release',path:'rescue',maxRank:1,name:'解缚指环',glyph:'⌁',type:'守望',desc:'解开搭档束缚只需 2 次普攻；扶起速度提高 30%，扶起距离增加 25。',flavor:'握得住，便不放开。',color:'amber'},
 {id:'rescue_lifeline',path:'rescue',maxRank:1,name:'最后一线',glyph:'✧',type:'守望',desc:'每局一次：受到致命伤时，若搭档存活且在 500 范围内，保留 30% 生命并获得 2 秒无敌。',flavor:'还没到说再见的时候。',color:'amber'},
 {id:'rescue_courage',path:'rescue',maxRank:2,name:'逆风双翼',glyph:'➶',type:'守望',desc:'搭档生命不高于 45% 或倒下时，你造成的伤害提高 12%/级。自己的低血量不会触发。',flavor:'你需要我时，我就更勇敢。',color:'amber'}
];
export const relics:Relic[]=[...baseRelics.map(r=>({...r,maxRank:3})),...pathRelics];
export const relicRank=(inventory:string[],id:string)=>inventory.filter(owned=>owned===id).length;
export const buildLevel=(inventory:string[],path:BuildPath)=>inventory.reduce((total,id)=>total+(relics.find(r=>r.id===id)?.path===path?1:0),0);
export const routeInfo: Record<Route,{name:string;desc:string;glyph:string}>={battle:{name:'幽影战场',desc:'常规战斗 · 获得一件遗物',glyph:'⚔'},elite:{name:'精英试炼',desc:'更强敌潮 · 星尘翻倍 · 额外治疗',glyph:'♜'},spring:{name:'静谧灵泉',desc:'恢复 35% 生命 · 较少敌人',glyph:'♧'}};
