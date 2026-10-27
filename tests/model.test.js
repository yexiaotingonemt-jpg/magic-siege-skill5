import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {defaults,clone,contractType,availableClasses,contractClasses} from '../src/config.js';
import {describeAbilities} from '../src/ability-descriptions.js';
import {unitStatuses,indexStatusFields} from '../src/unit-status.js';
const ids=[0,2,3,4,5],near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
function arena(id=0){const s=new Simulation();s.units=[];s.players[0].retired=true;s.waveAt=1e9;s.populationAt=1e9;for(const t of s.towers)t.x=100;function make(classId,x,y){const side=classId===3?1:0,p=s.makePlayer(side,false);p.classId=classId;p.level=6;p.builds[classId]=[1,1,1,1];const u=s.spawn(side,contractType(classId),0,1,x);assert.ok(s.contract(p,u.id));Object.assign(u,{x,y,hp:u.maxHp,cd:1e9,speed:0});return {p,h:u};}const {p,h}=make(id,0,0);s.localPlayerId=p.id;const enemy=make(id===3?0:3,0,3).h;enemy.hp=enemy.maxHp=1e7;const allies=[make(id===3?3:0,2,0).h,make(id===3?3:4,-2,0).h];for(const u of allies)u.hp=u.maxHp*.4;return {s,p,h,enemy,allies,make};}
function advance(s,time){for(let end=s.time+time;s.time<end-1e-8;)s.tick(Math.min(.05,end-s.time));}
for(const id of ids)for(let skill=0;skill<4;skill++)test(`职业${id} 技能${skill+1}：可施放、有限值、描述`,()=>{const {s,p,h,enemy,allies}=arena(id);enemy.targetId=allies[0].id;if(id===5&&skill===2)s.debuff(allies[0],enemy,'attackDown',.2,5);const before=p.stamina;assert.ok(s.cast(skill,p),s.notice);advance(s,1.5);assert.equal(p.stamina,before-s.config.heroes[id].skills[skill].cost);for(const u of s.units)for(const key of ['x','y','hp'])assert.ok(Number.isFinite(u[key]));assert.ok(describeAbilities(s).skills[skill].summary.length>5);for(const value of s.skillValues)assert.ok(value.spent<=value.limit+1e-6);});
test('只有详细表的4进攻职业、1防守职业可以契约',()=>{assert.deepEqual(availableClasses(0),[0,4,5,2]);assert.deepEqual(availableClasses(1),[3]);assert.deepEqual(contractClasses({side:0,type:'melee'}),[0]);assert.deepEqual(contractClasses({side:0,type:'ranged'}),[4,5]);assert.deepEqual(contractClasses({side:1,type:'ranged'}),[]);assert.equal(defaults.world.attackBots+defaults.world.defenseBots,0);});
test('兽人易伤可放大队友的伤害',()=>{const {s,h,enemy,allies}=arena(0);s.cast(0);advance(s,.4);const before=enemy.hp;s.damage(allies[0],enemy,100);near(before-enemy.hp,125);});
test('兽人战吼覆盖自己与附近友军，使用同一额度',()=>{const {s,h,enemy,allies}=arena(0);s.cast(1);advance(s,.4);for(const u of [h,...allies]){const before=u.hp;s.damage(enemy,u,100);near(before-u.hp,60);}});
test('兽人换位救援交换坐标且只给自己减伤',()=>{const {s,h,enemy,allies}=arena(0);enemy.targetId=allies[0].id;const old={x:h.x,y:h.y},pos={x:allies[0].x,y:allies[0].y};s.cast(2);advance(s,.4);near(h.x,pos.x);near(h.y,pos.y);near(allies[0].x,old.x);near(allies[0].y,old.y);assert.ok(h.guards.length);assert.equal(allies[0].guards,undefined);});
test('领主击杀4小兵或1英雄回复生命',()=>{const {s,h,enemy}=arena(3);h.hp=h.maxHp*.5;for(let i=0;i<4;i++){const u=s.spawn(0,'melee',0,1,1);s.damage(h,u,1e9);}near(h.hp,h.maxHp*.54);s.damage(h,enemy,1e9);near(h.hp,h.maxHp*.58);});
test('领主冲锋有0.7秒预警，沿路伤害、位移、同一目标只命中一次',()=>{const {s,h,enemy}=arena(3);enemy.y=10;const u=s.spawn(0,'melee',0,1,0);u.y=5;u.cd=1e9;u.speed=0;s.cast(1);advance(s,.6);near(h.y,0);advance(s,.2);assert.ok(h.y>0);const before=u.hp;advance(s,.8);assert.ok(u.hp<before);assert.ok(Math.abs(u.x)>=1.9);near(h.y,10);});
test('领主火盾减伤和灼烧均生效',()=>{const {s,h,enemy}=arena(3);s.cast(2);advance(s,.4);const hp=h.hp;s.damage(enemy,h,100);near(hp-h.hp,65);const foe=enemy.hp;advance(s,1);assert.ok(enemy.hp<foe);});
test('领主大招清除负面，免疫新控制且普攻溅射',()=>{const {s,h,enemy}=arena(3),u=s.spawn(0,'melee',0,1,1);u.y=3;s.debuff(h,enemy,'attackDown',.3,5);s.cast(3);advance(s,.35);assert.equal(s.hasNegative(h),false);assert.equal(s.stun(h,enemy,1),false);const hp=u.hp;s.afterBasicAttack(h,enemy);assert.ok(u.hp<hp);});
test('火焰技能3为一次伤害，5秒击杀标记，过期不叠热',()=>{const {s,h,enemy}=arena(4);s.cast(2);advance(s,.4);const hp=enemy.hp;advance(s,1);near(enemy.hp,hp);s.damage(h,enemy,1e9);assert.equal(h.heat,2);advance(s,15.1);assert.equal(h.heat,0);});
test('火焰技能3当次直接击杀也提供炙热',()=>{const {s,h,enemy}=arena(4);enemy.hp=1;s.cast(2);advance(s,.4);assert.equal(h.heat,2);});
test('普通索敌保留目标，新目标按英雄、小兵、塔再按距离',()=>{const {s,h,enemy}=arena(0),u=s.spawn(1,'melee',0,1,0);u.y=1;h.targetId=null;assert.equal(s.choose(h).id,enemy.id);h.targetId=u.id;assert.equal(s.choose(h).id,u.id);const tower=s.towers[0];tower.x=0;tower.y=5;const siege=s.spawn(0,'siege',0,1,0);siege.y=0;assert.equal(s.choose(siege).id,enemy.id);});
test('嘲讽优先于普通索敌，结束后正常重新选择',()=>{const {s,h,enemy}=arena(0),u=s.spawn(1,'melee',0,1,0);u.y=2;h.tauntId=u.id;h.tauntUntil=1;assert.equal(s.choose(h).id,u.id);s.time=2;h.targetId=null;assert.equal(s.choose(h).id,enemy.id);});
test('5职业自然战斗300秒，无非法坐标或无限数值',()=>{const c=clone(defaults);c.world.attackBots=4;c.world.defenseBots=1;const s=new Simulation(c);s.player.retired=true;for(let i=0;i<6000;i++)s.tick(.05);assert.ok(s.metrics.casts>10);for(const u of s.units)for(const k of ['hp','x','y'])assert.ok(Number.isFinite(u[k]));});


