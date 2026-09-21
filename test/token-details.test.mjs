import test from 'node:test';
import assert from 'node:assert/strict';
import {loadTokenDetails,applyTokenDetails} from '../src/token-details.mjs';
const address='0x'+'1'.repeat(40),other='0x'+'2'.repeat(40);
test('Blockscout details exist without a market quote; raw supply remains exact',async()=>{
 const provider={json:async url=>url.endsWith('/holders')?{items:[{address:{hash:other},value:'123456789012345678901'}],next_page_params:{index:1}}:url.endsWith('/transfers')?{items:[{from:{hash:other},to:{hash:address},total:{value:'17'},transaction_hash:'0xabc',timestamp:'2026-09-21T00:00:00Z'}]}:{name:'New launch',symbol:'NEW',decimals:'18',total_supply:'999999999999999999999',holders_count:'1'}};
 const token={address,name:'Unresolved',symbol:'?',market:null};
 applyTokenDetails(token,await loadTokenDetails(provider,address));
 assert.equal(token.name,'New launch');assert.equal(token.symbol,'NEW');assert.equal(token.market,null);
 assert.equal(token.onchain.totalSupply,'999999999999999999999');assert.equal(token.onchain.holders[0].address,other);assert.equal(token.onchain.transfers[0].to,address);assert.equal(token.onchain.status,'complete');assert.equal(token.onchain.holdersTruncated,true);
});
test('Partial metadata failures retain transfers and distinguish missing sources from empty lists',async()=>{
 const d=await loadTokenDetails({json:async url=>{if(!url.endsWith('/transfers'))throw Error('HTTP 503');return {items:[]};}},address);
 assert.equal(d.status,'partial');assert.equal(d.sources.metadata,'unavailable');assert.equal(d.sources.transfers,'available');assert.equal(d.name,null);assert.equal(d.holderCount,null);
});
test('All provider failures never claim a checked empty token',async()=>{
 const d=await loadTokenDetails({json:async()=>{throw Error('HTTP 401');}},address);
 assert.equal(d.status,'unavailable');assert.equal(d.sources.holders,'unavailable');
});
import {tokenActivity} from '../src/token-details.mjs';
test('Launch age uses block evidence, never first-seen time; active sample excludes duplicate logs',()=>{
 const now=Date.now();const t={seenAt:now,onchain:{launchAt:now-15*60000,checkedAt:now,sources:{transfers:'available'},transfers:Array.from({length:5},(_,i)=>({hash:'0x'+i,logIndex:i,timestamp:new Date(now-i*1000).toISOString(),from:address,to:'0x'+String(i+2).repeat(40)}))}};
 let a=tokenActivity(t,now);assert.equal(a.ageMinutes,15);assert.equal(a.active,true);assert.equal(a.transfers5m,5);
 t.onchain.transfers.push(t.onchain.transfers[0]);assert.equal(tokenActivity(t,now).transfers5m,5);
 assert.equal(tokenActivity({...t,onchain:{...t.onchain,checkedAt:now-181000}},now).active,false);
 assert.equal(tokenActivity({seenAt:now},now).ageMinutes,null);
});
test('Launch time is resolved from the actual factory block',async()=>{
 const now=Math.floor(Date.now()/1000)-900;
 const d=await loadTokenDetails({json:async()=>({items:[]}),rpc:async(method,args)=>{assert.equal(method,'eth_getBlockByNumber');assert.equal(args[0],'0x7b');return {timestamp:'0x'+now.toString(16)};}},address,{block:123});
 assert.equal(d.launchAt,now*1000);
});
import {Provider} from '../src/provider.mjs';
import {companion} from '../src/companion.mjs';
import {blank} from '../src/storage.mjs';
test('Radar retains Blockscout token details and saves when the independent quote provider fails',async()=>{
 const originals=Object.fromEntries(['connect','scan','markets','json','rpc'].map(k=>[k,Provider.prototype[k]]));
 let saved=0;
 try {
  Provider.prototype.connect=async()=>{};
  Provider.prototype.scan=async state=>{state.tokens=[{address,block:12,name:'Unresolved',symbol:'?',market:null}];state.lastScan=Date.now();};
  Provider.prototype.markets=async()=>{throw Error('market source offline');};
  Provider.prototype.rpc=async()=>({timestamp:'0x'+Math.floor(Date.now()/1000-600).toString(16)});
  Provider.prototype.json=async url=>url.endsWith('/holders')||url.endsWith('/transfers')?{items:[]}:{name:'Real metadata',symbol:'META',total_supply:'1000',decimals:'0',holders_count:'0'};
  const app=companion(blank(false),async()=>saved++);
  await app.run({type:'connect',key:'test-only-key'});
  const state=app.snapshot();
  assert.equal(state.tokens[0].name,'Real metadata');assert.equal(state.tokens[0].market,null);assert.equal(state.tokens[0].onchain.status,'complete');assert.equal(state.marketError,'market source offline');assert.ok(saved>0);assert.ok(state.activity[0].chain.ageMinutes>=10);
 } finally {Object.assign(Provider.prototype,originals);}
});

