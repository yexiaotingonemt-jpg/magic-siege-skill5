# 账号、会话与多人同步

[模块总览](README.md) · [全文件索引](source-file-index.md)

注册登录、会话、HTTP命令、SSE、单房间编排、快照还原及重连。

## 当前调用链

```text
本地浏览器 → client/launcher.mjs（读取本地资源、代理API） → 远端server/index.mjs → Accounts / Room.command → Simulation → Room.snapshot / SSE → network.js
```

服务端依据登录会话确定操作主体。客户端只发命令和插值显示；同账号多页共用同一英雄。

## 主要文件

| 文件 | 当前加载状态 |
|---|---|
| [server/accounts.mjs](../../server/accounts.mjs) | 启动入口可达 |
| [server/index.mjs](../../server/index.mjs) | 启动入口可达 |
| [server/room.mjs](../../server/room.mjs) | 启动入口可达 |
| [client/src/network.js](../../client/src/network.js) | 启动入口可达 |

## 对应规则

- [第2章 账号、阵营与同局](../rules/02-accounts-and-multiplayer.md)

## 验证入口

- [tests/multiplayer.test.js](../../tests/multiplayer.test.js)
- [tests/smoke.spec.js](../../tests/smoke.spec.js)

专项浏览器脚本见[scripts目录](../../scripts)，脚本定位见[验证与工具指南](testing-and-tools.md)。

本地客户端配置、启动和分发见[客户端说明](../../client/README.md)。服务端只提供API，不再提供静态页面或美术。

## 兼容版本限制

版本源为[shared/protocol.js](../../shared/protocol.js)。`CLIENT_VERSION` 控制桌面包自动更新，`GAME_VERSION` 控制两端战斗规则兼容检查；结构不兼容时另外提升 `PROTOCOL_VERSION`。`/api/version` 公开返回全部标记。客户端发布版本不一致触发签名包自动下载、安装与重启；核心兼容版本不一致则游戏接口返回409，停止操作与SSE并转入更新页。游戏鉴权不以界面发布版本拒绝兼容请求。`RULESET_REVISION` 仅用于诊断。完整规则见[版本说明](../../README.md#版本限制)。

对应验证：[接口校验](../../tests/version-gate.test.js)、[更新界面及在线升级](../../tests/version-gate.spec.js)、[桌面自动更新完整验收](../../scripts/verify-desktop-update.mjs)。
