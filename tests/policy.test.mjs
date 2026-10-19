import test from 'node:test';
import assert from 'node:assert/strict';
import {
  filterToolListResponse,
  blockedCallResult,
} from '../src/policy.mjs';

test('filters restricted tools from a tools/list response', () => {
  const response = {
    jsonrpc: '2.0',
    id: 7,
    result: {
      tools: [
        { name: 'browser_navigate' },
        { name: 'browser_run_code_unsafe' },
        { name: 'browser_evaluate' },
        { name: 'browser_network_request' },
        { name: 'browser_network_requests' },
        { name: 'browser_console_messages' },
        { name: 'browser_snapshot' },
      ],
      nextCursor: 'cursor-2',
    },
  };

  assert.deepEqual(filterToolListResponse(response), {
    ...response,
    result: {
      ...response.result,
      tools: [
        { name: 'browser_navigate' },
        { name: 'browser_snapshot' },
      ],
    },
  });
  assert.equal(response.result.tools.length, 7);
});

test('returns an MCP tool error for direct calls to blocked tools', () => {
  const blockedToolNames = [
    'browser_run_code_unsafe',
    'browser_evaluate',
    'browser_network_request',
    'browser_network_requests',
    'browser_console_messages',
  ];

  for (const [index, name] of blockedToolNames.entries()) {
    const request = {
      jsonrpc: '2.0',
      id: `call-${index}`,
      method: 'tools/call',
      params: { name, arguments: {} },
    };

    assert.deepEqual(blockedCallResult(request), {
      jsonrpc: '2.0',
      id: `call-${index}`,
      result: {
        content: [{
          type: 'text',
          text: 'This Playwright tool is disabled by the local safety filter. Use structured browser interactions instead.',
        }],
        isError: true,
      },
    });
  }
});

test('does not change unrelated MCP messages or allow blocked page evaluation', () => {
  const notification = { jsonrpc: '2.0', method: 'notifications/initialized' };
  const evaluateCall = {
    jsonrpc: '2.0',
    id: 8,
    method: 'tools/call',
    params: { name: 'browser_evaluate', arguments: { function: '() => 1' } },
  };

  assert.equal(filterToolListResponse(notification), notification);
  assert.equal(blockedCallResult(notification), null);
  assert.equal(blockedCallResult(evaluateCall).result.isError, true);
});
