/**
 * Copyright (c) Microsoft Corporation.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { RelayConnection, debugLog } from './relayConnection';
import { CODEX_GROUP_TITLE } from './groupTitle.mjs';
import { createGroupController } from './groupController.mjs';
// Green first, so a lone connection keeps the familiar look.
const PLAYWRIGHT_GROUP_COLORS: GroupColor[] = ['green', 'blue', 'purple', 'orange', 'pink', 'cyan', 'yellow', 'red'];
const NON_DEBUGGABLE_SCHEMES = ['chrome:', 'edge:', 'devtools:'];
const CONNECTED_BADGE = { text: '✓', color: '#4CAF50', title: 'Connected to Codex' };

export function isNonDebuggableUrl(url: string | undefined): boolean {
  return !!url && NON_DEBUGGABLE_SCHEMES.some(s => url.startsWith(s));
}

type GroupColor = `${chrome.tabGroups.Color}`;

export type GroupStyle = {
  title: string;
  color: GroupColor;
};

export function uniqueGroupStyle(_clientName: string | undefined, taken: readonly GroupStyle[]): GroupStyle {
  const colors = new Set(taken.map(style => style.color));
  const color = PLAYWRIGHT_GROUP_COLORS.find(candidate => !colors.has(candidate)) ?? PLAYWRIGHT_GROUP_COLORS[0];
  return { title: CODEX_GROUP_TITLE, color };
}

// The Codex tab group for an active RelayConnection. The Chrome tab group
// is the single source of truth for which tabs the client targets:
//  - User drags a tab in/out → `_onTabGroupChanged` attaches/detaches.
//  - Relay attaches on its own (initial tab, popup, Target.createTarget) →
//    `_onTabAttached` pulls the new tab into the group, whose onUpdated event
//    flows back through `_onTabGroupChanged` for consistency.
// `GroupController` caches membership from Chrome events so hot-path checks in
// `_onTabUpdated` stay synchronous and disconnect can wait for pending moves.
export class ConnectedTabGroup {
  readonly clientName: string | undefined;
  readonly groupStyle: GroupStyle;
  private _connection: RelayConnection;
  private _isTabReserved: (tabId: number) => boolean;
  private _groupController: ReturnType<typeof createGroupController>;
  private _onTabUpdatedListener: (tabId: number, changeInfo: chrome.tabs.OnUpdatedInfo, tab: chrome.tabs.Tab) => void;
  private _onTabRemovedListener: (tabId: number) => void;

  onclose?: () => void;

  constructor(connection: RelayConnection, selectedTab: chrome.tabs.Tab, clientName: string | undefined, groupStyle: GroupStyle, isTabReserved: (tabId: number) => boolean) {
    this.clientName = clientName;
    this.groupStyle = groupStyle;
    this._isTabReserved = isTabReserved;
    this._connection = connection;
    this._groupController = createGroupController({
      groupTab: options => chrome.tabs.group(options),
      updateGroup: (groupId, style) => chrome.tabGroups.update(groupId, style),
      ungroupTabs: tabIds => ungroupTabs(tabIds),
      groupStyle,
    });
    this._connection.onclose = () => this._onConnectionClose();
    this._connection.ontabattached = (tabId: number) => this._onTabAttached(tabId);
    this._connection.ontabdetached = (tabId: number) => this._onTabDetached(tabId);
    this._onTabUpdatedListener = this._onTabUpdated.bind(this);
    this._onTabRemovedListener = this._onTabRemoved.bind(this);
    chrome.tabs.onUpdated.addListener(this._onTabUpdatedListener);
    chrome.tabs.onRemoved.addListener(this._onTabRemovedListener);
    // Seed the relay with the user-selected tab, then close out the initial
    // handshake. The relay holds Playwright-side CDP traffic until
    // `didInitialize` arrives, so it sees a fully populated tab model by the
    // time it handles `Target.setAutoAttach`.
    this._connection.attachTab(selectedTab);
    this._connection.didInitialize();
  }

  connectedTabIds(): number[] {
    return this._groupController.tabIds();
  }

  close(reason: string): void {
    this._connection.close(reason);
  }

  releaseTab(tabId: number): void {
    if (!this._groupController.hasTab(tabId))
      return;
    this._groupController.removeTab(tabId);
    this._connection.detachTab(tabId);
  }

  private _onTabUpdated(tabId: number, changeInfo: chrome.tabs.OnUpdatedInfo, tab: chrome.tabs.Tab): void {
    if (changeInfo.groupId !== undefined)
      this._onTabGroupChanged(tabId, tab);
    if (changeInfo.url === undefined)
      return;
    // Chrome resets per-tab badge state on navigation, so re-apply it.
    if (this._connection.attachedTabs.has(tabId))
      void this._updateBadge(tabId, CONNECTED_BADGE);
    else if (this._groupController.hasTab(tabId) && !isNonDebuggableUrl(changeInfo.url))
      this._connection.attachTab(tab);
  }

  // Single entry point for group membership changes, whether the user dragged
  // or we grouped the tab ourselves. Attaches on entry (if debuggable) and
  // detaches on exit; a chrome:// tab stays in the group until it navigates
  // (handled in _onTabUpdated).
  private _onTabGroupChanged(tabId: number, tab: chrome.tabs.Tab): void {
    const groupId = this._groupController.groupId();
    const inOurGroup = groupId !== null && tab.groupId === groupId;
    const wasInGroup = this._groupController.hasTab(tabId);
    if (inOurGroup === wasInGroup)
      return;
    if (inOurGroup) {
      // Chrome may drop the connect page of a client that is still connecting
      // into our group; that tab is spoken for.
      if (this._isTabReserved(tabId)) {
        void ungroupTabs([tabId]);
        return;
      }
      this._groupController.trackTab(tabId);
      if (!isNonDebuggableUrl(tab.url))
        this._connection.attachTab(tab);
    } else {
      this._groupController.removeTab(tabId);
      if (this._connection.attachedTabs.has(tabId))
        this._connection.detachTab(tabId);
    }
  }

  private _onTabRemoved(tabId: number): void {
    this._groupController.removeTab(tabId);
  }

  private _onTabAttached(tabId: number): void {
    void this._updateBadge(tabId, CONNECTED_BADGE);
    void this._addTabToGroup(tabId);
  }

  // The debugger detached (drag-out, tab close, or external action). Clear the
  // badge but leave the tab in the group — the user's intent is still there,
  // and a subsequent navigation will re-attach via _onTabUpdated.
  private _onTabDetached(tabId: number): void {
    void this._updateBadge(tabId, { text: '' });
  }

  private _onConnectionClose(): void {
    chrome.tabs.onUpdated.removeListener(this._onTabUpdatedListener);
    chrome.tabs.onRemoved.removeListener(this._onTabRemovedListener);
    void this._groupController.close().finally(() => this.onclose?.());
  }

  private async _updateBadge(tabId: number, { text, color, title }: { text: string; color?: string, title?: string }): Promise<void> {
    try {
      await Promise.all([
        chrome.action.setBadgeText({ tabId, text }),
        chrome.action.setTitle({ tabId, title: title || '' }),
        color ? chrome.action.setBadgeBackgroundColor({ tabId, color }) : Promise.resolve(),
      ]);
    } catch (error: any) {
      // Ignore errors as the tab may be closed already.
    }
  }

  // Moves an already-attached tab into our Chrome tab group, creating it on
  // first use. The controller serializes that first group creation so tabs
  // attached at the same time all join the same group.
  private async _addTabToGroup(tabId: number): Promise<void> {
    if (this._groupController.hasTab(tabId))
      return;
    try {
      await retryOnDrag(() => this._groupController.addTab(tabId));
    } catch (error: any) {
      debugLog('Error adding tab to group:', error);
    }
  }

}

export async function ungroupTabs(tabIds: number[]): Promise<void> {
  if (!tabIds.length)
    return;
  try {
    const ids = [tabIds[0], ...tabIds.slice(1)] as [number, ...number[]];
    await retryOnDrag(() => chrome.tabs.ungroup(ids));
  } catch (error: any) {
    debugLog('Error ungrouping tabs:', error);
  }
}

// Chrome throws "user may be dragging a tab" while a drag is in progress.
// Retry with backoff until it clears (or we give up).
async function retryOnDrag(fn: () => Promise<void>): Promise<void> {
  const delays = [0, 100, 200, 400, 800];
  let lastError: unknown;
  for (const delay of delays) {
    if (delay)
      await new Promise(resolve => setTimeout(resolve, delay));
    try {
      await fn();
      return;
    } catch (error: any) {
      if (!error?.message?.includes('user may be dragging a tab'))
        throw error;
      lastError = error;
    }
  }
  throw lastError;
}
