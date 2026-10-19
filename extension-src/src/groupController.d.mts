export type GroupStyle = {
  title: string;
  color: 'blue' | 'cyan' | 'green' | 'grey' | 'orange' | 'pink' | 'purple' | 'red' | 'yellow';
};

export type GroupControllerOptions = {
  groupTab: (options: { groupId?: number; tabIds: [number, ...number[]] }) => Promise<number>;
  updateGroup: (groupId: number, style: GroupStyle) => Promise<unknown>;
  ungroupTabs: (tabIds: number[]) => Promise<unknown>;
  groupStyle: GroupStyle;
};

export function createGroupController(options: GroupControllerOptions): {
  addTab(tabId: number): Promise<void>;
  close(): Promise<void>;
  groupId(): number | null;
  hasTab(tabId: number): boolean;
  removeTab(tabId: number): boolean;
  trackTab(tabId: number): void;
  tabIds(): number[];
};
