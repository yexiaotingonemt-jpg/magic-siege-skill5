# 玩法规则模块

当前技能以[0.7.0整体核对记录](../releases/0.7.0-skill-alignment-20261102.md)及[当前五职业规则](10-classes-and-skills.md)为准；0.6.x字段与示例仅供旧规则兼容回归。

当前规则基准日：2026-11-02；目标版本0.7.0。新增[升级词条与精英兵完整规则](15-traits-and-elites.md)。

本目录按完整玩法正文的14章拆分，五职业再拆为5份技能规则。章节编号继续保留，跨章节引用直接链接对应模块。默认从本目录阅读和维护当前规则。

| 模块 | 内容 |
|---|---|
| [01 玩法概述](01-overview.md) | 玩家职责、非对称攻防和自动行动 |
| [02 账号、阵营与同局](02-accounts-and-multiplayer.md) | 账号身份、阵营固定、共享战场、断线与重启 |
| [03 战场与阶段](03-battlefield-and-stages.md) | 地图距离、防线、阶段胜负与重建 |
| [04 单位、建筑与兵线](04-units-waves-and-towers.md) | 单位属性、30秒出兵、出生分布、塔守护 |
| [05 单位契约与职业](05-contracts-and-classes.md) | 职业兵种映射、契约确认、扣费、继承生命比例 |
| [06 自动寻路与索敌流程](06-navigation-and-targeting.md) | 嘲讽、手动锁、自动目标、反击、推进边界 |
| [07 普通攻击流程](07-basic-attacks.md) | 射程、出手、弹道和减攻速冷却进度 |
| [08 手动目标](08-manual-targets.md) | 20格敌友选择、目标的目标解析、无效重选 |
| [09 技能释放公共流程](09-skill-casting.md) | 施法验证、扣费、前摇锁定与诊断账本 |
| [10 职业与技能](10-classes-and-skills.md) | 五职业20技能及专属资源 |
| [11 体力、经验与技能构筑](11-stamina-and-progression.md) | 体力、职业独立成长、升级、词条选择与保留 |
| [12 贡献评价、积分与排行](12-ratings-and-scores.md) | 有效贡献、职业权重、评价积分和战报 |
| [13 伤害、治疗与状态](13-damage-healing-and-status.md) | 伤害顺序、护盾、治疗共享、净化、免疫和死亡 |
| [14 界面、视角与反馈](14-interface-and-feedback.md) | 640×1136界面、触控、姓名、状态、动作和飘字 |

## 职业技能

- [兽人战士](classes/orc-warrior.md)
- [符文战车](classes/rune-chariot.md)
- [黑暗领主](classes/dark-lord.md)
- [火焰法师](classes/fire-mage.md)
- [森林精灵](classes/forest-elf.md)

## 版本口径

- 开放进攻职业：兽人战士、火焰法师、森林精灵、符文战车；防守职业：黑暗领主。
- 双方30秒独立出兵：进攻10名（5近战、3远程、2攻城），防守8名（5近战、3远程）。默认按存活英雄总数补充NPC，防守:进攻=1:3，详见[第16章](16-npc-ratio.md)。
- 升级选择词条，取消技能点和统一收益截断；人数、倍率、跳数、时长及局部上限见第15章。
- 手动选取20格，选取范围不改变普攻和技能本身的射程。

完整默认参数见[数值配置表](../数值配置表.md)，实际入口和依赖见[代码模块索引](../architecture/README.md)。原完整正文逐字保存在[归档](../archive/2026-10-27/docs/玩法规则.md)，拆分覆盖和哈希记录见[整理清单](../references/organization-manifest.json)。
