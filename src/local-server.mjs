import {createResearch} from './research.mjs';
import http from 'node:http';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { readFile, writeFile, rename } from 'node:fs/promises';
import {validateAtlas} from '../companion/atlas-data.mjs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { storage } from './storage.mjs';
import { companion } from './companion.mjs';

export async function startCompanion({
  port = 0,
  demo = false,
  dataDir = join(homedir(), '.sheriff-cat', 'companion'),
} = {}) {
  const research = createResearch();
  const db = await storage(resolve(dataDir), demo);
  const app = companion(db.state, db.save);
  await app.initialize();
  const session = randomBytes(32).toString('hex');
  let origin;
  const atlasFile=join(db.dir,demo?'atlas-demo.json':'atlas.json');
  let atlasWrite=Promise.resolve();
  const root = fileURLToPath(new URL('../companion/', import.meta.url));
  const files = {
    '/research-desks.js':['research-desks.js','text/javascript'],
    '/research-desks.css':['research-desks.css','text/css'],
    '/atlas-data.mjs':['atlas-data.mjs','text/javascript'],
    '/lab-math.mjs':['lab-math.mjs','text/javascript'],
    '/vendor/3d-force-graph.min.js':['vendor/3d-force-graph.min.js','text/javascript'],
    '/': ['research.html', 'text/html'],
    '/legacy': ['index.html', 'text/html'],
    '/research.js': ['research.js', 'text/javascript'],
    '/token-media.mjs': ['token-media.mjs', 'text/javascript'],
    '/research.css': ['research.css', 'text/css'],
    '/project-avatar.png': ['project-avatar.png', 'image/png'],
    '/cortex-data.mjs': ['cortex-data.mjs', 'text/javascript'],
    '/cortex-engine.mjs': ['cortex-engine.mjs', 'text/javascript'],
    '/cortex-lab.js': ['cortex-lab.js', 'text/javascript'],
    '/cortex-lab.css': ['cortex-lab.css', 'text/css'],
    '/token-view.js': ['token-view.js', 'text/javascript'],
    '/token-assessment.mjs': ['token-assessment.mjs', 'text/javascript'],
    '/token-view.css': ['token-view.css', 'text/css'],
    '/token-cat.png': ['token-cat.png', 'image/png'],
    '/app.js': ['app.js', 'text/javascript'],
    '/observatory.js': ['observatory.js', 'text/javascript'],
    '/braincat-theme.css': ['braincat-theme.css', 'text/css'],
    '/pets.js': ['pets.js', 'text/javascript'],
    '/braincat-forecast.mjs': ['braincat-forecast.mjs', 'text/javascript'],
    '/braincat-research.js': ['braincat-research.js', 'text/javascript'],
    '/catbrain.js': ['catbrain.js', 'text/javascript'],
    '/catbrain-model.mjs': ['catbrain-model.mjs', 'text/javascript'],
    '/catbrain-visuals.mjs': ['catbrain-visuals.mjs', 'text/javascript'],
    '/catbrain.css': ['catbrain.css', 'text/css'],
    '/catbrain-cat.png': ['catbrain-cat.png', 'image/png'],
    '/style.css': ['style.css', 'text/css'],
    '/cat.svg': ['cat.svg', 'image/svg+xml'],
  };
  const server = http.createServer(async (req, res) => {
    const send = (code, data) => {
      res.writeHead(code, {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      });
      res.end(JSON.stringify(data));
    };
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
    );
    if (
      req.headers.host !== `127.0.0.1:${port}` ||
      (req.headers.origin && req.headers.origin !== origin)
    )
      return send(403, { error: 'Local origin only' });
    const path = new URL(req.url, origin).pathname;
    try {
      if (path.startsWith('/api/')) {
        const key = req.headers['x-sheriff-session'];
        if (
          typeof key !== 'string' ||
          !/^[a-f0-9]{64}$/.test(key) ||
          !timingSafeEqual(Buffer.from(key), Buffer.from(session))
        )
          return send(401, {
            error:
              'Open the private URL from your terminal to unlock this session.',
          });
        if (req.method === 'GET' && path === '/api/state')
          return send(200, app.snapshot());
        if (req.method === 'POST' && path === '/api/action') {
          let text = '';
          for await (const chunk of req) {
            text += chunk;
            if (Buffer.byteLength(text) > 2097152)
              return send(413, { error: 'Request too large' });
          }
          const body = JSON.parse(text);
          if (!body || typeof body.type !== 'string')
            throw Error('Invalid action');
          if(body.type==='atlas-load'){await atlasWrite;try{return send(200,validateAtlas(JSON.parse(await readFile(atlasFile,'utf8'))));}catch(e){if(e.code==='ENOENT')return send(200,null);throw e;}}
          if(body.type==='atlas-save'){const payload=JSON.stringify(validateAtlas(body.data));atlasWrite=atlasWrite.catch(()=>{}).then(async()=>{await writeFile(atlasFile+'.tmp',payload,{mode:0o600});await rename(atlasFile+'.tmp',atlasFile);});await atlasWrite;return send(200,{saved:true});}
          if(Buffer.byteLength(text)>8192)throw Error('Request too large');
          if (['research','research-key','research-disconnect','research-catalog'].includes(body.type)) return send(200, await research(body));
          return send(200, await app.run(body));
        }
        return send(404, { error: 'Unknown endpoint' });
      }
      if (req.method !== 'GET' || !files[path])
        return send(404, { error: 'Not found' });
      const [file, mime] = files[path];
      res.writeHead(200, { 'Content-Type': mime, 'Cache-Control': 'no-store' });
      res.end(await readFile(join(root, file)));
    } catch (e) {
      send(400, { error: e.message });
    }
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolve);
  }).catch(async (error) => {
    await db.close();
    throw error;
  });
  port = server.address().port;
  origin = `http://127.0.0.1:${port}`;
  const timer = setInterval(() => app.tick(), 1000);
  let closing;
  function close() {
    return (closing ||= (async () => {
      clearInterval(timer);
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
      while (app.snapshot().busy)
        await new Promise((resolve) => setTimeout(resolve, 100));
      await atlasWrite.catch(()=>{});
      await db.close();
    })());
  }
  return { url: `${origin}/#${session}`, origin, close };
}
