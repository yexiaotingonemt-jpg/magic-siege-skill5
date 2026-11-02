# 职业与技能

目标版本0.7.0，当前源表核对日期2026-11-02。默认新战局采用钉钉当前设计，五职业20个主动技能及5个职业被动。

| 职业 | 阵营 | 编号 |
|---|---|---|
| [兽人战士](classes/orc-warrior.md) | 进攻 | 0 |
| [火焰法师](classes/fire-mage.md) | 进攻 | 4 |
| [森林精灵](classes/forest-elf.md) | 进攻 | 5 |
| [符文战车](classes/rune-chariot.md) | 进攻 | 2 |
| [黑暗领主](classes/dark-lord.md) | 防守 | 3 |

雷霆巨人与暗影刺客仍不开放。职业被动、技能与词条以各职业页和[当前源表快照](../source/当前技能设计-20261102.json)为准。旧0.6.x发布记录留作历史，不作为新规则配置。

实现：shared/current-design-data.js、shared/current-design.js、shared/current-design-mechanics.js。常规npm start、Room默认新战局均启用当前设计；legacyLiveConfig仅供旧规则回归。
