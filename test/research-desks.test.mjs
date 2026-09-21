import test from 'node:test';import assert from 'node:assert/strict';
import {computeLab,conditionalPaths} from '../companion/lab-math.mjs';
import {inspectRelations,relationService} from '../src/relations.mjs';
const a='0x'+'1'.repeat(40),b='0x'+'2'.repeat(40),tx='0x'+'a'.repeat(64);
const candles=[100,110,99,108.9].map((Close,i)=>({Close,High:Close*1.1,Low:Close*.9,volume:100,time:new Date(Date.UTC(2026,8,12,i)).toISOString()}));
test('lab uses actual elapsed time; short histories withhold conditional paths',()=>{const m=computeLab(candles);assert.equal(m.n,4);assert.ok(Math.abs(m.ret-8.9)<1e-9);assert.ok(Math.abs(m.maxDD+10)<1e-9);assert.equal(m.pairs,3);assert.equal(m.concentration,.25);assert.equal(conditionalPaths(m).length,3);assert.equal(conditionalPaths(m)[0].points[0].p,m.last);assert.equal(computeLab([]),null);const gap=candles.map((c,i)=>({...c,time:new Date(Date.UTC(2026,8,12,i*3)).toISOString()}));assert.equal(computeLab(gap).sigma,null);assert.equal(conditionalPaths(computeLab(gap)).length,3);assert.equal(conditionalPaths(computeLab(gap.slice(0,3))).length,0);assert.ok(Math.abs(computeLab(gap).pathMu-m.pathMu/3)<1e-12);});
test('relationships retain transaction evidence and exclude unrelated or malformed transfers',async()=>{const p={json:async url=>url.endsWith('token-transfers')?{items:[{from:{hash:a},to:{hash:b},transaction_hash:tx,log_index:1,token:{symbol:'CAT'},total:{value:'123'}},{from:{hash:b},to:{hash:b},transaction_hash:tx},{from:{hash:a},to:{hash:'bad'},transaction_hash:tx}],next_page_params:{next:1}}:{is_contract:true,creator_address_hash:b}};const r=await inspectRelations(p,a);assert.equal(r.nodes.length,2);assert.equal(r.links.length,2);assert.equal(r.links[1].evidence,tx);assert.equal(r.complete,false);assert.ok(r.warnings.length);await assert.rejects(inspectRelations(p,'invalid'),/valid/);});
test('relationship service requires provider and caches repeated addresses',async()=>{let calls=0;const p={json:async()=>{calls++;return {items:[]};}},run=relationService();await assert.rejects(run(null,a),/Connect/);await run(p,a);await run(p,a);assert.equal(calls,2);await assert.rejects(run(p,b),/cooldown/);});

import {parseBatch,assignRegions,validateAtlas} from '../companion/atlas-data.mjs';
test('batch accepts mixed separators, deduplicates case, and rejects invalid/oversized input',()=>{assert.deepEqual(parseBatch(`${a},\n${b}; ${a.toUpperCase()}`),[a,b]);assert.throws(()=>parseBatch(a+' seed words'),/valid/);assert.throws(()=>parseBatch(Array.from({length:51},(_,i)=>'0x'+i.toString(16).padStart(40,'0')).join('\n')),/50/);});
test('evidence regions reflect actual connected components including isolated addresses',()=>{const nodes=[{id:a},{id:b},{id:'isolated'}];const names=assignRegions(nodes,[{source:a,target:{id:b}}]);assert.equal(names.length,2);assert.equal(nodes[0].region,nodes[1].region);assert.notEqual(nodes[0].region,nodes[2].region);assert.equal(names[1],'UNLINKED ADDRESS');});
test('saved atlas validates public entities and rejects malformed snapshots',()=>{const v={version:1,mode:'chain',patterns:[],nodes:[{id:a}],links:[]};assert.equal(validateAtlas(v),v);assert.throws(()=>validateAtlas({...v,nodes:[{id:'secret'}]}));assert.throws(()=>validateAtlas({...v,patterns:[{address:a,features:[NaN,0,0,0,0]}]}));});

test('relationship authentication failures and total outages never look like checked empty graphs',async()=>{
 await assert.rejects(inspectRelations({json:async()=>{throw Error('HTTP 401 (check API key)');}},a),/401/);
 await assert.rejects(inspectRelations({json:async()=>{throw Error('connection unavailable');}},a),/could not be loaded/);
 const partial=await inspectRelations({json:async url=>{if(url.endsWith('token-transfers'))throw Error('connection unavailable');return {}; }},a);
 assert.equal(partial.partial,true);
});
