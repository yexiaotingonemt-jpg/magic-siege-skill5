import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {EventEmitter} from 'node:events';
import {Writable} from 'node:stream';
import http from 'node:http';
import {gunzipSync} from 'node:zlib';
import {createGameServer} from '../server/index.mjs';
import {createLocalClient} from '../client/launcher.mjs';
import {acceptsGzip,createEventStream} from '../server/event-stream.mjs';
import {openSse,waitFor} from '../scripts/sse-probe.mjs';
import {CLIENT_VERSION,GAME_VERSION,PROTOCOL_VERSION} from '../shared/protocol.js';
import {Room} from '../server/room.mjs';
import {applySnapshotDelta} from '../shared/snapshot-delta.js';
const listen=async server=>{await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));return `http://127.0.0.1:${server.address().port}`;};

async function setup(t,options={}){
 const directory=await mkdtemp(path.join(tmpdir(),'magic-gzip-'));
 const game=createGameServer({dataDir:directory,...options});game.room.paused=true;
 const remote=await listen(game.server),local=createLocalClient({serverUrl:remote});
 const base=await listen(local.server);
 const account=await game.accounts.register({name:'压缩测试',password:'gzip-test-password',side:0});
 const cookie='kc_session='+game.accounts.issue(account),probes=[];
 t.after(async()=>{
  for(const probe of probes)probe.close();
  for(const server of [local.server,game.server]){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
  await rm(directory,{recursive:true,force:true});
 });
 return {game,base,account,cookie,async connect(encoding,delta=false){const probe=await openSse(base+'/api/events'+(delta?'?delta=1':''),{cookie,encoding});probes.push(probe);await waitFor(()=>probe.events.some(e=>e.type==='message'));return probe;}};
}

test('差量订阅经过真实Gzip和本地代理还原同局全量状态，断线后重新发送完整基准',async t=>{
 const {game,account,connect}=await setup(t),full=await connect('gzip'),delta=await connect('gzip',true);
 for(let i=0;i<8;i++){game.room.sim.tick(.05);game.room.sequence++;game.room.broadcast();await new Promise(resolve=>setTimeout(resolve,5));}
 const result=game.room.command(account,{type:'pause',args:{paused:true},id:'delta-pause'});
 await waitFor(()=>[full,delta].every(probe=>probe.events.some(e=>e.type==='message'&&e.data.sequence===result.sequence)));
 const fullStates=new Map(full.events.filter(e=>e.type==='message').map(e=>[e.data.sequence,e.data]));let state,matched=0;
 for(const event of delta.events.filter(e=>e.type==='message')){
  state=applySnapshotDelta(state,event.data);const expected=fullStates.get(state.sequence);if(!expected)continue;
  assert.deepEqual({...state,config:undefined},{...expected,config:undefined});matched++;
 }
 assert.ok(matched>=8);assert.ok(delta.events.some(e=>e.data.delta));assert.equal(state.paused,true);
 delta.close();await waitFor(()=>game.room.clients.size===1);const reconnected=await connect('gzip',true);
 const initial=reconnected.events.find(e=>e.type==='message').data;assert.ok(initial.config);assert.equal(initial.delta,undefined);assert.equal(initial.matchId,state.matchId);
});

test('gzip negotiation respects explicit q=0, wildcard and absent encodings',()=>{
 for(const header of ['gzip','br, gzip;q=0.5','GZIP; q=1','gzip ; q=1','*;q=0.8'])assert.ok(acceptsGzip(header),header);
 for(const header of [undefined,'','identity','br','gzip;q=0','gzip;q=0, *;q=1','*;q=0','gzip;q=oops','gzip;q=2'])assert.equal(acceptsGzip(header),false,header);
});

test('完整状态HTTP响应也协商Gzip，经过本地代理后与未压缩状态一致，避免挤占实时同步',async t=>{
 const {base,cookie,game,account}=await setup(t);game.room.player(account);
 const read=encoding=>new Promise((resolve,reject)=>{
  http.get(base+'/api/state',{headers:{Cookie:cookie,'Accept-Encoding':encoding,'X-Magic-Client-Version':CLIENT_VERSION,'X-Magic-Version':GAME_VERSION,'X-Magic-Protocol':String(PROTOCOL_VERSION)}},res=>{
   const chunks=[];res.on('data',chunk=>chunks.push(chunk));res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:Buffer.concat(chunks)}));res.on('error',reject);
  }).on('error',reject);
 });
 const raw=await read('identity'),gzip=await read('gzip'),declined=await read('gzip;q=0');
 assert.equal(raw.status,200);assert.equal(gzip.headers['content-encoding'],'gzip');assert.equal(gzip.headers.vary,'Accept-Encoding');assert.equal(declined.headers['content-encoding'],undefined);
 assert.deepEqual(JSON.parse(gunzipSync(gzip.body)),JSON.parse(raw.body));assert.deepEqual(JSON.parse(declined.body),JSON.parse(raw.body));assert.ok(gzip.body.length<raw.body.length/3);
});

