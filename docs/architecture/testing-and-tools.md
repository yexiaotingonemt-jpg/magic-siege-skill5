# 验证与工具指南

[代码模块总览](README.md) · [开发协作指南](../开发协作指南.md)

## 从干净环境验证

```sh
npm ci
npm test
npm run build
npm run test:browser
```

浏览器验收分别启动临时API服务和5194端口的本地客户端，使用系统临时账号目录。截图、报告和浏览器测试输出默认位于系统临时目录的`magic-siege-browser-qa/`，可用`MAGIC_QA_DIR`指定；不写入源码目录。Windows默认使用Chrome，其他浏览器路径用`CHROME_PATH`指定。历史专项脚本仍可能写入旧版evidence目录。

## 测试分组

| 规则模块 | 测试文件 |
|---|---|
| 本地客户端与接口分离 | [tests/local-client.test.js](../../tests/local-client.test.js)、[tests/local-client.spec.js](../../tests/local-client.spec.js) |
| 账号、会话与多人同步 | [tests/multiplayer.test.js](../../tests/multiplayer.test.js)、[tests/smoke.spec.js](../../tests/smoke.spec.js) |
| 战场、兵线、阶段与建筑 | [tests/model.test.js](../../tests/model.test.js)、[tests/multiplayer.test.js](../../tests/multiplayer.test.js) |
| 契约、体力、职业成长与评价 | [tests/model.test.js](../../tests/model.test.js)、[tests/stamina.test.js](../../tests/stamina.test.js)、[tests/multiplayer.test.js](../../tests/multiplayer.test.js)、[tests/smoke.spec.js](../../tests/smoke.spec.js) |
| 自动行动、普攻与手动目标 | [tests/manual-target.test.js](../../tests/manual-target.test.js)、[tests/ally-target.test.js](../../tests/ally-target.test.js)、[tests/attack-arrival.test.js](../../tests/attack-arrival.test.js)、[tests/frost-cooldown.test.js](../../tests/frost-cooldown.test.js)、[tests/dash-bounce.test.js](../../tests/dash-bounce.test.js) |
| 五职业技能、词条与持续效果 | [tests/model.test.js](../../tests/model.test.js)、[tests/skill-double.test.js](../../tests/skill-double.test.js)、[tests/lord-flame.test.js](../../tests/lord-flame.test.js)、[tests/manual-target.test.js](../../tests/manual-target.test.js)、[tests/ally-target.test.js](../../tests/ally-target.test.js) |
| 伤害、治疗、状态与归属统计 | [tests/model.test.js](../../tests/model.test.js)、[tests/skill-double.test.js](../../tests/skill-double.test.js)、[tests/frost-cooldown.test.js](../../tests/frost-cooldown.test.js)、[tests/damage-numbers.test.js](../../tests/damage-numbers.test.js) |
| 界面、技能HUD与交互文案 | [tests/smoke.spec.js](../../tests/smoke.spec.js)、[tests/hero-names.test.js](../../tests/hero-names.test.js) |
| 战场渲染、单位动作与技能反馈 | [tests/unit-motion.test.js](../../tests/unit-motion.test.js)、[tests/unit-hit.test.js](../../tests/unit-hit.test.js)、[tests/hero-names.test.js](../../tests/hero-names.test.js)、[tests/damage-numbers.test.js](../../tests/damage-numbers.test.js)、[tests/smoke.spec.js](../../tests/smoke.spec.js) |
| 配置、迁移与历史兼容 | [tests/model.test.js](../../tests/model.test.js)、[tests/skill-double.test.js](../../tests/skill-double.test.js) |

## 辅助脚本

| 类型 | 入口与用途 | 限制 |
|---|---|---|
| 当前专项浏览器验收 | `scripts/verify-*.mjs`，覆盖目标、动作、飘字、火盾、射程、减攻速和冲锋回弹 | 先构建；浏览器路径按本机；逐脚本核对隔离数据目录。 |
| 多人验收服务 | [playtest-server.mjs](../../scripts/playtest-server.mjs) | 固定5194端口，使用系统临时账号目录。 |
| 历史审计/跟进 | `scripts/audit-*.mjs`、`scripts/qa-followup-*.mjs` | 部分依赖原始`evidence/`快照；那些本地输入不随仓库提交。旧探针不代表当前参数。 |
| 历史素材处理 | `scripts/prepare_*.py`、`scripts/render_fx_review_v16.py`等 | 需要原始生成图、本机字体或Python依赖；运行游戏使用已提交的`client/public/art/`，不需要重跑。 |

## 已知实现边界

原开发协作指南记录了地图重建时待执行回调与全塔全毁可能双重重建的交接检测项；本次整理未修改战斗实现，也未将这些项标为已修复。详见[交接检测项](../开发协作指南.md#9-交接检测项)。

本次整理的实际验证结果见[上传整理说明](../上传整理说明.md)。
