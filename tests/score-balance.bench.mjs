// Permanent engine benchmark; generated reports belong outside the repository.
import {Simulation} from '../shared/simulation.js';
import {defaults,legacyLiveConfig as liveConfig,classes,contractType,names} from '../shared/config.js';
import {prepareChoice,rarityAt} from '../shared/traits.js';
import {contributionParts} from '../shared/contribution-score.js';
import {writeFileSync,mkdirSync} from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {SCORE_COEFFICIENTS} from '../shared/contribution-score.js';
import {pathToFileURL} from 'node:url';
const ids=[0,2,3,4,5];
export function run(id,level,mask,focus='hero',build='base',duration=60,options={}){
 const s=new Simulation(process.argv.includes('--legacy')?defaults:liveConfig(),987654);s.units=[];s.players=[];s.logs=[];s.reports=[];s.waveAt=1e9;s.spawnWave=()=>{};s.addXp=()=>{};
 for(const t of s.towers){t.y=1000;t.cd=Infinity;t.speed=0;}
 const side=id===3?1:0,p=s.makePlayer(side,false);p.classId=id;p.level=level;p.stamina=10000;
 if(build!=='base')for(let l=2;l<=level;l++){p.progress[id].choices.push({level:l,rarity:rarityAt(l)});const choice=prepareChoice(s,p,id);if(!s.chooseTrait(choice.options[0],l,p,id))throw Error('Invalid trait build');}
 const recruit=(player,x,y)=>{const u=s.spawn(player.side,contractType(player.classId),0,1);u.x=x;u.y=y;if(!s.contract(player,u.id))throw Error('Contract failed');return s.hero(player);};
 const h=recruit(p,0,-10),traits={...p.progress[id].traits};h.auto=false;const contractSpent=p.staminaSpent;
 const enemyPlayer=s.makePlayer(1-side,false);enemyPlayer.classId=side?0:3;enemyPlayer.level=level;enemyPlayer.stamina=10000;
 let enemyHero;
 const friends=Array.from({length:4},(_,i)=>{const u=s.spawn(side,'melee',0,1);Object.assign(u,{x:(i-1.5)*.6,y:-9.5,hp:1000,speed:0,cd:Infinity});return u;});
 let minions=[];let casts=[0,0,0,0],castCosts=[0,0,0,0],failed={},hpFloor=Infinity;
 const nextAt=[0,.8,1.6,2.4];
 const fill=()=>{
  if(!enemyHero||enemyHero.hp<=0){enemyHero=recruit(enemyPlayer,h.x+1,h.y+1);Object.assign(enemyHero,{speed:0,cd:Infinity});}
  minions=minions.filter(u=>u.hp>0);
  while(minions.length<3){const u=s.spawn(1-side,'melee',0,1);Object.assign(u,{x:h.x+(minions.length-1)*.7,y:h.y+1.2,speed:0,cd:Infinity});minions.push(u);}
 };
 const dt=.05,incoming=h.maxHp*(id===0||id===3?1:.25)/60;
 for(let step=0;step<duration/dt;step++){
  fill();
  const target=focus==='hero'?enemyHero:minions[0]||enemyHero;
  for(const f of friends){f.hp=Math.max(1,f.hp-200*dt);f.targetId=target.id;if(step%200===0)s.debuff(f,enemyHero,'moveSlow',.2,8);}
  enemyHero.targetId=friends[0].id;enemyHero.manualTargetId=friends[0].id;
  // External healing has no player attribution; it holds exposure constant so
  // the benchmark measures accounting incentives, not different survival times.
  s.heal(h,incoming*dt,null);s.damage(enemyHero,h,incoming*dt);
  hpFloor=Math.min(hpFloor,h.hp);
  if(step%20===0)for(const f of friends)if(enemyHero.hp>0)s.damage(f,enemyHero,100);
  for(const i of [3,2,1,0])if(mask&(1<<i)){
   if(options.counts&&(casts[i]>=options.counts[i]||s.time+1e-7<nextAt[i]))continue;
   const friendly=(id===0&&(i===1||i===2))||(id===5&&i>=1);
   s.setManualTarget(friendly?friends[0].id:target.id,p);
   const plan=s.castPlan(i,p);
   if(plan.ok){if(s.cast(i,p)){casts[i]++;castCosts[i]+=plan.s.cost;if(options.counts)nextAt[i]+=duration/options.counts[i];break;}}
   else failed[plan.code]=(failed[plan.code]||0)+1;
  }
  if(!mask)s.setManualTarget(target.id,p);
  s.tick(dt);
  if(h.hp<=0)throw Error(`Exposure fixture killed ${classes[id]}`);
 }
 const points=p.totalPoints,spent=p.staminaSpent;
 return {id,name:classes[id],level,mask,policy:mask?Array.from({length:4},(_,i)=>mask&(1<<i)?String(i+1):'').filter(Boolean).join('+'):'不施法',focus,build,duration,casts,castCosts,contractSpent,spent,points,kda:points/spent,pointsPerSecond:points/duration,combatPoints:points-100*spent,combatPerSecond:(points-100*spent)/duration,stats:{...h.stats},parts:contributionParts(h,s.config),traits,hpFloor,failed};
}

