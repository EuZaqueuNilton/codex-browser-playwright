#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { mkdir, chmod } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import os from 'node:os';
import path from 'node:path';
import { blockedCallResult, filterToolListResponse } from './src/policy.mjs';

const playwrightMcpVersion = '0.0.83';
const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), '.codex');
const browserProfile = path.resolve(
  process.env.PLAYWRIGHT_BROWSER_PROFILE || path.join(codexHome, 'playwright-browser-profile'),
);

try {
  await mkdir(browserProfile, { recursive: true, mode: 0o700 });
  if (process.platform !== 'win32') await chmod(browserProfile, 0o700);
} catch {
  process.stderr.write('Unable to create the private Playwright browser profile directory.\n');
  process.exit(1);
}

const childEnvironment = { ...process.env };
for (const key of Object.keys(childEnvironment)) {
  if (key.startsWith('PLAYWRIGHT_MCP_')) delete childEnvironment[key];
}
childEnvironment.PLAYWRIGHT_MCP_USER_DATA_DIR = browserProfile;
childEnvironment.PLAYWRIGHT_MCP_CAPS = '';
childEnvironment.PLAYWRIGHT_MCP_WEBMCP = 'false';

const child = spawn(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['--yes', `@playwright/mcp@${playwrightMcpVersion}`, '--no-webmcp'],
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
