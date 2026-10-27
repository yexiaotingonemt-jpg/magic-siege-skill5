# 自动行动、普攻与手动目标

[模块总览](README.md) · [全文件索引](source-file-index.md)

自动目标优先级、反击、普通移动、推进边界、20格手选、射程容差与减攻速进度。

## 当前调用链

```text
Simulation.tick → chooseTarget / navigate → inAttackRange → 普攻出手 / 弹道 → HeroRules.damage
```

手选友军与敌方追击锁独立。移动停距与攻击使用同一射程边界；冲锋越过推进线后不瞬移回弹。

## 主要文件

| 文件 | 当前加载状态 |
|---|---|
| [src/navigation.js](../../src/navigation.js) | 启动入口可达 |
| [src/manual-target.js](../../src/manual-target.js) | 启动入口可达 |
| [src/attack-range.js](../../src/attack-range.js) | 启动入口可达 |
| [src/attack-cooldown.js](../../src/attack-cooldown.js) | 启动入口可达 |

共享入口：[src/simulation.js](../../src/simulation.js)、[src/hero-rules.js](../../src/hero-rules.js)、[src/selection.js](../../src/selection.js)。

## 对应规则

- [第6章 自动寻路与索敌流程](../rules/06-navigation-and-targeting.md)
- [第7章 普通攻击流程](../rules/07-basic-attacks.md)
- [第8章 手动目标](../rules/08-manual-targets.md)

## 验证入口

- [tests/manual-target.test.js](../../tests/manual-target.test.js)
- [tests/ally-target.test.js](../../tests/ally-target.test.js)
- [tests/attack-arrival.test.js](../../tests/attack-arrival.test.js)
- [tests/frost-cooldown.test.js](../../tests/frost-cooldown.test.js)
- [tests/dash-bounce.test.js](../../tests/dash-bounce.test.js)

专项浏览器脚本见[scripts目录](../../scripts)，脚本定位见[验证与工具指南](testing-and-tools.md)。
