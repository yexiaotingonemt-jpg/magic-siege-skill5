export const WALK_FRAMES=8;
// Time runs across columns; facing runs down rows, as with the troop cycles.
export const HERO_WALK_ART={
  0:{texture:'kc-orc-walk',file:'orc-walk.png'},
  2:{texture:'kc-chariot-walk',file:'chariot-walk.png'},
  3:{texture:'kc-lord-walk',file:'lord-walk-grounded.png'},
  4:{texture:'kc-mage-walk',file:'mage-walk.png'},
  5:{texture:'kc-elf-walk',file:'elf-walk.png'},
};
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
