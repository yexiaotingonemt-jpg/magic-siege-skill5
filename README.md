# 魔法王座 · 职业技能设计5

同一战场内的实时非对称攻防原型。玩家选择阵营，通过场上小兵契约英雄；移动、索敌、普通攻击自动执行，玩家操作技能、加点与手动目标。服务端统一计算并同步同局战斗。

进攻职业：**兽人战士、火焰法师、森林精灵、符文战车**；防守职业：**黑暗领主**。规则基准日：2026-10-27，修订标识：`skill5-dash-fix-20261027`。

## 文档入口

- [玩法规则：14个模块及五职业20技能](docs/rules/README.md)
- [代码模块：职责、依赖、源码与测试](docs/architecture/README.md)
- [数值配置表](docs/数值配置表.md)
- [开发协作指南](docs/开发协作指南.md)
- [文档总导航](docs/README.md)

## 安装与启动

使用Node.js 20.19+或22.12+及npm：

```sh
npm ci
npm run build
npm start
```

打开`http://127.0.0.1:5183/`。同内网玩家连接服务主机的内网IP与5183端口；首个注册账号取得房主身份。Windows在安装并构建后也可双击`LAN-Start.cmd`。

环境变量：`PORT`（默认5183）、`HOST`（默认0.0.0.0）、`KC_DATA_DIR`（默认项目内data目录）。服务自动创建账号数据；账号和阵营保留，服务重启后战局重新开始。

## 当前规则要点

- 双方每30秒出兵：进攻10名（5近战、3远程、2攻城），防守8名（5近战、3远程）；默认机器人0/0。
- 契约消耗3体力并继承原小兵当前生命比例，每个账号同时拥有一名存活英雄。
- 手动目标20格；兽人、精灵可另选友方，敌方追击锁独立保留。选取不扩大普攻或技能射程。
- 主动技能共用一次施法收益额度：1级每体力1600%攻击等效基准、2000%峰值；3体力大招上限6000%。
- 阶段默认3600秒，进攻突破1排防线获胜；阶段重建后重新契约，体力、成长、积分及尚未结束的技能冷却保留。

完整条件、计算顺序和职业差异以[模块规则](docs/rules/README.md)与[最终配置](src/config.js)为准。

## 代码模块

| 模块 | 主要职责 |
|---|---|
| [账号、会话与多人同步](docs/architecture/01-accounts-and-network.md) | 注册登录、会话、HTTP命令、SSE、单房间编排、快照还原及重连。 |
| [战场、兵线、阶段与建筑](docs/architecture/02-battlefield-and-waves.md) | 地图边界、阶段胜负、单位模板、波次分配、出生、防御塔守护及机器人数量。 |
| [契约、体力、职业成长与评价](docs/architecture/03-contracts-and-progression.md) | 点兵确认、职业映射、生命比例继承、技能点、经验归属、体力、贡献、积分和战报。 |
| [自动行动、普攻与手动目标](docs/architecture/04-navigation-and-attacks.md) | 自动目标优先级、反击、普通移动、推进边界、20格手选、射程容差与减攻速进度。 |
| [五职业技能、共享额度与持续效果](docs/architecture/05-skills-and-budget.md) | 技能计划、目标选择、前摇锁定、20技能释放、共享收益额度、领主光环与灼烧。 |
| [伤害、治疗、状态与归属统计](docs/architecture/06-combat-and-statistics.md) | 护甲、易伤、减伤、盾吸、治疗共享、净化免疫、死亡、延迟效果和贡献归属。 |
| [界面、技能HUD与交互文案](docs/architecture/07-interface-and-skill-hud.md) | 页面入口、640×1136布局、登录、弹层、技能施放/详情/加点、彩色词条及主题。 |
| [战场渲染、单位动作与技能反馈](docs/architecture/08-rendering-and-feedback.md) | Phaser镜头、双方视角、局部动作、轮廓命中、VFX、状态、姓名、光圈和伤害数字。 |
| [配置、迁移与历史兼容](docs/architecture/09-configuration-and-compatibility.md) | 最终默认值、基础配置、校验、旧存储迁移、旧范围升级和历史界面兼容文件。 |

源码沿用原路径，运行所需美术资源位于`public/art/`。服务端20Hz模拟、正常约5Hz同步，客户端插值显示。`Simulation`、`HeroRules`及`Room`为共享实现入口；[全文件索引](docs/architecture/source-file-index.md)列出全部归属及静态依赖。

## 验证

```sh
npm test
npm run build
npm run test:browser
```

浏览器验收在5194隔离服务及临时账号目录运行。原Playwright配置使用Windows Chrome安装路径，其他环境需按[验证指南](docs/architecture/testing-and-tools.md)调整。

## 仓库内容与版本

提交源码、运行美术资源、默认配置、锁文件、启动器、测试、辅助脚本和模块文档。本地账号、环境变量、依赖、构建包及验收产物由`.gitignore`排除；首次使用先安装并构建。

原始Markdown位于[原文归档](docs/archive/README.md)。其中无攻城兵线、旧六职业、800%/1000%收益和历史端口属于旧版记录。阅读当前玩法请使用上面的模块入口。[整理范围及验证结果](docs/上传整理说明.md)。
