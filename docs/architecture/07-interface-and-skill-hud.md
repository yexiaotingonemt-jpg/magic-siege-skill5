# 界面、技能HUD与交互文案

[模块总览](README.md) · [全文件索引](source-file-index.md)

页面入口、640×1136布局、登录、弹层、技能施放/详情/强化选择、彩色词条及主题。

## 当前调用链

```text
client/index.html → main.js → gameShell / mountGameLayout → selection / skill-hud → 网络命令
```

施法、详情、强化选择独立触控；外侧辅助工具与游戏区分离。文案以当前五职业配置为准。

技能右上角统一显示与该技能有关的实时数字，与图标内的冷却秒数分开：精灵共生链接按独立链接条数计数；兽人汲血连接按有效目标数计数，蓄伤壁垒显示预计转盾量；法师显示炙热层数、自身标记目标数及天火可消耗的炙热；战车炮击和精灵群疗显示本次引导剩余次数；领主取得召唤强化后显示自身存活护卫数。只读取当前英雄的有效状态，不累计历史施法；到期、中断、阵亡及换职业时更新或隐藏。大额蓄盾量使用万单位，鼠标提示及无障碍名称保留精确数值。状态图标对具有层数/数量的状态从1开始标数，保留个人来源筛选和红蓝底框。

升级后只更新战场右下角的“技能强化”图标及右上角待选次数，点击图标才打开选择窗口；再次升级、刷新和重连均不会自动弹窗。窗口内可连续处理积攒的强化，关闭后保留剩余次数与当前候选，选完后入口隐藏。

强化卡片放大技能名称与词条名称。技能名称后的“!”为独立详情按钮，展示当前技能效果、冷却与体力消耗、该技能已选强化及次数，并列出通用强化；通用词条展示本职业定位及已选通用强化。查看详情不消耗强化次数，返回时保留候选；Esc先返回选择，再关闭窗口，详情内数字键不执行选卡。

统一皮肤由 `kc-final.css` 管理：深绿面板、古铜边框、语义色及一致的控件间距；`ui-icons.js` 提供导航和资源图标。导航通过 `aria-current` 标记当前面板，关闭弹层恢复战场选中态；账号入口支持方向键切换。技能区和底部导航按实际缩放比例预留触控高度，避免消耗文字、强化选择按钮与状态栏重叠。

## 主要文件

| 文件 | 当前加载状态 |
|---|---|
| [client/src/main.js](../../client/src/main.js) | 启动入口可达 |
| [client/src/game-shell.js](../../client/src/game-shell.js) | 启动入口可达 |
| [client/src/game-layout.js](../../client/src/game-layout.js) | 启动入口可达 |
| [client/src/skill-hud.js](../../client/src/skill-hud.js) | 启动入口可达 |
| [client/src/trait-draft.js](../../client/src/trait-draft.js) | 手动强化入口、次数角标、选卡与技能详情 |
| [client/src/trait-draft.css](../../client/src/trait-draft.css) | 强化入口、卡片与详情的响应式样式 |
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
