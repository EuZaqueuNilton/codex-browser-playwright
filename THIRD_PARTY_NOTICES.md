# Third-party notices

## Playwright MCP and Playwright Core

At runtime, the plugin downloads [`@playwright/mcp` 0.0.83](https://github.com/microsoft/playwright-mcp) from npm. It depends on Playwright Core. Both are maintained by Microsoft and distributed under the Apache License 2.0. Their source is not copied into this repository.

## Playwright Chrome Extension

The source in [`extension-src`](extension-src/) and the built files in [`chrome-extension`](chrome-extension/) are derived from Microsoft's Playwright Chrome Extension, Apache-2.0, at commit [`e8149b8257d32dcf8f72573ecc43e72439da7080`](https://github.com/microsoft/playwright/tree/e8149b8257d32dcf8f72573ecc43e72439da7080/packages/extension). The local changes set the tab-group title to `codex`, adjust connection-page wording and update links, and set the extension display name. The upstream license is included at `extension-src/LICENSE` and copied into the unpacked build; see `extension-src/NOTICE.md` for the change record.

The build bundles React and React DOM, distributed under the MIT License. Their copyright notices remain in the generated JavaScript, and the full license texts are copied into `chrome-extension/LICENSE-REACT.txt` and `chrome-extension/LICENSE-REACT-DOM.txt`. Build tools are listed with exact versions in `extension-src/package.json` and locked in `extension-src/package-lock.json`.