test('gzip and original SSE decode to identical snapshots through local proxy; commands and idle heartbeats flush immediately',async t=>{
 const {game,account,connect}=await setup(t),raw=await connect('identity'),gzip=await connect('gzip');
 assert.equal(raw.headers['content-encoding'],undefined);assert.equal(gzip.headers['content-encoding'],'gzip');
 assert.equal(gzip.headers.vary,'Accept-Encoding');assert.equal(gzip.headers['x-accel-buffering'],'no');
 const initial=gzip.events.find(e=>e.type==='message').data;
 assert.ok(initial.config);assert.ok(initial.units.length);assert.ok(gzip.events.some(e=>e.type==='identity'));
 const result=game.room.command(account,{type:'speed',args:{speed:2},id:'gzip-speed'});
 await waitFor(()=>[raw,gzip].every(probe=>probe.events.some(e=>e.type==='message'&&e.data.sequence===result.sequence)),{timeout:1000});
 const get=probe=>probe.events.find(e=>e.type==='message'&&e.data.sequence===result.sequence).data;
 assert.deepEqual(get(gzip),get(raw));assert.equal(get(gzip).speed,2);assert.equal(get(gzip).config,undefined);
 game.room.heartbeat();await waitFor(()=>gzip.events.some(e=>e.type==='heartbeat'),{timeout:1000});
 assert.ok(gzip.encodedBytes<raw.encodedBytes/4);
 assert.equal(gzip.error,null);
});

test('gzip reconnect restores full config and identity; logout ends compressor and removes room connection',async t=>{
 const {game,base,cookie,connect}=await setup(t),first=await connect('gzip');
 const identity=first.events.find(e=>e.type==='identity').data;
 first.close();await waitFor(()=>game.room.clients.size===0);
 const next=await connect('gzip');
 assert.deepEqual(next.events.find(e=>e.type==='identity').data,identity);
 assert.ok(next.events.find(e=>e.type==='message').data.config);
 const logout=await fetch(base+'/api/logout',{method:'POST',headers:{Cookie:cookie,'X-Magic-Client-Version':CLIENT_VERSION,'X-Magic-Version':GAME_VERSION,'X-Magic-Protocol':String(PROTOCOL_VERSION),'Content-Type':'application/json'},body:'{}'});
 assert.equal(logout.status,200);await logout.json();
 await waitFor(()=>next.ended&&game.room.clients.size===0);
 assert.equal(next.error,null);
});

test('gzip can be disabled and q=0 falls back without changing SSE payload',async t=>{
 const enabled=await setup(t),declined=await enabled.connect('gzip;q=0, *;q=1');
 assert.equal(declined.headers['content-encoding'],undefined);
 const disabled=await setup(t,{sseGzip:false}),fallback=await disabled.connect('gzip');
 assert.equal(fallback.headers['content-encoding'],undefined);assert.ok(fallback.events.find(e=>e.type==='message').data.config);
});

test('compressed transport exposes encoder/socket backpressure and closes on socket failure',async()=>{
 class Response extends Writable{
  writeHead(){}
  _write(chunk,encoding,callback){this.release=callback;}
 }
 const response=new Response({highWaterMark:1}),transport=createEventStream({headers:{'accept-encoding':'gzip'}},response);
 const closed=new Promise(resolve=>transport.on('close',resolve));
 assert.equal(transport.write('data: '+JSON.stringify({value:'x'.repeat(32768)})+'\n\n'),false);
 assert.equal(transport.writableNeedDrain,true);
 response.destroy();await closed;assert.equal(transport.destroyed,true);
 const plain=new EventEmitter();plain.writeHead=()=>{};
 assert.equal(createEventStream({headers:{}},plain),plain);
});
test('暂停命令遇到背压后仍在队列恢复时发送最新快照，不等待下一次战斗tick',()=>{
 const room=new Room(),packets=[],res=new EventEmitter();res.destroyed=false;res.writableNeedDrain=false;res.write=value=>{packets.push(value);return true;};
 const account={id:'backpressure',name:'同步检查',side:0,isHost:true},client=room.connect(account,res),count=packets.length;
 res.writableNeedDrain=true;assert.equal(room.command(account,{type:'pause',args:{paused:true},id:'pause'}).ok,true);assert.equal(client.pendingSnapshot,true);assert.equal(packets.length,count);
 res.writableNeedDrain=false;res.emit('drain');const latest=JSON.parse(packets.at(-1).slice(6));assert.equal(latest.paused,true);assert.equal(latest.sequence,room.sequence);assert.equal(client.pendingSnapshot,false);
 const sent=packets.length;res.emit('drain');assert.equal(packets.length,sent);res.emit('close');
});
test('压缩器与底层socket均传递drain，完整大配置不会丢失恢复通知',async()=>{
 class Response extends Writable{writeHead(){}_write(chunk,encoding,callback){setImmediate(callback);}}
 const response=new Response({highWaterMark:1}),transport=createEventStream({headers:{'accept-encoding':'gzip'}},response);let drained=0;
 transport.on('drain',()=>drained++);assert.equal(transport.write('data: '+JSON.stringify({value:'x'.repeat(65536)})+'\n\n'),false);
 await waitFor(()=>drained>0&&!transport.writableNeedDrain);const finished=new Promise(resolve=>response.once('finish',resolve));transport.end();await finished;assert.ok(drained>0);
});
