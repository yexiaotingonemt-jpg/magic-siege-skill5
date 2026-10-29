# 共享逻辑

这里保存客户端和服务端复用的配置、战斗模型、技能计算、目标选择、成长与协议常量。仅使用标准JavaScript，不导入 `client/`、`server/`、Phaser、DOM或Node.js专用模块。

服务端通过 `Simulation.tick` 推进权威战斗。客户端复用模型用于快照读取、技能条件和说明展示，不运行权威战斗循环。客户端修改本地文件不能改变服务器上的伤害、权限或最终状态。

`protocol.js` 分别定义 `CLIENT_VERSION`（客户端发布版本，控制自动更新）与 `GAME_VERSION`（战斗兼容版本，两端必须一致）。客户端和服务器发布号统一提升；战斗不兼容时同时提升GAME_VERSION，命令或快照不兼容时提升PROTOCOL_VERSION。正式要求以docs/版本发布约定.md为准。构建和打包不自动递增。

`PROTOCOL_VERSION` 是底层接口结构的兼容标记，不兼容的API、命令或快照变化时另外递增。`RULESET_REVISION` 仅用于诊断。`update-protocol.js` 定义纯JS更新清单格式、规范化签名内容与内置发布公钥，不包含私钥或Node依赖。完整规则见[版本说明](../README.md#版本限制)。
