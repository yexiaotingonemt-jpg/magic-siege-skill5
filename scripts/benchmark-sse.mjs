import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createGameServer} from '../server/index.mjs';
import {createLocalClient} from '../client/launcher.mjs';
import {openSse,waitFor} from './sse-probe.mjs';

const output=path.resolve(process.env.MAGIC_BENCH_DIR||path.join(tmpdir(),'magic-siege-sse-benchmark'));
const frames=Number(process.env.MAGIC_BENCH_FRAMES||60);
assert.ok(Number.isInteger(frames)&&frames>=10);
const listen=async server=>{await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));return `http://127.0.0.1:${server.address().port}`;};
const quantile=(values,q)=>{const sorted=[...values].sort((a,b)=>a-b);return sorted[Math.ceil(sorted.length*q)-1];};
const round=value=>Number(value.toFixed(3));
const results=[];

// Pair raw and gzip subscribers on the same live room to compare exactly the
// same states, timing, serialization and local launcher proxy. No offline gzip.
for(const pairs of [1,5,10]){
 const directory=await mkdtemp(path.join(tmpdir(),'magic-sse-bench-'));
 const game=createGameServer({dataDir:directory}),probes=[],servers=[game.server];
 game.room.paused=true;
 try{
  const remote=await listen(game.server),local=createLocalClient({serverUrl:remote});servers.unshift(local.server);
  const base=await listen(local.server);
  const accounts=[];
  for(let i=0;i<4;i++){
   const account=await game.accounts.register({name:'带宽测试'+i,password:'benchmark-password',side:i%2});
   const player=game.room.player(account);player.auto=true;accounts.push(account);
  }
  game.room.command(accounts[0],{type:'bots',args:{attackBots:2,defenseBots:2},id:'bench-bots'});
  // Deterministic seeded combat, warmed to 60 seconds, including accumulated
  // logs and reports instead of only measuring an empty initial battlefield.
  for(let i=0;i<1200;i++)game.room.sim.tick(.05);
  const cookie='kc_session='+game.accounts.issue(accounts[0]);
  const sent=new Map(),hashes=new Map(),arrivals=[],units=[];
  let measuring=false,count=0,start=0,lastSend=0;
  const broadcast=game.room.broadcast.bind(game.room);
  game.room.broadcast=()=>{
   if(measuring){
    sent.set(game.room.sequence,performance.now());units.push(game.room.sim.units.length);count++;
   }
   broadcast();
   if(measuring&&count===frames){lastSend=performance.now();measuring=false;game.room.paused=true;}
  };
  for(let i=0;i<pairs;i++)for(const encoding of ['identity','gzip']){
   const probe=await openSse(base+'/api/events',{cookie,encoding,onEvent:event=>{
    const at=sent.get(event.data.sequence);if(event.type!=='message'||at===undefined)return;
    arrivals.push({probe,sequence:event.data.sequence,latency:event.at-at});
   }});
   probe.mode=encoding==='gzip'?'gzip':'original';probes.push(probe);
  }
  await waitFor(()=>probes.every(probe=>probe.events.some(e=>e.type==='message')));
  await new Promise(resolve=>setTimeout(resolve,100));
  for(const probe of probes){probe.initialBytes=probe.encodedBytes;probe.initialWireBytes=probe.wireBytes();probe.initialDecodedBytes=probe.decodedBytes;}
  start=performance.now();game.room.last=start;game.room.broadcastAt=start;game.room.acc=0;
  game.room.paused=false;measuring=true;
  await waitFor(()=>count===frames&&arrivals.length===frames*probes.length,{timeout:frames*300+5000,label:'all paired benchmark frames'});
  const seconds=(lastSend-start)/1000;
  // Compare after measurement: hashing every raw frame inside the receive
  // callback would artificially delay gzip callbacks on this shared event loop.
  for(const probe of probes)for(const event of probe.events){
   if(event.type!=='message'||!sent.has(event.data.sequence))continue;
   const hash=createHash('sha256').update(JSON.stringify(event.data)).digest('hex');
   if(hashes.has(event.data.sequence))assert.equal(hash,hashes.get(event.data.sequence));else hashes.set(event.data.sequence,hash);
  }
  const modes={};
  for(const mode of ['original','gzip']){
   const group=probes.filter(probe=>probe.mode===mode),samples=arrivals.filter(event=>event.probe.mode===mode);
   for(const probe of group){assert.equal(probe.error,null);assert.equal(samples.filter(event=>event.probe===probe).length,frames);}
   const encodedBytes=group.reduce((sum,probe)=>sum+probe.encodedBytes-probe.initialBytes,0);
   const wireBytes=group.reduce((sum,probe)=>sum+probe.wireBytes()-probe.initialWireBytes,0);
   const decodedBytes=group.reduce((sum,probe)=>sum+probe.decodedBytes-probe.initialDecodedBytes,0);
   modes[mode]={connections:group.length,frames:samples.length,encodedBytes,wireBytes,decodedBytes,
    KiBPerFrame:round(encodedBytes/samples.length/1024),KiBPerSecondPerConnection:round(encodedBytes/seconds/group.length/1024),
    wireKiBPerSecondPerConnection:round(wireBytes/seconds/group.length/1024),
    latencyMedianMs:round(quantile(samples.map(e=>e.latency),.5)),latencyP95Ms:round(quantile(samples.map(e=>e.latency),.95)),
    latencyMaxMs:round(Math.max(...samples.map(e=>e.latency)))};
  }
  assert.equal(modes.original.decodedBytes,modes.gzip.decodedBytes);
  const result={totalConnections:probes.length,framesPerConnection:frames,seconds:round(seconds),broadcastHz:round(frames/seconds),
   units:{min:Math.min(...units),max:Math.max(...units)},sameStateComparisons:arrivals.length-hashes.size,
   savingPercent:round((1-modes.gzip.encodedBytes/modes.original.encodedBytes)*100),modes};
  results.push(result);console.log(JSON.stringify(result));
 }finally{
  for(const probe of probes)probe.close();
  for(const server of servers){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
  await rm(directory,{recursive:true,force:true});
 }
}
await mkdir(output,{recursive:true});
const report={createdAt:new Date().toISOString(),node:process.version,platform:process.platform,method:'Paired raw/gzip subscriptions on the same live room, through actual local-client HTTP proxy; 60s simulation warmup, four players and four bots. Body bytes count compressed IncomingMessage chunks before gunzip; wire bytes also include HTTP headers/chunk framing. Latency runs from Room.broadcast entry through serialization, compression, loopback transport, local proxy, decompression and complete SSE parse. Initial config and connection handshakes excluded. CPU load is shared, so these are paired comparisons, not separate capacity tests. No WAN, loss, rendering or input-to-display latency measured.',results};
await writeFile(path.join(output,'benchmark.json'),JSON.stringify(report,null,2)+'\n');
const lines=['# SSE streaming gzip benchmark','',report.method,'',`Node ${report.node}; ${report.platform}; ${report.createdAt}`,'',
 '| Total connections (half each mode) | Mode | KiB/frame | KiB/s/connection | Median ms | P95 ms | Saving |',
 '|---|---|---:|---:|---:|---:|---:|'];
for(const result of results)for(const [mode,value]of Object.entries(result.modes))lines.push(`| ${result.totalConnections} | ${mode} | ${value.KiBPerFrame} | ${value.KiBPerSecondPerConnection} | ${value.latencyMedianMs} | ${value.latencyP95Ms} | ${mode==='gzip'?result.savingPercent+'%':'—'} |`);
await writeFile(path.join(output,'benchmark.md'),lines.join('\n')+'\n');
console.log('Report: '+path.join(output,'benchmark.md'));
