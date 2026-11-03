import fs from "node:fs";
import path from "node:path";
import { defaults, classes, names, labels } from "../shared/config.js";
import { Simulation } from "../shared/simulation.js";
import { TRAITS, RARITIES } from "../shared/traits.js";
import { describeAbilities } from "../client/src/ability-descriptions.js";
const ids = [0, 2, 3, 4, 5],
  files = {
    0: "orc-warrior",
    2: "rune-chariot",
    3: "dark-lord",
    4: "fire-mage",
    5: "forest-elf",
  };
const cell = (s) => String(s).replaceAll("|", "／").replaceAll("\n", " ");
const source = JSON.parse(
  fs
    .readFileSync(
      process.argv[2] || "docs/source/职业技能设计5-20261029.json",
      "utf8",
    )
    .replace(/^\uFEFF/, ""),
);
if (!source.rows && (!source.success || source.hasMore))
  throw Error("需要完整且成功的钉钉来源快照");
const snapshot = source.rows
  ? source
  : {
      document: "魔法王座技能设计",
      sheet: "职业技能设计5",
      node: "lyQod3RxJK3vADkBslqKj1EGJkb4Mw9r",
      sheetId: "st-d87ad229-19078",
      readAt: new Date().toISOString(),
      range: source.returnedRange,
      rows: source.cells
        .map((row, i) => ({
          row: source.rowIndices[i],
          values: row.map((c) => c.value),
        }))
        .filter((r) => r.values.some((v) => v !== null && v !== "")),
    };
