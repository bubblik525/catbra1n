import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { storage, blank } from '../src/storage.mjs';
import { render, selected } from '../src/view.mjs';
import { demoTokens } from '../src/demo.mjs';
import { settle, clones, summary, clean } from '../src/core.mjs';
import { Provider, FACTORY, TOPIC } from '../src/provider.mjs';
test('all seven screens render bounded text; provider control sequences cannot execute', () => {
  const state = { ...blank(true), tokens: demoTokens() };
  state.tokens[0].symbol = '\x1b]52;c;bad\x07';
  for (const width of [76, 106, 120])
    for (let tab = 0; tab < 7; tab++) {
      const screen = render(
        {
          state,
          tab,
          index: 0,
          filter: '',
          baseline: {},
          events: [],
          message: 'DEMO',
        },
        width,
        38,
        false,
      );
      assert.ok(!screen.includes('\x1b'));
      assert.ok(screen.split('\r\n').every((line) => line.length <= width));
      assert.ok(screen.split('\r\n').length <= 38);
    }
  assert.equal(clean('\x1b\x07\u009b'), '');
});
test('game selection persists across desks; stale, wrong-pool and pre-deadline quotes rejected', () => {
  const tokens = demoTokens(),
    t = tokens[4],
    g = {
      address: t.address,
      direction: 'up',
      entry: { address: t.address, price: 1, pair: 'p' },
      due: 1000,
    };
  assert.equal(
    selected({ state: { tokens }, tab: 5, gamePick: t.address })?.address,
    t.address,
  );
  assert.equal(
    settle(
      g,
      { address: t.address, price: 2, pair: 'p', observedAt: 999 },
      1001,
    ).result,
    undefined,
  );
  assert.equal(
    settle(
      g,
      { address: t.address, price: 2, pair: 'q', observedAt: 1000 },
      1001,
    ).result,
    undefined,
  );
  assert.equal(
    settle(
      g,
      { address: t.address, price: 2, pair: 'p', observedAt: 1000 },
      1001,
    ).result,
    'won',
  );
  assert.equal(settle(g, null, 121001).result, 'void');
});
test('unknown clone names and UTC dates are handled honestly', () => {
  assert.equal(
    clones([
      { name: 'Unresolved', symbol: '?', block: 1 },
      { name: 'Unresolved', symbol: '?', block: 2 },
    ]).length,
    0,
  );
  const now = Date.UTC(2026, 8, 11, 12);
  assert.equal(
    summary(
      [
        { seenAt: Date.UTC(2026, 8, 11) - 1 },
        { seenAt: now },
        { seenAt: now + 1 },
      ],
      now,
    ).today,
    1,
  );
});
test('state survives restart; lock prevents concurrent writers; demo stays separate', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'sheriff-test-'));
  try {
    const db = await storage(dir);
    await assert.rejects(() => storage(dir), /Another terminal/);
    db.state.tokens = demoTokens();
    await Promise.all([
      db.save(db.state),
      db.save({ ...db.state, cursor: 123 }),
    ]);
    await db.close();
    const again = await storage(dir);
    assert.equal(again.state.cursor, 123);
    assert.equal(again.state.tokens.length, 28);
    const demo = await storage(dir, true);
    assert.equal(demo.state.tokens.length, 0);
    await demo.close();
    await again.close();
    assert.ok(
      !(await readFile(join(dir, 'state.json'), 'utf8')).includes('proapi_'),
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
test('factory scan resumes, ignores removed logs, and failures do not advance cursor', async () => {
  const state = blank(false),
    address = '1'.repeat(40),
    creator = '2'.repeat(40),
    calls = [];
  const provider = new Provider('synthetic-key', async (url, init) => {
    calls.push({ url, headers: init.headers });
    const req = JSON.parse(init.body);
    return Response.json({
      result:
        req.method === 'eth_blockNumber'
          ? '0x1000'
          : [
              {
                address: FACTORY,
                topics: [
                  TOPIC,
                  '0x' + '0'.repeat(24) + address,
                  '0x' + '0'.repeat(64),
                  '0x' + '0'.repeat(24) + creator,
                ],
                blockNumber: '0xff0',
                transactionHash: '0xabc',
              },
            ],
    });
  });
  await provider.scan(state);
  assert.equal(state.tokens.length, 1);
  assert.equal(state.cursor, 4084);
  assert.equal(state.tokens[0].creator, '0x' + creator);
  provider.fetcher = async () => Response.json({ error: { code: -32000 } });
  await assert.rejects(() => provider.scan(state));
  assert.equal(state.cursor, 4084);
  assert.ok(
    calls.every((c) => new URL(c.url).searchParams.get('apikey') === 'synthetic-key' && !c.headers.Authorization),
  );
});
test('API keys are never sent to the market provider; chain mismatches fail', async () => {
  let headers;
  const p = new Provider('test-only', async (url, init) => {
    headers = init.headers;
    return Response.json([]);
  });
  await p.markets(['0x' + '1'.repeat(40)]);
  assert.equal(headers.Authorization, undefined);
  p.fetcher = async (url, init) =>
    Response.json(init.body ? { result: '0x1' } : {});
  await assert.rejects(() => p.connect(), /Wrong chain/);
});

test('80x24 works, complete evidence can scroll, and clone selection matches its row',()=>{
 const state={...blank(true),tokens:demoTokens()},app={state,tab:0,index:0,filter:'',baseline:{},events:[]};
 const screen=render(app,80,24,false);assert.ok(screen.includes('1 RADAR'));assert.ok(!screen.includes('Make this terminal'));
 app.tab=4;assert.equal(selected(app).address,clones(state.tokens.slice(0,500))[0].a.address);
 app.showReport=true;app.report={address:state.tokens[0].address,lines:['A'.repeat(180),'FINAL EVIDENCE']};app.detailScroll=2;assert.ok(render(app,80,24,false).includes('FINAL EVIDENCE'));
});
test('corrupted nested state is rejected without overwriting the original archive',async()=>{
 const {writeFile}=await import('node:fs/promises');const dir=await mkdtemp(join(tmpdir(),'sc-corrupt-'));
 try{const malformed={...blank(false),tokens:[null]};await writeFile(join(dir,'state.json'),JSON.stringify(malformed));await assert.rejects(()=>storage(dir),/Cannot read/);assert.deepEqual(JSON.parse(await readFile(join(dir,'state.json'),'utf8')),malformed)}finally{await rm(dir,{recursive:true,force:true})}
});
test('missing pool, invalid JSON and rate-limit cooldown are explicit failures',async()=>{
 const a='0x'+'a'.repeat(40);
 const p=new Provider('test-only',async()=>Response.json([{chainId:'robinhood',baseToken:{address:a},priceUsd:'1'}]));await assert.rejects(()=>p.quote(a),/No indexed price/);
 p.fetcher=async()=>new Response('not json');await assert.rejects(()=>p.metadata(a),/invalid JSON/);
 let n=0;p.fetcher=async()=>{n++;return new Response('',{status:429,headers:{'retry-after':'60'}})};await assert.rejects(()=>p.metadata(a),/cooldown/);assert.equal(n,1);
});
test('authentication failure never prints credential in the error',async()=>{
 const key='synthetic-secret-for-test',p=new Provider(key,async()=>new Response('secret body '+key,{status:401}));await assert.rejects(()=>p.connect(),e=>e.message.includes('401')&&!e.message.includes(key));
});

test('Blockscout 402 stops repeated calls but leaves market provider available', async()=>{
 let calls=0;
 const p=new Provider('synthetic-only',async url=>{
   calls++;
   if(new URL(url).hostname==='api.blockscout.com') {
     assert.equal(new URL(url).searchParams.get('apikey'),'synthetic-only');
     return new Response('',{status:402});
   }
   assert.equal(new URL(url).searchParams.has('apikey'),false);
   return Response.json([]);
 });
 await assert.rejects(()=>p.connect(),/402/);
 await assert.rejects(()=>p.connect(),/402/);
 assert.equal(calls,1);
 assert.equal(p.status,'API BLOCKED');
 await p.markets(['0x'+'1'.repeat(40)]);
 assert.equal(calls,2);
});

test('Credit exhaustion reports the provider reason without exposing response contents',async()=>{
 const key='test-secret';
 const p=new Provider(key,async()=>Response.json({error:'Out of credits',private:key},{status:402}));
 await assert.rejects(()=>p.connect(),e=>e.message.includes('Out of credits')&&!e.message.includes(key));
});
test('Confirmed new launches appear on subsequent scans without duplicate rows or lost metadata',async()=>{
 let head=100,phase=0;
 const a='0x'+'1'.repeat(40),b='0x'+'2'.repeat(40),creator='0x'+'3'.repeat(40);
 const state=blank(false),p=new Provider('synthetic-only');
 p.rpc=async(method,params)=>{
  if(method==='eth_blockNumber')return '0x'+head.toString(16);
  const range=params[0];
  const block=phase?89:88;
  assert.ok(Number(BigInt(range.fromBlock))<=block);
  assert.ok(Number(BigInt(range.toBlock))>=block);
  const event={address:FACTORY,topics:[TOPIC,'0x'+'0'.repeat(24)+(phase?b:a).slice(2),'0x'+'0'.repeat(64),'0x'+'0'.repeat(24)+creator.slice(2)],blockNumber:'0x'+block.toString(16),transactionHash:'0xabc'};
  return [event,event,{...event,removed:true}];
 };
 await p.scan(state);assert.equal(state.tokens.length,1);
 state.tokens[0].name='Retained';state.tokens[0].imageUrl='https://cdn.example.com/a.png';
 phase=1;head=101;await p.scan(state);
 assert.equal(state.tokens.length,2);assert.equal(state.tokens[0].address,b);assert.equal(state.tokens[1].name,'Retained');
 assert.equal(state.scanProgress.remainingBlocks,0);assert.equal(state.scanProgress.scannedThrough,89);
});