export function audit(){
 const medium=[],high=[],failures=[];
 for(const build of ['base','draft'])for(const focus of ['hero','minion'])for(const level of [5,20,40])for(const id of ids){
  for(const mask of [0,1,2,4,8,15])medium.push(run(id,level,mask,focus,build,60,{counts:[8,3,2,1]}));
  for(const mask of [1,2,4,8])high.push(run(id,level,mask,focus,build));
 }
 for(const r of [...medium,...high]){
  assert.equal(r.spent,r.contractSpent+r.castCosts.reduce((s,n)=>s+n,0));
  assert.ok(Math.abs(r.parts.reduce((s,p)=>s+p.points,0)-r.points)<1e-6,'score ledger mismatch');
  assert.ok(r.hpFloor>0);for(let i=0;i<4;i++)if(!(r.mask&(1<<i)))assert.equal(r.casts[i],0);
 }
 const groups=[],policies=[];
 for(const build of ['base','draft'])for(const focus of ['hero','minion'])for(const level of [5,20,40]){
  const full=medium.filter(r=>r.build===build&&r.focus===focus&&r.level===level&&r.mask===15),pointMean=full.reduce((s,r)=>s+r.points,0)/full.length,kdaMean=full.reduce((s,r)=>s+r.kda,0)/full.length;
  const members=full.map(r=>({...r,pointDeviation:r.points/pointMean-1,kdaDeviation:r.kda/kdaMean-1,takenShare:r.parts.find(p=>p.key==='damageTaken').points/r.points}));
  const pointMax=Math.max(...members.map(r=>Math.abs(r.pointDeviation))),kdaMax=Math.max(...members.map(r=>Math.abs(r.kdaDeviation))),standard=build==='base'&&focus==='hero';
  groups.push({build,focus,level,standard,pointMean,kdaMean,pointMax,kdaMax,members});
  if(standard&&(pointMax>.1||kdaMax>.1))failures.push(`${level}级标准总分/KDA超±10%`);
  for(const r of members){
   if(r.takenShare>=.2)failures.push(`${r.name}/${build}/${focus}/${level}承伤占比不小于20%`);
   if(standard&&r.casts.some((n,i)=>n!==[8,3,2,1][i]))failures.push(`${r.name}/${level}中频次数未完成，须检查新技能机会条件`);
   const same=v=>v.id===r.id&&v.level===level&&v.build===build&&v.focus===focus;
   const idle=medium.find(v=>same(v)&&v.mask===0),solo=medium.filter(v=>same(v)&&[1,2,4,8].includes(v.mask)).sort((a,b)=>b.kda-a.kda)[0],fast=high.filter(same).sort((a,b)=>b.kda-a.kda)[0];
   const compare=v=>({policy:v.policy,skill:v.mask===0?null:names[v.id][Math.log2(v.mask)],casts:v.casts,spent:v.spent,points:v.points,kda:v.kda,kdaChange:v.kda/r.kda-1,pointRatio:v.points/r.points});
   policies.push({name:r.name,id:r.id,level,build,focus,normal:compare(r),idle:compare(idle),solo:compare(solo),high:compare(fast),expectedOrder:idle.kda>=solo.kda&&solo.kda>=r.kda,mediumTotalOrder:r.points>solo.points&&r.points>idle.points,highSoloTotalHigher:fast.points>r.points});
  }
 }
 return {schema:1,config:process.argv.includes('--legacy')?defaults:liveConfig(),coefficients:SCORE_COEFFICIENTS,failures,standardPassed:failures.length===0,scope:'无词条英雄优先三个标准节点；其他场景与三策略必须另读未达项',policyOrderUnmet:policies.filter(p=>!p.expectedOrder).length,mediumTotalOrderUnmet:policies.filter(p=>!p.mediumTotalOrder).length,highSoloTotalHigher:policies.filter(p=>p.highSoloTotalHigher).length,groups,policies,medium,high};
}