test('Scan failure does not stop quotes and failed scans back off',async()=>{
 const originals=Object.fromEntries(['connect','scan','markets'].map(k=>[k,Provider.prototype[k]]));
 let scans=0,quotes=0;
 try {
  Provider.prototype.connect=async()=>{};
  Provider.prototype.scan=async()=>{scans++;throw Error('api.blockscout.com: HTTP 402');};
  Provider.prototype.markets=async()=>{quotes++;return [{address,name:'Quoted',symbol:'Q',market:{price:1,observedAt:Date.now(),liquidity:1000}}];};
  const state=blank(false);state.tokens=[{address,name:'Unresolved',symbol:'?',market:null}];
  const app=companion(state,async()=>{});
  await app.run({type:'connect',key:'synthetic-only'});
  assert.equal(app.snapshot().tokens[0].market.price,1);
  assert.equal(app.snapshot().connectionMode,'DEGRADED');
  assert.match(app.snapshot().status,/402/);
  await app.run({type:'refresh'});
  assert.equal(scans,1);assert.equal(quotes,1);
 } finally {Object.assign(Provider.prototype,originals);}
});

test('Initial API denial still starts independent quote updates with blocked status',async()=>{
 const originals=Object.fromEntries(['connect','markets'].map(k=>[k,Provider.prototype[k]]));
 try {
  Provider.prototype.connect=async function(){this.blockedError='api.blockscout.com: HTTP 402';throw Error(this.blockedError);};
  Provider.prototype.markets=async()=>[{address,market:{price:2,observedAt:Date.now()}}];
  const state=blank(false);state.tokens=[{address,name:'Token',symbol:'T',market:null}];
  const app=companion(state,async()=>{});
  await app.run({type:'connect',key:'synthetic-only'});
  assert.equal(app.snapshot().connectionMode,'API BLOCKED');
  assert.equal(app.snapshot().connected,false);
  assert.equal(app.snapshot().tokens[0].market.price,2);
 } finally {Object.assign(Provider.prototype,originals);}
});

import {tokenImageUrl} from '../companion/token-media.mjs';
test('Token images accept HTTPS metadata and reject executable or credential-bearing URLs',()=>{
 assert.equal(tokenImageUrl('https://cdn.example.com/cat.png'),'https://cdn.example.com/cat.png');
 for(const value of ['javascript:alert(1)','data:image/svg+xml,test','http://cdn.example.com/a','https://127.0.0.1/a','https://user:password@example.com/a','https://example.com/a?apikey=secret'])assert.equal(tokenImageUrl(value),null);
});
test('Blockscout image and identity load without quotes and survive a later metadata outage',async()=>{
 const p={json:async url=>url.endsWith('/holders')||url.endsWith('/transfers')?{items:[]}:{name:'Fresh Cat',symbol:'FC',icon_url:'https://cdn.example.com/cat.png'}};
 const t={address,market:null};applyTokenDetails(t,await loadTokenDetails(p,address));
 assert.equal(t.imageUrl,'https://cdn.example.com/cat.png');assert.equal(t.name,'Fresh Cat');assert.equal(t.market,null);
 applyTokenDetails(t,await loadTokenDetails({json:async()=>{throw Error('offline');}},address));
 assert.equal(t.imageUrl,'https://cdn.example.com/cat.png');assert.equal(t.onchain.status,'unavailable');
});
test('Radar refreshes token metadata even when launch age exceeds thirty minutes',async()=>{
 const originals=Object.fromEntries(['connect','scan','markets','json'].map(k=>[k,Provider.prototype[k]]));
 try {
  Provider.prototype.connect=async()=>{};
  Provider.prototype.scan=async s=>{s.lastScan=Date.now();};
  Provider.prototype.markets=async()=>[];
  Provider.prototype.json=async url=>url.endsWith('/holders')||url.endsWith('/transfers')?{items:[]}:{name:'Recovered',symbol:'RC'};
  const s=blank(false);s.tokens=[{address,name:'Unresolved',symbol:'?',market:null,onchain:{launchAt:Date.now()-3600000,checkedAt:1}}];
  const app=companion(s,async()=>{});await app.run({type:'connect',key:'synthetic-only'});
  assert.equal(app.snapshot().tokens[0].name,'Recovered');
 }finally{Object.assign(Provider.prototype,originals);}
});

import {researchRead} from '../src/token-details.mjs';
test('Research prioritizes verified active transfers without requiring a quote, and rejects stale activity',()=>{
 const now=Date.now();
 const t={address,market:null,onchain:{checkedAt:now,name:'Cat',holderCount:'10',sources:{metadata:'available',transfers:'available'},transfers:Array.from({length:5},(_,i)=>({hash:'0x'+i,logIndex:i,timestamp:new Date(now-1000).toISOString(),from:address,to:'0x'+String(i+2).repeat(40)}))}};
 assert.equal(researchRead(t,now).verdict,'LOOK CLOSER');
 t.onchain.checkedAt=now-200000;
 assert.equal(researchRead(t,now).verdict,'STALE DATA');
 assert.equal(researchRead({address},now).hasData,false);
});