test('新版波次：进攻10名包含攻城兵，防守8名没有攻城兵',()=>{const s=new Simulation();assert.equal(s.units.filter(u=>u.side===0).length,10);assert.equal(s.units.filter(u=>u.side===1).length,8);assert.equal(s.units.filter(u=>u.side===0&&u.type==='siege').length,2);assert.equal(s.units.filter(u=>u.side===1&&u.type==='siege').length,0);assert.deepEqual(contractClasses({side:0,type:'siege'}),[2]);});
test('技能说明无未定义数值并与新版技能对应',()=>{for(const id of ids){const {s}=arena(id);for(const a of describeAbilities(s).skills)assert.doesNotMatch(a.effect,/undefined|NaN/);}assert.match(describeAbilities(arena(0).s).skills[3].summary,/护盾/);assert.match(describeAbilities(arena(2).s).skills[0].summary,/最大生命/);});
test('原始承伤计入评价，减伤与护盾不减少承伤统计',()=>{const {s,h,enemy}=arena(0);h.guards=[{ratio:.4,until:10,value:null}];s.shield(h,100,h,10);const hp=h.hp;s.damage(enemy,h,100);near(h.hp,hp);near(h.stats.damageTaken,100);near(h.shield,40);});
test('兽人大招到期按双倍承伤转盾，承伤阶段正常扣血且不生成猛虎',()=>{const {s,h,enemy}=arena(0);s.cast(3);advance(s,.4);const hp=h.hp;s.damage(enemy,h,1000);near(hp-h.hp,1000);near(h.shield,0);near(h.damageStore.total,1000);advance(s,5);near(h.shield,2000);assert.equal(h.damageStore,null);s.damage(enemy,h,500);near(h.shield,1500);near(h.hp,hp-1000);advance(s,8);near(h.shield,0);});
test('领主能量保留余数：3小兵后击杀英雄，回一次血且仍保留3能量',()=>{const {s,h,enemy}=arena(3);h.hp=h.maxHp*.5;for(let i=0;i<3;i++)s.damage(h,s.spawn(0,'melee',0,1,8),1e9);assert.equal(h.energy,3);const hp=h.hp;s.damage(h,enemy,1e9);near(h.hp-hp,h.maxHp*.04);assert.equal(h.energy,3);});
test('火焰1和3只选择最近一人，标记阵亡增加2层炙热',()=>{const {s,h,enemy}=arena(4),closer=s.spawn(1,'melee',0,1,0);closer.y=1;closer.hp=closer.maxHp=1e6;const hp=enemy.hp;s.cast(0);advance(s,.4);near(enemy.hp,hp);assert.equal(h.heat,1);assert.equal(s.castPlan(2).targets[0].id,closer.id);s.cast(2);advance(s,.4);s.damage(h,closer,1e9);assert.equal(h.heat,3);});
test('森林精灵1立即造成伤害并治疗，之后没有寄生跳伤',()=>{const {s,h,enemy,allies}=arena(5);const hp=enemy.hp,before=allies.reduce((n,u)=>n+u.hp,0);s.cast(0);advance(s,.4);assert.ok(enemy.hp<hp);assert.ok(allies.reduce((n,u)=>n+u.hp,0)>before);const after=enemy.hp;advance(s,2);near(enemy.hp,after);assert.equal(s.fields.some(f=>f.kind==='dot'),false);});
test('森林精灵链接双倍共享治疗，不减伤；分享不会递归',()=>{const {s,h,enemy}=arena(5);s.cast(1);advance(s,.4);const target=s.get(h.linkId),hp=target.hp;s.damage(enemy,target,100);near(hp-target.hp,100);h.hp=h.maxHp*.4;const own=h.hp,other=target.hp;s.heal(h,100,h);near(h.hp-own,100);near(target.hp-other,200);const own2=h.hp;s.heal(target,100,h);near(h.hp-own2,200);});
test('森林精灵净化消耗生命，不附加受疗增益',()=>{const {s,h,enemy,allies}=arena(5);s.debuff(allies[0],enemy,'attackDown',.2,5);const hp=h.hp;s.cast(2);advance(s,.4);near(h.hp,hp*.9);assert.equal(s.hasNegative(allies[0]),false);assert.equal(allies[0].healingBoostUntil,undefined);});
test('符文战车腐蚀弹按最大生命结算一次，超过射程仍可在技能范围施法',()=>{const {s,h,enemy}=arena(2);enemy.y=11;enemy.hp=enemy.maxHp=10000;h.targetId=enemy.id;assert.ok(s.cast(0),s.notice);advance(s,1.4);near(enemy.hp,9200);advance(s,2);near(enemy.hp,9200);});
test('符文战车冰霜弹造成单体伤害并降低攻速',()=>{const {s,enemy}=arena(2),hp=enemy.hp;s.cast(1);advance(s,1);assert.ok(enemy.hp<hp);near(s.attackRate(enemy),.6);});
test('符文战车连续炮击固定位置，减速叠层且引导可打断',()=>{const {s,h,enemy}=arena(2);s.cast(2);advance(s,1.9);const slow=s.activeDebuffs(enemy,'moveSlow')[0];assert.equal(slow.stacks,2);near(slow.ratio,.3);assert.equal(s.castPlan(0).code,'channel');s.stun(h,enemy,1);assert.equal(s.fields.some(f=>f.kind==='runeBarrage'),false);});
test('符文战车震荡弹均摊总伤害，击退小兵与英雄',()=>{const {s,h,enemy}=arena(2),u=s.spawn(1,'melee',0,1,1);u.y=3;u.hp=u.maxHp=1e6;const hp=enemy.hp,other=u.hp;s.cast(3);advance(s,1);near(hp-enemy.hp,h.attack*18);near(other-u.hp,h.attack*18);assert.ok(enemy.y>3);assert.ok(u.y>3);});
test('索敌不再比较接敌数，同类按最近距离选择',()=>{const {s,h,enemy,make}=arena(0);const e=make(3,0,4).h;for(let i=0;i<3;i++){const a=s.spawn(0,'melee',0,1,i);a.targetId=enemy.id;}h.targetId=null;assert.equal(s.choose(h).id,enemy.id);enemy.y=6;assert.equal(s.choose(h).id,e.id);});
test('被攻击且警戒内无目标时反击，攻击者失效后恢复前进',()=>{const {s,h,enemy}=arena(0);enemy.y=8;s.damage(enemy,h,100);const t=s.choose(h);assert.equal(t.id,enemy.id);h.targetId=t.id;assert.equal(s.choose(h).id,enemy.id);s.time=4;assert.equal(s.choose(h),null);});
test('嘲讽结束自动解除强制目标并重选，控制时不普通移动或攻击',()=>{const {s,h,enemy}=arena(0),u=s.spawn(1,'melee',0,1,0);u.y=2;h.tauntId=u.id;h.tauntUntil=1;h.targetId=s.choose(h).id;s.time=2;assert.equal(s.choose(h).id,enemy.id);h.speed=2;h.stunUntil=5;h.cd=0;const y=h.y,hp=enemy.hp;advance(s,1);near(h.y,y);near(enemy.hp,hp);});
test('无目标前进至配置边界停止，并继续搜索后来出现的目标',()=>{const {s,h}=arena(0);s.units=s.units.filter(u=>u.side===0);h.y=s.config.world.mapMaxY-.1;h.speed=2;advance(s,1);near(h.y,s.config.world.mapMaxY);const e=s.spawn(1,'melee',0,1,h.x);e.y=h.y-2;e.cd=1e9;e.speed=0;advance(s,.1);assert.equal(h.targetId,e.id);});
test('击杀单位获得经验，不同职业等级、经验和技能加点分别保留',()=>{const {s,p,h}=arena(0),old=p.xp;s.damage(h,s.spawn(1,'melee',0,1,0),1e9);near(p.xp-old,s.config.world.minionKillXp);const level=p.level,xp=p.xp,build=[...p.builds[0]];s.damage(null,h,1e9);assert.ok(s.setClass(4,p));assert.equal(p.level,1);assert.equal(p.xp,0);s.setClass(0,p);assert.equal(p.level,level);near(p.xp,xp);assert.deepEqual(p.builds[0],build);});