fs.writeFileSync(
  "docs/source/职业技能设计5-20261029.json",
  JSON.stringify(snapshot, null, 2) + "\n",
);
const principles = `# 0.6.0 升级词条、连携技能与精英兵

规则修订：skill5-synergy-common-traits-20261029。客户端／服务器0.6.0，战斗兼容0.6.0，协议3。最新钉钉来源为[职业技能设计5快照](../source/职业技能设计5-20261029.json)。本文是当前技能、词条和数值依据，替代本章旧0.5.0内容。

## 公共规则

- 四技能费用固定1／1／2／3体力，基础冷却6／10／22／42秒。初始开放1、2、3，大招5级解锁；不分技能等级，不分配技能点。
- 初始0级、等级上限40，0→40共32蓝、4紫、4金；5／15／25／35级紫色，10／20／30／40级金色，高品质替代当次蓝色。
- 每个职业29类词条：16蓝、7紫、6金；次数库存78／14／8。类别等概率且同次不重复，次数只表示可选上限。候选不足3项显示实际数量。断线不重抽，按顺序处理待选。
- 升级只显示强化图标和待选次数，点击后选择；感叹号查看当前效果与已选强化。通用词条详情直接展示其效果。
- 每实际消耗1点体力获得100经验，包含契约和施法；失败操作、补充体力、击杀及塔伤不提供经验。0级起步、40级封顶，按整数阶梯升级：升至1～7级每级5体力，8～14级6体力，15～20级7体力，21～26级8体力，27～33级9体力，34～40级10体力。累计300体力、30000经验升满，升级余量保留。基础积分沿用当前计分规则。
- 主目标优先玩家选中目标；支援技能优先所选友方，选中敌人时解析该敌人攻击的友方目标。无效或超距拒绝且不扣费。次级目标受各技能局部人数与范围约束。
- 生命每级+2%基础生命，攻击每级+1.5%基础攻击。升级和生命词条保持当前生命比例；职业分别保存成长与构筑。
- 不恢复旧2000%／6000%统一收益截断。各技能按人数、跳数、持续时间、实际位移及明确转化规则结算。

## 强度分配原则

1. 单独使用1技能保留实用性，但降低直接输出占比；基础技能自带连携，词条扩展方式，核心循环不依赖抽到金色。
2. 对比相同等级、实际体力和合法选择投入。单体、三目标、密集目标分开测；伤害、有效治疗、护盾吸收分别记录，过量不算实战贡献。减伤、净化、位移看实际场景收益，不能把固定减伤率直接当攻击倍率相加。
3. 技能蓝色直接数值通常每次+15%；紫色强调条件收益，常态局部增益参考25%—35%；金色改变形态，局部常态参考50%—75%。人数词条在稀疏场景收益低，在密集场景允许超过直接倍率词条。这些是配数参照，不是结算上限。
4. 通用词条按整个英雄计价：基础生命／攻击每次增加职业1级基础值2%，冷却每次3%，通用金色最终增伤／减伤每次6%。常驻可靠性换取较低的局部增益，避免通用金色压过技能形态。
5. 吸血、治疗共享、反伤、死亡爆炸和召唤不递归。多段、多目标的高收益必须计入技能本身的预算，不能各自沿用旧单体倍率。

### 基础收益参照

| 技能场景 | 基础收益（攻击系数；未含普通攻击、词条与受击条件） | 费用 | 解释 |
|---|---|---:|---|
| 火法1 | 单体450% | 1 | 附带1层炙热，后续技能兑现资源。 |
| 兽人1 | 4跳共360%伤害＋等额实际伤害治疗 | 1 | 治疗只由实际伤害生成；可净化、超距断链。 |
| 领主1 | 每人200%，最多5人；自有灼烧每人额外220% | 1 | 基础最多1000%，连携最多2100%，返回波不重复触发额外伤害。 |
| 火法3 | 单目标1000%；至少3热时3目标各1000% | 2 | 22秒冷却；需要前置资源，但不消耗炙热。 |
| 战车3 | 最多4目标各700%，并击退2格 | 2 | 满命中2800%；位移不会对建筑生效。 |
| 战车4 | 单目标5炮各600%，合计3000% | 3 | 固定落点、3.75秒引导可打断；离开落点可躲避。 |
| 火法4 | 每个全额目标1800%，每2热增加1目标 | 3 | 炙热来自前置施法，不能把多目标总收益全部归到这3体力。蓝色额外名额各35%。 |
| 精灵4 | 自身＋4友方各1000%，最多5000%面板治疗 | 3 | 以缺失生命决定实际收益；过量只有选中词条后才转盾。 |
| 领主4 | 12秒内每次普攻对最多4名其他敌人各140% | 3 | 以基础攻速理想8次计4480%溅射；受接敌、攻速和密度影响，不保证满额。 |
| 兽人4 | 6秒实际承伤，最多自身生命75%，结束全额转10秒护盾 | 3 | 没有实际承伤就没有大盾，不死挡掉的伤害不记账。 |

### 已自行确定的歧义

- 兽人1以施法者攻击计算；金色按技能总览采用额外2条链接，每条伤害／治疗为主目标35%，不沿用旧扇形重击。链接非引导，可移动并释放其他技能；净化、9格断链、施法者阵亡可中断。
- 领主1只识别自身灼烧，一次施法每目标最多一次额外伤害，返回不重复，不清除灼烧。冲锋紫色每次增加30%攻击／秒，4秒；与火盾同源灼烧不叠层，取较强每跳值，刷新不推迟跳伤。
- 领主大招紫色只吸取技能实际伤害，每次6%；持续、群体和派生伤害半额，普攻、君临溅射、反伤与召唤不参与。沿用大招负面免疫和普攻溅射，不额外添加原表没有的技能序列奖励。
- 火法至少3层视为强化条件；2技能零热量不能释放，付费时消耗1层，每个有效死亡标记返3层并受炙热上限约束。前摇中主目标死亡，额外标记仍保持45%伤害。新获得的热量增攻不倒灌当次施法。
- 火球金色为一颗贯穿球，炙热选定最多3目标首次全额，其余首次25%；最多5个不同目标，每人最多3跳，后两跳各为首次15%，间隔至少0.75秒。紫色击退只在首次命中生效。
- 精灵1伤害按施法者的本次面板治疗计算，不受受疗者加成或过量影响。金色额外治疗60%，不额外派生伤害。
- 精灵链接首条共享50%、额外各25%，仅直接有效治疗产生一次共享。金色链接组含精灵和存活的12格内对象；先平摊原始伤害，各成员再结算一次自身防护，不再次分摊。重叠链接组同一伤害只采用一组，优先较早出生的精灵。斩杀只作用于被斩杀者。
- 战车3为震荡、4为连轰；词条ID保持原技能语义。冰霜在命中时检查任意来源有效腐蚀；腐蚀之后消失不追溯移除已施加减攻速。
- 通用受疗采用百分比，每次4%，避免固定值被高频治疗无限放大。通用击杀恢复采用按职业1级基础生命校准的固定值，每次0.05%；反伤、召唤物击杀不触发该恢复。
- 同名减伤取最高，不同来源乘算，沿用常规80%减伤边界；塔防护另算。同类易伤／减速／降攻取最高，攻速增益相加最多60%。通用金色最终增伤不提高治疗、护盾、反伤或召唤物伤害。
- 技能位置变更与旧持续状态不兼容，0.6.0使用新的战斗兼容号和战局结构。发布保留账号与会话、明确重开战局，不迁入旧待执行技能。

## 五职业基础技能与完整词条

`;
let rule = principles;
for (const id of ids) {
  const sim = new Simulation();
  sim.player.classId = id;
  const guide = describeAbilities(sim);
  let body = `## ${classes[id]}\n\n${guide.passiveSummary}\n\n| 技能 | 体力 | 基础冷却（秒） | 基础效果 |\n|---|---:|---:|---|\n`;
  for (let i = 0; i < 4; i++)
    body += `| ${i + 1} ${names[id][i]} | ${defaults.heroes[id].skills[i].cost} | ${defaults.heroes[id].skills[i].cd} | ${cell(guide.skills[i].summary)} |\n`;
  body +=
    "\n| 编号 | 归属 | 词条 | 品质 | 次数上限 | 每次效果／特殊规则 |\n|---|---|---|---|---:|---|\n";
  for (const t of TRAITS.filter((t) => t.classId === id).sort(
    (a, b) => (a.skill ?? 9) - (b.skill ?? 9) || a.id.localeCompare(b.id),
  ))
    body += `| ${t.id} | ${t.skill == null ? (t.common ? "英雄通用" : "英雄专属") : `技能${t.skill + 1}`} | ${t.name} | ${RARITIES[t.rarity].name} | ${t.max} | ${cell(t.description)} |\n`;
  rule += body + "\n";
  fs.writeFileSync(
    `docs/rules/classes/${files[id]}.md`,
    `# ${classes[id]} · 0.6.0\n\n完整公共规则及配数依据见[升级词条、连携技能与精英兵](../15-traits-and-elites.md)。\n\n` +
      body +
      "\n",
  );
}
rule += `## 精英兵与广播\n\n双方每3波各额外生成1名精英，不能契约。敌方精英由存活英雄击杀后随机获得一种30秒Buff：击杀非召唤单位恢复2%最大生命、攻击+20%、新施法冷却缩短15%并技能伤害+10%、受到伤害降低15%。全体在线玩家收到广播，战报保留结果。同种Buff刷新时限，不同种类独立计时。\n\n## 验证与局限\n\n数值验证记录见[0.6.0构筑平衡](../releases/0.6.0-balance.json)。包含真实模拟器场景与可复现随机种子，不能作为正式玩家胜率。客户端真实操作、窄屏、账号与发布验证见0.6.0验收记录。\n`;
fs.writeFileSync("docs/rules/15-traits-and-elites.md", rule);
// 现有数值表采用四列字段表，按相同职责分别展开静态配置。
let table =
  "# 魔法王座当前数值配置 · 0.6.0\n\n规则、145类词条及平衡依据见[升级词条、连携技能与精英兵](rules/15-traits-and-elites.md)。以下由当前静态默认配置生成，不记录玩家运行状态。攻击系数100表示100%攻击，普通比例0.35表示35%；时间秒、距离格。\n\n";
