# Browser extension source

This folder contains the Playwright Chrome Extension source adapted for the Codex Browser plugin. The upstream is pinned in [NOTICE.md](NOTICE.md); the group-title change is the main behavioral difference.

From the repository root, install the locked build dependencies and rebuild the unpacked extension with:

```sh
npm ci --prefix extension-src
npm run build:extension
```

The build writes to `../chrome-extension`. Load that folder from `chrome://extensions` with Developer mode enabled. See the repository's [installation and privacy instructions](../README.md).
