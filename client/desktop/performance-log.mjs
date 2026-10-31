import {mkdir,stat,rename,rm,appendFile} from 'node:fs/promises';
import path from 'node:path';
// 固定文件名、串行写入、最多保留两个 5 MiB 日志；渲染进程不能指定路径。
export function createPerformanceLog(directory,{maxBytes=5*1024*1024}={}){
 const file=path.join(directory,'performance.jsonl');let queue=Promise.resolve();
 return {file,write(record){
  const line=JSON.stringify(record)+'\n';if(Buffer.byteLength(line)>65536)return Promise.reject(Error('Performance record too large'));
  const next=queue.then(async()=>{
   await mkdir(directory,{recursive:true});let size=0;
   try{size=(await stat(file)).size;}catch(e){if(e.code!=='ENOENT')throw e;}
   if(size+Buffer.byteLength(line)>maxBytes){await rm(file+'.1',{force:true});if(size)await rename(file,file+'.1');}
   await appendFile(file,line,'utf8');return file;
  });queue=next.catch(()=>{});return next;
 }};
}
