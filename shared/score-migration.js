import {isCurrentDesign,currentContributionParts} from './current-design.js';

// Rebase retained actors before switching coefficients. Earned points stay fixed;
// later events use the new coefficients, including projectiles from a dead hero.
export function planScoreMigration(sim,nextConfig){
 if(!isCurrentDesign(sim.config)||!isCurrentDesign(nextConfig))return [];
 const actors=new Set([
  ...sim.units,
  ...sim.projectiles.map(p=>p.source),
  ...sim.fields.map(f=>f.owner),
  ...sim.summonOwners.values(),
  ...[...sim.units,...sim.towers].map(u=>u.shieldSource),
 ]),changes=[];
 for(const actor of actors){
  if(!actor?.hero||!actor.stats)continue;
  const before=sim.config.design.scoreCoefficients[actor.classId],after=nextConfig.design.scoreCoefficients[actor.classId];
  if(!before||!after||['a','b','c'].every(key=>before[key]===after[key]))continue;
  changes.push({actor,hadBase:Object.hasOwn(actor,'currentScoreBase'),before:actor.currentScoreBase,
   after:Object.fromEntries(currentContributionParts(sim.config,actor).map(p=>[p.key,{value:p.value,points:p.points}]))});
 }
 return changes;
}
