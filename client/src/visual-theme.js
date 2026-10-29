// Presentation only: unit types, class IDs and combat attributes stay unchanged.
const names=[
 {melee:'近战·符石傀儡',ranged:'远程·幽魂弩灵',siege:'攻城·悬浮晶炮'},
 {melee:'近战·晶盾傀儡',ranged:'远程·王庭弩灵',siege:'攻城·紫晶浮炮'}
];
export const troopTitle=unit=>unit.elite?'精英卫士':unit.summoned?'亡灵护卫':names[unit.side][unit.type];
