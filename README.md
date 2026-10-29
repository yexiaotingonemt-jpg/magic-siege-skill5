# 魔法王座 · 职业技能设计5

同一战场内的实时非对称攻防原型。玩家选择阵营，通过场上小兵契约英雄；移动、索敌、普通攻击自动执行，玩家操作技能、加点与手动目标。服务端统一计算并同步同局战斗。

进攻职业：**兽人战士、火焰法师、森林精灵、符文战车**；防守职业：**黑暗领主**。规则基准日：2026-10-29，版本0.5.0；升级词条、精英兵及数值基准见[本轮完整规则](docs/rules/15-traits-and-elites.md)。已正式发布，验收与回滚信息见[发布记录](docs/releases/0.5.0-deployment-20261029.md)。

## 同事从 GitHub 拉取后直接运行

Windows 同事完整克隆或拉取本仓库后，双击根目录 **`魔法王座.exe`**，也可以运行 `Start.cmd`。无需安装 Node.js、Go、npm 或执行构建。首次启动会从已拉取的固定分片准备运行环境，后续复用本机缓存；游戏使用仓库内的预构建页面及美术。

以后先退出游戏、`git pull`，再双击同一个入口即可打开对应新版。已有客户端检测到正式服要求更新时，会优先使用本机完整且版本一致的仓库；本机没有新版时保留服务器签名更新作为后备。

详见 [GitHub 客户端分发](docs/GitHub客户端分发.md)。

## 文档入口

- [玩法规则：14个模块及五职业20技能](docs/rules/README.md)
- [代码模块：职责、依赖、源码与测试](docs/architecture/README.md)
- [数值配置表](docs/数值配置表.md)
- [开发协作指南](docs/开发协作指南.md)
- [文档总导航](docs/README.md)

## 客户端、服务端与共享代码

- `client/`：Electron桌面窗口、游戏界面、Phaser、美术资源及服务器设置。
- `server/`：HTTP/SSE、账号与房间编排，只提供API，不提供网页和美术。
- `shared/`：两端复用的战斗规则、技能、数值配置及版本定义；不依赖界面或Node.js专用API。

每位玩家运行自己的本地客户端。页面、脚本、图片从本机读取，只有登录、操作、战局状态经过网络。所有客户端的 `serverUrl` 必须指向同一个战斗服务。客户端不推进权威战斗。

## 开发与启动

桌面开发与打包使用Node.js 22.12+（本机验证为24.16.0）及npm，在项目根目录执行：

```sh
npm ci
npm run setup:desktop
npm run build
npm run start:server
```

另开一个终端执行：

```sh
npm run start:client
```

启动独立桌面游戏窗口，自动连接 `http://124.222.216.66:5183`，玩家无需填写或选择服务器，旧版保存的个人地址也不会覆盖内置地址。源码默认地址位于 [client/client-config.json](client/client-config.json)。Windows源码目录的 `Start.cmd` / `LAN-Start.cmd` 也会启动桌面窗口。玩家直接使用打包后的 `魔法王座.exe`。

开发时可用 `npm run dev` 启动Vite热更新界面，默认转发API到 `http://127.0.0.1:5183`；通过环境变量 `MAGIC_SERVER_URL` 改用远端服务。必须另行运行一个战斗服务器。

服务端环境变量：`PORT`（5183）、`HOST`（0.0.0.0）、`KC_DATA_DIR`（项目内data）。账号与阵营落盘；会话、战局、成长、积分及临时房主配置仅在内存中，重启后重置。

## 版本限制

正式发布必须遵守[客户端与服务器统一版本发布约定](docs/版本发布约定.md)：`SERVER_VERSION` 与 `CLIENT_VERSION` 使用同一个发布号，每次正式发布同时提升。数值平衡及主要由服务器执行的修改也需要两端配套发布。

`GAME_VERSION` 是两端共用的战斗兼容标记，`PROTOCOL_VERSION` 是 API、命令与快照结构兼容标记；按兼容性需要调整，`RULESET_REVISION` 只作诊断。构建与打包不自动递增版本。

