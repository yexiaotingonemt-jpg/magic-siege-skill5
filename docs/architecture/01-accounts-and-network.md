# 账号、会话与多人同步

[模块总览](README.md) · [全文件索引](source-file-index.md)

注册登录、会话、HTTP命令、SSE、单房间编排、快照还原及重连。

## 当前调用链

```text
浏览器请求 → server.mjs → Accounts / Room.command → Simulation → Room.snapshot / SSE → network.js
```

服务端依据登录会话确定操作主体。客户端只发命令和插值显示；同账号多页共用同一英雄。

## 主要文件

| 文件 | 当前加载状态 |
|---|---|
| [server/accounts.mjs](../../server/accounts.mjs) | 启动入口可达 |
| [server.mjs](../../server.mjs) | 启动入口可达 |
| [server/room.mjs](../../server/room.mjs) | 启动入口可达 |
| [src/network.js](../../src/network.js) | 启动入口可达 |

## 对应规则

- [第2章 账号、阵营与同局](../rules/02-accounts-and-multiplayer.md)

## 验证入口

- [tests/multiplayer.test.js](../../tests/multiplayer.test.js)
- [tests/smoke.spec.js](../../tests/smoke.spec.js)

专项浏览器脚本见[scripts目录](../../scripts)，脚本定位见[验证与工具指南](testing-and-tools.md)。
