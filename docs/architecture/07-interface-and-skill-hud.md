# 界面、技能HUD与交互文案

[模块总览](README.md) · [全文件索引](source-file-index.md)

页面入口、640×1136布局、登录、弹层、技能施放/详情/加点、彩色词条及主题。

## 当前调用链

```text
index.html → main.js → gameShell / mountGameLayout → selection / skill-hud → 网络命令
```

施法、详情、加点独立触控；外侧辅助工具与游戏区分离。文案以当前五职业配置为准。

## 主要文件

| 文件 | 当前加载状态 |
|---|---|
| [src/main.js](../../src/main.js) | 启动入口可达 |
| [src/game-shell.js](../../src/game-shell.js) | 启动入口可达 |
| [src/game-layout.js](../../src/game-layout.js) | 启动入口可达 |
| [src/skill-hud.js](../../src/skill-hud.js) | 启动入口可达 |
| [src/ability-descriptions.js](../../src/ability-descriptions.js) | 启动入口可达 |
| [src/ability-tags.js](../../src/ability-tags.js) | 启动入口可达 |
| [src/ability-summaries.js](../../src/ability-summaries.js) | 当前入口未静态引用；保留兼容/工具 |
| [src/style.css](../../src/style.css) | 启动入口可达 |
| [src/kc-layout.css](../../src/kc-layout.css) | 启动入口可达 |
| [src/multiplayer.css](../../src/multiplayer.css) | 启动入口可达 |
| [src/visual-theme.js](../../src/visual-theme.js) | 启动入口可达 |

共享入口：[src/selection.js](../../src/selection.js)、[src/network.js](../../src/network.js)。

## 对应规则

- [第5章 单位契约与职业](../rules/05-contracts-and-classes.md)
- [第8章 手动目标](../rules/08-manual-targets.md)
- [第14章 界面、视角与反馈](../rules/14-interface-and-feedback.md)

## 验证入口

- [tests/smoke.spec.js](../../tests/smoke.spec.js)
- [tests/hero-names.test.js](../../tests/hero-names.test.js)

专项浏览器脚本见[scripts目录](../../scripts)，脚本定位见[验证与工具指南](testing-and-tools.md)。
