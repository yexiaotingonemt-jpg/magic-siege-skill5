const tag=(text,tone='scope')=>({text,tone});
const single=tag('单体'),area=tag('群体'),self=tag('自身'),ally=tag('友方');
const damage=tag('输出','output'),control=tag('控制','control'),heal=tag('治疗','healing'),shield=tag('护盾','protection');
const buff=text=>tag(text,'support');
const passiveTags=[
 [self,tag('净化','control')],[tag('导电','control')],[tag('攻城','output'),damage],
 [self,tag('减伤','protection')],[self,buff('攻速')],[self,buff('精灵恢复')]
];
const skillTags=[
 [[single,damage,buff('伤痕')],[single,damage,control,tag('减速','control')],[self,shield,tag('减伤','protection')],[single,damage,control,tag('击退','control')]],
 [[single,damage],[area,damage,tag('弹射','output')],[single,damage,control,tag('牵引','control')],[area,damage,tag('持续','output')]],
 [[area,damage,tag('攻城','output')],[ally,heal,buff('链接')],[area,tag('防护','protection'),tag('闪避','protection')],[area,damage,buff('突进'),tag('耗生命','penalty')]],
 [[area,damage,tag('降攻','control')],[area,control,tag('嘲讽','control'),tag('减伤','protection')],[self,tag('反伤','output')],[area,damage,tag('持续','output')]],
 [[single,damage],[area,damage,buff('普攻强化')],[self,buff('增伤'),buff('冷却缩减')],[area,damage,buff('消耗炙热')]],
 [[single,damage,tag('持续','output'),heal],[single,shield,tag('群体爆破','output')],[self,buff('增攻'),buff('精灵恢复')],[area,heal]]
];
export function abilityTags(classId,skill=null){return (skill==null?passiveTags[classId]:skillTags[classId][skill]).map(t=>({...t}));}
export function abilityTagsHTML(tags){return `<div class="ability-tags" aria-label="技能效果词条">${tags.map(t=>`<span class="ability-tag ability-tag--${t.tone}">${t.text}</span>`).join('')}</div>`;}