桌面启动与重新连接时读取公开的 `/api/version`。客户端发布版本与服务器公布的目标版本不同，就自动下载签名更新包、校验SHA-256、关闭旧进程、安装并重启。游戏接口检查战斗兼容版本及协议标记。先发布完整客户端更新包，再切换配套服务端；两端发布号与更新清单均核对一致后，才能报告发布完成。详见[部署说明](deploy/README.md#桌面自动更新发布)。

## 分别打包与分发

```sh
npm run package:server
npm run package:client -- --server https://game.example.com
```

输出位于 `release/` 的独立版本目录，包含Windows桌面客户端ZIP及SHA-256。玩家完整解压桌面ZIP，双击 `魔法王座.exe`，无需安装Node.js、浏览器或运行CMD。请保留同目录所有DLL和resources文件，不能单独复制EXE。

`npm run package:browser`保留旧的浏览器开发分发方式；默认`package:client`与`package:desktop`均生成桌面版。

服务器只上传服务端包，执行 `node server/index.mjs`，不需要客户端、美术、构建工具或 `node_modules`。长期运行、更新、账号备份及Nginx设置见 [部署说明](deploy/README.md)。客户端使用和更新见 [客户端说明](client/README.md)。

## 当前规则要点

- 双方每30秒出兵：进攻10名（5近战、3远程、2攻城），防守8名（5近战、3远程）；默认机器人0/0。
- 契约消耗3体力并继承原小兵当前生命比例，每个账号同时拥有一名存活英雄。
- 手动目标20格；兽人、精灵可另选友方，敌方追击锁独立保留。选取不扩大普攻或技能射程。
- 初始开放1/2/3技能，大招5级解锁；升级选择蓝、紫、金词条，无技能点或统一收益硬截断。
- 每三波双方各额外生成1名精英，击杀获得随机30秒Buff并向全体广播、加入战报。
- 阶段默认3600秒，进攻突破1排防线获胜；阶段重建后重新契约，体力、成长、积分及尚未结束的技能冷却保留。

完整条件、计算顺序和职业差异以[模块规则](docs/rules/README.md)与[最终配置](shared/config.js)为准。

## 代码模块

| 模块 | 主要职责 |
|---|---|
| [账号、会话与多人同步](docs/architecture/01-accounts-and-network.md) | 注册登录、会话、HTTP命令、SSE、单房间编排、快照还原及重连。 |
| [战场、兵线、阶段与建筑](docs/architecture/02-battlefield-and-waves.md) | 地图边界、阶段胜负、单位模板、波次分配、出生、防御塔守护及机器人数量。 |
| [契约、体力、职业成长与评价](docs/architecture/03-contracts-and-progression.md) | 点兵确认、职业映射、生命比例继承、词条、经验归属、体力、贡献、积分和战报。 |
| [自动行动、普攻与手动目标](docs/architecture/04-navigation-and-attacks.md) | 自动目标优先级、反击、普通移动、推进边界、20格手选、射程容差与减攻速进度。 |
| [五职业技能、词条与持续效果](docs/architecture/05-skills-and-budget.md) | 技能计划、目标选择、前摇锁定、20技能释放、施法诊断账本、领主光环与灼烧。 |
| [伤害、治疗、状态与归属统计](docs/architecture/06-combat-and-statistics.md) | 护甲、易伤、减伤、盾吸、治疗共享、净化免疫、死亡、延迟效果和贡献归属。 |
| [界面、技能HUD与交互文案](docs/architecture/07-interface-and-skill-hud.md) | 页面入口、640×1136布局、登录、弹层、技能施放/详情/加点、彩色词条及主题。 |
| [战场渲染、单位动作与技能反馈](docs/architecture/08-rendering-and-feedback.md) | Phaser镜头、双方视角、局部动作、轮廓命中、VFX、状态、姓名、光圈和伤害数字。 |
| [配置、迁移与历史兼容](docs/architecture/09-configuration-and-compatibility.md) | 最终默认值、基础配置、校验、旧存储迁移、旧范围升级和历史界面兼容文件。 |

界面位于`client/src/`，运行美术位于`client/public/art/`，战斗规则位于`shared/`。服务端20Hz模拟、正常约5Hz同步，客户端插值显示。`Simulation`、`HeroRules`及`Room`为共享实现入口；[全文件索引](docs/architecture/source-file-index.md)列出全部归属及静态依赖。

## 验证

```sh
npm test
npm run build
npm run test:browser
npm run test:desktop
```

浏览器验收使用独立的API服务和5194本地客户端，账号位于临时目录；截图与报告默认写入系统临时目录，可用`MAGIC_QA_DIR`指定。Windows默认使用Chrome，其他浏览器路径可用`CHROME_PATH`指定。

## 仓库内容与版本

提交源码、运行美术资源、默认配置、锁文件、启动器、测试、辅助脚本和模块文档。本地账号、环境变量、依赖、构建包及验收产物由`.gitignore`排除；首次使用先安装并构建。

原始Markdown位于[原文归档](docs/archive/README.md)。其中无攻城兵线、旧六职业、800%/1000%收益和历史端口属于旧版记录。阅读当前玩法请使用上面的模块入口。[整理范围及验证结果](docs/上传整理说明.md)。
