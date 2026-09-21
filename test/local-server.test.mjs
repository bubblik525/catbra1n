import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startCompanion } from '../src/local-server.mjs';
test('desktop backend uses assigned port, authenticates requests and releases profile', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'sheriff-desktop-'));
  let server;
  try {
    server = await startCompanion({ demo: true, dataDir: dir });
    const url = new URL(server.url),
      key = url.hash.slice(1);
    assert.notEqual(url.port, '0');
    assert.equal((await fetch(server.origin + '/')).status, 200);
    for (const path of ['/catbrain.js', '/catbrain-model.mjs', '/catbrain-visuals.mjs', '/catbrain.css', '/catbrain-cat.png']) {
      const response = await fetch(server.origin + path);
      assert.equal(response.status, 200, path);
      assert.ok((await response.arrayBuffer()).byteLength > 0);
    }
    assert.equal((await fetch(server.origin + '/api/state')).status, 401);
    const headers = { 'X-Sheriff-Session': key };
    const state = await (
      await fetch(server.origin + '/api/state', { headers })
    ).json();
    assert.equal(state.demo, true);
    assert.equal(state.tokens.length, 28);
    assert.equal(
      (
        await fetch(server.origin + '/api/state', {
          headers: { ...headers, Origin: 'https://untrusted.example' },
        })
      ).status,
      403,
    );
    await server.close();
    server = await startCompanion({ demo: true, dataDir: dir });
    assert.equal(
      (await fetch(server.origin + '/api/state', { headers })).status,
      401,
    );
  } finally {
    await server?.close();
    await rm(dir, { recursive: true, force: true });
  }
});

test('atlas research persists across server restarts and separates demo data', async()=>{
 const dir=await mkdtemp(join(tmpdir(),'catbrain-atlas-'));let server;
 const request=async(body)=>fetch(server.origin+'/api/action',{method:'POST',headers:{'content-type':'application/json','x-sheriff-session':new URL(server.url).hash.slice(1)},body:JSON.stringify(body)});
 try{server=await startCompanion({dataDir:dir});const snapshot={version:1,mode:'chain',patterns:[],nodes:[{id:'0x'+'1'.repeat(40),label:'Test wallet',kind:'address',traceState:'not checked'}],links:[]};assert.equal((await request({type:'atlas-save',data:snapshot})).status,200);await server.close();server=await startCompanion({dataDir:dir});assert.deepEqual(await(await request({type:'atlas-load'})).json(),snapshot);assert.equal((await request({type:'atlas-save',data:{version:0}})).status,400);assert.deepEqual(await(await request({type:'atlas-load'})).json(),snapshot);await server.close();server=await startCompanion({dataDir:dir,demo:true});assert.equal(await(await request({type:'atlas-load'})).json(),null);}finally{await server?.close();await rm(dir,{recursive:true,force:true});}
});

import {switchedModeArgs} from '../desktop/launch-options.mjs';
test('switching recording demo to live drops both demo entry flags',()=>{
 assert.deepEqual(switchedModeArgs(['app','--record-network','--demo'],true),['app']);
 assert.deepEqual(switchedModeArgs(['app'],false),['app','--demo']);
});