for(const kind of ['hero','minion','tower'])test(`阵亡战车在途击杀${kind}：经验只归来源职业，升级不改变新英雄`,()=>{
 const {s,p,h,enemy}=arena(2);enemy.x=50;
 const target=kind==='hero'?enemy:kind==='tower'?s.towers[0]:s.spawn(1,'melee',0,1,0);
 Object.assign(target,{x:0,y:10,hp:1,maxHp:10000,cd:1e9,speed:0});h.targetId=target.id;
 assert.ok(s.cast(0,p));advance(s,.4);assert.equal(s.projectiles.length,1);
 const old=p.progress[2],level=old.level,needed=s.expNeeded(p,2);old.xp=needed-.001;
 s.damage(null,h,1e9);assert.ok(s.setClass(4,p));const next=s.spawn(0,'ranged',0,1,0);assert.ok(s.contract(p,next.id));Object.assign(next,{x:0,y:-10,speed:0,cd:1e9});
 const progress=structuredClone(p.progress[4]),attributes={hp:next.hp,maxHp:next.maxHp,attack:next.attack};
 advance(s,1.5);assert.ok(target.hp<=0);assert.equal(old.level,level+1);
 const reward=kind==='hero'?s.config.world.heroKillXp:kind==='minion'?s.config.world.minionKillXp:s.config.world.towerBreakXp+s.config.world.towerDamageExpRate;
 near(old.xp,reward-.001);assert.deepEqual(p.progress[4],progress);assert.deepEqual({hp:next.hp,maxHp:next.maxHp,attack:next.attack},attributes);
});
test('来源职业的延迟升级可更新重新契约的同职业英雄',()=>{
 const {s,p,h}=arena(2);s.damage(null,h,1e9);const next=s.spawn(0,'siege',0,1,0);assert.ok(s.contract(p,next.id));next.hp=next.maxHp*.5;
 const before={level:p.level,hp:next.maxHp,attack:next.attack};s.addXp(p,s.expNeeded(p)-p.xp,2);
 assert.equal(p.level,before.level+1);assert.ok(next.maxHp>before.hp);assert.ok(next.attack>before.attack);near(next.hp/next.maxHp,.5);
});
for(const rank of [1,4])for(const count of [1,3])test(`连轰${rank}级、${count}目标：四炮均有等额伤害，减速末次命中后保留4秒`,()=>{
 const {s,p,h,enemy}=arena(2);p.builds[2][2]=rank;
 const enemies=[enemy,...Array.from({length:count-1},(_,i)=>{const u=s.spawn(1,'melee',0,1,i+1);Object.assign(u,{y:3,hp:1e7,maxHp:1e7,speed:0,cd:1e9});return u;})];
 assert.ok(s.cast(2,p));const value=s.skillValues.at(-1),baseHp=enemies.map(u=>u.hp),growth=1+.2*(rank-1);let before=baseHp.reduce((n,v)=>n+v,0);
 for(let shot=0;shot<4;shot++){advance(s,shot===0?1.15:.75);const total=enemies.reduce((n,u)=>n+u.hp,0);near(before-total,h.attack*3.4*growth);before=total;}
 for(let i=0;i<count;i++){near(baseHp[i]-enemies[i].hp,h.attack*13.6*growth/count);const slow=s.activeDebuffs(enemies[i],'moveSlow')[0];assert.equal(slow.stacks,3);near(slow.ratio,.45);}
 near(value.spent,value.limit);near(value.parts['炮击减速'],h.attack*6.4*growth);near(value.parts['伤害'],h.attack*13.6*growth);
 advance(s,3.9);assert.equal(s.activeDebuffs(enemy,'moveSlow').length,1);advance(s,.11);assert.equal(s.activeDebuffs(enemy,'moveSlow').length,0);
 const guide=describeAbilities(s).skills[2];assert.match(guide.summary,/均摊/);assert.match(guide.effect,/前摇结束时/);
});
test('已结算连轰减速可以净化，免疫目标不会获得减速',()=>{
 const {s,h,enemy}=arena(2);s.cast(2);advance(s,1.15);assert.equal(s.activeDebuffs(enemy,'moveSlow').length,1);assert.ok(s.cleanse(enemy));assert.equal(s.activeDebuffs(enemy,'moveSlow').length,0);
 enemy.immuneUntil=20;advance(s,2.25);assert.equal(s.activeDebuffs(enemy,'moveSlow').length,0);assert.ok(s.skillValues.at(-1).spent<=s.skillValues.at(-1).limit);
});

