import {ART_ROOT,HERO_ART} from './art-catalog.js';
import {names} from '../../shared/config.js';
import {describeAbilities} from './ability-descriptions.js';
import {SKILL_PROGRESSION} from '../../shared/skill-progression.js';

const frames=[[0,3,2,3],[1,6,1,1],[5,7,2,3],[3,3,0,3],[4,4,4,4],[5,2,5,5],[0,0,2,3]];
const shortStatus={target:'缺少目标',conduct:'缺少导电目标',healing:'友军满血',stamina:'体力不足',stunned:'眩晕中',channel:'炮击引导中',cleanse:'无负面可净化',casting:'施法中',cooldown:'冷却中','no-hero':'请先契约'};
export function createSkillHud(container){
 // Keep the actual buttons alive across updates, including pointer down/up.
 container.innerHTML=Array.from({length:4},(_,i)=>`<div><button data-cast="${i}" class="skill s${i}"><span class="skill-art"></span><span class="skill-lock" aria-hidden="true" hidden></span><em></em></button><div class="skill-caption"><button class="skill-info" data-info="${i}" aria-label="查看技能${i+1}说明"><b></b><span aria-hidden="true">i</span></button></div><small class="skill-cost"></small><button class="upgrade" data-up="${i}" hidden>＋</button></div>`).join('');
 const slots=[...container.children].map(slot=>({button:slot.querySelector('[data-cast]'),art:slot.querySelector('.skill-art'),lock:slot.querySelector('.skill-lock'),count:slot.querySelector('em'),name:slot.querySelector('b'),cost:slot.querySelector('.skill-cost'),upgrade:slot.querySelector('.upgrade')}));
 return {update(sim,guide=describeAbilities(sim)){
  const p=sim.player,h=sim.hero(),id=p.classId,b=p.builds[id];
  slots.forEach((slot,i)=>{
   const plan=sim.castPlan(i),upgrade=sim.upgradePlan(i),cd=Math.max(0,p.cd[i]-sim.time),unlock=SKILL_PROGRESSION[i].unlock,s=sim.config.heroes[id].skills[i];
   const casting=(h?.castUntil>sim.time||h?.channelUntil>sim.time)&&h.skillAnimation?.skill===i;
   const status=casting?'施法中':plan.ok?'可释放':plan.code==='locked'?(p.level<unlock?`Lv.${unlock}解锁`:'待加点'):shortStatus[plan.code]||plan.reason;
   slot.button.classList.toggle('unready',!plan.ok);slot.button.classList.toggle('ready',plan.ok);slot.button.classList.toggle('casting',!!casting);slot.button.dataset.state=casting?'casting':plan.code;
   slot.button.setAttribute('aria-label',names[id][i]+' · '+status);
   slot.button.title=`${guide.skills[i].summary}\n${guide.skills[i].compactMeta}\n${casting?'正在施法':plan.reason}${cd?` · 剩余${cd.toFixed(1)}秒`:''}`;
   const art=HERO_ART[id];const frame=art?art.row*4+i:frames[id][i];slot.art.style.backgroundImage=art?`url('${ART_ROOT}/skill-icons.webp')`:'';slot.art.style.backgroundSize=art?'400% 500%':'';slot.art.style.backgroundPosition=`${frame%4/3*100}% ${Math.floor(frame/4)/(art?4:1)*100}%`;
   slot.count.className=casting?'casting-count':cd?'cooldown-count':!b[i]?'locked-count':'';
   slot.lock.hidden=!!b[i];slot.count.textContent=casting?'◌':!b[i]?'':cd?cd.toFixed(1)+'s':'';
   slot.name.textContent=names[id][i];slot.cost.textContent=`ϟ ${s.cost} · Lv.${b[i]}`;
   slot.upgrade.hidden=!upgrade.ok;slot.upgrade.disabled=!upgrade.ok;slot.upgrade.dataset.state=upgrade.code;
   slot.upgrade.title=upgrade.reason;slot.upgrade.setAttribute('aria-label',`${names[id][i]} · ${upgrade.reason}`);
  });
 }};
}
