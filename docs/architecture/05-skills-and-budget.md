# 技能、词条与效果结算

shared/hero-rules.js处理施法验证、费用、快照、伤害、治疗与状态。shared/skill5-mechanics.js实现五职业20技能及持续效果；shared/traits.js提供90类词条目录、库存与候选、运行参数；shared/trait-effects.js处理派生、击杀与精英奖励。

shared/skill-value.js是诊断账本，新施法limit为null，不截断公共收益。明确的目标数、跳数、时长与护盾/蓄伤上限仍在各技能局部执行。shared/skill4-mechanics.js保留历史辅助函数，不作为本轮技能的权威规则。

server/room.mjs仅为当前认证玩家处理chooseTrait指令，并通过SSE同步队列、已选次数与精英奖励。客户端选卡界面不决定候选和结算。具体规则见[升级词条与精英兵](../rules/15-traits-and-elites.md)，专项回归为tests/traits.test.js及tests/traits.spec.js。
