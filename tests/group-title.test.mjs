import test from 'node:test';
import assert from 'node:assert/strict';
import { CODEX_GROUP_TITLE } from '../extension-src/src/groupTitle.mjs';

test('uses the exact required name for every Codex tab group', () => {
  assert.equal(CODEX_GROUP_TITLE, 'codex');
});