function progressionTable() {
  const w=defaults.world;
  let total=0;
  let text="## 经验升级曲线\n\n每实际消耗1点体力获得"+w.expPerStamina+"经验，包含契约和施法。0级起步，升级余量保留。\n\n| 升至等级 | 本级体力 | 本级经验 | 累计体力 |\n|---|---:|---:|---:|\n";
  w.levelUpStamina.forEach((cost,index)=>{total+=cost;text+=`| ${index+1} | ${cost} | ${cost*w.expPerStamina} | ${total} |\n`;});
  return text+"\n";
}
function section(title, obj, prefix) {
  table += `## ${title}\n\n| 字段名 | 说明 | 字段类型 | 备注 |\n|---|---|---|---|\n`;
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "number")
      table += `| ${prefix}.${key} | ${labels[key] || key} | digit | 当前值：${value} |\n`;
    else if (key === "levelUpStamina" && Array.isArray(value))
      table += `| ${prefix}.${key} | ${labels[key]}；数组下标0对应升至1级 | array | ${value.length}项，见下方经验升级曲线 |\n`;
  }
  table += "\n";
}
section("全局", defaults.world, "world");
table += progressionTable();
for (const [type, value] of Object.entries(defaults.troops))
  section("士兵 " + type, value, "troops." + type);
section("防御塔", defaults.tower, "tower");
section("出兵权重", defaults.waves, "waves");
for (const id of ids) {
  section(classes[id] + "基础属性", defaults.heroes[id], `heroes.${id}`);
  for (let i = 0; i < 4; i++)
    section(
      `${classes[id]} · ${names[id][i]}`,
      defaults.heroes[id].skills[i],
      `heroes.${id}.skills.${i}`,
    );
}
for (let i = 0; i < defaults.rating.length; i++) {
  section(`${classes[i]}评价基准`, defaults.rating[i], `rating.${i}`);
  section(
    `${classes[i]}评价权重`,
    defaults.ratingWeights[i],
    `ratingWeights.${i}`,
  );
}
fs.writeFileSync("docs/数值配置表.md", table);
console.log("已生成五职业技能、145类词条、数值表及钉钉来源快照");

for (const file of [...Object.values(files).map(name=>`docs/rules/classes/${name}.md`),"docs/数值配置表.md"]) fs.writeFileSync(file,fs.readFileSync(file,"utf8").trimEnd()+"\n");
