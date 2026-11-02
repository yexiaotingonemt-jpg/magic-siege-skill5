// 显示映射保留权威技能位；新领主的尖刺与冲锋对应旧美术资源的不同位置。
export function visualEvent(config,event){
 if(!config.design?.enabled||event.classId!==3||![1,2].includes(event.skill))return event;
 return {...event,sourceSkill:event.skill,skill:3-event.skill};
}
export const skillLabel=(sim,event)=>sim.config.design?.enabled?
 sim.config.design.skills[event.classId]?.[event.sourceSkill??event.skill]?.name:
 null;
