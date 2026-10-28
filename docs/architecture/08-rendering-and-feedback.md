# 战场渲染、单位动作与技能反馈

[模块总览](README.md) · [全文件索引](source-file-index.md)

Phaser镜头、双方视角、局部动作、轮廓命中、VFX、状态、姓名、光圈和伤害数字。

## 当前调用链

```text
服务端状态 / 事件 → network.js插值 → renderer.js → 动作 / 特效 / 名称 / 状态 / 飘字
```

动作与反馈只读取服务器结果；不能通过改动画来改变命中、伤害、冷却和战斗时序。

## 契约英雄连续移动

五种开放职业各有一张 `client/public/art/kc-final/*-walk.png`，使用192×256透明格、八方向行（S/SE/E/NE/N/NW/W/SW）和八时间帧列，共320帧。五个绘制方向加三个镜像方向，与现有小兵采用相同的方向组织。

`walk-animation.js`登记资源；`unit-art.js`仅在`move`状态选取连续移动图集。时间相位来自服务器时钟，暂停冻结，停步、攻击、技能、控制与死亡切回原动作资源。`hero-walk-layout.js`复用待机的体型与锚点；连续移动时不叠加网格拉伸或程序整身跳动。符文战车播放鳍片、晶核与短尾迹推进循环。

验证：`tests/hero-walk.test.js`覆盖开放职业、选帧、动作切换、定位与资源；`tests/hero-walk.spec.js`在双方视角检查八向八帧、正背面换脚、网格稳定、冻结、战斗切换和五职业契约确认。

## 主要文件

| 文件 | 当前加载状态 |
|---|---|
| [client/src/renderer.js](../../client/src/renderer.js) | 启动入口可达 |
| [client/src/unit-motion.js](../../client/src/unit-motion.js) | 启动入口可达 |
| [client/src/unit-motion-view.js](../../client/src/unit-motion-view.js) | 启动入口可达 |
| [client/src/unit-hit.js](../../client/src/unit-hit.js) | 启动入口可达 |
| [client/src/hero-action-layout.js](../../client/src/hero-action-layout.js) | 启动入口可达 |
| [client/src/hero-names.js](../../client/src/hero-names.js) | 启动入口可达 |
| [client/src/target-halos.js](../../client/src/target-halos.js) | 启动入口可达 |
| [client/src/unit-status.js](../../client/src/unit-status.js) | 启动入口可达 |
| [client/src/status-icons.js](../../client/src/status-icons.js) | 启动入口可达 |
| [client/src/combat-numbers.js](../../client/src/combat-numbers.js) | 启动入口可达 |
| [client/src/skill-animation.js](../../client/src/skill-animation.js) | 当前入口未静态引用；保留兼容/工具 |
| [client/src/premium-vfx.js](../../client/src/premium-vfx.js) | 启动入口可达 |
| [client/src/vfx-profiles.js](../../client/src/vfx-profiles.js) | 启动入口可达 |
| [client/src/vfx-brushes.js](../../client/src/vfx-brushes.js) | 启动入口可达 |
| [shared/formation-ranges.js](../../shared/formation-ranges.js) | 当前入口未静态引用；保留兼容/工具 |
| [client/src/skill3-visuals.js](../../client/src/skill3-visuals.js) | 当前入口未静态引用；保留兼容/工具 |

共享入口：[client/src/battlefield.js](../../client/src/battlefield.js)、[client/src/network.js](../../client/src/network.js)、[public/art](../../client/public/art)。

## 对应规则

- [第14章 界面、视角与反馈](../rules/14-interface-and-feedback.md)

## 验证入口

- [tests/unit-motion.test.js](../../tests/unit-motion.test.js)
- [tests/unit-hit.test.js](../../tests/unit-hit.test.js)
- [tests/hero-names.test.js](../../tests/hero-names.test.js)
- [tests/damage-numbers.test.js](../../tests/damage-numbers.test.js)
- [tests/smoke.spec.js](../../tests/smoke.spec.js)

专项浏览器脚本见[scripts目录](../../scripts)，脚本定位见[验证与工具指南](testing-and-tools.md)。
