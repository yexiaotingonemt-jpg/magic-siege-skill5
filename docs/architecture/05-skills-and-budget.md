# 五职业技能、共享额度与持续效果

[模块总览](README.md) · [全文件索引](source-file-index.md)

技能计划、目标选择、前摇锁定、20技能释放、共享收益额度、领主光环与灼烧。

## 当前调用链

```text
HeroRules.plan / cast → selectSkill5 → scaleSkill4 → resolveSkill5 → 弹道 / 场地 / 位移 / 状态 → spend
```

skill4-mechanics.js仍被设计5复用，不能按文件名删除。一次施法所有目标与后续收益共用额度；前摇后改选不重定向已锁定效果。

## 主要文件

| 文件 | 当前加载状态 |
|---|---|
| [src/skill5-mechanics.js](../../src/skill5-mechanics.js) | 启动入口可达 |
| [src/skill4-mechanics.js](../../src/skill4-mechanics.js) | 启动入口可达 |
| [src/skill-value.js](../../src/skill-value.js) | 启动入口可达 |
| [src/lord-flame-shield.js](../../src/lord-flame-shield.js) | 启动入口可达 |

共享入口：[src/hero-rules.js](../../src/hero-rules.js)、[src/skill-progression.js](../../src/skill-progression.js)、[src/config.js](../../src/config.js)、[src/simulation.js](../../src/simulation.js)。

## 对应规则

- [第9章 技能释放公共流程](../rules/09-skill-casting.md)
- [第10章 职业与技能](../rules/10-classes-and-skills.md)
- [第13章 伤害、治疗与状态](../rules/13-damage-healing-and-status.md)

## 验证入口

- [tests/model.test.js](../../tests/model.test.js)
- [tests/skill-double.test.js](../../tests/skill-double.test.js)
- [tests/lord-flame.test.js](../../tests/lord-flame.test.js)
- [tests/manual-target.test.js](../../tests/manual-target.test.js)
- [tests/ally-target.test.js](../../tests/ally-target.test.js)

专项浏览器脚本见[scripts目录](../../scripts)，脚本定位见[验证与工具指南](testing-and-tools.md)。
