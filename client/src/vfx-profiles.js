// Art frames: 4 skills × 5 factions, shared by authored timelines, never by color alone.
const make=(hero,row,color,light,accent,skills)=>skills.map(([signature,read,release,impact],i)=>({hero,row,skill:i,frame:row*4+i,color,light,accent,signature,read,release,impact,ultimate:i===3}));
export const VFX_PROFILES={
 0:make('祖灵战纹',0,0x4dc4aa,0xe8fff1,0xc69b62,[
  ['ancestral-cleave','斜劈斧光 / 破甲裂纹',.65,.5],['guardian-roar','声浪扩散 / 群体守护',.85,.5],['rescue-gates','双向祖灵通道 / 换位落印',.9,.5],['ancestral-bulwark','六片战纹甲 / 蓄伤成盾两幕',1.65,1.8]
 ]),
 2:make('奥术晶械',1,0x70dcec,0xe2fcff,0xaf92ff,[
  ['caustic-shell','腐蚀彗弹 / 酸液冠',.45,.75],['glacial-shell','冰晶炮弹 / 放射冰棱',.5,.8],['fourfold-artillery','四重测距阵 / 弧线落弹',.7,.65],['reactor-collapse','晶核压缩 / 三环爆震',1.1,1.65]
 ]),
 3:make('黯冕王权',2,0xb18aee,0xf1ddff,0x59327f,[
  ['throne-rend','扇面暗镰 / 地脉裂隙',.7,.5],['shadow-procession','预警路径 / 黯影冲锋',.6,.5],['infernal-bastion','冥焰牢笼 / 随身灼烧',.9,.55],['dread-coronation','王冠升起 / 三柄王剑 / 帝王溅射',1.95,.8]
 ]),
 4:make('熔日秘术',3,0xf88135,0xffefb5,0xd74029,[
  ['flame-lance','狭长焰矛 / 针状穿刺',.6,.5],['spiral-fireball','螺旋火球 / 炙热爆燃',.85,.6],['soul-brand','焚魂火眼 / 烙印缎带',.85,.6],['solar-judgement','日轮开翼 / 多目标天火裁决',1.85,1.3]
 ]),
 5:make('圣林生息',4,0x8ad8a0,0xf2ffe0,0x4baf9c,[
  ['living-bolt','灵叶飞矢 / 回流治疗',.85,.5],['symbiotic-helix','双螺旋藤带 / 双端生息',.9,.5],['sacrificial-lotus','献血凝露 / 白莲净化',1,.5],['worldtree-benediction','圣树展开 / 根脉群疗 / 落叶收束',2,.9]
 ])
};
// 技能换位后保留对应的原画帧，时间线使用新的技能编号。
[VFX_PROFILES[2][2],VFX_PROFILES[2][3]]=[VFX_PROFILES[2][3],VFX_PROFILES[2][2]];
[VFX_PROFILES[4][1],VFX_PROFILES[4][2]]=[VFX_PROFILES[4][2],VFX_PROFILES[4][1]];
for(const profiles of Object.values(VFX_PROFILES))profiles.forEach((p,i)=>{p.skill=i;p.ultimate=i===3;});
export const vfxProfile=(id,skill)=>VFX_PROFILES[id]?.[skill];
// The hand-painted motifs have different silhouettes. Explicit frames preserve
// the canopy/crown tips while excluding adjacent rows' colored edges.
const atlasRows=[[[0,290],[0,290],[0,290],[0,290]],[[290,575],[290,575],[290,575],[290,558]],[[580,830],[575,828],[575,830],[558,830]],[[840,1110],[828,1098],[833,1095],[832,1095]],[[1122,1402],[1110,1402],[1105,1402],[1098,1402]]];
export function vfxAtlasFrame(row,col,width,height){const [top,bottom]=atlasRows[row][col],x=Math.round(col*width/4),y=Math.round(top/1402*height);return {x,y,width:Math.round((col+1)*width/4)-x,height:Math.round(bottom/1402*height)-y};}
export const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
export const easeOut=t=>1-(1-Math.max(0,Math.min(1,t)))**3;
