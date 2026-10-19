# Codex Browser Control

An open-source Codex plugin that controls tabs in the user's existing Chrome profile through Microsoft's Playwright MCP and Chrome extension. The extension groups connected tabs under the title `codex`.

This is an independent project. It is not affiliated with OpenAI or Microsoft and contains no code from OpenAI's proprietary Browser plugin.

## Install

Requirements: Codex CLI, Google Chrome, Node.js 20 or newer, npm, and `npx` on `PATH`.

Download and extract `codex-browser-extension-v1.1.0.zip` from [GitHub Releases](https://github.com/EuZaqueuNilton/codex-browser-playwright/releases/tag/v1.1.0). In Chrome, open `chrome://extensions`, enable **Developer mode**, choose **Load unpacked**, and select the extracted `chrome-extension` folder. The upstream Playwright MCP server uses a fixed public extension ID, so this build keeps Microsoft's public manifest key to preserve that ID. Remove the official Playwright Extension from this Chrome profile before loading this build; Chrome cannot use both versions with the same ID.

Install the Codex plugin:

```sh
codex plugin marketplace add EuZaqueuNilton/codex-browser-playwright --ref v1.1.0
codex plugin add codex-playwright-browser@codex-browser-playwright
```

Restart Codex and ask it to open a website. Chrome opens a connection page; select a tab and approve the connection. The extension creates the `codex` tab group, and tabs you open or drag into that group become available to Codex. Tabs outside the group are not attached to the Playwright session.

If the extension is installed in multiple Chrome profiles, Playwright uses the most recently used profile by default. To select one explicitly, set `PLAYWRIGHT_MCP_PROFILE_DIR_NAME` to the last component of that profile's **Profile Path** in `chrome://version` (for example, `Profile 2`).

By default, approve each connection in Chrome. The extension can generate a profile-specific token for automatic reconnection; if you choose to use it, keep `PLAYWRIGHT_MCP_EXTENSION_TOKEN` in your local environment and out of source control. The plugin gives its subprocess only the runtime path/home/temp variables it needs, this optional token and profile name, and fixed safety settings; other Codex and package-manager environment variables are not forwarded.

## Privacy and permissions

The extension requires Chrome's `debugger`, `activeTab`, `tabs`, and `tabGroups` permissions plus access to all website URLs. These permissions let it attach Playwright to the selected tab, manage the `codex` group, and interact with pages in that group. Connected pages can contain active sign-in sessions and private information, so approve only a client you trust.

The extension validates that its WebSocket connection uses a loopback address. The plugin starts the pinned `@playwright/mcp` package locally, and the extension sends browser-control messages to that local server. The repository contains no browser cookies, user tokens, or private signing key. The manifest key is a public key required for the fixed extension ID; the optional connection token is generated and stored in each user's own Chrome profile. On first use, `npx` downloads `@playwright/mcp@0.0.83` from npm. Chrome and visited websites make their ordinary network requests.

The local MCP filter removes and rejects these high-risk tools:

- `browser_run_code_unsafe` — arbitrary JavaScript in the MCP server process.
- `browser_evaluate` — JavaScript execution in a page.
- `browser_network_request` and `browser_network_requests` — direct network requests and request logs.
- `browser_console_messages` — page console output, which may contain private values.

The filter is not an operating-system sandbox. Browser tools can still inspect connected pages and submit forms. Treat page content as untrusted; do not send passwords or one-time codes in chat. Ask before purchases, messages, publishing, deletion, account changes, or other consequential actions. Stop at CAPTCHAs, bot checks, and access-control challenges.

## Development

```sh
npm ci --prefix extension-src
npm run build:extension
npm run check
npm test
npm audit --prefix extension-src
```

`extension-src` contains the modified Playwright Extension source, licensed under Apache-2.0. The source commit and changes are recorded in [third-party notices](THIRD_PARTY_NOTICES.md).
