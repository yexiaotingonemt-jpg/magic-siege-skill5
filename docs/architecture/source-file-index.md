# 全文件代码模块索引

[模块总览](README.md)

覆盖全部`src/`文件及HTTP/账号/房间入口。加载状态通过从`server.mjs`、`src/main.js`递归解析本地静态导入与重新导出来判断；可达只代表文件被加载，不表示每个导出或分支都会执行。未静态引用不等于可以删除。

| 文件 | 主归属模块 | 启动加载状态 | 本地直接依赖 |
|---|---|---|---|
| [server.mjs](../../server.mjs) | [账号、会话与多人同步](01-accounts-and-network.md) | 入口可达 | [accounts.mjs](../../server/accounts.mjs)、[room.mjs](../../server/room.mjs) |
| [server/accounts.mjs](../../server/accounts.mjs) | [账号、会话与多人同步](01-accounts-and-network.md) | 入口可达 | — |
| [server/room.mjs](../../server/room.mjs) | [账号、会话与多人同步](01-accounts-and-network.md) | 入口可达 | [simulation.js](../../src/simulation.js)、[config.js](../../src/config.js) |
| [src/ability-descriptions.js](../../src/ability-descriptions.js) | [界面、技能HUD与交互文案](07-interface-and-skill-hud.md) | 入口可达 | [config.js](../../src/config.js)、[skill-progression.js](../../src/skill-progression.js)、[ability-tags.js](../../src/ability-tags.js)、[skill-value.js](../../src/skill-value.js) |
| [src/ability-summaries.js](../../src/ability-summaries.js) | [界面、技能HUD与交互文案](07-interface-and-skill-hud.md) | 未静态引用 | — |
| [src/ability-tags.js](../../src/ability-tags.js) | [界面、技能HUD与交互文案](07-interface-and-skill-hud.md) | 入口可达 | — |
| [src/attack-cooldown.js](../../src/attack-cooldown.js) | [自动行动、普攻与手动目标](04-navigation-and-attacks.md) | 入口可达 | — |
| [src/attack-range.js](../../src/attack-range.js) | [自动行动、普攻与手动目标](04-navigation-and-attacks.md) | 入口可达 | — |
| [src/backline-ai.js](../../src/backline-ai.js) | [配置、迁移与历史兼容](09-configuration-and-compatibility.md) | 未静态引用 | — |
| [src/base-config.js](../../src/base-config.js) | [配置、迁移与历史兼容](09-configuration-and-compatibility.md) | 入口可达 | — |
| [src/battlefield.js](../../src/battlefield.js) | [战场、兵线、阶段与建筑](02-battlefield-and-waves.md) | 入口可达 | — |
| [src/bot-population.js](../../src/bot-population.js) | [战场、兵线、阶段与建筑](02-battlefield-and-waves.md) | 未静态引用 | — |
| [src/combat-numbers.js](../../src/combat-numbers.js) | [战场渲染、单位动作与技能反馈](08-rendering-and-feedback.md) | 入口可达 | — |
| [src/config-migrations.js](../../src/config-migrations.js) | [配置、迁移与历史兼容](09-configuration-and-compatibility.md) | 未静态引用 | [config.js](../../src/config.js)、[bot-population.js](../../src/bot-population.js) |
| [src/config.js](../../src/config.js) | [配置、迁移与历史兼容](09-configuration-and-compatibility.md) | 入口可达 | [base-config.js](../../src/base-config.js) |
| [src/formation-ranges.js](../../src/formation-ranges.js) | [战场渲染、单位动作与技能反馈](08-rendering-and-feedback.md) | 未静态引用 | [config.js](../../src/config.js) |
| [src/game-layout.js](../../src/game-layout.js) | [界面、技能HUD与交互文案](07-interface-and-skill-hud.md) | 入口可达 | — |
| [src/game-shell.js](../../src/game-shell.js) | [界面、技能HUD与交互文案](07-interface-and-skill-hud.md) | 入口可达 | — |
| [src/hero-action-layout.js](../../src/hero-action-layout.js) | [战场渲染、单位动作与技能反馈](08-rendering-and-feedback.md) | 入口可达 | — |
| [src/hero-names.js](../../src/hero-names.js) | [战场渲染、单位动作与技能反馈](08-rendering-and-feedback.md) | 入口可达 | — |
| [src/hero-rules.js](../../src/hero-rules.js) | [伤害、治疗、状态与归属统计](06-combat-and-statistics.md) | 入口可达 | [tower-guard.js](../../src/tower-guard.js)、[config.js](../../src/config.js)、[skill-progression.js](../../src/skill-progression.js)、[attack-cooldown.js](../../src/attack-cooldown.js)、[skill-value.js](../../src/skill-value.js)、[skill5-mechanics.js](../../src/skill5-mechanics.js) |
| [src/kc-layout.css](../../src/kc-layout.css) | [界面、技能HUD与交互文案](07-interface-and-skill-hud.md) | 入口可达 | — |
| [src/legacy-descriptions.js](../../src/legacy-descriptions.js) | [配置、迁移与历史兼容](09-configuration-and-compatibility.md) | 未静态引用 | [config.js](../../src/config.js)、[skill-progression.js](../../src/skill-progression.js)、[ability-tags.js](../../src/ability-tags.js)、[skill-value.js](../../src/skill-value.js) |
| [src/legacy-match3.css](../../src/legacy-match3.css) | [配置、迁移与历史兼容](09-configuration-and-compatibility.md) | 未静态引用 | — |
| [src/legacy-match3.js](../../src/legacy-match3.js) | [配置、迁移与历史兼容](09-configuration-and-compatibility.md) | 未静态引用 | [style.css](../../src/style.css) |
| [src/lord-flame-shield.js](../../src/lord-flame-shield.js) | [五职业技能、共享额度与持续效果](05-skills-and-budget.md) | 入口可达 | [skill-value.js](../../src/skill-value.js)、[manual-target.js](../../src/manual-target.js) |
| [src/main.js](../../src/main.js) | [界面、技能HUD与交互文案](07-interface-and-skill-hud.md) | 入口可达 | [style.css](../../src/style.css)、[kc-layout.css](../../src/kc-layout.css)、[multiplayer.css](../../src/multiplayer.css)、[game-shell.js](../../src/game-shell.js)、[game-layout.js](../../src/game-layout.js)、[config.js](../../src/config.js)、[renderer.js](../../src/renderer.js)、[selection.js](../../src/selection.js)、[visual-theme.js](../../src/visual-theme.js)、[skill-hud.js](../../src/skill-hud.js)、[ability-descriptions.js](../../src/ability-descriptions.js)、[network.js](../../src/network.js)、[skill-value.js](../../src/skill-value.js) |
| [src/manual-target.js](../../src/manual-target.js) | [自动行动、普攻与手动目标](04-navigation-and-attacks.md) | 入口可达 | — |
| [src/multiplayer.css](../../src/multiplayer.css) | [界面、技能HUD与交互文案](07-interface-and-skill-hud.md) | 入口可达 | — |
| [src/navigation.js](../../src/navigation.js) | [自动行动、普攻与手动目标](04-navigation-and-attacks.md) | 入口可达 | [manual-target.js](../../src/manual-target.js)、[attack-range.js](../../src/attack-range.js) |
| [src/network.js](../../src/network.js) | [账号、会话与多人同步](01-accounts-and-network.md) | 入口可达 | [simulation.js](../../src/simulation.js) |
| [src/premium-vfx.js](../../src/premium-vfx.js) | [战场渲染、单位动作与技能反馈](08-rendering-and-feedback.md) | 入口可达 | [config.js](../../src/config.js)、[skill-value.js](../../src/skill-value.js)、[vfx-profiles.js](../../src/vfx-profiles.js)、[vfx-brushes.js](../../src/vfx-brushes.js) |
| [src/renderer.js](../../src/renderer.js) | [战场渲染、单位动作与技能反馈](08-rendering-and-feedback.md) | 入口可达 | [hero-action-layout.js](../../src/hero-action-layout.js)、[premium-vfx.js](../../src/premium-vfx.js)、[unit-hit.js](../../src/unit-hit.js)、[battlefield.js](../../src/battlefield.js)、[target-halos.js](../../src/target-halos.js)、[tower-guard-visual.js](../../src/tower-guard-visual.js)、[status-icons.js](../../src/status-icons.js)、[combat-numbers.js](../../src/combat-numbers.js)、[unit-motion-view.js](../../src/unit-motion-view.js)、[hero-names.js](../../src/hero-names.js) |
| [src/selection.js](../../src/selection.js) | [契约、体力、职业成长与评价](03-contracts-and-progression.md) | 入口可达 | [config.js](../../src/config.js)、[visual-theme.js](../../src/visual-theme.js)、[battlefield.js](../../src/battlefield.js)、[manual-target.js](../../src/manual-target.js) |
| [src/simulation.js](../../src/simulation.js) | [契约、体力、职业成长与评价](03-contracts-and-progression.md) | 入口可达 | [hero-rules.js](../../src/hero-rules.js)、[config.js](../../src/config.js)、[tower-guard.js](../../src/tower-guard.js)、[skill-progression.js](../../src/skill-progression.js)、[navigation.js](../../src/navigation.js)、[manual-target.js](../../src/manual-target.js)、[attack-range.js](../../src/attack-range.js)、[troop-population.js](../../src/troop-population.js) |
| [src/skill-animation.js](../../src/skill-animation.js) | [战场渲染、单位动作与技能反馈](08-rendering-and-feedback.md) | 未静态引用 | [config.js](../../src/config.js) |
| [src/skill-hud.js](../../src/skill-hud.js) | [界面、技能HUD与交互文案](07-interface-and-skill-hud.md) | 入口可达 | [config.js](../../src/config.js)、[ability-descriptions.js](../../src/ability-descriptions.js)、[skill-progression.js](../../src/skill-progression.js) |
| [src/skill-progression.js](../../src/skill-progression.js) | [契约、体力、职业成长与评价](03-contracts-and-progression.md) | 入口可达 | — |
| [src/skill-range-upgrade.js](../../src/skill-range-upgrade.js) | [配置、迁移与历史兼容](09-configuration-and-compatibility.md) | 未静态引用 | — |
| [src/skill-value.js](../../src/skill-value.js) | [五职业技能、共享额度与持续效果](05-skills-and-budget.md) | 入口可达 | — |
| [src/skill3-visuals.js](../../src/skill3-visuals.js) | [战场渲染、单位动作与技能反馈](08-rendering-and-feedback.md) | 未静态引用 | [config.js](../../src/config.js) |
| [src/skill4-mechanics.js](../../src/skill4-mechanics.js) | [五职业技能、共享额度与持续效果](05-skills-and-budget.md) | 入口可达 | [skill-value.js](../../src/skill-value.js) |
| [src/skill5-mechanics.js](../../src/skill5-mechanics.js) | [五职业技能、共享额度与持续效果](05-skills-and-budget.md) | 入口可达 | [skill4-mechanics.js](../../src/skill4-mechanics.js)、[skill-value.js](../../src/skill-value.js)、[lord-flame-shield.js](../../src/lord-flame-shield.js)、[manual-target.js](../../src/manual-target.js) |
| [src/status-icons.js](../../src/status-icons.js) | [战场渲染、单位动作与技能反馈](08-rendering-and-feedback.md) | 入口可达 | [unit-status.js](../../src/unit-status.js) |
| [src/style.css](../../src/style.css) | [界面、技能HUD与交互文案](07-interface-and-skill-hud.md) | 入口可达 | — |
| [src/target-halos.js](../../src/target-halos.js) | [战场渲染、单位动作与技能反馈](08-rendering-and-feedback.md) | 入口可达 | [manual-target.js](../../src/manual-target.js) |
| [src/tower-guard-visual.js](../../src/tower-guard-visual.js) | [战场、兵线、阶段与建筑](02-battlefield-and-waves.md) | 入口可达 | [tower-guard.js](../../src/tower-guard.js) |
| [src/tower-guard.js](../../src/tower-guard.js) | [战场、兵线、阶段与建筑](02-battlefield-and-waves.md) | 入口可达 | — |
| [src/troop-population.js](../../src/troop-population.js) | [战场、兵线、阶段与建筑](02-battlefield-and-waves.md) | 入口可达 | — |
| [src/unit-hit.js](../../src/unit-hit.js) | [战场渲染、单位动作与技能反馈](08-rendering-and-feedback.md) | 入口可达 | — |
| [src/unit-motion-view.js](../../src/unit-motion-view.js) | [战场渲染、单位动作与技能反馈](08-rendering-and-feedback.md) | 入口可达 | [unit-motion.js](../../src/unit-motion.js) |
| [src/unit-motion.js](../../src/unit-motion.js) | [战场渲染、单位动作与技能反馈](08-rendering-and-feedback.md) | 入口可达 | [attack-range.js](../../src/attack-range.js) |
| [src/unit-status.js](../../src/unit-status.js) | [战场渲染、单位动作与技能反馈](08-rendering-and-feedback.md) | 入口可达 | [skill-value.js](../../src/skill-value.js)、[tower-guard.js](../../src/tower-guard.js) |
| [src/vfx-brushes.js](../../src/vfx-brushes.js) | [战场渲染、单位动作与技能反馈](08-rendering-and-feedback.md) | 入口可达 | — |
| [src/vfx-profiles.js](../../src/vfx-profiles.js) | [战场渲染、单位动作与技能反馈](08-rendering-and-feedback.md) | 入口可达 | — |
| [src/visual-theme.js](../../src/visual-theme.js) | [界面、技能HUD与交互文案](07-interface-and-skill-hud.md) | 入口可达 | — |

## 资源与外围入口

| 目录/文件 | 用途 |
|---|---|
| [public/art](../../public/art) | 运行所需图集与特效素材，随源码提交。 |
| [tests](../../tests) | 模型、HTTP及浏览器测试。 |
| [scripts](../../scripts) | 专项验收、历史审计与素材处理；部分需要本地输入。 |
| [package.json](../../package.json) | 安装依赖与运行命令。 |
| [vite.config.js](../../vite.config.js) | 构建及Phaser分包。 |
| [playwright.config.js](../../playwright.config.js) | 5194隔离验收与本机Chrome路径。 |
| [start.mjs](../../start.mjs) | Windows启动器、已有服务检查及日志。 |
