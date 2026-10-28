import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {EventEmitter} from 'node:events';
import {Writable} from 'node:stream';
import {createGameServer} from '../server/index.mjs';
import {createLocalClient} from '../client/launcher.mjs';
import {acceptsGzip,createEventStream} from '../server/event-stream.mjs';
import {openSse,waitFor} from '../scripts/sse-probe.mjs';
import {GAME_VERSION,PROTOCOL_VERSION} from '../shared/protocol.js';
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
 return {game,base,account,cookie,async connect(encoding){const probe=await openSse(base+'/api/events',{cookie,encoding});probes.push(probe);await waitFor(()=>probe.events.some(e=>e.type==='message'));return probe;}};
}

test('gzip negotiation respects explicit q=0, wildcard and absent encodings',()=>{
 for(const header of ['gzip','br, gzip;q=0.5','GZIP; q=1','gzip ; q=1','*;q=0.8'])assert.ok(acceptsGzip(header),header);
 for(const header of [undefined,'','identity','br','gzip;q=0','gzip;q=0, *;q=1','*;q=0','gzip;q=oops','gzip;q=2'])assert.equal(acceptsGzip(header),false,header);
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
 const logout=await fetch(base+'/api/logout',{method:'POST',headers:{Cookie:cookie,'X-Magic-Version':GAME_VERSION,'X-Magic-Protocol':String(PROTOCOL_VERSION),'Content-Type':'application/json'},body:'{}'});
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
