import test from 'node:test';
import assert from 'node:assert/strict';
import {defaults,clone,contractType,validateConfig} from '../shared/config.js';
import {createCurrentDesignConfig} from '../shared/current-design.js';
import {Simulation} from '../shared/simulation.js';
import {Room} from '../server/room.mjs';
import {describeAbilities} from '../client/src/ability-descriptions.js';

const costs = [
  ...Array(7).fill(10),...Array(7).fill(12),...Array(6).fill(14),
  ...Array(6).fill(16),...Array(7).fill(18),...Array(7).fill(20),
];

for (const [mode,config] of [['普通战局',defaults],['新版预览',createCurrentDesignConfig(defaults)]]) {
  function fixture(id=0) {
    const s=new Simulation(config);s.units=[];s.waveAt=Infinity;for(const t of s.towers){t.x=1000;t.y=1000;}
    const p=s.player;p.classId=id;p.side=id===3?1:0;p.stamina=1000;
    const recruit=()=>{const u=s.spawn(p.side,contractType(id),0,1,0);assert.ok(s.contract(p,u.id));u.x=u.y=0;return u;};
    return {s,p,recruit};
  }

  test(`${mode}：40级整数阶梯合计600体力，全部职业使用同一门槛`,()=>{
    validateConfig(config);
    const {s,p}=fixture();
    assert.equal(p.level,0);assert.equal(config.world.expPerStamina,100);
    assert.deepEqual(config.world.levelUpStamina,costs);
    for (let classId=0;classId<p.progress.length;classId++) {
      let total=0;
      for (let level=0;level<40;level++) {
        p.progress[classId].level=level;
        assert.equal(s.expNeeded(p,classId),costs[level]*100);
        total+=s.expNeeded(p,classId);
      }
      assert.equal(total,60000);
    }
  });

  for (const id of [0,2,3,4,5]) test(`${mode}：职业${id}累计200次契约恰好消耗600体力并升满40级`,()=>{
    const {s,p,recruit}=fixture(id);
    let h=recruit();
    assert.equal(p.level,0);assert.equal(p.xp,300);assert.equal(p.staminaSpent,3);
    for (let count=2;count<=200;count++) {
      s.damage(null,h,1e9);h=recruit();
      if(count===2){assert.equal(p.level,0);assert.equal(p.xp,600);}
      if(count===4){assert.equal(p.level,1);assert.equal(p.xp,200);}
      if(count===199){assert.equal(p.level,39);assert.equal(p.xp,1700);assert.equal(p.progress[id].choices.length,39);}
    }
    assert.equal(p.level,40);assert.equal(p.xp,0);
    assert.equal(p.staminaSpent,600);assert.equal(p.stamina,400);
    assert.equal(p.progress[id].choices.length,40);
    s.damage(null,h,1e9);recruit();
    assert.equal(p.level,40);assert.equal(p.xp,0);assert.equal(p.progress[id].choices.length,40);
  });

  test(`${mode}：契约与施法共计10点体力升1级，失败和补充体力不加经验`,()=>{
    const {s,p,recruit}=fixture(),h=recruit();
    assert.equal(s.contract(p,h.id),false);assert.equal(s.cast(0,p),false);assert.equal(p.xp,300);
    const enemy=s.spawn(1,'melee',0,1,0);enemy.x=0;enemy.y=3;
    s.setManualTarget(enemy.id,p);
    assert.equal(s.cast(0,p),true);assert.equal(p.level,0);assert.equal(p.xp,400);
    assert.equal(s.cast(0,p),false);assert.equal(p.xp,400);
    s.time=10;
    s.setManualTarget(h.id,p);
    assert.equal(s.cast(1,p),true);assert.equal(p.level,0);assert.equal(p.xp,500);
    s.setManualTarget(enemy.id,p);
    for(let i=0;i<5;i++){s.time+=10;assert.equal(s.cast(0,p),true);}
    assert.equal(p.level,1);assert.equal(p.xp,0);
    assert.equal(p.staminaSpent,10);assert.equal(p.progress[0].choices.length,1);
    const room=new Room(config),account={id:'xp-refill',side:0,name:'经验测试'};
    const q=room.player(account),before=q.xp;
    assert.equal(room.command(account,{type:'stamina',id:'refill'}).ok,true);
    assert.equal(q.xp,before);assert.equal(q.level,0);
  });

  test(`${mode}：击杀英雄、小兵、塔伤和毁塔不提供经验`,()=>{
    const {s,p,recruit}=fixture(),h=recruit();
    const enemy=s.spawn(1,'melee',0,1,0);
    s.damage(h,enemy,1e9);
    const opponent=s.makePlayer(1,false);opponent.classId=3;
    const hero=s.spawn(1,'melee',0,1,0);assert.ok(s.contract(opponent,hero.id));
    s.damage(h,hero,1e9);
    const tower=s.towers.find(t=>t.hp>0);tower.towerGuardUntil=0;
    s.damage(h,tower,1e9);
    assert.equal(p.level,0);assert.equal(p.xp,300);assert.equal(p.staminaSpent,3);
  });

  test(`${mode}：契约跨级保留生命比例，经验归当前契约职业`,()=>{
    const {s,p,recruit}=fixture();
    p.xp=900;
    const u=s.spawn(0,'melee',0,1,0);u.hp=u.maxHp/2;
    assert.ok(s.contract(p,u.id));
    assert.equal(p.level,1);assert.equal(p.xp,200);assert.equal(u.hp/u.maxHp,0.5);
    s.damage(null,u,1e9);assert.ok(s.setClass(4,p));
    const other=s.spawn(0,'ranged',0,1,0);assert.ok(s.contract(p,other.id));
    assert.equal(p.xp,300);assert.equal(p.progress[0].xp,200);
    s.resetMap();assert.equal(p.xp,300);assert.equal(p.progress[0].xp,200);
  });
}

test('成长配置拒绝缺失档位、小数、递减及无效经验倍率',()=>{
  for(const base of [defaults,createCurrentDesignConfig(defaults)]) {
    for(const edit of [r=>r.levelUpStamina.pop(),r=>r.levelUpStamina[0]=5.5,
      r=>r.levelUpStamina[1]=4,r=>r.expPerStamina=0,r=>r.initialLevel=1]) {
      const next=clone(base);edit(next.world);assert.throws(()=>validateConfig(next));
      if(base.design){const current=clone(base);edit(current.design.rules);assert.throws(()=>validateConfig(current));}
    }
  }
});

test('新版技能说明展示整数阶梯、600点总消耗及契约经验',()=>{
  const s=new Simulation(createCurrentDesignConfig(defaults)),context=describeAbilities(s).context;
  assert.match(context,/100经验/);assert.match(context,/包含契约/);
  assert.match(context,/10～20点体力/);assert.match(context,/600点体力/);
});
