import test from 'node:test';
import assert from 'node:assert/strict';
import {Writable} from 'node:stream';
import {once} from 'node:events';
import {createEgressBudget} from '../server/egress.mjs';

class Sink extends Writable{
 constructor(){super();this.chunks=[];}
 _write(chunk,encoding,callback){this.chunks.push(Buffer.from(chunk));callback();}
}

test('大响应轮转发送，小实时响应不等待另一连接的完整数据，保持字节顺序',async()=>{
 const budget=createEgressBudget(),large=new Sink(),small=new Sink(),order=[];
 const a=budget.stream(large),b=budget.stream(small),body=Buffer.alloc(32768,7);
 large.on('finish',()=>order.push('large'));small.on('finish',()=>order.push('small'));
 const completed=Promise.all([once(large,'finish'),once(small,'finish')]);
 a.end(body);b.end(Buffer.from('real-time'));await completed;
 assert.equal(order[0],'small');assert.deepEqual(Buffer.concat(large.chunks),body);assert.equal(Buffer.concat(small.chunks).toString(),'real-time');assert.ok(large.chunks.every(c=>c.length<=1024));
});

test('断开的慢连接释放发送队列，其余连接继续结束',async()=>{
 const budget=createEgressBudget(),closed=new Sink(),live=new Sink(),a=budget.stream(closed),b=budget.stream(live);
 const completed=once(live,'finish');a.end(Buffer.alloc(65536));closed.destroy();b.end(Buffer.from('alive'));await completed;
 assert.equal(Buffer.concat(live.chunks).toString(),'alive');assert.equal(a.destroyed,true);
});
