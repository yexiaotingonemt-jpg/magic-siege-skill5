// 有界采样；每帧只记录数字，统计和序列化每两秒执行一次。
const round=n=>Math.round(n*100)/100;
const stats=values=>{const a=[...values].sort((a,b)=>a-b);return {mean:round(a.reduce((s,v)=>s+v,0)/(a.length||1)),p95:round(a[Math.max(0,Math.ceil(a.length*.95)-1)]||0),max:round(a.at(-1)||0)};};
export function summarizePerformance(samples){
 return ['<30','30–49','50+'].map((band,i)=>{
  const rows=samples.filter(s=>i===0?s.fps<30:i===1?s.fps>=30&&s.fps<50:s.fps>=50),loads=rows.map(s=>s.load);
  const range=key=>({mean:stats(loads.map(l=>l[key]||0)).mean,max:Math.max(0,...loads.map(l=>l[key]||0))});
  return {fpsBand:band,windows:rows.length,units:range('units'),visibleUnits:range('visibleUnits'),heroes:range('heroes'),skillEffects:range('skillEffects'),vfxSprites:range('vfxSprites'),projectiles:range('projectiles'),combatNumbers:range('combatNumbers')};
 });
}
export function createPerformanceMonitor({getLoad=()=>({}),onSample=()=>{},now=()=>performance.now(),wall=()=>new Date().toISOString(),interval=2000,limit=300}={}){
 const samples=[];let last=null,start=null,frames=[],stages={},peaks={},worst=null,snapshots=[],lastSnapshot=null,snapshotGaps=[],matchId;
 const reset=()=>{last=null;start=null;frames=[];stages={};peaks={};worst=null;snapshots=[];snapshotGaps=[];};
 return {
  reset,
  stage(name,ms){if(last!==null&&Number.isFinite(ms)&&ms>=0){const values=stages[name]??=[];if(values.length<10000)values.push(ms);}},
  snapshot(at,ms){if(lastSnapshot!=null)snapshotGaps.push(at-lastSnapshot);lastSnapshot=at;snapshots.push(ms);if(snapshotGaps.length>100)snapshotGaps.shift();if(snapshots.length>100)snapshots.shift();},
  frame(at,visible=true){
   if(!visible){reset();lastSnapshot=null;return;}
   const load=getLoad();
   if(matchId!==load.matchId){reset();lastSnapshot=null;matchId=load.matchId;}
   if(last===null){last=at;start=at;return;}
   const delta=at-last;last=at;if(delta<=0)return;frames.push(delta);
   for(const [key,value]of Object.entries(load))if(typeof value==='number'&&Number.isFinite(value))peaks[key]=Math.max(peaks[key]??-Infinity,value);
   if(!worst||delta>worst.ms)worst={ms:round(delta),load:{...load}};
   if(at-start<interval&&frames.length<10000)return;
   const elapsed=at-start,sample={at:wall(),durationMs:round(elapsed),frames:frames.length,fps:round(frames.length*1000/elapsed),frameMs:stats(frames),over33ms:frames.filter(n=>n>33.34).length,over50ms:frames.filter(n=>n>50).length,over100ms:frames.filter(n=>n>100).length,stages:Object.fromEntries(Object.entries(stages).map(([key,v])=>[key,stats(v)])),network:{snapshots:snapshots.length,applyMs:stats(snapshots),gapMs:stats(snapshotGaps),ageMs:lastSnapshot===null?null:round(at-lastSnapshot)},load:{...load},peakLoad:peaks,worstFrame:worst};
   samples.push(sample);if(samples.length>limit)samples.shift();
   reset();last=at;start=at;onSample(sample);return sample;
  },
  get latest(){return samples.at(-1)||null;},
  get summary(){return summarizePerformance(samples);},
  report(environment={}){return {schemaVersion:1,exportedAt:wall(),environment,notes:['前台 Phaser 帧间隔；隐藏/失焦窗口恢复后重新计时。暂停战局仍统计绘制。','stages 是主线程各段耗时，不包含 GPU 执行时间；未直接测量 GPU/Draw Calls。','load 为窗口末帧，peakLoad 为窗口峰值，worstFrame.load 为最长帧间隔结束时的负载。','FPS 分组展示关联，不代表单位或光效是已证实的根因。网络 gap 包含传输、主线程排队及服务端发送间隔。'],summary:summarizePerformance(samples),samples:[...samples]};},
  now,
 };
}
