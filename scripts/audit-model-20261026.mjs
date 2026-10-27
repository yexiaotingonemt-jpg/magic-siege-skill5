import fs from 'node:fs';
import {performance} from 'node:perf_hooks';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {defaults,clone,contractType,validateConfig} from '../src/config.js';
import {Room} from '../server/room.mjs';
import {describeAbilities} from '../src/ability-descriptions.js';
const dir='evidence/audit-20261026'; fs.mkdirSync(dir,{recursive:true});
const results=[];
function check(name,fn){try{const evidence=fn();results.push({name,status:'PASS',evidence});}catch(e){results.push({name,status:'FAIL',error:e.message,stack:e.stack});}}
export function advance(s,seconds){const end=s.time+seconds;while(s.time<end-1e-8)s.tick(Math.min(.05,end-s.time));}
export function arena(id,rank=1){
 const s=new Simulation();s.units=[];s.player.retired=true;s.waveAt=1e9;for(const t of s.towers)t.x=100;
 function make(cid,x,y){const p=s.makePlayer(cid===3?1:0,false);p.classId=cid;p.level=12;p.builds[cid]=[rank,rank,rank,Math.min(3,rank)];p.stamina=100;
  const h=s.spawn(p.side,contractType(cid),0,1,x);assert.ok(s.contract(p,h.id));Object.assign(h,{x,y,cd:1e9,speed:0});return {p,h};}
 const {p,h}=make(id,0,0);s.localPlayerId=p.id;const {h:e}=make(id===3?0:3,0,3);e.hp=e.maxHp=1e7;
 const allies=[make(id===3?3:0,2,0).h,make(id===3?3:4,-2,0).h];for(const u of allies)u.hp=u.maxHp*.4;e.targetId=allies[0].id;
 return {s,p,h,e,allies,make};
}
const approx=(a,b)=>assert.ok(Math.abs(a-b)<1e-5,`${a} != ${b}`);
for(const id of [0,2,3,4,5])for(let skill=0;skill<4;skill++){
 check(`class${id}/skill${skill+1}/lock-stamina-cooldown-interrupt`,()=>{
  const {s,p,h,e,allies}=arena(id);if(id===5&&skill===2)s.debuff(allies[0],e,'attackDown',.2,10);
  const rank=p.builds[id][skill];p.builds[id][skill]=0;assert.equal(s.castPlan(skill).code,'locked');p.builds[id][skill]=rank;
  const cost=s.config.heroes[id].skills[skill].cost;p.stamina=cost-.01;assert.equal(s.castPlan(skill).code,'stamina');p.stamina=97;
  h.stunUntil=1;assert.equal(s.castPlan(skill).code,'stunned');h.stunUntil=0;
  const before=e.hp;assert.ok(s.cast(skill),s.notice);assert.equal(p.stamina,97-cost);assert.equal(s.castPlan(skill).code,'casting');
  advance(s,.1);approx(e.hp,before);s.stun(h,e,.5);advance(s,1);
  assert.equal(s.animations.filter(a=>a.kind==='release'&&a.sourceId===h.id).length,0);assert.ok(p.cd[skill]>s.time);assert.equal(s.castPlan(skill).code,'cooldown');
  return {cost,spent:97-p.stamina,cooldown:p.cd[skill],targetHpUnchanged:e.hp===before};
 });
}
check('rune barrage: four shot cycles, fixed after release, reaches 3 slow layers before cap',()=>{
 const {s,h,e}=arena(2);s.cast(2);advance(s,.4);const location={...s.fields.find(f=>f.kind==='runeBarrage')};advance(s,.8);const first=s.activeDebuffs(e,'moveSlow')[0];assert.equal(first.stacks,1);
 advance(s,.75);assert.equal(s.activeDebuffs(e,'moveSlow')[0].stacks,2);advance(s,.75);assert.equal(s.activeDebuffs(e,'moveSlow')[0].stacks,3);
 advance(s,.75);const value=s.skillValues.at(-1);return {location:{x:location.x,y:location.y},remaining:s.fields.find(f=>f.kind==='runeBarrage')?.remaining,spent:value.spent,parts:value.parts,slow:s.activeDebuffs(e,'moveSlow')[0],hpLost:1e7-e.hp,attack:h.attack};
});
check('rune barrage: pre-cast selected ground remains fixed during windup',()=>{
 const {s,e}=arena(2);s.cast(2);const expected={x:e.x,y:e.y};e.y=7;advance(s,.4);const f=s.fields.find(f=>f.kind==='runeBarrage');assert.deepEqual({x:f.x,y:f.y},expected);return {expected,actual:{x:f.x,y:f.y}};
});
check('rune barrage: cancel after shot 1 cancels all later shots and allows actions after stun',()=>{
 const {s,h,e,p}=arena(2);s.cast(2);advance(s,1.15);const hp=e.hp;assert.ok(h.channelUntil>s.time);s.stun(h,e,.2);advance(s,3);approx(e.hp,hp);assert.equal(s.fields.some(f=>f.kind==='runeBarrage'),false);p.cd[0]=0;assert.ok(s.castPlan(0).ok);return {lost:1e7-e.hp};
});
check('rune barrage: late targets receive equal promised shot damage within budget',()=>{
 const {s,h,e}=arena(2);const extra=[s.spawn(1,'melee',0,1,1),s.spawn(1,'melee',0,1,-1)];for(const u of extra)Object.assign(u,{y:3,hp:1e7,maxHp:1e7,cd:1e9,speed:0});s.cast(2);advance(s,3.5);
 const losses=[e,...extra].map(u=>(1e7-u.hp)/h.attack*100);const value=s.skillValues.at(-1);assert.ok(losses.every(v=>Math.abs(v-720)<1e-5),JSON.stringify({losses,value}));return {losses,value};
});
check('orc stored damage includes shield absorption and forms bounded shield, expires',()=>{
 const {s,h,e}=arena(0);s.shield(h,300,h,20);s.cast(3);advance(s,.4);s.damage(e,h,500);approx(h.damageStore.total,500);const hp=h.hp;advance(s,5);approx(h.shield,500);s.damage(e,h,100);approx(h.hp,hp);approx(h.shield,400);advance(s,8.1);approx(h.shield,0);return {stored:500,hp};
});
check('elf link: both directions, no recursion, exhausted cap, death and cleanse',()=>{
 const {s,h,e}=arena(5);s.cast(1);advance(s,.4);const t=s.get(h.linkId);h.hp=h.maxHp*.2;t.hp=t.maxHp*.2;let before=t.hp;s.heal(h,100,h);approx(t.hp-before,100);before=h.hp;s.heal(t,100,h);approx(h.hp-before,100);
 const f=s.fields.find(f=>f.kind==='link');s.heal(t,1e6,h);assert.ok(f.value.spent<=f.value.limit+1e-5);s.damage(e,t,1e9);advance(s,.1);assert.equal(s.fields.some(f=>f.kind==='link'),false);return {limit:f.value.limit,spent:f.value.spent};
});
check('lord dash: source farthest target, dead destination, immune target stays, unique hits',()=>{
 const {s,h,e}=arena(3);e.y=10;const near=s.spawn(0,'melee',0,1,0);Object.assign(near,{y:5,hp:1e6,maxHp:1e6,speed:0,cd:1e9,immuneUntil:10});assert.equal(s.castPlan(1).t.id,e.id);s.cast(1);advance(s,.6);approx(h.y,0);s.damage(null,e,1e9);advance(s,1.1);approx(h.y,10);approx(near.x,0);approx(1e6-near.hp,h.attack*1.2);return {end:h.y,immuneX:near.x,damage:1e6-near.hp};
});
check('lord energy: overheal does not defer heal; remainder survives hero kill',()=>{
 const {s,h,e}=arena(3);for(let i=0;i<3;i++)s.damage(h,s.spawn(0,'melee',0,1,9),1e9);assert.equal(h.energy,3);h.hp=h.maxHp*.5;s.damage(h,e,1e9);assert.equal(h.energy,3);approx(h.hp/h.maxHp,.54);return {energy:h.energy,hpRatio:h.hp/h.maxHp};
});
check('fire ult selects absolute lowest HP, consumes 5 heat and hits 3',()=>{
 const {s,h,e}=arena(4);h.heat=5;h.heatUntil=100;const es=[e,...Array.from({length:3},(_,i)=>s.spawn(1,'melee',i,3,i))];es.forEach((u,i)=>Object.assign(u,{y:4,hp:5000+i*1000,maxHp:1e7,speed:0,cd:1e9}));const expected=es.slice(0,3).map(u=>u.id);assert.deepEqual(s.castPlan(3).targets.map(u=>u.id),expected);const hp=es.map(u=>u.hp);s.cast(3);advance(s,.4);assert.equal(h.heat,0);es.forEach((u,i)=>approx(hp[i]-u.hp,i<3?h.attack*8:0));return {expected};
});
check('no-target boundary, taunt end, active target retention and tower immobility across 3 rows',()=>{
 const {s,h,e}=arena(0);h.targetId=e.id;const m=s.spawn(1,'melee',0,1,0);m.y=1;assert.equal(s.choose(h).id,e.id);h.tauntId=m.id;h.tauntUntil=1;h.targetId=s.choose(h).id;assert.equal(h.targetId,m.id);s.time=2;assert.equal(s.choose(h).id,e.id);
 const hits=[];for(let layer=0;layer<3;layer++){const q=new Simulation();q.units=[];q.player.retired=true;q.waveAt=1e9;const t=q.towers.find(x=>x.layer===layer),u=q.spawn(0,'melee',0,1,t.x);Object.assign(u,{y:t.y+2,speed:0,cd:1e9,hp:1e6,maxHp:1e6});const before={x:t.x,y:t.y,hp:u.hp};advance(q,1);assert.equal(t.x,before.x);assert.equal(t.y,before.y);assert.ok(u.hp<before.hp);hits.push({layer,lost:before.hp-u.hp});}return hits;
});
check('waves at 0/30/60: independently 10/8 with 0 bots',()=>{
 const s=new Simulation();for(const u of s.units)u.speed=0;for(const t of s.towers)t.cd=1e9;advance(s,60.1);assert.equal(s.metrics.waves,3);assert.equal(s.players.filter(p=>p.bot&&!p.retired).length,0);const births=Object.groupBy(s.units,u=>Math.round(u.bornAt));return Object.fromEntries(Object.entries(births).map(([at,us])=>[at,[us.filter(u=>u.side===0).length,us.filter(u=>u.side===1).length]]));
});
check('delayed kill XP remains credited to casting class after death/re-contract',()=>{
 const {s,h,e,p}=arena(2);e.y=10;e.hp=10;s.cast(0);advance(s,.4);s.damage(null,h,1e9);const beforeRune=p.progress[2].xp;assert.ok(s.setClass(4,p));const soldier=s.spawn(0,'ranged',0,1,0);assert.ok(s.contract(p,soldier.id));soldier.speed=0;soldier.cd=1e9;const beforeFire=p.progress[4].xp;advance(s,1);
 const actual={runeXp:p.progress[2].xp-beforeRune,fireXp:p.progress[4].xp-beforeFire};assert.equal(actual.fireXp,0,JSON.stringify(actual));assert.equal(actual.runeXp,1);return actual;
});
check('config level buttons stop at max level',()=>{
 const room=new Room(),account={id:'audit-max',side:0,isHost:true,name:'max'};const p=room.player(account);p.level=30;p.xp=0;const before=clone(p.progress);for(let i=0;i<3;i++)room.command(account,{type:'level',id:String(i)});assert.equal(p.level,30);assert.equal(p.xp,0,JSON.stringify({xp:p.xp,needed:room.sim.expNeeded(p)}));return {before,after:p.progress};
});
// Natural, deterministic 20 Hz simulations. No direct combat fixtures inside these runs.
const runs=[];
for(const [attackBots,defenseBots,seconds,seeds] of [[0,0,600,[1234]],[4,1,1800,[1234,42,20261026]],[20,10,600,[1234]]])for(const seed of seeds){
 const c=clone(defaults);Object.assign(c.world,{attackBots,defenseBots});const s=new Simulation(c,seed);s.player.retired=true;const deaths=[];const originalDie=s.die;s.die=function(u,a){if(u.hp<=0&&!u.deathDone&&u.combatAt!=null)deaths.push({id:u.id,type:u.type,hero:!!u.hero,classId:u.classId,side:u.side,seconds:this.time-u.combatAt,born:this.time-(u.bornAt??this.time),level:u.hero?this.players[u.playerId].level:null});return originalDie.call(this,u,a);};
 let maxUnits=0,maxProjectiles=0,bad=0;const samples=[],start=performance.now();for(let i=0;i<seconds*20;i++){s.tick(.05);maxUnits=Math.max(maxUnits,s.units.length);maxProjectiles=Math.max(maxProjectiles,s.projectiles.length);for(const u of s.units)if(![u.x,u.y,u.hp].every(Number.isFinite))bad++;if(i%1200===1199)samples.push({time:s.time,units:s.units.length,heroes:s.units.filter(u=>u.hero).length,towerHp:s.towers.reduce((n,t)=>n+t.hp,0),casts:s.metrics.casts,layer:s.layer,stamina:s.players.filter(p=>p.bot&&!p.retired).map(p=>({classId:p.classId,stamina:p.stamina,level:p.level}))});}
 const alive=s.units.map(u=>({id:u.id,type:u.type,hero:!!u.hero,classId:u.classId,side:u.side,engagedSeconds:u.combatAt==null?null:s.time-u.combatAt,age:s.time-(u.bornAt??u.start),hpRatio:u.hp/u.maxHp}));
 runs.push({attackBots,defenseBots,seed,seconds,wallMs:performance.now()-start,maxUnits,maxProjectiles,bad,deaths,alive,samples,metrics:s.metrics});
}
const latest=JSON.parse(fs.readFileSync(`${dir}/dingtalk-latest.json`,'utf8').replace(/^\uFEFF/,''));const old=JSON.parse(fs.readFileSync('evidence/skill5-source-20261024.json','utf8'));const changes=[];for(let r=0;r<51;r++)for(let c=0;c<7;c++){const a=latest.cells[r]?.[c]?.value??'',b=old.cells[r]?.[c]?.value??'';if(a!==b)changes.push({row:r+1,col:c+1,old:b,new:a});}
const out={created:new Date().toISOString(),results,source:{changes,latestLogId:latest.logId},runs};fs.writeFileSync(`${dir}/model-audit.json`,JSON.stringify(out,null,2));console.log(JSON.stringify({passes:results.filter(x=>x.status==='PASS').length,failures:results.filter(x=>x.status==='FAIL'),sourceChanges:changes,runs:runs.map(r=>({...Object.fromEntries(['attackBots','defenseBots','seed','seconds','wallMs','maxUnits','maxProjectiles','bad'].map(k=>[k,r[k]])),deaths:r.deaths.length,longAlive:r.alive.filter(u=>(u.engagedSeconds||0)>100),heroDeaths:r.deaths.filter(u=>u.hero)}))},null,2));
