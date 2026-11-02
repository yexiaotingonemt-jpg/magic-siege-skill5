import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CURRENT_DESIGN as design} from '../shared/current-design-data.js';
import {classes,liveConfig} from '../shared/config.js';
import {Room} from '../server/room.mjs';
import {near} from './current-design-fixture.mjs';
import {visualEvent,skillLabel} from '../client/src/current-skill-visuals.js';
import {unitMotionPose} from '../client/src/unit-motion.js';
const source=JSON.parse(readFileSync(new URL('../docs/source/当前技能设计-20261102.json',import.meta.url),'utf8'));
const clean=s=>s.replace(/\s+/g,'').replaceAll('个百分点','%');
test('默认战局采用当前设计，旧被动结算不与新被动叠加',()=>{
 const config=liveConfig(),room=new Room();assert.equal(config.design.enabled,true);assert.equal(room.sim.config.design.enabled,true);assert.equal(config.innate.enabled,0);
 assert.equal(config.heroes[4].skills[0].power,320);assert.equal(config.heroes[4].skills[0].heatCap,10);assert.equal(config.heroes[4].skills[2].cd,20);assert.equal(config.heroes[3].skills[1].duration,1.2);
});
test('领主新技能显示映射保留真实技能位、名称与原始事件',()=>{
 const config=liveConfig(),original={classId:3,skill:2};const e=visualEvent(config,original);assert.equal(e.skill,1);assert.equal(e.sourceSkill,2);assert.equal(skillLabel({config},e),'暗影冲锋');assert.deepEqual(original,{classId:3,skill:2});
 const shell=visualEvent(config,{classId:3,skill:1});assert.equal(shell.skill,2);assert.equal(skillLabel({config},shell),'尖刺外壳');
});
test('新冲锋对象优先播放冲锋动作，不退回步行或待机',()=>{
 assert.equal(unitMotionPose({id:1,hero:true,classId:3,hp:100,currentDash:{}},1).action,'dash');
});
for(const [id,skills] of Object.entries(design.skills))for(const [i,skill] of skills.entries())test(`${classes[id]}技能${i+1}：名称、效果、费用、CD与前摇逐项对应钉钉`,()=>{
 const row=source.skills.find(r=>r[1]===classes[id]&&r[2]===skill.name);assert.ok(row);
 assert.equal(clean(skill.description),clean(row[3]));assert.deepEqual([skill.cost,skill.cd,skill.cast],row.slice(4,7).map(Number));
});
const whole=new Set(['duration','targets','range','bounces','taunt','knock','shots','initial_heat','heat_duration_extra','heat_cap_extra','range_bonus','elf_extra_targets','damage_targets']);
const boolean=new Set(['immortal','pierce','split','drag','passive_dr']);
const groups=(text,percent=false)=>[...text.split('（')[0].matchAll(/\d+(?:\.\d+)?(?:%?\/\d+(?:\.\d+)?)*%?(?:个百分点)?/g)].map(m=>m[0]).filter(t=>!percent||t.includes('%')||t.includes('个百分点')).map(t=>t.match(/\d+(?:\.\d+)?/g).map(Number));
for(const a of design.affixes)test(`${classes[a.classId]}词条${a.sourceId}：全部档位、上限、品质对应当前源表`,()=>{
 const row=source.affixes.find(r=>r[2]===a.name&&(a.common?r[1]==='通用词条':r[0]===classes[a.classId]&&r[1]===(a.skill==null?'职业被动':design.skills[a.classId][a.skill].name)));
 assert.ok(row,a.id);assert.equal(clean(a.description),clean(row[3]));assert.equal(a.max,Number(row[4]));assert.equal(a.rarity,{'蓝':'blue','紫':'purple','金':'gold'}[row[5]]);
 const key=a.keys[0],id=a.sourceId,ps=groups(row[3],true),ns=groups(row[3]);let expected;
 if(id===51)expected=ps[1].map(n=>[.3,n/100]);
 else if(id===52)expected=ps[0].map((n,i)=>[.06+n/100,2+ps[1][i]/100]);
 else if(id===67)expected=[[.15,1.5]];
 else if(boolean.has(key))expected=[[1]];
 else if(id===77)expected=[[2]];
 else if(id===31)expected=[[6]];
 else {const series=[88,91].includes(id)?ps.at(-1):whole.has(key)?ns[0]:ps[0];expected=series.map(n=>[Number(a.baseline[0])+n/(whole.has(key)?1:100)]);}
 assert.equal(expected.length,a.max);for(let r=0;r<a.max;r++)for(let j=0;j<a.keys.length;j++)near(a.values[r][j],expected[r][j]);
 if(a.skill!=null)for(let j=0;j<a.keys.length;j++)near(Number(a.baseline[j]),Number(design.skills[a.classId][a.skill][a.keys[j]]||0));
});
test('完整覆盖五职业20技能、5被动和104种词条，通用项展开143个合法职业实例',()=>{
 assert.equal(source.skills.length-1,25);assert.equal(source.affixes.length-1,104);assert.equal(new Set(design.affixes.map(a=>a.sourceId)).size,104);assert.equal(design.affixes.length,143);
 assert.ok(!design.affixes.some(a=>a.sourceId===63),'已移除的范围连轰不能重新混入');
});
test('计分系数来自当前源表，固定B、P与KDA口径',()=>{
 for(const id of [0,4,5,2,3]){const row=source.scores.find(r=>r[0]===classes[id]+'系数');const numbers=[...row[1].matchAll(/[abc]＝(\d+\.\d+)/g)].map(m=>Number(m[1]));assert.deepEqual(['a','b','c'].map(k=>design.scoreCoefficients[id][k]),numbers);}
 assert.equal(design.rules.heroKillPoints,200);assert.equal(design.rules.heroAssistPoints,100);assert.equal(design.rules.staminaPoints,100);assert.equal(design.rules.standardStamina,21);
});
