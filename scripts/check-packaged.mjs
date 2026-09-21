import { spawn } from 'node:child_process';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
const executable = resolve(process.argv[2]);
const report = join(await mkdtemp(join(tmpdir(), 'catbrain-result-')), 'result.json');
const child = spawn(executable, ['--demo', '--smoke-test'], {
  stdio: 'inherit', env: {...process.env, CATBRAIN_SMOKE_REPORT: report},
});
const timeout = setTimeout(() => child.kill(), 60000);
try {
  await new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('exit', (code, signal) => code === 0 ? resolve() : reject(Error(`Packaged app failed: ${code} / ${signal}`)));
  });
  const result = JSON.parse(await readFile(report, 'utf8'));
  if (!result.ok || !result.packaged) throw Error('Packaged smoke report missing');
  console.log(JSON.stringify(result));
} finally { clearTimeout(timeout); }
