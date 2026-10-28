# 战场、兵线、阶段与建筑

[模块总览](README.md) · [全文件索引](source-file-index.md)

地图边界、阶段胜负、单位模板、波次分配、出生、防御塔守护及机器人数量。

## 当前调用链

```text
Room.step / checkStage → Simulation.tick / resetMap / spawnWave → distributeTroops → 单位及塔实例
```

30秒兵线与玩家、机器人数量独立；塔守护有服务端结算与前端显示两个入口。阶段重建的已知交接边界继续见开发协作指南第9节。

## 主要文件

| 文件 | 当前加载状态 |
|---|---|
| [client/src/battlefield.js](../../client/src/battlefield.js) | 启动入口可达 |
| [shared/troop-population.js](../../shared/troop-population.js) | 启动入口可达 |
| [shared/bot-population.js](../../shared/bot-population.js) | 当前入口未静态引用；保留兼容/工具 |
| [shared/tower-guard.js](../../shared/tower-guard.js) | 启动入口可达 |
| [client/src/tower-guard-visual.js](../../client/src/tower-guard-visual.js) | 启动入口可达 |

共享入口：[shared/simulation.js](../../shared/simulation.js)、[server/room.mjs](../../server/room.mjs)、[shared/config.js](../../shared/config.js)。

## 对应规则

- [第3章 战场与阶段](../rules/03-battlefield-and-stages.md)
- [第4章 单位、建筑与兵线](../rules/04-units-waves-and-towers.md)

## 验证入口

- [tests/model.test.js](../../tests/model.test.js)
- [tests/multiplayer.test.js](../../tests/multiplayer.test.js)

专项浏览器脚本见[scripts目录](../../scripts)，脚本定位见[验证与工具指南](testing-and-tools.md)。