test('血条状态只显示有效效果，净化/到期/额度耗尽均及时移除',()=>{
 const {s,h,enemy}=arena(0),value={limit:100,spent:0};assert.deepEqual(unitStatuses(s,h),[]);
 s.debuff(h,enemy,'vulnerable',.25,4,value);s.debuff(h,enemy,'attackSpeedDown',.4,4,value);s.stun(h,enemy,1);
 assert.deepEqual(new Set(unitStatuses(s,h).map(x=>x.id)),new Set(['vulnerable','attackSpeedDown','stun']));value.spent=100;
 assert.deepEqual(unitStatuses(s,h).map(x=>x.id),['stun']);s.time=1.1;assert.deepEqual(unitStatuses(s,h),[]);
 s.debuff(h,enemy,'moveSlow',.45,4,value,true);assert.equal(unitStatuses(s,h)[0].id,'moveSlow');s.cleanse(h);assert.deepEqual(unitStatuses(s,h),[]);
});
test('血条状态合并相同来源效果，减速/炙热显示真实叠层且不修改战斗状态',()=>{
 const {s,h,enemy,allies}=arena(4);s.addHeat(h,3);s.debuff(h,enemy,'moveSlow',.3,4,null,true);h.debuffs[enemy.id+':moveSlow'].stacks=2;s.debuff(h,allies[0],'moveSlow',.15,5,null,true);
 const before=JSON.stringify(h),statuses=unitStatuses(s,h);assert.equal(statuses.filter(x=>x.id==='moveSlow').length,1);assert.equal(statuses.find(x=>x.id==='moveSlow').stacks,2);assert.equal(statuses.find(x=>x.id==='heat').stacks,3);assert.equal(JSON.stringify(h),before);
 s.time=16;assert.equal(unitStatuses(s,h).length,0);
});
test('血条增益覆盖护盾、减伤、蓄伤、免疫、溅射，过期及耗尽隐藏',()=>{
 const {s,h}=arena(0),value={limit:100,spent:0};s.shield(h,80,h,4,value);h.guards=[{ratio:.4,until:4,value}];h.damageStore={total:20,until:4,value};h.immuneUntil=4;h.lordUlt={until:4,s:{value}};
 assert.deepEqual(new Set(unitStatuses(s,h).map(x=>x.id)),new Set(['shield','guard','damageStore','immune','lordUlt']));value.spent=100;assert.deepEqual(unitStatuses(s,h).map(x=>x.id),['immune']);s.time=5;assert.deepEqual(unitStatuses(s,h),[]);
});
test('共生链接两端都有状态，链接额度耗尽或任一端死亡后隐藏',()=>{
 const {s,h}=arena(5);s.cast(1);advance(s,.4);const target=s.get(h.linkId),f=s.fields.find(f=>f.kind==='link');let index=indexStatusFields(s);
 for(const u of [h,target])assert.ok(unitStatuses(s,u,index).some(x=>x.id==='link'));f.value.spent=f.value.limit;index=indexStatusFields(s);for(const u of [h,target])assert.ok(!unitStatuses(s,u,index).some(x=>x.id==='link'));
 f.value.spent=0;target.hp=0;index=indexStatusFields(s);assert.ok(!unitStatuses(s,h,index).some(x=>x.id==='link'));assert.deepEqual(unitStatuses(s,target,index),[]);
});
test('防御塔三重守护显示增益，焚魂奖励标记与可净化负面区分',()=>{
 const {s,h,enemy}=arena(4),tower=s.towers[0];tower.hp=tower.maxHp=1000;s.damage(h,tower,301);assert.ok(unitStatuses(s,tower).some(x=>x.id==='towerGuard'));
 enemy.soulMarks=[{ownerId:h.id,until:5,heat:2}];assert.equal(unitStatuses(s,enemy).find(x=>x.id==='soulMark').tone,'mark');s.cleanse(enemy);assert.ok(unitStatuses(s,enemy).some(x=>x.id==='soulMark'));s.time=11;assert.equal(unitStatuses(s,tower).length,0);assert.ok(!unitStatuses(s,enemy).some(x=>x.id==='soulMark'));
});
