export type Route = 'battle'|'elite'|'spring';
export const chapters = ['苔光庭院','沉星回廊','无昼圣所'];
export const rooms = ['失落的门庭','萤火花园','守门者','回声祭坛','碎月长廊','缚星者','静默之渊','终焉阶梯','深井之心'];
export type BuildPath='relay'|'bulwark'|'vortex'|'rescue';
export interface Relic { id:string; name:string; glyph:string; type:string; desc:string; detail?:string; flavor:string; color:string; maxRank:number; path?:BuildPath; core?:boolean; }
const baseRelics:Omit<Relic,'maxRank'>[] = [
 {id:'power',name:'余烬之刃',glyph:'✧',type:'攻击',desc:'烬和澜的普攻、破甲和引爆伤害提高 25%。',detail:'每次升级在当前伤害基础上再提高 25%；也提高接力爆炸和引爆扩散，不提高冲刺爆燃、环绕星、蓄能反击或双人合击。',flavor:'熄灭之处，仍有火种。',color:'amber'},
 {id:'haste',name:'流光沙漏',glyph:'⌛',type:'攻击',desc:'双方普攻间隔缩短 16%，技能冷却缩短 12%。',detail:'每次升级按当前数值继续缩短攻击间隔和技能冷却，多次升级的比例不直接相加。',flavor:'让时间比黑暗先行一步。',color:'teal'},
 {id:'health',name:'常青之心',glyph:'❧',type:'生存',desc:'双方最大生命各增加 25，并立即各恢复 30 生命。已经倒下的搭档仍需另一人靠近扶起。',flavor:'根系记得每一次春天。',color:'teal'},
 {id:'chain',name:'缠星金线',glyph:'⋈',type:'共鸣',desc:'魂链能让经过的敌人走得更慢，也允许烬和澜站得更远。把敌人引到两人之间，更容易留住它们接技能。',detail:'魂链有效距离每级增加 45；减速强度每级增强，最多使敌人减速 60%。魂链本身不造成伤害，也不产生合击能量。',flavor:'命运不是枷锁，是另一只手。',color:'amber'},
 {id:'nova',name:'月轮残片',glyph:'☽',type:'共鸣',desc:'双人合击伤害提高 40%，每次进入房间额外获得 15 点合击能量。能量满后，仍需两人分别按键确认，才会释放合击。',detail:'伤害每级在当前数值上再提高 40%；进房能量每级增加 15 点，总能量最多 100。',flavor:'月亮破碎后，也有圆满。',color:'teal'},
 {id:'speed',name:'旅风之羽',glyph:'≋',type:'机动',desc:'双方移动速度提高 12%，冲刺冷却缩短 18%。',detail:'每次升级按当前移速继续提高 12%，按当前冲刺冷却继续缩短 18%，多次升级的比例不直接相加。',flavor:'风从不独自远行。',color:'teal'},
 {id:'pierce',name:'穿林之矢',glyph:'➶',type:'攻击',desc:'双方的普攻子弹都能多穿过 1 个敌人，普攻、破甲和引爆伤害提高 8%。敌人排成一列时，一发子弹能打到更多目标。',detail:'每级额外穿透 1 个敌人；伤害按当前数值再提高 8%，同样影响接力爆炸和引爆扩散，不提高冲刺、环绕星、反击或合击伤害。',flavor:'穿过迷雾，奔向彼此。',color:'amber'},
 {id:'multishot',name:'双生棱镜',glyph:'◇',type:'攻击',desc:'双方每次普攻都多发射 1 枚稍微偏向侧面的子弹。把更多敌人纳入射线，可以一次给多个敌人加标记或打碎标记。',detail:'每升 1 级增加 1 枚子弹。子弹不会自动追踪，仍需靠走位把敌人放进射线。',flavor:'一束光，也能有两个归处。',color:'amber'},
 {id:'leech',name:'赤露花',glyph:'✿',type:'生存',desc:'两人合计每击败 6 个敌人，就各恢复 3 生命/级。只治疗还站着的人，不能直接扶起倒地的搭档。',detail:'击杀数量由全队共同累计；1、2、3 级每次分别恢复 3、6、9 生命。',flavor:'伤口里也会开花。',color:'amber'},
 {id:'armor',name:'旧日护符',glyph:'⬡',type:'生存',desc:'双方受到的伤害减少 18%。继续升级时，会在当前伤害基础上再减少 18%。',detail:'多次升级按剩余伤害继续减少，比例不直接相加；轻松模式与守望的减伤仍会生效。',flavor:'被守护过的人，更懂得守护。',color:'teal'},
 {id:'revive',name:'归途灯芯',glyph:'♧',type:'协作',desc:'靠近倒地搭档时，扶起速度提高 60%；搭档站起来后恢复到 65% 生命。升级能继续加快扶起，但不会提高这 65%。',detail:'每次升级在当前扶起速度上再提高 60%；复起生命固定为最大生命的 65%。',flavor:'你在的地方，就是归途。',color:'teal'},
 {id:'charge',name:'永燃烛火',glyph:'♨',type:'共鸣',desc:'打碎标记、引爆敌人和救援时，获得的合击能量提高 35%。释放双人合击后，还会额外为存活的两人各恢复 10 生命/级。',detail:'每次升级按当前的协作能量获取量再提高 35%；合击额外治疗每级增加 10 生命，不增加进房时获得的能量。',flavor:'两朵火焰，照亮同一个长夜。',color:'amber'},
 {id:'frost',name:'霜语之种',glyph:'❄',type:'控制',desc:'普攻命中的敌人移动速度降低 35%，每级持续 1.5 秒。先把敌人留住，搭档就更容易赶上来打碎标记或引爆。',detail:'1、2、3 级分别持续 1.5、3、4.5 秒；再次命中会刷新时间，减速比例不会叠加。',flavor:'请黑暗，走慢一点。',color:'teal'},
 {id:'orbit',name:'环星之石',glyph:'⊙',type:'攻击',desc:'两人身边各有一颗绕行的星，碰到敌人就持续造成伤害。每级每秒造成 30 点基础伤害；升级增强伤害，不增加星星数量。',detail:'星星在角色周围半径 55 的轨道运行；只有接触敌人时才造成伤害。',flavor:'总有星辰，为你环绕。',color:'teal'},
 {id:'dash',name:'烬行足迹',glyph:'↯',type:'机动',desc:'双方每次冲刺时，都会在起点附近炸开，对周围敌人造成 45 点伤害/级。先贴近敌人再冲刺，可以边躲攻击边造成伤害。',detail:'爆炸半径 95；伤害每级增加 45，不沿整条冲刺路线持续造成伤害。',flavor:'身后留火，身前留路。',color:'amber'},
 {id:'close',name:'同心誓约',glyph:'∞',type:'协作',desc:'烬打碎标记时造成的额外伤害、烬用技能攻击标记目标的伤害，以及澜的引爆伤害，每级提高 30%。两人连续配合才有收益。',detail:'普通攻击本身不会全部增伤；烬普攻获得的是打碎标记时的额外伤害加成。各级加成相加，最高增加 90%。',flavor:'你创造破口，我接住回响。',color:'amber'},
 {id:'skill',name:'苏醒纹章',glyph:'✺',type:'技能',desc:'烬和澜的主动技能伤害提高 45%，技能冷却缩短 15%。烬更容易打出伤害，澜也能更频繁地引爆已破甲的敌人。',detail:'每级按当前数值计算；强化技能本体，不强化接力爆炸、引爆扩散或蓄能反击的额外伤害。',flavor:'石头的梦里，还有晨曦。',color:'amber'},
 {id:'magnet',name:'拾光贝壳',glyph:'◈',type:'成长',desc:'离星尘更远时也能自动拾取。拿到它后，每次清房额外获得 20 星尘；升级继续扩大拾取范围，不再增加这 20 星尘。',detail:'自动拾取半径每级增加 90；清房额外 20 星尘只解锁一次。',flavor:'把一路的光，都装进口袋。',color:'teal'}
];
export const buildPaths:{id:BuildPath;name:string;glyph:string;color:string;summary:string;bonus3:string;bonus5:string}[]=[
 {id:'relay',name:'流火接力',glyph:'↯',color:'amber',summary:'烬和澜轮流用技能，帮先出手的人更快等到下一次技能。',bonus3:'另一人在 6 秒内接着用技能，先出手者的技能冷却额外减少 1 秒。',bonus5:'成功接技能后，双方技能冷却再减少 1 秒；接下来 5 秒，双方伤害额外提高 20%。'},
 {id:'bulwark',name:'双生壁垒',glyph:'⬡',color:'teal',summary:'澜给烬加盾，护盾挡下伤害，烬再用技能把存下的伤害打回去。',bonus3:'两人的护盾可存下最多 80 点伤害；烬下次用技能时把存下的伤害打出去，反击伤害提高 25%。',bonus5:'最多存下 100 点伤害。烬反击的半径扩大到 260，释放反击后获得 20 护盾。'},
 {id:'vortex',name:'星涡织阵',glyph:'⊙',color:'teal',summary:'烬把敌人拉到一起并打碎标记，澜引爆一个目标，也能伤到旁边的敌人。',bonus3:'双方技能半径各增加 30；澜引爆时，对附近敌人额外造成 15 点范围伤害，每次技能最多触发 3 次。',bonus5:'烬打碎标记后，额外给附近 2 个敌人加标记；澜每次技能的前 3 次引爆，还会先拉近周围的普通敌人，首领除外。'},
 {id:'rescue',name:'逆境守望',glyph:'♧',color:'amber',summary:'解救搭档，或在残血搭档身边用技能，把危险时刻变成两人的反攻机会。',bonus3:'解缚、扶起搭档，或在生命不高于 45% 的搭档身边用技能，让双方增伤 25%，持续 8 秒；解缚和扶起后，双方还各恢复 8 生命。',bonus5:'守望生效时，双方受到的伤害减少 20%；守望触发冷却从 12 秒缩短至 8 秒。'}
];
const pathRelics:Relic[]=[
 {id:'relay_oath',path:'relay',core:true,maxRank:1,name:'交棒誓约',glyph:'↯',type:'起始誓约',desc:'烬用技能后，澜在 4 秒内接着用技能，烬的技能冷却减少 1.2 秒，澜周围额外造成 24 点范围伤害。换澜先手也一样。',detail:'范围伤害以后一位施法者为中心，半径 160。整次接力加成最多每 1.5 秒触发一次；流派等级 3 时，接招时间延长至 6 秒。',flavor:'把余火交给下一双手。',color:'amber'},
 {id:'relay_refund',path:'relay',maxRank:3,name:'回流刻印',glyph:'⌛',type:'接力',desc:'烬打碎标记后，澜的技能少等 0.35 秒；澜引爆敌人后，烬的技能少等 0.6 秒。每升 1 级，都增加同样的减免时间。',detail:'打碎标记的减冷却最多每 0.6 秒触发一次；引爆的减冷却每次施法只算一次，不按引爆数量重复计算。',flavor:'你的出手，为我争来下一刻。',color:'amber'},
 {id:'relay_echo',path:'relay',maxRank:3,name:'叠焰铜铃',glyph:'♨',type:'接力',desc:'烬和澜轮流用技能，后一人及时接上时，会在自己周围额外造成 16 点范围伤害/级。不需要「交棒誓约」也能触发。',detail:'接招时间为 4 秒，流派等级 3 后为 6 秒；伤害半径 160，接力加成触发间隔 1.5 秒。有「交棒誓约」时，额外伤害加在原有 24 点上。',flavor:'第二声，总是回应。',color:'amber'},
 {id:'relay_window',path:'relay',maxRank:2,name:'不熄引线',glyph:'∞',type:'接力',desc:'澜给敌人的标记、烬打出的破甲状态，每级都多持续 1.5 秒。搭档能有更多时间靠近目标，再接上攻击或引爆技能。',detail:'两种状态分别延长；不会延长交替使用技能的接招时间。',flavor:'为迟来的一步留灯。',color:'amber'},
 {id:'relay_handoff',path:'relay',maxRank:2,name:'同拍双针',glyph:'⋈',type:'接力',desc:'烬和澜轮流用技能，后一人及时接上时，双方伤害提高 12%/级，持续 5 秒。再次成功接上，会刷新持续时间。',detail:'接招时间为 4 秒，流派等级 3 后为 6 秒；接力加成触发间隔 1.5 秒。重复触发只刷新时间，不重复叠加同一份增伤。',flavor:'不必同时，却要相接。',color:'amber'},
 {id:'bulwark_oath',path:'bulwark',core:true,maxRank:1,name:'承压誓约',glyph:'⬡',type:'起始誓约',desc:'澜引爆敌人给烬加盾，护盾挡下的伤害会被存起来。烬下次用技能时，把存下的伤害打向周围敌人；每间房先给烬 20 护盾。',detail:'两人的护盾都能存入同一份蓄能，默认最多 60；反击基础伤害等于存量，半径 200。只有护盾实际挡下的伤害才计入，生命受伤不计入。',flavor:'把最重的一击交给我。',color:'teal'},
 {id:'bulwark_capacity',path:'bulwark',maxRank:3,name:'层叠鳞甲',glyph:'◇',type:'壁垒',desc:'护盾上限每级增加 20，持续时间每级增加 1 秒。澜连续引爆多个敌人时，烬能留下更多护盾，也能多等一会再接敌人的攻击。',detail:'默认护盾上限为 55、持续 6 秒；这件遗物只提高上限和时间，不会直接补满护盾。',flavor:'一片鳞，是一次信任。',color:'teal'},
 {id:'bulwark_share',path:'bulwark',maxRank:2,name:'并肩壁灯',glyph:'◈',type:'壁垒',desc:'烬得到护盾时，澜也会得到一份：每级相当于本次护盾量的 35%。不会分走烬的护盾，两人都能受到保护。',detail:'澜的护盾按本次授予烬的原始数值计算，不受烬当前护盾是否已满影响；双方仍各自遵守护盾上限。',flavor:'盾后，也该有你的位置。',color:'teal'},
 {id:'bulwark_thorns',path:'bulwark',maxRank:3,name:'返棘护环',glyph:'✺',type:'壁垒',desc:'任意一人的护盾挡住伤害时，会伤到自己周围的敌人。每级造成所挡伤害的 50%，单次基础伤害最多 25 点。',detail:'伤害以持盾者为中心，半径 160；全队共用 0.8 秒触发间隔。25 点是其他增伤生效前的上限，不会远程反弹给攻击者。',flavor:'不让守护只留下伤痕。',color:'teal'},
 {id:'bulwark_return',path:'bulwark',maxRank:2,name:'回护契石',glyph:'❧',type:'壁垒',desc:'澜每引爆一个已破甲的敌人，给烬的护盾额外增加 5 点/级。只要这次技能成功引爆，烬的技能冷却还会减少 0.4 秒/级。',detail:'额外护盾按引爆数量计算；减少冷却每次施法只算一次。',flavor:'每个破口，都能铸成盾。',color:'teal'},
 {id:'vortex_oath',path:'vortex',core:true,maxRank:1,name:'引星誓约',glyph:'⊙',type:'起始誓约',desc:'烬用技能拉近普通敌人，首领不会被拉动；澜用技能引爆已破甲的敌人时，对它周围的敌人再造成 30 点伤害。额外伤害每次技能最多触发 3 次。',detail:'烬的牵引半径 300，每个敌人最多被拉近 150，至少保留 100 间距；额外伤害以被引爆的敌人为中心，半径 140，不会再次触发引爆。',flavor:'让散落的星，回到同一片天。',color:'teal'},
 {id:'vortex_thread',path:'vortex',maxRank:2,name:'宽弦星索',glyph:'≋',type:'星涡',desc:'两人站得更远时，魂链也不会轻易断开；魂链两侧的减速区域也更宽。把敌人夹在中间，更容易让它们一直受减速影响。',detail:'魂链有效距离每级增加 60，减速判定向两侧各延伸 8；不会增加魂链的减速比例。',flavor:'把战场织成我们的形状。',color:'teal'},
 {id:'vortex_still',path:'vortex',maxRank:2,name:'凝波镜片',glyph:'❄',type:'星涡',desc:'烬或澜的技能命中敌人后，会使其减速 35%，每级持续 2 秒。先用技能留住敌人，让搭档更容易接上攻击。',detail:'只在技能命中时触发；再次命中会刷新时间，减速比例不会叠加。',flavor:'这一瞬，留给你。',color:'teal'},
 {id:'vortex_seed',path:'vortex',maxRank:2,name:'传星花种',glyph:'✿',type:'星涡',desc:'烬打碎一个标记后，会把澜的标记传给附近另外 2 个尚未被标记的敌人/级。烬再攻击它们，就能继续打出破甲。',detail:'传播半径 150，最多每 1.2 秒传播一次；优先选择较近的目标，不会直接替烬完成破甲或替澜完成引爆。',flavor:'一人点灯，两人铺开星海。',color:'teal'},
 {id:'vortex_reach',path:'vortex',maxRank:2,name:'广域星盘',glyph:'☽',type:'星涡',desc:'烬的技能能打到更远的敌人，澜也能引爆更大范围内的破甲目标。有「引星誓约」时，烬拉近敌人的范围也会扩大。',detail:'每级使烬的技能半径增加 30、澜的技能半径增加 40；烬的牵引半径同步增加 30，不改变流派等级 5 时澜引爆附带的牵引半径。',flavor:'让你创造的机会，再大一点。',color:'teal'},
 {id:'rescue_oath',path:'rescue',core:true,maxRank:1,name:'守望誓约',glyph:'♧',type:'起始誓约',desc:'解开搭档的束缚、扶起搭档，或在生命不高于 45% 的搭档身边用技能，都能让双方进入「守望」：伤害提高 25%，持续 6 秒。',detail:'在残血搭档身边用技能，需要两人距离不超过 400。守望全队共用 12 秒触发冷却；不能靠自己的低血量触发，升级流派可改善持续时间和冷却。',flavor:'你的险境，就是我的出手时刻。',color:'amber'},
 {id:'rescue_mend',path:'rescue',maxRank:3,name:'回春结绳',glyph:'❧',type:'守望',desc:'解开搭档的束缚、扶起搭档，或在残血搭档身边用技能，都能为搭档恢复 8 生命/级。残血指生命不高于 45%。',detail:'使用技能治疗时，搭档必须存活且距离不超过 400；全队共用 10 秒治疗冷却。解开束缚和扶起后的治疗不要求搭档处于残血。',flavor:'先把你拉回来，再一起往前。',color:'amber'},
 {id:'rescue_release',path:'rescue',maxRank:1,name:'解缚指环',glyph:'⌁',type:'守望',desc:'攻击束缚搭档的敌人，普攻命中 2 次就能解开束缚。扶起倒地搭档的速度提高 30%，也可以站得稍远一些。',detail:'扶起距离增加 25。解缚命中只统计搭档的攻击；受束缚的人自己攻击施法者，不会减少所需的命中次数。',flavor:'握得住，便不放开。',color:'amber'},
 {id:'rescue_lifeline',path:'rescue',maxRank:1,name:'最后一线',glyph:'✧',type:'守望',desc:'全队每局共 1 次：受到致命伤时，只要搭档活着且在附近，就不会倒下，而是恢复到 30% 生命，并获得 2 秒无敌。',detail:'搭档距离必须不超过 500；任意一人用掉后，另一人也不能再触发。进入下一个房间不会重置次数。',flavor:'还没到说再见的时候。',color:'amber'},
 {id:'rescue_courage',path:'rescue',maxRank:2,name:'逆风双翼',glyph:'➶',type:'守望',desc:'搭档生命不高于 45%，或已经倒下时，你的伤害提高 12%/级。只看搭档的状态，自己的低血量不会触发增伤。',detail:'搭档恢复到 45% 生命以上后，增伤立即结束；两人分别按对方的状态判断。这份增伤不影响双人合击。',flavor:'你需要我时，我就更勇敢。',color:'amber'}
];
export const relics:Relic[]=[...baseRelics.map(r=>({...r,maxRank:3})),...pathRelics];
export const relicRank=(inventory:string[],id:string)=>inventory.filter(owned=>owned===id).length;
export const buildLevel=(inventory:string[],path:BuildPath)=>inventory.reduce((total,id)=>total+(relics.find(r=>r.id===id)?.path===path?1:0),0);
export const routeInfo: Record<Route,{name:string;desc:string;glyph:string}>={battle:{name:'幽影战场',desc:'常规难度的战斗。清房后可选遗物，最终房胜利后直接结算。',glyph:'⚔'},elite:{name:'精英试炼',desc:'进房各恢复 10 生命；敌人更多、更耐打，击杀掉落的星尘翻倍。',glyph:'♜'},spring:{name:'静谧灵泉',desc:'进房各恢复最大生命的 35%，敌人数量更少；清房后照常选择遗物。',glyph:'♧'}};
