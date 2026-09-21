import test from 'node:test';
import assert from 'node:assert/strict';
import { morphWeights, metrics, appendTelemetry, particleTargets } from '../companion/catbrain-visuals.mjs';

test('morph cycle remains a continuous convex blend and closes every 30 seconds',()=>{
  for(let t=0;t<61;t+=.017){const m=morphWeights(t);assert.ok(m.every(v=>v>=0&&v<=1));assert.ok(Math.abs(m.reduce((a,b)=>a+b,0)-1)<1e-12);assert.ok(m.every((v,i)=>Math.abs(v-morphWeights(t+.001)[i])<.001));}
  assert.deepEqual(morphWeights(0),morphWeights(30));
  assert.deepEqual(morphWeights(100,'brain'),[0,1,0]);
});
test('sensor readings reflect activations and signed weights, not random telemetry',()=>{
  assert.deepEqual(metrics([.2,.8],[[0,1,-2],[1,0,1]],[.1,.5]),{active:1,mean:.5,delta:.2,drive:1.2000000000000002});
  assert.equal(metrics([.2,.8],[]).delta,0);
});
test('activity history copies data, ignores duplicate ticks and stays bounded',()=>{
  const h=[],v=[.1,.2];appendTelemetry(h,0,v);v[0]=.9;appendTelemetry(h,0,v);assert.equal(h.length,1);assert.equal(h[0].values[0],.1);
  for(let t=1;t<150;t++)appendTelemetry(h,t,v);assert.equal(h.length,96);assert.equal(h.at(-1).step,149);
});
test('all artistic particle targets are finite, bounded and reproducible',()=>{
  const p=Array.from({length:16},(_,i)=>[i/16-.5,0]);
  for(let i=0;i<1000;i++){const a=particleTargets(i,(i%100)/100,p);assert.deepEqual(a,particleTargets(i,(i%100)/100,p));assert.ok([...a.brain,...a.cluster,...a.scatter].every(v=>Number.isFinite(v)&&Math.abs(v)<1.5));assert.ok(a.group>=0&&a.group<16);}
});
