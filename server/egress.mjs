import {Writable} from 'node:stream';

// 在压缩之后按连接轮转小块数据，避免云出口的突发限速丢包拖住已有实时连接。
export function createEgressBudget({bytesPerSecond=128*1024,chunkBytes=1024}={}){
 const queue=[];let timer=null,nextAt=0;
 const wake=()=>{if(!timer&&queue.length)timer=setTimeout(pump,Math.max(0,nextAt-performance.now()));};
 function pump(){
  timer=null;const job=queue.shift();if(!job)return;
  if(job.cancelled){wake();return;}
  if(job.response.destroyed){job.finish(Error('Response closed'));wake();return;}
  const size=Math.min(chunkBytes,job.buffer.length-job.offset),part=job.buffer.subarray(job.offset,job.offset+size);
  job.offset+=size;nextAt=Math.max(nextAt,performance.now())+size*1000/bytesPerSecond;
  const advance=()=>{if(job.cancelled)return;if(job.offset===job.buffer.length)job.finish();else queue.push(job);wake();};
  if(job.response.write(part))advance();else job.response.once('drain',advance);
  wake();
 }
 function stream(response){
  let pending;
  const output=new Writable({
   write(buffer,encoding,callback){
    if(!buffer.length){callback();return;}
    const job={response,buffer,offset:0,cancelled:false,finish(error){if(job.cancelled)return;job.cancelled=true;pending=null;callback(error);}};
    pending=job;queue.push(job);wake();
   },
   final(callback){response.end(callback);},
   destroy(error,callback){if(pending)pending.finish(error||Error('Response closed'));callback(error);},
  });
  output.on('error',()=>response.destroy());response.on('close',()=>output.destroy());return output;
 }
 return {stream,end(response,buffer){if(Buffer.byteLength(buffer)<1024)response.end(buffer);else stream(response).end(buffer);}};
}
