import { cp, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const sourceRoot = path.dirname(fileURLToPath(import.meta.url));
const outputRoot = path.resolve(sourceRoot, '../chrome-extension');

await mkdir(path.join(outputRoot, 'icons'), { recursive: true });
await cp(path.join(sourceRoot, 'manifest.json'), path.join(outputRoot, 'manifest.json'));
await cp(path.join(sourceRoot, 'icons'), path.join(outputRoot, 'icons'), { recursive: true });
await cp(path.join(sourceRoot, 'LICENSE'), path.join(outputRoot, 'LICENSE'));
await cp(path.join(sourceRoot, 'NOTICE.md'), path.join(outputRoot, 'NOTICE.md'));
await cp(path.join(sourceRoot, 'node_modules/react/LICENSE'), path.join(outputRoot, 'LICENSE-REACT.txt'));
await cp(path.join(sourceRoot, 'node_modules/react-dom/LICENSE'), path.join(outputRoot, 'LICENSE-REACT-DOM.txt'));
