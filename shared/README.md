# 共享逻辑

客户端和服务端复用配置、战斗模型、技能、成长及版本常量。客户端不推进权威战斗，不能改变服务端伤害、权限和最终状态。

protocol.js 的 SERVER_VERSION 与 CLIENT_VERSION 必须相同且随正式发布一起提升；所有游戏请求严格校验客户端发布号。GAME_VERSION 表示战斗兼容性，PROTOCOL_VERSION 表示接口兼容性，RULESET_REVISION 仅作诊断。客户端不再自动更新，版本不一致时要求退出并手动拉取完整 GitHub 仓库。完整流程见[统一版本约定](../docs/版本发布约定.md)。
