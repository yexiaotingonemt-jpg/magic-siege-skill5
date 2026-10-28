import test from 'node:test';
import assert from 'node:assert/strict';
import {heroNameData,shortHeroName,HERO_NAME_COLORS} from '../client/src/hero-names.js';
const sim={player:{side:0,heroId:10},players:[{id:2,name:'艾尔莎'},{id:5,name:'暗影王庭守护者'},{id:8,name:'普通契约者'}]};
test('契约英雄按实际所属账号显示名字，玩家ID无需连续',()=>{
 const data=heroNameData(sim,{id:11,hero:true,hp:100,side:1,playerId:5});assert.equal(data.name,'暗影王庭守护者');assert.equal(data.fullName,'暗影王庭守护者');assert.equal(data.team,'enemy');assert.equal(data.color,HERO_NAME_COLORS.enemy);
});
test('字色相对观看者阵营判断，自己的名字保留我标记',()=>{
 const u={id:10,hero:true,hp:100,side:0,playerId:2},own=heroNameData(sim,u);assert.equal(own.text,'我 · 艾尔莎');assert.equal(own.team,'ally');assert.equal(own.color,HERO_NAME_COLORS.ally);const enemy=heroNameData({...sim,player:{side:1,heroId:12}},u);assert.equal(enemy.text,'艾尔莎');assert.equal(enemy.color,HERO_NAME_COLORS.enemy);
});
test('非英雄、死亡英雄及没有所属账号的单位不显示玩家名',()=>{
 for(const u of [{id:11,hp:100,playerId:2},{id:11,hero:true,hp:0,playerId:2},{id:11,hero:true,hp:100,playerId:99}])assert.equal(heroNameData(sim,u),null);
});
test('长中文和Unicode按完整字符缩略，保留完整名称以便查看',()=>{
 const name='王庭守护者艾尔莎',n=shortHeroName(name);assert.equal(n.full,name);assert.equal(n.text,'王庭守护者艾…');assert.equal(n.truncated,true);assert.equal(shortHeroName('Alice😀',7).text,'Alice😀');assert.equal(shortHeroName('Alice😀Z',7).text,'Alice😀…');assert.equal(shortHeroName('艾\n尔莎').text,'艾 尔莎');
});
