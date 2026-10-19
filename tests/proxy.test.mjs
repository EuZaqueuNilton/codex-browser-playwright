import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { spawn } from 'node:child_process';
import { chmod, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('filters tool discovery and blocks restricted calls at the stdio boundary', {
  skip: process.platform === 'win32',
}, async t => {
  const tempRoot = await mkdtemp(path.join(tmpdir(), 'codex-playwright-test-'));
  const binDir = path.join(tempRoot, 'bin');
  const profileDir = path.join(tempRoot, 'private-profile');
  const probePath = path.join(tempRoot, 'child-environment.json');
  await import('node:fs/promises').then(({ mkdir }) => mkdir(binDir));

  const fakeNpx = path.join(binDir, 'npx');
  await writeFile(fakeNpx, `#!/usr/bin/env node
import { createInterface } from 'node:readline';
import { writeFileSync } from 'node:fs';

writeFileSync(process.env.POLICY_PROBE_PATH, JSON.stringify({
  args: process.argv.slice(2),
  profile: process.env.PLAYWRIGHT_MCP_USER_DATA_DIR,
  caps: process.env.PLAYWRIGHT_MCP_CAPS,
  webmcp: process.env.PLAYWRIGHT_MCP_WEBMCP,
  extra: process.env.PLAYWRIGHT_MCP_EXTENSION,
}));

const input = createInterface({ input: process.stdin, crlfDelay: Infinity });
input.on('line', line => {
  const request = JSON.parse(line);
  if (request.method === 'tools/list') {
    process.stdout.write(JSON.stringify({
      jsonrpc: '2.0', id: request.id, result: { tools: [
        { name: 'browser_navigate' },
        { name: 'browser_run_code_unsafe' },
        { name: 'browser_evaluate' },
        { name: 'browser_network_requests' },
      ] },
    }) + '\\n');
    return;
  }
  process.stdout.write(JSON.stringify({
    jsonrpc: '2.0', id: request.id,
    result: { content: [{ type: 'text', text: 'forwarded' }] },
  }) + '\\n');
});
`);
  await chmod(fakeNpx, 0o700);

  const child = spawn(process.execPath, [path.join(projectRoot, 'server.mjs')], {
    env: {
      ...process.env,
      CODEX_HOME: tempRoot,
      PATH: `${binDir}${path.delimiter}${process.env.PATH}`,
      POLICY_PROBE_PATH: probePath,
      PLAYWRIGHT_BROWSER_PROFILE: profileDir,
      PLAYWRIGHT_MCP_USER_DATA_DIR: '/must-be-cleared',
      PLAYWRIGHT_MCP_CAPS: 'storage,network',
      PLAYWRIGHT_MCP_EXTENSION: 'true',
    },
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  t.after(async () => {
    child.kill();
    await rm(tempRoot, { recursive: true, force: true });
  });

  const output = createInterface({ input: child.stdout, crlfDelay: Infinity });
  const queue = [];
  const waiters = [];
  output.on('line', line => {
    const message = JSON.parse(line);
    const waiter = waiters.shift();
    if (waiter) waiter(message);
    else queue.push(message);
  });
  const nextMessage = () => queue.length
    ? Promise.resolve(queue.shift())
    : new Promise(resolve => waiters.push(resolve));

  const send = async request => {
    const response = nextMessage();
    child.stdin.write(`${JSON.stringify(request)}\n`);
    return response;
  };

  const listResponse = await send({ jsonrpc: '2.0', id: 1, method: 'tools/list' });
  assert.deepEqual(listResponse.result.tools.map(tool => tool.name), ['browser_navigate']);

  const blockedResponse = await send({
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: { name: 'browser_run_code_unsafe', arguments: {} },
  });
  assert.equal(blockedResponse.result.isError, true);

  const allowedResponse = await send({
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: { name: 'browser_navigate', arguments: {} },
  });
  assert.equal(allowedResponse.result.content[0].text, 'forwarded');

  const childEnvironment = JSON.parse(await readFile(probePath, 'utf8'));
  assert.deepEqual(childEnvironment.args, ['--yes', '@playwright/mcp@0.0.83', '--no-webmcp']);
  assert.equal(childEnvironment.profile, profileDir);
  assert.equal(childEnvironment.caps, '');
  assert.equal(childEnvironment.webmcp, 'false');
  assert.equal(childEnvironment.extra, undefined);

  if (process.platform !== 'win32') {
    assert.equal((await stat(profileDir)).mode & 0o777, 0o700);
  }

  child.stdin.end();
  await once(child, 'close');
});
