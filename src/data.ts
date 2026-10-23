export type Route = 'battle'|'elite'|'spring';
export const chapters = ['苔光庭院','沉星回廊','无昼圣所'];
export const rooms = ['失落的门庭','萤火花园','守门者','回声祭坛','碎月长廊','缚星者','静默之渊','终焉阶梯','深井之心'];
export interface Relic { id:string; name:string; glyph:string; type:string; desc:string; flavor:string; color:string; }
export const relics:Relic[] = [
 {id:'power',name:'余烬之刃',glyph:'✧',type:'攻击',desc:'两位守灯人的攻击伤害提高 25%。',flavor:'熄灭之处，仍有火种。',color:'amber'},
 {id:'haste',name:'流光沙漏',glyph:'⌛',type:'攻击',desc:'自动攻击间隔缩短 16%，技能冷却缩短 12%。',flavor:'让时间比黑暗先行一步。',color:'teal'},
 {id:'health',name:'常青之心',glyph:'❧',type:'生存',desc:'最大生命 +25，并为两人恢复 30 生命。',flavor:'根系记得每一次春天。',color:'teal'},
 {id:'chain',name:'缠星金线',glyph:'⋈',type:'共鸣',desc:'魂链伤害提高 50%，有效连接距离增加 45。',flavor:'命运不是枷锁，是另一只手。',color:'amber'},
 {id:'nova',name:'月轮残片',glyph:'☽',type:'共鸣',desc:'合击伤害提高 40%，每个房间初始共鸣 +15。',flavor:'月亮破碎后，也有圆满。',color:'teal'},
 {id:'speed',name:'旅风之羽',glyph:'≋',type:'机动',desc:'移动速度 +12%，冲刺冷却缩短 18%。',flavor:'风从不独自远行。',color:'teal'},
 {id:'pierce',name:'穿林之矢',glyph:'➶',type:'攻击',desc:'弹体额外穿透 1 个敌人，伤害提高 8%。',flavor:'穿过迷雾，奔向彼此。',color:'amber'},
 {id:'multishot',name:'双生棱镜',glyph:'◇',type:'攻击',desc:'每次攻击额外发射 1 枚偏转弹体。',flavor:'一束光，也能有两个归处。',color:'amber'},
 {id:'leech',name:'赤露花',glyph:'✿',type:'生存',desc:'每击败 6 个敌人，为存活的两人恢复 3 生命。',flavor:'伤口里也会开花。',color:'amber'},
 {id:'armor',name:'旧日护符',glyph:'⬡',type:'生存',desc:'受到的伤害减少 18%，至少保留 1 点伤害。',flavor:'被守护过的人，更懂得守护。',color:'teal'},
 {id:'revive',name:'归途灯芯',glyph:'♧',type:'协作',desc:'救援速度提高 60%，复起时恢复 65% 生命。',flavor:'你在的地方，就是归途。',color:'teal'},
 {id:'charge',name:'永燃烛火',glyph:'♨',type:'共鸣',desc:'共鸣积累速度提高 35%，合击为两人恢复 10 生命。',flavor:'两朵火焰，照亮同一个长夜。',color:'amber'},
 {id:'frost',name:'霜语之种',glyph:'❄',type:'控制',desc:'攻击命中使敌人减速 35%，持续 1.5 秒。',flavor:'请黑暗，走慢一点。',color:'teal'},
 {id:'orbit',name:'环星之石',glyph:'⊙',type:'攻击',desc:'两人各获得一颗环绕星，对接触敌人持续造成伤害。',flavor:'总有星辰，为你环绕。',color:'teal'},
 {id:'dash',name:'烬行足迹',glyph:'↯',type:'机动',desc:'冲刺产生爆燃，对周围敌人造成 45 点伤害。',flavor:'身后留火，身前留路。',color:'amber'},
 {id:'close',name:'同心誓约',glyph:'∞',type:'协作',desc:'两人相距小于 180 时，攻击伤害额外提高 30%。',flavor:'走得近些，夜就短些。',color:'amber'},
 {id:'skill',name:'苏醒纹章',glyph:'✺',type:'技能',desc:'主动技能伤害提高 45%，技能冷却缩短 15%。',flavor:'石头的梦里，还有晨曦。',color:'amber'},
 {id:'magnet',name:'拾光贝壳',glyph:'◈',type:'成长',desc:'自动拾取半径 +90，每次清房额外获得 20 星尘。',flavor:'把一路的光，都装进口袋。',color:'teal'}
];
export const routeInfo: Record<Route,{name:string;desc:string;glyph:string}>={battle:{name:'幽影战场',desc:'常规战斗 · 获得一件遗物',glyph:'⚔'},elite:{name:'精英试炼',desc:'更强敌潮 · 星尘翻倍 · 额外治疗',glyph:'♜'},spring:{name:'静谧灵泉',desc:'恢复 35% 生命 · 较少敌人',glyph:'♧'}};
