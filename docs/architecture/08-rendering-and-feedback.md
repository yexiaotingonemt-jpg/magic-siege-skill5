# 战场渲染、单位动作与技能反馈

[模块总览](README.md) · [全文件索引](source-file-index.md)

Phaser镜头、双方视角、局部动作、轮廓命中、VFX、状态、姓名、光圈和伤害数字。

## 当前调用链

```text
服务端状态 / 事件 → network.js插值 → renderer.js → 动作 / 特效 / 名称 / 状态 / 飘字
```

动作与反馈只读取服务器结果；不能通过改动画来改变命中、伤害、冷却和战斗时序。

## 主要文件

| 文件 | 当前加载状态 |
|---|---|
| [src/renderer.js](../../src/renderer.js) | 启动入口可达 |
| [src/unit-motion.js](../../src/unit-motion.js) | 启动入口可达 |
| [src/unit-motion-view.js](../../src/unit-motion-view.js) | 启动入口可达 |
| [src/unit-hit.js](../../src/unit-hit.js) | 启动入口可达 |
| [src/hero-action-layout.js](../../src/hero-action-layout.js) | 启动入口可达 |
| [src/hero-names.js](../../src/hero-names.js) | 启动入口可达 |
| [src/target-halos.js](../../src/target-halos.js) | 启动入口可达 |
| [src/unit-status.js](../../src/unit-status.js) | 启动入口可达 |
| [src/status-icons.js](../../src/status-icons.js) | 启动入口可达 |
| [src/combat-numbers.js](../../src/combat-numbers.js) | 启动入口可达 |
| [src/skill-animation.js](../../src/skill-animation.js) | 当前入口未静态引用；保留兼容/工具 |
| [src/premium-vfx.js](../../src/premium-vfx.js) | 启动入口可达 |
| [src/vfx-profiles.js](../../src/vfx-profiles.js) | 启动入口可达 |
| [src/vfx-brushes.js](../../src/vfx-brushes.js) | 启动入口可达 |
| [src/formation-ranges.js](../../src/formation-ranges.js) | 当前入口未静态引用；保留兼容/工具 |
| [src/skill3-visuals.js](../../src/skill3-visuals.js) | 当前入口未静态引用；保留兼容/工具 |

共享入口：[src/battlefield.js](../../src/battlefield.js)、[src/network.js](../../src/network.js)、[public/art](../../public/art)。

## 对应规则

- [第14章 界面、视角与反馈](../rules/14-interface-and-feedback.md)

## 验证入口

- [tests/unit-motion.test.js](../../tests/unit-motion.test.js)
- [tests/unit-hit.test.js](../../tests/unit-hit.test.js)
- [tests/hero-names.test.js](../../tests/hero-names.test.js)
- [tests/damage-numbers.test.js](../../tests/damage-numbers.test.js)
- [tests/smoke.spec.js](../../tests/smoke.spec.js)

专项浏览器脚本见[scripts目录](../../scripts)，脚本定位见[验证与工具指南](testing-and-tools.md)。
