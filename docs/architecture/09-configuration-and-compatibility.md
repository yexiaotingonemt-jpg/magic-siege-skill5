# 配置、迁移与历史兼容

[模块总览](README.md) · [全文件索引](source-file-index.md)

最终默认值、基础配置、校验、旧存储迁移、旧范围升级和历史界面兼容文件。

## 当前调用链

```text
base-config.js → config.js多轮覆盖和主动技能倍乘 → defaults → Room / Simulation；shared/default-config.json为展开快照
```

配置数组存在未开放职业。后排旧AI、旧描述或旧界面不能直接作为设计5规则；是否实际加载以依赖索引为准。

## 主要文件

| 文件 | 当前加载状态 |
|---|---|
| [shared/config.js](../../shared/config.js) | 启动入口可达 |
| [shared/base-config.js](../../shared/base-config.js) | 启动入口可达 |
| [shared/config-migrations.js](../../shared/config-migrations.js) | 当前入口未静态引用；保留兼容/工具 |
| [client/src/skill-range-upgrade.js](../../client/src/skill-range-upgrade.js) | 当前入口未静态引用；保留兼容/工具 |
| [client/src/legacy-descriptions.js](../../client/src/legacy-descriptions.js) | 当前入口未静态引用；保留兼容/工具 |
| [client/src/legacy-match3.js](../../client/src/legacy-match3.js) | 当前入口未静态引用；保留兼容/工具 |
| [client/src/legacy-match3.css](../../client/src/legacy-match3.css) | 当前入口未静态引用；保留兼容/工具 |
| [shared/backline-ai.js](../../shared/backline-ai.js) | 当前入口未静态引用；保留兼容/工具 |

共享入口：[shared/default-config.json](../../shared/default-config.json)。

## 对应规则

- [第4章 单位、建筑与兵线](../rules/04-units-waves-and-towers.md)
- [第9章 技能释放公共流程](../rules/09-skill-casting.md)
- [第10章 职业与技能](../rules/10-classes-and-skills.md)
- [第11章 体力、经验与技能构筑](../rules/11-stamina-and-progression.md)
- [第12章 贡献评价、积分与排行](../rules/12-ratings-and-scores.md)

## 验证入口

- [tests/model.test.js](../../tests/model.test.js)
- [tests/skill-double.test.js](../../tests/skill-double.test.js)

专项浏览器脚本见[scripts目录](../../scripts)，脚本定位见[验证与工具指南](testing-and-tools.md)。
