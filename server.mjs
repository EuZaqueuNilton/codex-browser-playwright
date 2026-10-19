#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { blockedCallResult, filterToolListResponse } from './src/policy.mjs';

const playwrightMcpVersion = '0.0.83';
const childEnvironment = {};
const runtimeEnvironmentKeys = process.platform === 'win32'
  ? ['PATH', 'HOME', 'USERPROFILE', 'HOMEDRIVE', 'HOMEPATH', 'TEMP', 'TMP', 'SystemRoot', 'WINDIR', 'COMSPEC', 'PATHEXT', 'APPDATA', 'LOCALAPPDATA']
  : ['PATH', 'HOME', 'TMPDIR', 'TMP', 'TEMP'];

// Keep Codex and package-manager credentials out of the Playwright subprocess.
for (const key of runtimeEnvironmentKeys) {
  if (process.env[key]) childEnvironment[key] = process.env[key];
}
for (const key of ['PLAYWRIGHT_MCP_EXTENSION_TOKEN', 'PLAYWRIGHT_MCP_PROFILE_DIR_NAME']) {
  if (process.env[key]) childEnvironment[key] = process.env[key];
}
childEnvironment.PLAYWRIGHT_MCP_CAPS = '';
childEnvironment.PLAYWRIGHT_MCP_WEBMCP = 'false';

const child = spawn(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['--yes', `@playwright/mcp@${playwrightMcpVersion}`, '--extension', '--no-webmcp'],
  {
    env: childEnvironment,
    shell: process.platform === 'win32',
    stdio: ['pipe', 'pipe', 'inherit'],
  },
);

const pendingToolsListIds = new Set();

function writeMessage(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

const serverOutput = createInterface({ input: child.stdout, crlfDelay: Infinity });
serverOutput.on('line', line => {
  try {
    const message = JSON.parse(line);
    const requestId = JSON.stringify(message?.id);
    if (message?.id !== undefined && pendingToolsListIds.delete(requestId)) {
      writeMessage(filterToolListResponse(message));
      return;
    }
    writeMessage(message);
  } catch {
    process.stdout.write(`${line}\n`);
  }
});

const clientInput = createInterface({ input: process.stdin, crlfDelay: Infinity });
clientInput.on('line', line => {
  let message;
  try {
    message = JSON.parse(line);
  } catch {
    child.stdin.write(`${line}\n`);
    return;
  }

  if (message?.method === 'tools/list' && message.id !== undefined) {
    pendingToolsListIds.add(JSON.stringify(message.id));
  }

  const blockedResult = blockedCallResult(message);
  if (blockedResult) {
    writeMessage(blockedResult);
    return;
  }

  child.stdin.write(`${line}\n`);
});

clientInput.on('close', () => child.stdin.end());
child.on('error', () => {
  process.stderr.write('Unable to start the pinned Playwright MCP package. Install Node.js and npm, then try again.\n');
  process.exitCode = 1;
});
child.on('close', code => {
  process.exitCode = code ?? 1;
});
