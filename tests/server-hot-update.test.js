import {test} from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdtemp,cp,mkdir,readFile,writeFile,rm,symlink,realpath,stat} from 'node:fs/promises';
import {createGameServer} from '../server/index.mjs';
import {buildManifest,verifyRelease,manifestDigest} from '../server/release-manifest.mjs';
import {listenHotControl} from '../server/hot-update.mjs';
import {packDelta,stageDelta,applyDelta,controlRequest} from '../deploy/server-update.mjs';
import {CLIENT_VERSION,SERVER_VERSION,GAME_VERSION,PROTOCOL_VERSION} from '../shared/protocol.js';
import {git,GITHUB_REPOSITORY,GitHubSourceVerifier,prepareCommittedPackage} from '../server/source-provenance.mjs';

const NEXT_VERSION=SERVER_VERSION.split('.').map((v,i)=>i===2?Number(v)+1:v).join('.');
const FUTURE_VERSION=SERVER_VERSION.split('.').map((v,i)=>i===2?Number(v)+2:v).join('.');
const source=fileURLToPath(new URL('../',import.meta.url));
async function writeManifest(directory){
 const remote=path.join(path.dirname(path.dirname(directory)),'github.git');
 try{await git(directory,['rev-parse','--git-dir']);}catch{await git(directory,['init','-b','main']);}
 await git(directory,['config','user.name','Hot update QA']);await git(directory,['config','user.email','qa@example.invalid']);await git(directory,['config','core.autocrlf','false']);
 const version=JSON.parse(await readFile(path.join(directory,'VERSION.json'),'utf8'));
 for(const name of ['package.json','package-lock.json']){const value=JSON.parse(await readFile(path.join(directory,name),'utf8'));value.version=version.serverVersion;if(value.packages?.[''])value.packages[''].version=version.serverVersion;await writeFile(path.join(directory,name),JSON.stringify(value,null,2)+'\n');}
 await git(directory,['add','--','server','shared','deploy','package.json','package-lock.json','README.md']);
 await git(directory,['commit','--allow-empty','-m','isolated release']);await git(directory,['push','--force',remote,'HEAD:refs/heads/main']);
 version.source={repository:GITHUB_REPOSITORY,ref:'refs/heads/main',commit:(await git(directory,['rev-parse','HEAD'])).toString().trim()};
 await writeFile(path.join(directory,'VERSION.json'),JSON.stringify(version,null,2)+'\n');
 const value=await buildManifest(directory);await writeFile(path.join(directory,'server-manifest.json'),JSON.stringify(value));return value;
}
async function change(directory,name,replace){const file=path.join(directory,name);await writeFile(file,replace(await readFile(file,'utf8')));}
async function fixture(t){
 const root=await mkdtemp(path.join(tmpdir(),'magic-hot-update-')),first=path.join(root,'releases/first'),next=path.join(root,'releases/next');
 assert.equal(path.dirname(root),tmpdir());assert.match(path.basename(root),/^magic-hot-update-/);
 t.after(()=>rm(root,{recursive:true,force:true,maxRetries:10,retryDelay:100}));await mkdir(first,{recursive:true});await git(root,['init','--bare',path.join(root,'github.git')]);
 const sourceVerifier=new GitHubSourceVerifier({cacheDir:path.join(root,'git-cache'),transport:path.join(root,'github.git')});
 for(const name of ['server','shared','deploy','package.json','package-lock.json','README.md'])await cp(path.join(source,name),path.join(first,name),{recursive:true});
 const version={serverVersion:SERVER_VERSION,clientVersion:SERVER_VERSION,gameVersion:GAME_VERSION,protocolVersion:PROTOCOL_VERSION};
 await writeFile(path.join(first,'VERSION.json'),JSON.stringify(version));const baseline=await writeManifest(first);
 await cp(first,next,{recursive:true});
 await change(next,'shared/protocol.js',value=>value.replace(/(export const (?:SERVER_VERSION|CLIENT_VERSION)=)'[^']+'/g,"$1'"+NEXT_VERSION+"'"));
 await change(next,'shared/hero-rules.js',value=>value.replace(/export class HeroRules\s*\{/,"export class HeroRules{\n hotUpdateProbe(){return 'new-runtime';}"));
 await change(next,'shared/config.js',value=>value+'\ndefaults.world.initialStamina=4321;\n');
 await writeFile(path.join(next,'VERSION.json'),JSON.stringify({...version,serverVersion:NEXT_VERSION,clientVersion:NEXT_VERSION}));
 const manifest=await writeManifest(next);
 const game=createGameServer({dataDir:path.join(root,'data'),runtimeRoot:first,sourceVerifier});
 await new Promise(resolve=>game.server.listen(0,'127.0.0.1',resolve));
 t.after(async()=>{for(const c of [...game.room.clients])c.res.end();game.server.closeAllConnections();await new Promise(resolve=>game.server.close(resolve));});
 const base='http://127.0.0.1:'+game.server.address().port;
 const account=await game.accounts.register({name:'热更测试',password:'isolated-test-only',side:0});
 const token=game.accounts.issue(account),player=game.room.player(account);
 const call=async(route,body)=>{const release=(await (await fetch(base+'/api/version')).json()).clientVersion;const response=await fetch(base+route,{method:body?'POST':'GET',headers:{Cookie:'kc_session='+token,'X-Magic-Client-Version':release,'X-Magic-Version':GAME_VERSION,'X-Magic-Protocol':String(PROTOCOL_VERSION),'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});return {status:response.status,data:await response.json()};};
 return {root,first,next,baseline,manifest,game,account,player,call,base,token,sourceVerifier};
}
test('保留战局热更加载整个新依赖图，保留身份、成长、冷却、对象引用与待执行闭包',async t=>{
 const f=await fixture(t),{game,player}=f,room=game.room,s=room.sim;
 s.contract(player,s.units.find(u=>u.side===0&&u.type==='melee'&&!u.hero).id);const hero=s.hero(player);
 // Simulate the pre-0.6.2 runtime: policy is introduced without changing existing heroes.
 delete s.npcPolicy;const livingIds=s.units.filter(u=>u.hero&&u.hp>0).map(u=>u.id);
 player.level=4;player.score=123;player.totalPoints=42;player.cd[0]=100;
 room.paused=true;room.speed=2;s.time=12;room.stageEnd=300;s.config.world.stageDuration=777;
 const projectile={source:hero,targetId:s.towers[0].id,x:0,y:0,power:2};s.projectiles.push(projectile);
 let ran=0;const job={at:12.05,run:()=>{ran++;hero.shield=123;}};s.jobs.push(job);
 const before={matchId:room.matchId,heroId:hero.id,units:s.units,players:s.players,progress:player.progress,jobs:s.jobs,stageEnd:room.stageEnd};
 const priorCommand=await f.call('/api/action',{id:'before-update',type:'stamina'}),priorStamina=player.stamina;
 const result=await game.hotUpdate.update({releaseDir:f.next,baseDigest:f.baseline.digest});
 assert.equal(result.ok,true);assert.equal(result.battle,'preserve');assert.equal(game.room,room);assert.equal(room.sim,s);
 assert.equal(room.matchId,before.matchId);assert.equal(s.hero(player),hero);assert.equal(player.heroId,before.heroId);
 assert.equal(s.units,before.units);assert.equal(s.players,before.players);assert.equal(player.progress,before.progress);assert.equal(s.jobs,before.jobs);assert.equal(s.jobs[0],job);
 assert.equal(s.projectiles[0],projectile);assert.equal(projectile.source,hero);assert.equal(player.level,4);player.level=5;assert.equal(player.progress[player.classId].level,5);
 assert.equal(player.score,123);assert.equal(player.totalPoints,42);assert.equal(player.cd[0],100);assert.equal(s.time,12);assert.equal(room.stageEnd,300);assert.equal(room.paused,true);assert.equal(room.speed,2);
 assert.equal(s.hotUpdateProbe(),'new-runtime');assert.equal(s.config.world.initialStamina,4321);assert.equal(s.config.world.stageDuration,777);
 assert.deepEqual(s.npcPolicy,{mode:'ratio',defense:1,attack:3});assert.deepEqual(s.units.filter(u=>u.hero&&u.hp>0).map(u=>u.id),livingIds);
 s.projectiles=[];s.tick(.05);assert.equal(ran,1);assert.equal(hero.shield,123);s.tick(.05);assert.equal(ran,1);
 assert.equal((await f.call('/api/me')).status,200);assert.equal((await f.call('/api/health')).data.serverVersion,NEXT_VERSION);
 assert.deepEqual((await f.call('/api/action',{id:'before-update',type:'stamina'})).data,priorCommand.data);assert.equal(player.stamina,priorStamina);
 const response=await f.call('/api/action',{id:'same-command',type:'stamina'});assert.equal(response.data.ok,true);
});
test('保留战局也断开旧 SSE 以要求拉取新版，重开模式仍保留登录会话',async t=>{
 const f=await fixture(t),abort=new AbortController();t.after(()=>abort.abort());
 const response=await fetch(f.base+'/api/events',{headers:{Cookie:'kc_session='+f.token,'X-Magic-Client-Version':CLIENT_VERSION,'X-Magic-Version':GAME_VERSION,'X-Magic-Protocol':String(PROTOCOL_VERSION)},signal:abort.signal});
 const reader=response.body.getReader();await reader.read();f.game.room.paused=true;
 const client=[...f.game.room.clients][0],oldRoom=f.game.room;let closed=false;
 const closedPromise=new Promise(resolve=>client.res.on('close',()=>{closed=true;resolve();}));
 f.player.level=8;f.player.score=99;
 await f.game.hotUpdate.update({releaseDir:f.next,baseDigest:f.baseline.digest});
 assert.equal(f.game.room,oldRoom);await closedPromise;assert.equal(closed,true);
 const stale=await fetch(f.base+'/api/me',{headers:{Cookie:'kc_session='+f.token,'X-Magic-Client-Version':CLIENT_VERSION,'X-Magic-Version':GAME_VERSION,'X-Magic-Protocol':String(PROTOCOL_VERSION)}});assert.equal(stale.status,409);
 const third=path.join(f.root,'releases/third');await cp(f.next,third,{recursive:true});await change(third,'shared/protocol.js',v=>v.replace("'"+NEXT_VERSION+"'","'"+FUTURE_VERSION+"'").replace("'"+NEXT_VERSION+"'","'"+FUTURE_VERSION+"'"));
 const version=JSON.parse(await readFile(path.join(third,'VERSION.json'),'utf8'));version.serverVersion=version.clientVersion=FUTURE_VERSION;await writeFile(path.join(third,'VERSION.json'),JSON.stringify(version));await writeManifest(third);
 const result=await f.game.hotUpdate.update({releaseDir:third,baseDigest:f.manifest.digest,battle:'restart'});
 await closedPromise;
 assert.notEqual(result.matchId,oldRoom.matchId);assert.equal(closed,true);assert.equal(f.game.room.sim.time,0);assert.equal(f.game.room.stageNumber,1);
 assert.equal((await f.call('/api/me')).status,200);const fresh=f.game.room.player(f.account);assert.equal(fresh.level,0);assert.equal(fresh.score,0);assert.equal(fresh.heroId,null);
});
test('战斗兼容变化不能静默清场，明确重开才允许激活',async t=>{
 const f=await fixture(t),id=f.game.room.matchId;
 await change(f.next,'shared/protocol.js',v=>v.replace("GAME_VERSION='"+GAME_VERSION+"'","GAME_VERSION='incompatible'"));
 const version=JSON.parse(await readFile(path.join(f.next,'VERSION.json'),'utf8'));version.gameVersion='incompatible';await writeFile(path.join(f.next,'VERSION.json'),JSON.stringify(version));await writeManifest(f.next);
 await assert.rejects(f.game.hotUpdate.update({releaseDir:f.next,baseDigest:f.baseline.digest}),/明确选择重开/);assert.equal(f.game.room.matchId,id);
 assert.equal((await f.game.hotUpdate.update({releaseDir:f.next,baseDigest:f.baseline.digest,battle:'restart'})).ok,true);
});
test('激活后自检失败恢复旧原型、配置与版本，原战局继续可操作',async t=>{
 const f=await fixture(t),room=f.game.room,prototype=Object.getPrototypeOf(room.sim),config=room.sim.config;
 await change(f.next,'server/room.mjs',v=>v.replace('snapshot(includeConfig=true){',"snapshot(includeConfig=true){if(this.players.size)throw Error('candidate smoke failure');"));await writeManifest(f.next);
 await assert.rejects(f.game.hotUpdate.update({releaseDir:f.next,baseDigest:f.baseline.digest}),/candidate smoke failure/);
 assert.equal(f.game.room,room);assert.equal(Object.getPrototypeOf(room.sim),prototype);assert.equal(room.sim.config,config);assert.equal(room.sim.hotUpdateProbe,undefined);
 assert.equal((await f.call('/api/health')).data.serverVersion,SERVER_VERSION);assert.equal((await f.call('/api/action',{id:'after-failure',type:'stamina'})).data.ok,true);
});
test('拒绝被篡改文件、过期基准、非法选项及引导文件变化',async t=>{
 const f=await fixture(t);
 await assert.rejects(f.game.hotUpdate.update({releaseDir:f.next,baseDigest:'0'.repeat(64)}),/基准版本/);
 await assert.rejects(f.game.hotUpdate.update({releaseDir:f.next,baseDigest:f.baseline.digest,battle:'unknown'}),/battle/);
 await change(f.next,'server/index.mjs',v=>v+'\n// changed bootstrap\n');
 await assert.rejects(f.game.hotUpdate.update({releaseDir:f.next,baseDigest:f.baseline.digest}),/清单不一致/);
 await writeManifest(f.next);await assert.rejects(f.game.hotUpdate.update({releaseDir:f.next,baseDigest:f.baseline.digest}),/引导文件改变/);
 assert.equal((await f.call('/api/health')).data.serverVersion,SERVER_VERSION);
});
test('服务端发布无需客户端包，公共 HTTP 不暴露发布接口',async t=>{
 const f=await fixture(t);
 assert.equal((await f.game.hotUpdate.update({releaseDir:f.next,baseDigest:f.baseline.digest})).ok,true);
 assert.equal((await f.call('/api/hot-update',{releaseDir:f.next})).status,404);
});

test('等待旧请求结束后切换，拒绝并发发布，避免请求写入已废弃战局',async t=>{
 const f=await fixture(t),accounts=f.game.accounts,original=accounts.login.bind(accounts);let entered,release;
 const ready=new Promise(resolve=>entered=resolve),gate=new Promise(resolve=>release=resolve);
 accounts.login=async input=>{entered();await gate;return original(input);};
 const pending=f.call('/api/login',{name:'热更测试',password:'isolated-test-only'});await ready;
 const update=f.game.hotUpdate.update({releaseDir:f.next,baseDigest:f.baseline.digest});
 await assert.rejects(f.game.hotUpdate.update({releaseDir:f.next,baseDigest:f.baseline.digest}),/已有热更/);
 release();assert.equal((await pending).status,200);assert.equal((await update).ok,true);assert.equal(f.game.accounts,accounts);
 assert.equal((await f.call('/api/me')).status,200);
});
test('战局 schema 改变仅允许重开，账号 schema 改变始终要求常规部署',async t=>{
 const f=await fixture(t);
 await change(f.next,'server/game-runtime.mjs',v=>v.replace(/HOT_STATE_SCHEMA=\d+/,'HOT_STATE_SCHEMA=999'));await writeManifest(f.next);
 await assert.rejects(f.game.hotUpdate.update({releaseDir:f.next,baseDigest:f.baseline.digest}),/战局状态结构不兼容/);
 assert.equal((await f.game.hotUpdate.update({releaseDir:f.next,baseDigest:f.baseline.digest,battle:'restart'})).ok,true);
 const other=path.join(f.root,'releases/account-schema');await cp(f.next,other,{recursive:true});
 await change(other,'shared/protocol.js',v=>v.replaceAll("'"+NEXT_VERSION+"'","'"+FUTURE_VERSION+"'"));
 await change(other,'server/game-runtime.mjs',v=>v.replace('HOT_ACCOUNT_SCHEMA=1','HOT_ACCOUNT_SCHEMA=2'));
 const version=JSON.parse(await readFile(path.join(other,'VERSION.json'),'utf8'));version.serverVersion=version.clientVersion=FUTURE_VERSION;await writeFile(path.join(other,'VERSION.json'),JSON.stringify(version));await writeManifest(other);
 await assert.rejects(f.game.hotUpdate.update({releaseDir:other,baseDigest:(await verifyRelease(f.next)).digest,battle:'restart'}),/账号结构不兼容/);
});
test('差异包只携带变化文件，暂存保留未变内容、正确删除文件且不改动旧版本',async t=>{
 const f=await fixture(t);await writeFile(path.join(f.first,'server/obsolete.mjs'),'old');const base=await writeManifest(f.first);
 await git(f.next,['fetch',path.join(f.root,'github.git'),'refs/heads/main']);await git(f.next,['merge','--no-edit','-s','ours','FETCH_HEAD']);
 const next=await writeManifest(f.next);
 await symlink(f.first,path.join(f.root,'current'),process.platform==='win32'?'junction':'dir');
 const baseFile=path.join(f.root,'status.json');await writeFile(baseFile,JSON.stringify({manifest:base}));const output=path.join(f.root,'delta');
 const packed=await packDelta({baseFile,source:f.next,output,sourceVerifier:f.sourceVerifier});assert.ok(packed.removed.includes('server/obsolete.mjs'));assert.ok(!packed.changed.includes('server/accounts.mjs'));
 await assert.rejects(readFile(path.join(output,'payload/server/accounts.mjs')),/ENOENT/);
 const staged=await stageDelta({appRoot:f.root,bundle:output});assert.equal((await verifyRelease(staged.releaseDir)).digest,next.digest);
 await assert.rejects(readFile(path.join(staged.releaseDir,'server/obsolete.mjs')),/ENOENT/);
 assert.equal(await readFile(path.join(f.first,'server/obsolete.mjs'),'utf8'),'old');assert.equal(await realpath(path.join(f.root,'current')),await realpath(f.first));
 await writeFile(path.join(output,'payload/shared/protocol.js'),'corrupt');await assert.rejects(stageDelta({appRoot:f.root,bundle:output}),/差异文件校验失败/);
});
test('拒绝差异清单的目录穿越和未声明的删除',async t=>{
 const f=await fixture(t),baseFile=path.join(f.root,'base.json'),output=path.join(f.root,'delta');await writeFile(baseFile,JSON.stringify(f.baseline));await packDelta({baseFile,source:f.next,output,sourceVerifier:f.sourceVerifier});
 await symlink(f.first,path.join(f.root,'current'),process.platform==='win32'?'junction':'dir');
 const file=path.join(output,'delta.json'),delta=JSON.parse(await readFile(file,'utf8'));delta.removed.push('server/accounts.mjs');await writeFile(file,JSON.stringify(delta));
 await assert.rejects(stageDelta({appRoot:f.root,bundle:output}),/列表与发布清单不一致/);
 delta.manifest.files['../outside']='0'.repeat(64);await writeFile(file,JSON.stringify(delta));await assert.rejects(stageDelta({appRoot:f.root,bundle:output}),/非法发布路径/);
});
test('Linux 本机命令完整执行差异发布、原子切换目录和读回验证',{skip:process.platform==='win32'},async t=>{
 const f=await fixture(t);await symlink(f.first,path.join(f.root,'current'),'dir');
 const socketPath=path.join(f.root,'shared/runtime/hot-update.sock');
 const game=createGameServer({dataDir:path.join(f.root,'linux-data'),runtimeRoot:f.first,sourceVerifier:f.sourceVerifier,appRoot:f.root,requireClientPackage:false});
 await new Promise(resolve=>game.server.listen(0,'127.0.0.1',resolve));
 const control=await listenHotControl(socketPath,game.hotUpdate),cwd=process.cwd();
 t.after(async()=>{process.chdir(cwd);await new Promise(resolve=>control.close(resolve));game.server.closeAllConnections();await new Promise(resolve=>game.server.close(resolve));});
 assert.equal((await stat(socketPath)).mode&0o777,0o600);
 const active=await controlRequest(socketPath,'/status'),baseFile=path.join(f.root,'active.json'),output=path.join(f.root,'delta');await writeFile(baseFile,JSON.stringify(active));await packDelta({baseFile,source:f.next,output,sourceVerifier:f.sourceVerifier});
 const matchId=game.room.matchId,result=await applyDelta({appRoot:f.root,bundle:output});assert.equal(result.verified,true);assert.equal(game.room.matchId,matchId);
 assert.equal(await realpath(path.join(f.root,'current')),result.releaseDir);assert.equal(process.cwd(),result.releaseDir);assert.ok((await readFile(path.join(f.root,'shared/runtime/hot-updates.jsonl'),'utf8')).includes(result.digest));
});
test('Linux 激活后记录失败回滚 current、工作目录和旧运行状态',{skip:process.platform==='win32'},async t=>{
 const f=await fixture(t);await symlink(f.first,path.join(f.root,'current'),'dir');await mkdir(path.join(f.root,'shared/runtime/hot-updates.jsonl'),{recursive:true});
 const game=createGameServer({dataDir:path.join(f.root,'rollback-data'),runtimeRoot:f.first,sourceVerifier:f.sourceVerifier,appRoot:f.root,requireClientPackage:false});
 const cwd=process.cwd(),room=game.room;
 await new Promise(resolve=>game.server.listen(0,'127.0.0.1',resolve));
 t.after(async()=>{process.chdir(cwd);game.server.closeAllConnections();await new Promise(resolve=>game.server.close(resolve));});
 await assert.rejects(game.hotUpdate.update({releaseDir:f.next,baseDigest:f.baseline.digest}),/EISDIR/);
 assert.equal(game.room,room);assert.equal(await realpath(path.join(f.root,'current')),await realpath(f.first));assert.equal(process.cwd(),await realpath(f.first));assert.equal(room.sim.hotUpdateProbe,undefined);
 assert.equal((await game.hotUpdate.status()).serverVersion,SERVER_VERSION);
});
test('Linux 正式启动入口启用私有控制通道，崩溃残留 socket 可安全恢复',{skip:process.platform==='win32',timeout:15000},async t=>{
 const f=await fixture(t),socketPath=path.join(f.root,'shared/runtime/hot-update.sock');
 await symlink(f.first,path.join(f.root,'current'),'dir');
 let child;
 async function start(){
  child=spawn(process.execPath,[path.join(f.first,'server/index.mjs')],{env:{...process.env,PORT:'0',HOST:'127.0.0.1',KC_DATA_DIR:path.join(f.root,'cold-data'),MAGIC_SIEGE_ROOT:f.root,MAGIC_HOT_UPDATE_SOCKET:socketPath},stdio:['ignore','pipe','pipe']});
  await new Promise((resolve,reject)=>{let stdout='',stderr='';child.stdout.on('data',chunk=>{stdout+=chunk;if(stdout.includes('hot updates enabled'))resolve();});child.stderr.on('data',chunk=>stderr+=chunk);child.once('error',reject);child.once('exit',code=>reject(Error('服务提前退出：'+code+' '+stderr)));});
 }
 t.after(async()=>{if(child&&child.exitCode===null&&child.signalCode===null){child.kill('SIGKILL');await once(child,'exit');}});
 await start();assert.equal((await controlRequest(socketPath,'/status')).manifest.digest,f.baseline.digest);
 child.kill('SIGKILL');await once(child,'exit');assert.equal((await stat(socketPath)).isSocket(),true);
 await start();assert.equal((await controlRequest(socketPath,'/status')).manifest.digest,f.baseline.digest);
 await assert.rejects(listenHotControl(socketPath,f.game.hotUpdate),/已有服务/);
});
test('服务端打包要求工作区干净且提交已推送，包内容直接读取 Git blob',async t=>{
 const f=await fixture(t),transport=path.join(f.root,'github.git');
 await writeFile(path.join(f.next,'.git/info/exclude'),'VERSION.json\nserver-manifest.json\n');
 await change(f.next,'shared/config.js',v=>v+'\n// unpublished change\n');
 await assert.rejects(prepareCommittedPackage(f.next,{transport}),/未提交内容/);
 await git(f.next,['add','shared/config.js']);await git(f.next,['commit','-m','not pushed']);
 await assert.rejects(prepareCommittedPackage(f.next,{transport}),/尚未推送或尚未合入/);
 await git(f.next,['push',transport,'HEAD:refs/heads/main']);
 const prepared=await prepareCommittedPackage(f.next,{transport});
 assert.equal(prepared.source.commit,(await git(f.next,['rev-parse','HEAD'])).toString().trim());
 assert.equal(prepared.files.get('shared/config.js').toString(),(await git(f.next,['show','HEAD:shared/config.js'])).toString());
 assert.equal(prepared.files.has('VERSION.json'),false);assert.equal(prepared.files.has('package-lock.json'),false);
});
test('重新计算清单也不能发布未经 GitHub 提交的服务端文件，验证发生在代码导入之前',async t=>{
 const f=await fixture(t),room=f.game.room;
 await change(f.next,'server/game-runtime.mjs',v=>v+"\nthrow Error('candidate code must not run');\n");
 const manifest=await buildManifest(f.next);await writeFile(path.join(f.next,'server-manifest.json'),JSON.stringify(manifest));
 await assert.rejects(f.game.hotUpdate.update({releaseDir:f.next,baseDigest:f.baseline.digest}),/发布文件与 GitHub 提交内容不一致/);
 assert.equal(f.game.room,room);assert.equal((await f.call('/api/health')).data.serverVersion,SERVER_VERSION);
 const baseFile=path.join(f.root,'base.json');await writeFile(baseFile,JSON.stringify(f.baseline));
 await assert.rejects(packDelta({baseFile,source:f.next,output:path.join(f.root,'forged-delta'),sourceVerifier:f.sourceVerifier}),/发布文件与 GitHub 提交内容不一致/);
});
test('A 已上线后，B 即使刷新基准也必须合入 A 的 Git 提交才能发布',async t=>{
 const f=await fixture(t),remote=path.join(f.root,'github.git');
 await writeFile(path.join(f.first,'server/colleague-a.mjs'),'export const contribution="A";\n');const onlineA=await writeManifest(f.first);
 await git(f.next,['fetch',remote,'refs/heads/main']);await git(f.next,['merge','--no-edit','FETCH_HEAD']);await git(f.next,['push',remote,'HEAD:refs/heads/main']);
 // B's original source SHA remains reachable, but it does not include A's deployed commit.
 await assert.rejects(f.sourceVerifier.verifyManifest(f.manifest,onlineA),/未包含线上已发布提交/);
 const merged=await writeManifest(f.next),proof=await f.sourceVerifier.verifyManifest(merged,onlineA);
 assert.equal(proof.previousCommit,onlineA.version.source.commit);assert.equal(proof.commit,merged.version.source.commit);
 assert.ok(merged.files['server/colleague-a.mjs']);
});
test('其他仓库、错误发布分支及 GitHub 无法访问时均拒绝发布',async t=>{
 const f=await fixture(t),forged=structuredClone(f.manifest);forged.version.source.repository='https://github.com/other/project.git';forged.digest=manifestDigest(forged);
 await assert.rejects(f.sourceVerifier.verifyManifest(forged,f.baseline),/必须绑定本项目/);
 const wrongRef=new GitHubSourceVerifier({cacheDir:path.join(f.root,'wrong-ref'),ref:'refs/heads/unapproved',transport:path.join(f.root,'github.git')});
 await assert.rejects(wrongRef.verifyManifest(f.manifest,f.baseline),/必须绑定本项目/);
 const unavailable=new GitHubSourceVerifier({cacheDir:path.join(f.root,'offline'),transport:path.join(f.root,'missing-remote.git')});
 await assert.rejects(unavailable.verifyManifest(f.manifest,f.baseline),/禁止离线跳过验证/);
});
