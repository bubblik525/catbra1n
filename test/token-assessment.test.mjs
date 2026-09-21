import {test} from 'node:test';import assert from 'node:assert/strict';import {assessToken} from '../companion/token-assessment.mjs';
const now=1000000;const t={market:{observedAt:now,change:20,liquidity:40000}};
test('missing and future quotes never imply useful fresh observations',()=>{assert.equal(assessToken(null,{},now).label,'WAIT FOR DATA');assert.equal(assessToken({market:{observedAt:now+1}}, {},now).fresh,false);});
test('verified and rising does not imply safety',()=>{const a=assessToken(t,{checks:{verified:true}},now);assert.equal(a.label,'KEEP OBSERVING');assert.match(a.summary,/cannot conclude/);});
test('listed holder concentration prompts review but not insider accusation',()=>{const a=assessToken(t,{checks:{listedShare:70,listedCount:10}},now);assert.equal(a.label,'REVIEW THE EVIDENCE');assert.match(a.notes.join(' '),/not proof/);});
test('demo stays explicitly simulated',()=>{assert.equal(assessToken(t,{checks:{verified:false}},now,true).label,'DEMO OBSERVATION');});
