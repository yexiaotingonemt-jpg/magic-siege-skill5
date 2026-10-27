// Movement, resolved basic attacks and their visual pose must share one boundary.
// The tolerance only absorbs floating-point error at the configured range.
export const ATTACK_RANGE_EPSILON=1e-7;
export const inAttackRange=(attacker,target)=>!!attacker&&!!target&&Math.hypot(attacker.x-target.x,attacker.y-target.y)<=attacker.range+ATTACK_RANGE_EPSILON;
