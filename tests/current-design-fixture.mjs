import assert from 'node:assert/strict';
import {defaults,contractType} from '../shared/config.js';
import {Simulation} from '../shared/simulation.js';
import {createCurrentDesignConfig,currentTraits} from '../shared/current-design.js';
export const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-6,`${actual} != ${expected}`);
export function arena(id=0,config=createCurrentDesignConfig(defaults)) {
 const s=new Simulation(config,123);s.units=[];s.player.retired=true;s.waveAt=1e9;
 for(const t of s.towers){t.x=100;t.cd=1e9;}
 const make=(id,x=0,y=0)=>{const p=s.makePlayer(id===3?1:0,false);p.classId=id;p.stamina=10000;
  const h=s.spawn(p.side,contractType(id),0,1,x);assert.ok(s.contract(p,h.id));Object.assign(h,{x,y,cd:1e9,speed:0});return {p,h};};
 const {p,h}=make(id),enemy=make(id===3?0:3,0,3).h,friend=make(id===3?3:0,1,0).h;
 enemy.hp=enemy.maxHp=1e7;friend.hp=friend.maxHp/2;
 h.targetId=enemy.id;friend.targetId=enemy.id;enemy.targetId=h.id;s.localPlayerId=p.id;
 return {s,p,h,enemy,friend,make};
}
export function advance(s,seconds){for(let t=0;t<seconds-1e-7;t+=.05)s.tick(.05);}
export function affix(s,p,sourceId,rank=1){const t=currentTraits(s.config,p.classId).find(t=>t.sourceId===sourceId);assert.ok(t);p.progress[p.classId].traits[t.id]=rank;return t;}
export function cast(s,p,i,target){if(target)s.setManualTarget(target.id,p);assert.ok(s.cast(i,p),s.notice);advance(s,s.config.design.skills[p.classId][i].cast+.05);}
