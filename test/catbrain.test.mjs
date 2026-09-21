import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluate, createSession, advance, equity } from '../companion/catbrain-model.mjs';

test('network has bounded deterministic 6 → 6 → 4 activations',()=>{
  const a=evaluate([.8,.6,.7,.8,.1,.5]);
  assert.equal(a.hidden.length,6);assert.equal(a.output.length,4);
  assert.deepEqual(a,evaluate([.8,.6,.7,.8,.1,.5]));
  assert.ok([...a.hidden,...a.output].every(n=>n>=0&&n<=1));
  assert.throws(()=>evaluate([NaN,0,0,0,0,0]));
  assert.notDeepEqual(a.output,evaluate([.1,.6,.7,.1,.9,.5]).output);
});
test('demo repeats exactly and executes a complete paper cycle',()=>{
  const a=createSession(),b=createSession();
  for(let i=0;i<128;i++){advance(a);advance(b);}
  assert.deepEqual(a,b);assert.ok(a.trades>0);assert.ok(a.events.some(e=>e.decision==='EXIT'));
  assert.ok(a.history.length<=100);assert.ok(a.events.length<=30);
});
test('unsafe synthetic scenarios cannot open positions',()=>{
  for(const scenario of ['thin','volatile']){
    const s=createSession(scenario,'curious');for(let i=0;i<100;i++)advance(s);
    assert.equal(s.position,null);assert.equal(s.trades,0);assert.equal(s.decision,'VETO');assert.equal(equity(s),1000);
  }
});
test('guard vetoes new entries without suppressing protective exits',()=>{
  const s=createSession();for(let i=0;i<20;i++)advance(s,{guard:true});assert.equal(s.position,null);
  const p=createSession();for(let i=0;i<12&&!p.position;i++)advance(p);assert.ok(p.position);
  for(let i=0;i<60;i++)advance(p,{guard:true});assert.equal(p.position,null);assert.ok(p.trades>0);
});
test('entry and exit account for both modeled transaction costs',()=>{
  const s=createSession();for(let i=0;i<20&&!s.position;i++)advance(s);
  assert.ok(s.position);assert.equal(s.cash,900);assert.ok(equity(s)<1000);
  while(s.position)advance(s);
  assert.ok(Math.abs(equity(s)-1000-s.realized)<1e-9);
});
test('reset creates a clean independent demo portfolio',()=>{
  const a=createSession();advance(a);const b=createSession();
  assert.equal(b.step,0);assert.equal(b.cash,1000);assert.deepEqual(b.events,[]);assert.notStrictEqual(a.history,b.history);
});
