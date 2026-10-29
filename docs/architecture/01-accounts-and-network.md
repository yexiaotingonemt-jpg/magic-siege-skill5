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

版本源为[shared/protocol.js](../../shared/protocol.js)。游戏 API 严格校验客户端发布版本、战斗兼容版本和协议。任一不一致则返回409，停止操作与SSE，提示退出后从 GitHub 拉取完整最新版；不再自动下载客户端包。旧更新下载接口返回410。服务端热更保留战局时仍断开旧 SSE，使旧客户端重新通过版本检查。

验证：[接口校验](../../tests/version-gate.test.js)、[版本提示及在线重连](../../tests/version-gate.spec.js)、[桌面流程](../../tests/desktop.electron.spec.js)。
