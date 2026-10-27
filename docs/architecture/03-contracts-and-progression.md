# 契约、体力、职业成长与评价

[模块总览](README.md) · [全文件索引](source-file-index.md)

点兵确认、职业映射、生命比例继承、技能点、经验归属、体力、贡献、积分和战报。

## 当前调用链

```text
selection.js → contract命令 → Simulation.contract → 职业独立progress/builds → 经验、评价与战报
```

选兵与契约确认分开。阵亡后成长保留在本战局；延迟伤害按来源职业结算。

## 主要文件

| 文件 | 当前加载状态 |
|---|---|
| [src/simulation.js](../../src/simulation.js) | 启动入口可达 |
| [src/selection.js](../../src/selection.js) | 启动入口可达 |
| [src/skill-progression.js](../../src/skill-progression.js) | 启动入口可达 |

共享入口：[src/config.js](../../src/config.js)、[src/hero-rules.js](../../src/hero-rules.js)、[src/main.js](../../src/main.js)、[server/room.mjs](../../server/room.mjs)。

## 对应规则

- [第5章 单位契约与职业](../rules/05-contracts-and-classes.md)
- [第11章 体力、经验与技能构筑](../rules/11-stamina-and-progression.md)
- [第12章 贡献评价、积分与排行](../rules/12-ratings-and-scores.md)

## 验证入口

- [tests/model.test.js](../../tests/model.test.js)
- [tests/stamina.test.js](../../tests/stamina.test.js)
- [tests/multiplayer.test.js](../../tests/multiplayer.test.js)
- [tests/smoke.spec.js](../../tests/smoke.spec.js)

专项浏览器脚本见[scripts目录](../../scripts)，脚本定位见[验证与工具指南](testing-and-tools.md)。
