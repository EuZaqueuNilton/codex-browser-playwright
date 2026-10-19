export function createGroupController({ groupTab, updateGroup, ungroupTabs, groupStyle }) {
  let groupId = null;
  let groupCreation = null;
  let closePromise = null;
  let closed = false;
  const tabIds = new Set();
  const pendingAdds = new Set();
  const pendingAddsByTab = new Map();

  async function addTabInternal(tabId) {
    if (groupId === null) {
      if (!groupCreation) {
        const initialTabId = tabId;
        const creation = (async () => {
          groupId = await groupTab({ tabIds: [initialTabId] });
          tabIds.add(initialTabId);
          await updateGroup(groupId, groupStyle);
          return { groupId, initialTabId };
        })();
        groupCreation = creation;
        creation.then(
          () => {
            if (groupCreation === creation)
              groupCreation = null;
          },
          () => {
            if (groupCreation === creation)
              groupCreation = null;
          },
        );
      }

      const { groupId: activeGroupId, initialTabId } = await groupCreation;
      if (tabId !== initialTabId) {
        await groupTab({ groupId: activeGroupId, tabIds: [tabId] });
        tabIds.add(tabId);
      }
      return;
    }

    await groupTab({ groupId, tabIds: [tabId] });
    tabIds.add(tabId);
  }

  function addTab(tabId) {
    if (closed || tabIds.has(tabId))
      return Promise.resolve();
    const existing = pendingAddsByTab.get(tabId);
    if (existing)
      return existing;

    const operation = addTabInternal(tabId);
    pendingAdds.add(operation);
    pendingAddsByTab.set(tabId, operation);
    const clear = () => {
      pendingAdds.delete(operation);
      if (pendingAddsByTab.get(tabId) === operation)
        pendingAddsByTab.delete(tabId);
    };
    operation.then(clear, clear);
    return operation;
  }

  function close() {
    if (closePromise)
      return closePromise;
    closed = true;
    closePromise = (async () => {
      await Promise.allSettled([...pendingAdds]);
      const tabsToUngroup = [...tabIds];
      tabIds.clear();
      if (tabsToUngroup.length)
        await ungroupTabs(tabsToUngroup);
    })();
    return closePromise;
  }

  return {
    addTab,
    close,
    groupId: () => groupId,
    hasTab: tabId => tabIds.has(tabId),
    removeTab: tabId => tabIds.delete(tabId),
    trackTab: tabId => tabIds.add(tabId),
    tabIds: () => [...tabIds],
  };
}
