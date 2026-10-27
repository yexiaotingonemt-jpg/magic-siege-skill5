const f=n=>String(Number(Number(n).toFixed(2)));
const pct=n=>f(n*100)+'%';
export function passiveSummary(id,c,h){return [
 `累计承受${f(c.passiveThreshold)}点伤害，净化全部负面状态。`,
 `每次施法随机标记${f(c.conductCount)}个远程敌人，导电${f(c.conductDuration)}秒。`,
 `优先攻击${f(h?.aggro??c.aggro)}格内建筑，对建筑伤害×${f(h?.buildingBonus??c.buildingBonus)}。`,
 `每受${f(c.hitsPerStack)}次普攻，减伤+${pct(c.reductionPerStack)}，最多${f(c.reductionCap)}层。`,
 `施法叠炙热，每层攻速+${pct(c.heatAttackSpeed)}，最多${f(c.heatCap)}层。`,
 `初始${f(c.initialSpirits)}精灵，每${f(c.spiritInterval)}秒恢复1个，上限${f(c.spiritCap)}。`
][id];}
export function skillSummary(id,i,c,h,s,factor,duration,coefficient,power,attack,maxHp){
 const damage=`${f(coefficient)}%攻击伤害（约${f(power)}）`;
 return [
 [
 `攻击${f(s.radius)}格内1个敌人，造成${damage}，叠1层伤痕。`,
 `攻击${f(s.radius)}格内1个敌人，造成${damage}；有伤痕时减速${pct(1-c.slowRatio)}，持续${f(duration)}秒。`,
 `获得最大生命${pct(c.shieldRatio*factor)}护盾（约${f(maxHp*c.shieldRatio*factor)}），持续${f(duration)}秒；护盾期间减伤${pct(c.shieldReduction)}。`,
 `对1个敌人造成${damage}；每层伤痕再加${f(c.markDamage*factor)}%攻击伤害，并增加${f(c.markKnockback)}格击退，消耗伤痕。`
 ],[
 `雷击${f(s.radius)}格内1个导电敌人，造成${damage}。`,
 `攻击${f(s.radius)}格内1个敌人，再弹射最多${f(c.bounces)}个导电敌人，每个造成${damage}。`,
 `攻击${f(s.radius)}格内1名导电英雄，造成${damage}，向自身牵引${f(c.pullDistance)}格。`,
 `雷云持续${f(duration)}秒，每${f(c.cloudTick)}秒攻击宿主周围${f(s.radius)}格内最多${f(c.cloudTargets)}个敌人，每个造成${damage}。`
 ],[
 `炮击${f(s.targetRange??s.radius)}格内目标落点，半径${f(s.radius)}格造成${damage}；对建筑伤害×${f(h?.buildingBonus??c.buildingBonus)}。`,
 `链接${f(s.radius)}格内1个友军并跟随，持续${f(duration)}秒；每${f(c.linkHealTick)}秒双方各回复最大生命${pct(c.linkHealRatio)}。`,
 `建立半径${f(s.radius)}格力场，持续${f(duration)}秒；友军受到普攻时有${pct(c.fieldMissChance)}概率闪避。`,
 `消耗最大生命${pct(c.chargeHpCost)}，蓄力${f(s.duration)}秒后冲锋；半径${f(s.radius)}格造成${damage}，爆炸后生命低于${pct(c.deathThreshold)}时阵亡。`
 ],[
 `半径${f(s.radius)}格造成${damage}，敌人攻击降低${pct(c.attackDownRatio)}，持续${f(duration)}秒。`,
 `嘲讽半径${f(s.radius)}格内敌方小兵与英雄${f(duration)}秒，自身减伤${pct(c.tauntReduction)}。`,
 `获得荆棘外壳${f(duration)}秒，反弹实际承伤的${pct(c.reflectRatio)}。`,
 `旋风持续${f(duration)}秒，每${f(c.whirlTick)}秒在半径${f(s.radius)}格造成${damage}；每受${f(c.whirlHitCount)}次伤害延长${f(c.whirlExtend)}秒。`
 ],[
 `火球攻击${f(s.radius)}格内1个敌人，造成${damage}。`,
 `普攻附带半径${f(s.radius)}格溅射，对主目标外敌人造成${damage}，持续${f(duration)}秒。`,
 `强化${f(duration)}秒：技能伤害+${pct(c.empower)}，新释放的前两个技能冷却-${pct(c.cdReduction)}。`,
 `攻击${f(s.radius)}格内最多${f(c.fireTargets)}个敌人，每个造成${damage}；消耗全部炙热，每层伤害+${pct(c.heatPower)}。`
 ],[
 `消耗1精灵，寄生1个敌人${f(duration)}秒，每秒造成${damage}；附近${f(c.parasiteHealTargets)}个友军各回复${f(c.parasiteHealPower*factor)}%攻击生命。`,
 `消耗${f(c.shieldSpirits)}精灵，为1个友军提供${f(c.shieldPower*factor)}%攻击护盾（约${f(attack*c.shieldPower/100*factor)}），持续${f(duration)}秒；破盾或到期爆炸造成${damage}。`,
 `恢复${f(c.spiritRestore)}精灵，自身攻击+${pct(c.attackBoost)}，持续${f(duration)}秒。`,
 `消耗${f(c.healSpirits)}精灵，治疗${f(s.radius)}格内最多${f(c.healTargets)}个受伤友军，各恢复${f(coefficient)}%攻击生命（约${f(power)}）。`
 ]][id][i];
}
