# 职业与技能

[玩法模块总览](README.md) · [代码模块索引](../architecture/README.md) · [数值配置表](../数值配置表.md)

适用版本：职业技能设计5，规则基准日2026-10-27。

## 10. 职业与技能

本章所有攻击、治疗系数为技能1级数值，采用[第9章](09-skill-casting.md)费用、冷却、成长及共享额度规则。

| 职业 | 阵营与兵种 | 职业编号 |
|---|---|---:|
| [兽人战士](classes/orc-warrior.md) | 进攻·近战 | 0 |
| [符文战车](classes/rune-chariot.md) | 进攻·攻城 | 2 |
| [黑暗领主](classes/dark-lord.md) | 防守·近战 | 3 |
| [火焰法师](classes/fire-mage.md) | 进攻·远程 | 4 |
| [森林精灵](classes/forest-elf.md) | 进攻·远程 | 5 |

雷霆巨人（编号1）与暗影刺客（编号6）未开放；保留的配置或兼容分支不代表可契约。

---

模块范围：五职业20技能及专属资源。

代码入口：[shared/skill5-mechanics.js](../../shared/skill5-mechanics.js)、[shared/skill4-mechanics.js](../../shared/skill4-mechanics.js)、[shared/lord-flame-shield.js](../../shared/lord-flame-shield.js)、[shared/config.js](../../shared/config.js)。

验证入口：[tests/model.test.js](../../tests/model.test.js)、[tests/lord-flame.test.js](../../tests/lord-flame.test.js)、[tests/skill-double.test.js](../../tests/skill-double.test.js)。
