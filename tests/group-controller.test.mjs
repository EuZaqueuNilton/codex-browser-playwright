import test from 'node:test';
import assert from 'node:assert/strict';
import { createGroupController } from '../extension-src/src/groupController.mjs';

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

test('concurrent tabs share one group and all join it', async () => {
  const firstGroup = deferred();
  const groupCalls = [];
  const controller = createGroupController({
    groupTab: async options => {
      groupCalls.push(options);
      return groupCalls.length === 1 ? firstGroup.promise : undefined;
    },
    updateGroup: async () => {},
    ungroupTabs: async () => {},
    groupStyle: { title: 'codex', color: 'green' },
  });

  const first = controller.addTab(11);
  const second = controller.addTab(12);
  firstGroup.resolve(42);
  await Promise.all([first, second]);

  assert.deepEqual(groupCalls, [
    { tabIds: [11] },
    { groupId: 42, tabIds: [12] },
  ]);
  assert.equal(controller.groupId(), 42);
  assert.deepEqual(controller.tabIds(), [11, 12]);
});

test('close waits for pending group creation and ungroups its tabs', async () => {
  const firstGroup = deferred();
  const ungrouped = [];
  const controller = createGroupController({
    groupTab: async () => firstGroup.promise,
    updateGroup: async () => {},
    ungroupTabs: async tabIds => ungrouped.push(...tabIds),
    groupStyle: { title: 'codex', color: 'green' },
  });

  const add = controller.addTab(21);
  const closing = controller.close();
  assert.deepEqual(ungrouped, []);

  firstGroup.resolve(43);
  await Promise.all([add, closing]);

  assert.deepEqual(ungrouped, [21]);
  assert.deepEqual(controller.tabIds(), []);
  await controller.addTab(22);
  assert.deepEqual(controller.tabIds(), []);
});
