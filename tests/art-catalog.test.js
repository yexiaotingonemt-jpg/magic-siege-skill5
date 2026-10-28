import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {availableClasses,defaults} from '../shared/config.js';
import {HERO_ART,HERO_CELL,heroArtFrame,heroArtPose,heroPortrait} from '../client/src/art-catalog.js';
const root=new URL('../client/public/art/kc-final/',import.meta.url);
test('every open class has a complete 8-direction, 4-action texture and matching portrait',()=>{
  const active=[...availableClasses(0,defaults),...availableClasses(1,defaults)];
  for(const id of active){
    const art=HERO_ART[id];assert.ok(art,`class ${id} missing art`);
    const png=readFileSync(new URL(art.key+'.png',root));
    assert.equal(png.readUInt32BE(16),HERO_CELL.width*8);
    assert.equal(png.readUInt32BE(20),HERO_CELL.height*4);
    assert.equal(png[25],6,'sprites require actual RGBA PNG');
    assert.ok(existsSync(new URL('../client/public'+heroPortrait(id),import.meta.url)));
    assert.equal(new Set(Array.from({length:32},(_,i)=>heroArtFrame(id,Math.floor(i/8),i%8))).size,32);
  }
});
test('all four motion states use the same class identity and declared action row',()=>{
  assert.deepEqual(['idle','move','attack','skill'].map(action=>heroArtPose({action})),[0,1,2,3]);
  assert.equal(heroArtPose({action:'channel'}),3);
  assert.equal(heroArtPose({action:'dash'}),3);
  assert.equal(heroArtFrame(6,0,0),null,'unreleased legacy classes retain compatibility');
});
