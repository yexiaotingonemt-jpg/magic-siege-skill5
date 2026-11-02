import {canRecordPerformance} from '../shared/performance-permission.js';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createPerformanceMonitor,summarizePerformance} from '../client/src/performance-monitor.js';
import {createPerformanceLog} from '../client/desktop/performance-log.mjs';

test('帧率按总帧数/时间计算，长帧关联当时负载而非窗口结束负载',()=>{
 let units=10;const m=createPerformanceMonitor({getLoad:()=>({matchId:'a',units}),interval:1000});
 m.frame(0);for(let t=20;t<=800;t+=20)m.frame(t);
 units=99;m.stage('skillVfx',120);m.frame(1000);const s=m.latest;
 assert.equal(s.fps,41);assert.equal(s.frameMs.max,200);assert.equal(s.over100ms,1);assert.equal(s.worstFrame.load.units,99);assert.equal(s.peakLoad.units,99);assert.equal(s.stages.skillVfx.max,120);
 units=2;m.frame(1020);assert.equal(s.load.units,99);
});
test('隐藏/恢复、战局切换不把后台停顿计入 FPS；历史有上限',()=>{
 let matchId='a';const m=createPerformanceMonitor({getLoad:()=>({matchId}),interval:100,limit:2});
 m.frame(0);m.frame(100);m.frame(10000,false);m.frame(20000);m.frame(20100);
 assert.equal(m.latest.fps,10);assert.equal(m.latest.frameMs.max,100);
 matchId='b';m.frame(30000);m.frame(30100);assert.equal(m.latest.frameMs.max,100);
 const r=m.report();assert.equal(r.samples.length,2);assert.equal(r.samples[1].load.matchId,'b');
});
test('快照耗时、间隔和年龄独立记录；FPS 正常也可发现快照停顿',()=>{
 const m=createPerformanceMonitor({interval:1000});m.frame(0);m.snapshot(100,5);m.snapshot(700,7);
 for(let t=20;t<=1000;t+=20)m.frame(t);
 assert.equal(m.latest.fps,50);assert.equal(m.latest.network.gapMs.max,600);assert.equal(m.latest.network.ageMs,300);assert.equal(m.latest.network.applyMs.max,7);
});
test('FPS正常也记录显示时钟停顿，暂停不计作卡顿',()=>{
 let visualTime=1,paused=false;const m=createPerformanceMonitor({interval:100,getLoad:()=>({visualTime,paused})});
 for(let at=0;at<=100;at+=20)m.frame(at);
 assert.equal(m.latest.fps,50);assert.equal(m.latest.visualClock.stalledMs,80);
 paused=true;for(let at=120;at<=200;at+=20)m.frame(at);assert.equal(m.latest.visualClock.stalledMs,0);
});
test('概要按 FPS 区间统计单位及光效，无数据区间不产生 NaN',()=>{
 const r=summarizePerformance([{fps:20,load:{units:50,skillEffects:10}},{fps:25,load:{units:100,skillEffects:20}},{fps:60,load:{units:5}}]);
 assert.equal(r[0].units.mean,75);assert.equal(r[0].skillEffects.max,20);assert.equal(r[1].windows,0);assert.equal(r[1].units.mean,0);assert.equal(r[2].units.max,5);
});
test('桌面日志并发写入保持逐行 JSON，轮转最多两个文件，拒绝超大记录后仍可写入',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'performance-log-')),log=createPerformanceLog(dir,{maxBytes:75});
 await Promise.all([log.write({id:1}),log.write({id:2})]);
 assert.deepEqual((await readFile(log.file,'utf8')).trim().split('\n').map(JSON.parse),[{id:1},{id:2}]);
 await assert.rejects(log.write({text:'x'.repeat(65536)}),/too large/);
 await log.write({id:3,text:'x'.repeat(50)});await log.write({id:4});
 assert.equal(JSON.parse((await readFile(log.file,'utf8')).trim()).id,4);
 assert.equal(JSON.parse((await readFile(log.file+'.1','utf8')).trim()).id,3);
});

test('性能权限同时要求精确yxt名称与服务端超级标记，房主与伪造类型均无效',()=>{
 assert.equal(canRecordPerformance({name:'yxt',isSuperAdmin:true}),true);
 for(const account of [null,{}, {name:'yxt'}, {name:'yxt',isHost:true}, {name:'other',isSuperAdmin:true},{name:'czy001',isSuperAdmin:true},{name:'yxt',isSuperAdmin:'true'},{name:'YXT',isSuperAdmin:true}])assert.equal(canRecordPerformance(account),false);
});