function markdown(data){
 const f=n=>n.toFixed(2),pct=n=>(n>=0?'+':'')+f(n*100)+'%',table=(h,rs)=>'| '+h.join(' | ')+' |\n|'+h.map(()=> '---').join('|')+'|\n'+rs.map(r=>'| '+r.join(' | ')+' |').join('\n')+'\n';
 let text='# 技能与积分同步校准\n\n'+`标准门禁：${data.standardPassed?'通过':'未通过'}。${data.scope}。\n\n`;
 text+=`共${data.medium.length+data.high.length}组引擎实验；KDA期望顺序未满足${data.policyOrderUnmet}组，中频正常总分优势未满足${data.mediumTotalOrderUnmet}组，高频单技能总分超过中频正常${data.highSoloTotalHigher}组。退出0不代表这些未达项已解决。\n\n`;
 for(const g of data.groups){text+=`## ${g.build}/${g.focus}/${g.level}级${g.standard?'（标准）':''}\n\n`+table(['职业','总分','实际体力','KDA','总分偏差','KDA偏差','承伤占比'],g.members.map(r=>[r.name,f(r.points),r.spent,f(r.kda),pct(r.pointDeviation),pct(r.kdaDeviation),f(r.takenShare*100)+'%']))+'\n';
  const policies=data.policies.filter(p=>p.build===g.build&&p.focus===g.focus&&p.level===g.level);
  text+=table(['职业','①总分/KDA/效率变化/占正常总分','②技能/次数/体力/总分/KDA/效率变化/占正常总分','③总分/KDA','高频单技能总分/KDA/效率变化/占正常总分'],policies.map(p=>[p.name,`${f(p.idle.points)}/${f(p.idle.kda)}/${pct(p.idle.kdaChange)}/${f(p.idle.pointRatio*100)}%`,`${p.solo.skill}/${p.solo.casts.reduce((s,n)=>s+n,0)}/${p.solo.spent}/${f(p.solo.points)}/${f(p.solo.kda)}/${pct(p.solo.kdaChange)}/${f(p.solo.pointRatio*100)}%`,`${f(p.normal.points)}/${f(p.normal.kda)}`,`${p.high.skill}/${f(p.high.points)}/${f(p.high.kda)}/${pct(p.high.kdaChange)}/${f(p.high.pointRatio*100)}%`]))+'\n';
 }
 text+='## 失败项\n\n'+(data.failures.length?data.failures.map(s=>'- '+s).join('\n'):'标准硬门禁无失败；仍须检查上面的敏感性与三策略未达项。')+'\n';return text;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const arg=process.argv.indexOf('--out');
 const out=arg>=0?process.argv[arg+1]:process.env.MAGIC_BALANCE_OUTPUT_DIR||(process.platform==='win32'?'E:/Codex/Support/魔法王座/outputs/score-balance':null);
 if(!out||!path.isAbsolute(out))throw Error('请用 --out 指定项目辅助目录的绝对路径');
 mkdirSync(out,{recursive:true});const result=audit();
 writeFileSync(path.join(out,'balance.json'),JSON.stringify(result,null,2)+'\n');writeFileSync(path.join(out,'balance.md'),markdown(result));
 console.log(JSON.stringify({standardPassed:result.standardPassed,failures:result.failures,policyOrderUnmet:result.policyOrderUnmet,mediumTotalOrderUnmet:result.mediumTotalOrderUnmet,highSoloTotalHigher:result.highSoloTotalHigher,output:path.resolve(out)},null,2));
 if(!result.standardPassed)process.exitCode=1;
}
