// Runtime assets share one pose order and one registration point.
// Each 192×256 cell places the feet at (96, 240).
export const ART_VERSION='kc-final-20261027';
export const HERO_CELL={width:192,height:256,footX:96,footY:240};
export const HERO_ART={
  0:{key:'orc',row:0},
  2:{key:'chariot',row:1},
  3:{key:'lord',row:2},
  4:{key:'mage',row:3},
  5:{key:'elf',row:4},
};
export const ART_ROOT='/art/kc-final';
export const MINION_CELL={width:128,height:160,footX:64,footY:150};
export const MINION_TYPES={melee:0,ranged:1,siege:2};
export const MINION_TEXTURES=['kc-minions-attack','kc-minions-defense'];
export const MINION_FILES=['minions-attack.png','minions-defense.png'];
export function heroArtFrame(classId,pose=0,heading=0){
  const art=HERO_ART[classId];
  return art?Math.max(0,Math.min(3,Math.trunc(pose)||0))*8+((Math.trunc(heading)||0)%8+8)%8:null;
}
export function heroArtPose(motion){
  if(['skill','channel','dash'].includes(motion.action))return 3;
  if(['attack','recover'].includes(motion.action))return 2;
  if(motion.action==='move')return 1;
  return 0;
}
export function heroPortrait(classId){
  const art=HERO_ART[classId];
  return art?`${ART_ROOT}/portrait-${art.key}.webp`:null;
}

export const unitBarOffset=u=>u.tower?44:u.hero?(u.classId===3?86:HERO_ART[u.classId]?46:39):27;

export const skillArtIndex=(id,i)=>id===2&&i>=2?5-i:id===4&&(i===1||i===2)?3-i:i;
