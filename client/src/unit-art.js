import {HERO_ART,MINION_TYPES,MINION_TEXTURES,heroArtFrame,heroArtPose} from './art-catalog.js';
import {HERO_LAYOUT} from './art-layout.js';
import {MINION_LAYOUT} from './minion-art-layout.js';
import {RANGED_WALK_LAYOUT} from './ranged-walk-layout.js';
import {MELEE_WALK_LAYOUT} from './melee-walk-layout.js';
import {RANGED_WALK_TEXTURES,MELEE_WALK_TEXTURES,WALK_FRAMES,walkFrameIndex} from './walk-animation.js';
const walks={ranged:{textures:RANGED_WALK_TEXTURES,layouts:RANGED_WALK_LAYOUT},melee:{textures:MELEE_WALK_TEXTURES,layouts:MELEE_WALK_LAYOUT}};

// All mobile units use facing; faction chooses appearance, never direction.
export function hasDirectionalArt(u){
  return !u.tower&&(u.hero?!!HERO_ART[u.classId]:Object.hasOwn(MINION_TYPES,u.type));
}
export function directionalUnitArt(u,motion,heading){
  if(!hasDirectionalArt(u))return null;
  if(u.hero)return {texture:'kc-'+HERO_ART[u.classId].key,frame:heroArtFrame(u.classId,heroArtPose(motion),heading),layout:HERO_LAYOUT[u.classId]};
  const side=u.side?1:0,direction=((Math.trunc(heading)||0)%8+8)%8;
  const walk=walks[u.type];
  if(walk&&motion.action==='move'){
    const walkFrame=walkFrameIndex(motion.phase);
    return {texture:walk.textures[side],frame:direction*WALK_FRAMES+walkFrame,walkFrame,layout:walk.layouts[side]};
  }
  return {texture:MINION_TEXTURES[side],frame:MINION_TYPES[u.type]*8+direction,layout:MINION_LAYOUT[side][u.type]};
}
