# 伤害、治疗、状态与归属统计

[模块总览](README.md) · [全文件索引](source-file-index.md)

护甲、易伤、减伤、盾吸、治疗共享、净化免疫、死亡、延迟效果和贡献归属。

## 当前调用链

```text
damage / heal / debuff / cleanse → 额度与实际生命变化 → stat / kill / 奖励 → 快照事件
```

有效伤害为实际扣血与护盾吸收，不计过量伤害。原始承伤在护甲、减伤、护盾前记录；显示层不重新结算。

## 主要文件

| 文件 | 当前加载状态 |
|---|---|
| [src/hero-rules.js](../../src/hero-rules.js) | 启动入口可达 |

共享入口：[src/simulation.js](../../src/simulation.js)、[src/tower-guard.js](../../src/tower-guard.js)、[src/skill-value.js](../../src/skill-value.js)、[src/lord-flame-shield.js](../../src/lord-flame-shield.js)。

## 对应规则

- [第12章 贡献评价、积分与排行](../rules/12-ratings-and-scores.md)
- [第13章 伤害、治疗与状态](../rules/13-damage-healing-and-status.md)

## 验证入口

- [tests/model.test.js](../../tests/model.test.js)
- [tests/skill-double.test.js](../../tests/skill-double.test.js)
- [tests/frost-cooldown.test.js](../../tests/frost-cooldown.test.js)
- [tests/damage-numbers.test.js](../../tests/damage-numbers.test.js)

专项浏览器脚本见[scripts目录](../../scripts)，脚本定位见[验证与工具指南](testing-and-tools.md)。
