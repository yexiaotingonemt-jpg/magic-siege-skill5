const entityLists=['units','towers','players','projectiles'];
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);

function objectPatch(before,after){
 const set={},remove=[];
 for(const [key,value]of Object.entries(after))if(value!==undefined&&!equal(before[key],value))set[key]=value;
 for(const key of Object.keys(before))if(!Object.hasOwn(after,key)||after[key]===undefined)remove.push(key);
 return {set,remove};
}

// 每条连接以前一个已排入发送队列的完整状态为基准；慢连接跳过中间帧仍能还原最新状态。
export function createSnapshotDelta(before,after){
 const previous={...before},current={...after},entities={};
 delete previous.config;delete current.config;
 for(const key of entityLists){
  const old=new Map(before[key].map(entity=>[entity.id,entity])),next=new Set(),updates=[];
  for(const entity of after[key]){
   next.add(entity.id);const prior=old.get(entity.id),patch=objectPatch(prior||{},entity);
   if(!prior||Object.keys(patch.set).length||patch.remove.length)updates.push({id:entity.id,...patch});
  }
  const remove=[...old.keys()].filter(id=>!next.has(id));
  const order=after[key].map(entity=>entity.id),oldOrder=before[key].map(entity=>entity.id);
  if(updates.length||remove.length||!equal(oldOrder,order))entities[key]={updates,remove,...(!equal(oldOrder,order)?{order}:{})};
  delete previous[key];delete current[key];
 }
 return {delta:true,matchId:after.matchId,sequence:after.sequence,baseSequence:before.sequence,patch:objectPatch(previous,current),entities};
}

function applyObject(before,patch){
 const next={...before,...patch.set};for(const key of patch.remove)delete next[key];return next;
}

// 还原独立的网络状态；渲染器向单位添加的插值字段不会进入下一帧的基准。
export function applySnapshotDelta(before,packet){
 if(!packet.delta)return packet;
 if(!before||packet.matchId!==before.matchId||packet.baseSequence!==before.sequence)throw Error('Snapshot delta requires a new baseline');
 const result=applyObject(before,packet.patch);
 for(const [key,change]of Object.entries(packet.entities)){
  const entities=new Map(before[key].map(entity=>[entity.id,entity]));
  for(const id of change.remove)entities.delete(id);
  for(const update of change.updates)entities.set(update.id,applyObject(entities.get(update.id)||{},update));
  result[key]=change.order?change.order.map(id=>entities.get(id)):[...entities.values()];
 }
 return result;
}
