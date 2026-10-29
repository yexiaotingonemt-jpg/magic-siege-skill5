# 界面、技能HUD与交互文案

[模块总览](README.md) · [全文件索引](source-file-index.md)

页面入口、640×1136布局、登录、弹层、技能施放/详情/强化选择、彩色词条及主题。

## 当前调用链

```text
client/index.html → main.js → gameShell / mountGameLayout → selection / skill-hud → 网络命令
```

施法、详情、强化选择独立触控；外侧辅助工具与游戏区分离。文案以当前五职业配置为准。

统一皮肤由 `kc-final.css` 管理：深绿面板、古铜边框、语义色及一致的控件间距；`ui-icons.js` 提供导航和资源图标。导航通过 `aria-current` 标记当前面板，关闭弹层恢复战场选中态；账号入口支持方向键切换。技能区和底部导航按实际缩放比例预留触控高度，避免消耗文字、强化选择按钮与状态栏重叠。

## 主要文件

| 文件 | 当前加载状态 |
|---|---|
| [client/src/main.js](../../client/src/main.js) | 启动入口可达 |
| [client/src/game-shell.js](../../client/src/game-shell.js) | 启动入口可达 |
| [client/src/game-layout.js](../../client/src/game-layout.js) | 启动入口可达 |
| [client/src/skill-hud.js](../../client/src/skill-hud.js) | 启动入口可达 |
| [client/src/ability-descriptions.js](../../client/src/ability-descriptions.js) | 启动入口可达 |
| [client/src/ability-tags.js](../../client/src/ability-tags.js) | 启动入口可达 |
| [client/src/ability-summaries.js](../../client/src/ability-summaries.js) | 当前入口未静态引用；保留兼容/工具 |
| [client/src/style.css](../../client/src/style.css) | 启动入口可达 |
| [client/src/kc-layout.css](../../client/src/kc-layout.css) | 启动入口可达 |
| [client/src/multiplayer.css](../../client/src/multiplayer.css) | 启动入口可达 |
| [client/src/kc-final.css](../../client/src/kc-final.css) | 统一主题与响应式控件样式 |
| [client/src/ui-icons.js](../../client/src/ui-icons.js) | 导航、资源与账号图标 |
| [client/src/visual-theme.js](../../client/src/visual-theme.js) | 启动入口可达 |

共享入口：[client/src/selection.js](../../client/src/selection.js)、[client/src/network.js](../../client/src/network.js)。

## 对应规则

- [第5章 单位契约与职业](../rules/05-contracts-and-classes.md)
- [第8章 手动目标](../rules/08-manual-targets.md)
- [第14章 界面、视角与反馈](../rules/14-interface-and-feedback.md)

## 验证入口

- [tests/smoke.spec.js](../../tests/smoke.spec.js)
- [tests/hero-names.test.js](../../tests/hero-names.test.js)

专项浏览器脚本见[scripts目录](../../scripts)，脚本定位见[验证与工具指南](testing-and-tools.md)。
