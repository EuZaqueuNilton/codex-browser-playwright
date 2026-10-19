import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const extensionRoot = path.join(projectRoot, 'chrome-extension');

test('bundled extension connects to Playwright MCP and names its tab group codex', async () => {
  const manifest = JSON.parse(await readFile(path.join(extensionRoot, 'manifest.json'), 'utf8'));
  const extensionId = [...createHash('sha256').update(Buffer.from(manifest.key, 'base64')).digest().subarray(0, 16)]
    .map(byte => String.fromCharCode(97 + (byte >> 4), 97 + (byte & 15)))
    .join('');

  assert.equal(manifest.name, 'Codex Browser Control');
  assert.equal(manifest.version, '1.1.0');
  assert.equal(extensionId, 'mmlmfjhmonkocbjadbfplnigmagldckm');
  assert.deepEqual(manifest.permissions, ['debugger', 'activeTab', 'tabs', 'tabGroups']);
  assert.deepEqual(manifest.host_permissions, ['<all_urls>']);

  await readFile(path.join(extensionRoot, manifest.background.service_worker));
  await readFile(path.join(extensionRoot, 'LICENSE-REACT.txt'));
  await readFile(path.join(extensionRoot, 'LICENSE-REACT-DOM.txt'));

  const background = await readFile(path.join(extensionRoot, 'lib/background.mjs'), 'utf8');
  assert.match(background, /['"]codex['"]/);
  assert.equal(background.includes('codex (2)'), false);
  assert.doesNotMatch(background, /Playwright · /);

  const connectPage = await readFile(path.join(extensionRoot, 'lib/ui/connect.js'), 'utf8');
  assert.match(connectPage, /127\.0\.0\.1/);
  assert.match(connectPage, /\[::1\]/);
});
