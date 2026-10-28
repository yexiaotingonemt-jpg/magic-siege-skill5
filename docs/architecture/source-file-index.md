# 全文件代码模块索引

[模块总览](README.md) · [客户端说明](../../client/README.md) · [部署说明](../../deploy/README.md)

客户端、美术与本地启动器位于client/，服务端位于server/，通用规则位于shared/。以下索引覆盖当前全部源码和CSS，加载可达性从两端入口、启动器及Vite配置的静态导入计算；不代表每个导出或分支都会运行。

| 文件 | 主归属模块 | 启动加载状态 | 本地直接依赖 |
|---|---|---|---|
| [client/launcher.mjs](../../client/launcher.mjs) | 客户端 | 入口可达 | [shared/protocol.js](../../shared/protocol.js) |
| [client/src/ability-descriptions.js](../../client/src/ability-descriptions.js) | [界面、技能HUD与交互文案](07-interface-and-skill-hud.md) | 入口可达 | [shared/config.js](../../shared/config.js)、[shared/skill-progression.js](../../shared/skill-progression.js)、[client/src/ability-tags.js](../../client/src/ability-tags.js)、[shared/skill-value.js](../../shared/skill-value.js) |
| [client/src/ability-summaries.js](../../client/src/ability-summaries.js) | [界面、技能HUD与交互文案](07-interface-and-skill-hud.md) | 未静态引用 | — |
| [client/src/ability-tags.js](../../client/src/ability-tags.js) | [界面、技能HUD与交互文案](07-interface-and-skill-hud.md) | 入口可达 | — |
| [client/src/art-catalog.js](../../client/src/art-catalog.js) | 客户端 | 入口可达 | — |
| [client/src/art-layout.js](../../client/src/art-layout.js) | 客户端 | 入口可达 | — |
| [client/src/battlefield.js](../../client/src/battlefield.js) | [战场、兵线、阶段与建筑](02-battlefield-and-waves.md) | 入口可达 | — |
| [client/src/combat-numbers.js](../../client/src/combat-numbers.js) | [战场渲染、单位动作与技能反馈](08-rendering-and-feedback.md) | 入口可达 | — |
| [client/src/game-layout.js](../../client/src/game-layout.js) | [界面、技能HUD与交互文案](07-interface-and-skill-hud.md) | 入口可达 | — |
| [client/src/game-shell.js](../../client/src/game-shell.js) | [界面、技能HUD与交互文案](07-interface-and-skill-hud.md) | 入口可达 | — |
| [client/src/hero-action-layout.js](../../client/src/hero-action-layout.js) | [战场渲染、单位动作与技能反馈](08-rendering-and-feedback.md) | 入口可达 | — |
| [client/src/hero-names.js](../../client/src/hero-names.js) | [战场渲染、单位动作与技能反馈](08-rendering-and-feedback.md) | 入口可达 | [client/src/art-catalog.js](../../client/src/art-catalog.js) |
| [client/src/kc-final.css](../../client/src/kc-final.css) | 客户端 | 入口可达 | — |
| [client/src/kc-layout.css](../../client/src/kc-layout.css) | [界面、技能HUD与交互文案](07-interface-and-skill-hud.md) | 入口可达 | — |
| [client/src/legacy-descriptions.js](../../client/src/legacy-descriptions.js) | [配置、迁移与历史兼容](09-configuration-and-compatibility.md) | 未静态引用 | [shared/config.js](../../shared/config.js)、[shared/skill-progression.js](../../shared/skill-progression.js)、[client/src/ability-tags.js](../../client/src/ability-tags.js)、[shared/skill-value.js](../../shared/skill-value.js) |
| [client/src/legacy-match3.css](../../client/src/legacy-match3.css) | [配置、迁移与历史兼容](09-configuration-and-compatibility.md) | 未静态引用 | — |
| [client/src/legacy-match3.js](../../client/src/legacy-match3.js) | [配置、迁移与历史兼容](09-configuration-and-compatibility.md) | 未静态引用 | [client/src/style.css](../../client/src/style.css) |
| [client/src/main.js](../../client/src/main.js) | [界面、技能HUD与交互文案](07-interface-and-skill-hud.md) | 入口可达 | [client/src/style.css](../../client/src/style.css)、[client/src/kc-layout.css](../../client/src/kc-layout.css)、[client/src/multiplayer.css](../../client/src/multiplayer.css)、[client/src/kc-final.css](../../client/src/kc-final.css)、[client/src/art-catalog.js](../../client/src/art-catalog.js)、[client/src/game-shell.js](../../client/src/game-shell.js)、[client/src/game-layout.js](../../client/src/game-layout.js)、[shared/config.js](../../shared/config.js)、[client/src/renderer.js](../../client/src/renderer.js)、[client/src/selection.js](../../client/src/selection.js)、[client/src/visual-theme.js](../../client/src/visual-theme.js)、[client/src/skill-hud.js](../../client/src/skill-hud.js)、[client/src/ability-descriptions.js](../../client/src/ability-descriptions.js)、[client/src/network.js](../../client/src/network.js)、[shared/skill-value.js](../../shared/skill-value.js) |
| [client/src/melee-walk-layout.js](../../client/src/melee-walk-layout.js) | 客户端 | 入口可达 | — |
| [client/src/minion-art-layout.js](../../client/src/minion-art-layout.js) | 客户端 | 入口可达 | — |
| [client/src/multiplayer.css](../../client/src/multiplayer.css) | [界面、技能HUD与交互文案](07-interface-and-skill-hud.md) | 入口可达 | — |
| [client/src/network.js](../../client/src/network.js) | [账号、会话与多人同步](01-accounts-and-network.md) | 入口可达 | [shared/simulation.js](../../shared/simulation.js)、[shared/protocol.js](../../shared/protocol.js) |
| [client/src/premium-vfx.js](../../client/src/premium-vfx.js) | [战场渲染、单位动作与技能反馈](08-rendering-and-feedback.md) | 入口可达 | [shared/config.js](../../shared/config.js)、[shared/skill-value.js](../../shared/skill-value.js)、[client/src/vfx-profiles.js](../../client/src/vfx-profiles.js)、[client/src/vfx-brushes.js](../../client/src/vfx-brushes.js) |
| [client/src/ranged-walk-layout.js](../../client/src/ranged-walk-layout.js) | 客户端 | 入口可达 | — |
| [client/src/renderer.js](../../client/src/renderer.js) | [战场渲染、单位动作与技能反馈](08-rendering-and-feedback.md) | 入口可达 | [client/src/art-catalog.js](../../client/src/art-catalog.js)、[client/src/unit-facing.js](../../client/src/unit-facing.js)、[client/src/walk-animation.js](../../client/src/walk-animation.js)、[client/src/unit-art.js](../../client/src/unit-art.js)、[client/src/art-catalog.js](../../client/src/art-catalog.js)、[client/src/hero-action-layout.js](../../client/src/hero-action-layout.js)、[client/src/premium-vfx.js](../../client/src/premium-vfx.js)、[client/src/unit-hit.js](../../client/src/unit-hit.js)、[client/src/battlefield.js](../../client/src/battlefield.js)、[client/src/target-halos.js](../../client/src/target-halos.js)、[client/src/tower-guard-visual.js](../../client/src/tower-guard-visual.js)、[client/src/status-icons.js](../../client/src/status-icons.js)、[client/src/combat-numbers.js](../../client/src/combat-numbers.js)、[client/src/unit-motion-view.js](../../client/src/unit-motion-view.js)、[client/src/hero-names.js](../../client/src/hero-names.js) |
| [client/src/selection.js](../../client/src/selection.js) | [契约、体力、职业成长与评价](03-contracts-and-progression.md) | 入口可达 | [shared/config.js](../../shared/config.js)、[client/src/visual-theme.js](../../client/src/visual-theme.js)、[client/src/battlefield.js](../../client/src/battlefield.js)、[shared/manual-target.js](../../shared/manual-target.js) |
| [client/src/skill-animation.js](../../client/src/skill-animation.js) | [战场渲染、单位动作与技能反馈](08-rendering-and-feedback.md) | 未静态引用 | [shared/config.js](../../shared/config.js) |
| [client/src/skill-hud.js](../../client/src/skill-hud.js) | [界面、技能HUD与交互文案](07-interface-and-skill-hud.md) | 入口可达 | [client/src/art-catalog.js](../../client/src/art-catalog.js)、[shared/config.js](../../shared/config.js)、[client/src/ability-descriptions.js](../../client/src/ability-descriptions.js)、[shared/skill-progression.js](../../shared/skill-progression.js) |
| [client/src/skill-range-upgrade.js](../../client/src/skill-range-upgrade.js) | [配置、迁移与历史兼容](09-configuration-and-compatibility.md) | 未静态引用 | — |
| [client/src/skill3-visuals.js](../../client/src/skill3-visuals.js) | [战场渲染、单位动作与技能反馈](08-rendering-and-feedback.md) | 未静态引用 | [shared/config.js](../../shared/config.js) |
| [client/src/status-icons.js](../../client/src/status-icons.js) | [战场渲染、单位动作与技能反馈](08-rendering-and-feedback.md) | 入口可达 | [client/src/art-catalog.js](../../client/src/art-catalog.js)、[client/src/unit-status.js](../../client/src/unit-status.js) |
| [client/src/style.css](../../client/src/style.css) | [界面、技能HUD与交互文案](07-interface-and-skill-hud.md) | 入口可达 | — |
| [client/src/target-halos.js](../../client/src/target-halos.js) | [战场渲染、单位动作与技能反馈](08-rendering-and-feedback.md) | 入口可达 | [shared/manual-target.js](../../shared/manual-target.js) |
| [client/src/tower-guard-visual.js](../../client/src/tower-guard-visual.js) | [战场、兵线、阶段与建筑](02-battlefield-and-waves.md) | 入口可达 | [shared/tower-guard.js](../../shared/tower-guard.js) |
| [client/src/unit-art.js](../../client/src/unit-art.js) | 客户端 | 入口可达 | [client/src/art-catalog.js](../../client/src/art-catalog.js)、[client/src/art-layout.js](../../client/src/art-layout.js)、[client/src/minion-art-layout.js](../../client/src/minion-art-layout.js)、[client/src/ranged-walk-layout.js](../../client/src/ranged-walk-layout.js)、[client/src/melee-walk-layout.js](../../client/src/melee-walk-layout.js)、[client/src/walk-animation.js](../../client/src/walk-animation.js) |
| [client/src/unit-facing.js](../../client/src/unit-facing.js) | 客户端 | 入口可达 | — |
| [client/src/unit-hit.js](../../client/src/unit-hit.js) | [战场渲染、单位动作与技能反馈](08-rendering-and-feedback.md) | 入口可达 | — |
| [client/src/unit-motion-view.js](../../client/src/unit-motion-view.js) | [战场渲染、单位动作与技能反馈](08-rendering-and-feedback.md) | 入口可达 | [client/src/unit-motion.js](../../client/src/unit-motion.js) |
| [client/src/unit-motion.js](../../client/src/unit-motion.js) | [战场渲染、单位动作与技能反馈](08-rendering-and-feedback.md) | 入口可达 | [shared/attack-range.js](../../shared/attack-range.js) |
| [client/src/unit-status.js](../../client/src/unit-status.js) | [战场渲染、单位动作与技能反馈](08-rendering-and-feedback.md) | 入口可达 | [shared/skill-value.js](../../shared/skill-value.js)、[shared/tower-guard.js](../../shared/tower-guard.js) |
| [client/src/vfx-brushes.js](../../client/src/vfx-brushes.js) | [战场渲染、单位动作与技能反馈](08-rendering-and-feedback.md) | 入口可达 | — |
| [client/src/vfx-profiles.js](../../client/src/vfx-profiles.js) | [战场渲染、单位动作与技能反馈](08-rendering-and-feedback.md) | 入口可达 | — |
| [client/src/visual-theme.js](../../client/src/visual-theme.js) | [界面、技能HUD与交互文案](07-interface-and-skill-hud.md) | 入口可达 | — |
| [client/src/walk-animation.js](../../client/src/walk-animation.js) | 客户端 | 入口可达 | — |
| [client/vite.config.js](../../client/vite.config.js) | 客户端 | 入口可达 | — |
| [server/accounts.mjs](../../server/accounts.mjs) | [账号、会话与多人同步](01-accounts-and-network.md) | 入口可达 | — |
| [server/index.mjs](../../server/index.mjs) | [账号、会话与多人同步](01-accounts-and-network.md) | 入口可达 | [server/accounts.mjs](../../server/accounts.mjs)、[server/room.mjs](../../server/room.mjs)、[shared/protocol.js](../../shared/protocol.js) |
| [server/room.mjs](../../server/room.mjs) | [账号、会话与多人同步](01-accounts-and-network.md) | 入口可达 | [shared/simulation.js](../../shared/simulation.js)、[shared/config.js](../../shared/config.js) |
| [shared/attack-cooldown.js](../../shared/attack-cooldown.js) | [自动行动、普攻与手动目标](04-navigation-and-attacks.md) | 入口可达 | — |
| [shared/attack-range.js](../../shared/attack-range.js) | [自动行动、普攻与手动目标](04-navigation-and-attacks.md) | 入口可达 | — |
| [shared/backline-ai.js](../../shared/backline-ai.js) | [配置、迁移与历史兼容](09-configuration-and-compatibility.md) | 未静态引用 | — |
| [shared/base-config.js](../../shared/base-config.js) | [配置、迁移与历史兼容](09-configuration-and-compatibility.md) | 入口可达 | — |
| [shared/bot-population.js](../../shared/bot-population.js) | [战场、兵线、阶段与建筑](02-battlefield-and-waves.md) | 未静态引用 | — |
| [shared/config-migrations.js](../../shared/config-migrations.js) | [配置、迁移与历史兼容](09-configuration-and-compatibility.md) | 未静态引用 | [shared/config.js](../../shared/config.js)、[shared/bot-population.js](../../shared/bot-population.js) |
| [shared/config.js](../../shared/config.js) | [配置、迁移与历史兼容](09-configuration-and-compatibility.md) | 入口可达 | [shared/base-config.js](../../shared/base-config.js) |
| [shared/formation-ranges.js](../../shared/formation-ranges.js) | [战场渲染、单位动作与技能反馈](08-rendering-and-feedback.md) | 未静态引用 | [shared/config.js](../../shared/config.js) |
| [shared/hero-rules.js](../../shared/hero-rules.js) | [伤害、治疗、状态与归属统计](06-combat-and-statistics.md) | 入口可达 | [shared/tower-guard.js](../../shared/tower-guard.js)、[shared/config.js](../../shared/config.js)、[shared/skill-progression.js](../../shared/skill-progression.js)、[shared/attack-cooldown.js](../../shared/attack-cooldown.js)、[shared/skill-value.js](../../shared/skill-value.js)、[shared/skill5-mechanics.js](../../shared/skill5-mechanics.js) |
| [shared/lord-flame-shield.js](../../shared/lord-flame-shield.js) | [五职业技能、共享额度与持续效果](05-skills-and-budget.md) | 入口可达 | [shared/skill-value.js](../../shared/skill-value.js)、[shared/manual-target.js](../../shared/manual-target.js) |
| [shared/manual-target.js](../../shared/manual-target.js) | [自动行动、普攻与手动目标](04-navigation-and-attacks.md) | 入口可达 | — |
| [shared/navigation.js](../../shared/navigation.js) | [自动行动、普攻与手动目标](04-navigation-and-attacks.md) | 入口可达 | [shared/manual-target.js](../../shared/manual-target.js)、[shared/attack-range.js](../../shared/attack-range.js) |
| [shared/protocol.js](../../shared/protocol.js) | 共享规则 | 入口可达 | — |
| [shared/simulation.js](../../shared/simulation.js) | [契约、体力、职业成长与评价](03-contracts-and-progression.md) | 入口可达 | [shared/hero-rules.js](../../shared/hero-rules.js)、[shared/config.js](../../shared/config.js)、[shared/tower-guard.js](../../shared/tower-guard.js)、[shared/skill-progression.js](../../shared/skill-progression.js)、[shared/navigation.js](../../shared/navigation.js)、[shared/manual-target.js](../../shared/manual-target.js)、[shared/attack-range.js](../../shared/attack-range.js)、[shared/troop-population.js](../../shared/troop-population.js) |
| [shared/skill-progression.js](../../shared/skill-progression.js) | [契约、体力、职业成长与评价](03-contracts-and-progression.md) | 入口可达 | — |
| [shared/skill-value.js](../../shared/skill-value.js) | [五职业技能、共享额度与持续效果](05-skills-and-budget.md) | 入口可达 | — |
| [shared/skill4-mechanics.js](../../shared/skill4-mechanics.js) | [五职业技能、共享额度与持续效果](05-skills-and-budget.md) | 入口可达 | [shared/skill-value.js](../../shared/skill-value.js) |
| [shared/skill5-mechanics.js](../../shared/skill5-mechanics.js) | [五职业技能、共享额度与持续效果](05-skills-and-budget.md) | 入口可达 | [shared/skill4-mechanics.js](../../shared/skill4-mechanics.js)、[shared/skill-value.js](../../shared/skill-value.js)、[shared/lord-flame-shield.js](../../shared/lord-flame-shield.js)、[shared/manual-target.js](../../shared/manual-target.js) |
| [shared/tower-guard.js](../../shared/tower-guard.js) | [战场、兵线、阶段与建筑](02-battlefield-and-waves.md) | 入口可达 | — |
| [shared/troop-population.js](../../shared/troop-population.js) | [战场、兵线、阶段与建筑](02-battlefield-and-waves.md) | 入口可达 | — |

## 桌面应用入口

- [client/desktop/main.mjs](../../client/desktop/main.mjs)：原生窗口、菜单、单实例、本地服务生命周期与设置IPC。
- [client/desktop/config.mjs](../../client/desktop/config.mjs)：分发默认地址、个人设置与持久化。
- [client/desktop/settings-preload.cjs](../../client/desktop/settings-preload.cjs)、[settings.html](../../client/desktop/settings.html)、[settings.js](../../client/desktop/settings.js)：隔离的设置窗口。
- [scripts/package-desktop.mjs](../../scripts/package-desktop.mjs)：独立Windows EXE与ZIP打包。
