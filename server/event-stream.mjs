import {createGzip,constants} from 'node:zlib';

export function acceptsGzip(header=''){
 const encodings=new Map(String(header).split(',').map(item=>{
  const [name,...params]=item.trim().toLowerCase().split(';');
  const quality=params.find(param=>param.trim().startsWith('q='));
  return [name.trim(),quality===undefined?1:Number(quality.trim().slice(2))];
 }));
 const quality=encodings.get('gzip')??encodings.get('*')??0;
 return Number.isFinite(quality)&&quality>0&&quality<=1;
}

// Room writes complete SSE events. Flush each write without resetting the
// compression dictionary, so clients receive every event immediately.
export function createEventStream(req,res,{gzip=true,egress}={}){
 const compressed=gzip&&acceptsGzip(req.headers['accept-encoding']);
 res.writeHead(200,{
  'Content-Type':'text/event-stream','Cache-Control':'no-cache',
  'Connection':'keep-alive','X-Accel-Buffering':'no','Vary':'Accept-Encoding',
  ...(compressed?{'Content-Encoding':'gzip'}:{}),
 });
 if(!compressed&&!egress)return res;
 const target=egress?egress.stream(res):res;
 if(!compressed)return {
  get destroyed(){return res.destroyed||target.destroyed;},
  get writableNeedDrain(){return res.writableNeedDrain||target.writableNeedDrain;},
  write(data){return target.write(data);},end(){target.end();},
  on(event,listener){res.on(event,listener);if(event==='drain')target.on(event,listener);return this;},
 };
 const encoder=createGzip({level:constants.Z_BEST_SPEED,flush:constants.Z_SYNC_FLUSH});
 encoder.on('error',()=>res.destroy());
 res.on('close',()=>encoder.destroy());
 encoder.pipe(target);
 return {
  get destroyed(){return res.destroyed||encoder.destroyed;},
  get writableNeedDrain(){return res.writableNeedDrain||encoder.writableNeedDrain||target.writableNeedDrain;},
  write(data){return encoder.write(data);},
  end(){encoder.end();},
  on(event,listener){res.on(event,listener);if(event==='drain'){encoder.on(event,listener);if(target!==res)target.on(event,listener);}return this;},
 };
}
