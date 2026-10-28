import http from 'node:http';
import {createGunzip} from 'node:zlib';
import {StringDecoder} from 'node:string_decoder';
import {GAME_VERSION,PROTOCOL_VERSION} from '../shared/protocol.js';

// Use node:http rather than fetch: fetch transparently decodes gzip and would
// make the measured byte count describe JSON instead of network traffic.
export function openSse(url,{cookie,encoding='gzip',onEvent=()=>{}}={}){
 return new Promise((resolve,reject)=>{
  const probe={events:[],encodedBytes:0,decodedBytes:0,error:null,ended:false};
  const req=http.get(url,{headers:{Cookie:cookie,'Accept-Encoding':encoding,'X-Magic-Version':GAME_VERSION,'X-Magic-Protocol':String(PROTOCOL_VERSION)}},res=>{
   if(res.statusCode!==200){res.resume();reject(Error(`SSE HTTP ${res.statusCode}`));return;}
   probe.headers=res.headers;probe.response=res;
   const decoder=new StringDecoder('utf8');let pending='';
   const stream=res.headers['content-encoding']==='gzip'?createGunzip():res;
   res.on('data',chunk=>{probe.encodedBytes+=chunk.length;});
   probe.wireBytes=()=>res.socket?.bytesRead??probe.finalWireBytes??0;
   stream.on('data',chunk=>{
    probe.decodedBytes+=chunk.length;pending+=decoder.write(chunk);
    let end;
    while((end=pending.indexOf('\n\n'))>=0){
     const packet=pending.slice(0,end);pending=pending.slice(end+2);
     const lines=packet.split('\n'),data=lines.filter(line=>line.startsWith('data: ')).map(line=>line.slice(6)).join('\n');
     if(!data)continue;
     const event={type:lines.find(line=>line.startsWith('event: '))?.slice(7)||'message',data:JSON.parse(data),at:performance.now()};
     probe.events.push(event);onEvent(event);
    }
   });
   const fail=error=>{if(!probe.closed)probe.error=error;};
   stream.on('error',fail);res.on('error',fail);
   res.on('end',()=>{probe.finalWireBytes=res.socket?.bytesRead;});
   stream.on('end',()=>{probe.ended=true;});
   probe.close=()=>{probe.closed=true;req.destroy();if(stream!==res)stream.destroy();};
   if(stream!==res)res.pipe(stream);
   resolve(probe);
  });
  req.on('error',reject);
 });
}

export async function waitFor(predicate,{timeout=3000,label='SSE event'}={}){
 const end=performance.now()+timeout;
 while(!predicate()){
  if(performance.now()>end)throw Error(`Timed out waiting for ${label}`);
  await new Promise(resolve=>setTimeout(resolve,10));
 }
}
