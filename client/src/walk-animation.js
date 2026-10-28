export const WALK_FRAMES=8;
export const RANGED_WALK_FILES=['arbalest-walk-attack.png','arbalest-walk-defense.png'];
export const RANGED_WALK_TEXTURES=['kc-arbalest-walk-attack','kc-arbalest-walk-defense'];
export const MELEE_WALK_FILES=['infantry-walk-attack.png','infantry-walk-defense.png'];
export const MELEE_WALK_TEXTURES=['kc-infantry-walk-attack','kc-infantry-walk-defense'];
export const WALK_FILES=[...RANGED_WALK_FILES,...MELEE_WALK_FILES];
export const WALK_TEXTURES=[...RANGED_WALK_TEXTURES,...MELEE_WALK_TEXTURES];
export function walkFrameIndex(phase){
  if(!Number.isFinite(phase))return 0;
  const cycle=((phase/(Math.PI*2))%1+1)%1;
  return Math.min(WALK_FRAMES-1,Math.floor(cycle*WALK_FRAMES));
}
