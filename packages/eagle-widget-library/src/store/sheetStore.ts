import { create } from 'zustand';

export interface CellValue {
    v: any;
}

export interface SheetData {
    [row: number]: {
        [col: number]: CellValue;
    };
}

export interface RangeConfig {
    startRow: number;
    startCol: number;
    endRow: number;
    endCol: number;
}

export type DependentWidgetCallback = (data: any) => void;

export interface SheetSubscription {
    widgetId: string;
    sheetNames: string[]; // empty array means all sheets
    ranges: RangeConfig[]; // empty array means entire sheet
    callback: DependentWidgetCallback;
}

interface SheetState {
    // workbookId -> sheetName -> SheetData
    workbooks: Record<string, Record<string, SheetData>>;

    // workbookId -> timeouts for debouncing
    updateTimeouts: Record<string, NodeJS.Timeout>;

    // Subscriptions: workbookId -> array of subscriptions
    subscriptions: Record<string, SheetSubscription[]>;

    // Actions
    setSheet: (workbookId: string, sheetName: string, data: any) => void;
    setSheets: (workbookId: string, sheetsData: Record<string, any>) => void;
    deleteSheet: (workbookId: string, sheetName: string) => void;
    subscribe: (workbookId: string, widgetId: string, sheetNames: string[], ranges: RangeConfig[], callback: DependentWidgetCallback) => void;
    unsubscribe: (workbookId: string, widgetId: string) => void;

    // Internal method to trigger updates to dependents
    _notifyDependents: (workbookId: string) => void;
}

const DEBOUNCE_MS = 1000;

export function extractSheetAsGrid(sheet: SheetData): any[][] {
    const rows = Object.keys(sheet).map(Number);
    if (rows.length === 0) return [];

    const maxRow = Math.max(...rows);
    let maxCol = 0;

    rows.forEach(r => {
        const cols = Object.keys(sheet[r] || {}).map(Number);
        if (cols.length > 0) {
            maxCol = Math.max(maxCol, ...cols);
        }
    });

    const result: any[][] = [];
    for (let r = 0; r <= maxRow; r++) {
        const rowData: any[] = [];
        for (let c = 0; c <= maxCol; c++) {
            rowData.push(sheet[r]?.[c]?.v ?? null);
        }
        result.push(rowData);
    }
    return result;
}

export function extractRangeData(sheet: SheetData, range: RangeConfig): any[][] {
    const result: any[][] = [];
    // Include header row (row 0)
    const headerRow: any[] = [];
    for (let c = range.startCol; c <= range.endCol; c++) {
        headerRow.push(sheet[0]?.[c]?.v ?? null);
    }
    result.push(headerRow);

    const actualStartRow = Math.max(1, range.startRow);
    for (let r = actualStartRow; r <= range.endRow; r++) {
        const rowData: any[] = [];
        for (let c = range.startCol; c <= range.endCol; c++) {
            rowData.push(sheet[r]?.[c]?.v ?? null);
        }
        result.push(rowData);
    }
    return result;
}

// Extract data for a subscription based on its sheetNames and ranges criteria
function resolveSubscriptionData(workbook: Record<string, SheetData> | undefined, sub: SheetSubscription): any {
    if (!workbook) {
        return null;
    }

    // If no sheetNames specified, default to all sheets
    const targetSheets = sub.sheetNames.length > 0 ? sub.sheetNames : Object.keys(workbook);

    const result: Record<string, any> = {};

    targetSheets.forEach(sheetName => {
        const sheet = workbook[sheetName];
        if (!sheet) {
            return;
        }

        result[sheetName] = sub.ranges.length > 0
            ? extractRangeData(sheet, sub.ranges[0])
            : extractSheetAsGrid(sheet);
    });

    console.log(`[sheetStore] Resolved data for widget ${sub.widgetId}:`, result);
    // If exactly 1 sheet and 1 range, we can return just the direct array to retain original behavior for simple widgets
    if (sub.sheetNames.length === 1 && sub.ranges.length === 1) {
        return result[sub.sheetNames[0]];
    }

    return result;
}

export const useSheetStore = create<SheetState>((set, get) => ({
    workbooks: {},
    updateTimeouts: {},
    subscriptions: {},

    setSheets: (workbookId, sheetsData) => {
        set((state) => {
            const workbook = state.workbooks[workbookId] || {};
            return {
                workbooks: {
                    ...state.workbooks,
                    [workbookId]: {
                        ...workbook,
                        ...sheetsData
                    }
                }
            };
        });

        const state = get();
        if (state.updateTimeouts[workbookId]) {
            clearTimeout(state.updateTimeouts[workbookId]);
        }
        const timeout = setTimeout(() => {
            get()._notifyDependents(workbookId);
        }, DEBOUNCE_MS);
        set((state) => ({
            updateTimeouts: { ...state.updateTimeouts, [workbookId]: timeout }
        }));
    },

    setSheet: (workbookId, sheetName, data) => {
        set((state) => {
            const workbook = state.workbooks[workbookId] || {};
            return {
                workbooks: {
                    ...state.workbooks,
                    [workbookId]: {
                        ...workbook,
                        [sheetName]: data
                    }
                }
            };
        });

        const state = get();
        if (state.updateTimeouts[workbookId]) {
            clearTimeout(state.updateTimeouts[workbookId]);
        }
        const timeout = setTimeout(() => {
            get()._notifyDependents(workbookId);
        }, DEBOUNCE_MS);
        set((state) => ({
            updateTimeouts: { ...state.updateTimeouts, [workbookId]: timeout }
        }));
    },

    deleteSheet: (workbookId: string, sheetName: string) => {
        set((state) => {
            const workbook = state.workbooks[workbookId] || {};
            const { [sheetName]: _, ...rest } = workbook;
            return {
                workbooks: {
                    ...state.workbooks,
                    [workbookId]: rest
                }
            };
        });

        const state = get();
        if (state.updateTimeouts[workbookId]) {
            clearTimeout(state.updateTimeouts[workbookId]);
        }
        const timeout = setTimeout(() => {
            get()._notifyDependents(workbookId);
        }, DEBOUNCE_MS);
        set((state) => ({
            updateTimeouts: { ...state.updateTimeouts, [workbookId]: timeout }
        }));
    },

    subscribe: (workbookId, widgetId, sheetNames, ranges, callback) => {
        set((state) => {
            const workbookSubs = state.subscriptions[workbookId] || [];
            const filtered = workbookSubs.filter(sub => sub.widgetId !== widgetId);
            return {
                subscriptions: {
                    ...state.subscriptions,
                    [workbookId]: [...filtered, { widgetId, sheetNames, ranges, callback }]
                }
            };
        });

        // Trigger initial update immediately
        const workbook = get().workbooks[workbookId];
        if (workbook) {
            const subData = resolveSubscriptionData(workbook, { widgetId, sheetNames, ranges, callback });
            if (subData) {
                callback(subData);
            }
        }
    },

    unsubscribe: (workbookId, widgetId) => {
        set((state) => {
            const workbookSubs = state.subscriptions[workbookId] || [];
            return {
                subscriptions: {
                    ...state.subscriptions,
                    [workbookId]: workbookSubs.filter(sub => sub.widgetId !== widgetId)
                }
            };
        });
    },

    _notifyDependents: (workbookId) => {
        const state = get();
        const workbook = state.workbooks[workbookId];
        const subs = state.subscriptions[workbookId];

        if (!workbook || !subs) return;

        subs.forEach(sub => {
            const subData = resolveSubscriptionData(workbook, sub);
            if (subData) {
                sub.callback(subData);
            }
        });
    }
}));
