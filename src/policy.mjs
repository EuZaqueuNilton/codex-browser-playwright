const blockedTools = new Set([
  'browser_run_code_unsafe',
  'browser_evaluate',
  'browser_network_request',
  'browser_network_requests',
  'browser_console_messages',
]);

export function filterToolListResponse(message) {
  if (!Array.isArray(message?.result?.tools)) {
    return message;
  }

  return {
    ...message,
    result: {
      ...message.result,
      tools: message.result.tools.filter(tool => !blockedTools.has(tool?.name)),
    },
  };
}

export function blockedCallResult(message) {
  if (message?.method !== 'tools/call' || !blockedTools.has(message.params?.name)) {
    return null;
  }

  return {
    jsonrpc: message.jsonrpc ?? '2.0',
    id: message.id ?? null,
    result: {
      content: [{
        type: 'text',
        text: 'This Playwright tool is disabled by the local safety filter. Use structured browser interactions instead.',
      }],
      isError: true,
    },
  };
}
