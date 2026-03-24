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

export type DependentWidgetCallback = (data: any[][]) => void;

interface SheetSubscription {
    widgetId: string;
    range: RangeConfig;
    callback: DependentWidgetCallback;
}

interface SheetState {
    // sheetName -> SheetData
    sheets: Record<string, SheetData>;

    // sheetName -> timeouts for debouncing
    updateTimeouts: Record<string, NodeJS.Timeout>;

    // Subscriptions: sheetName -> array of subscriptions
    subscriptions: Record<string, SheetSubscription[]>;

    // Actions
    updateCell: (sheetId: string, row: number, col: number, value: any) => void;
    updateCells: (sheetId: string, updates: { row: number; col: number; value: any }[]) => void;
    setSheet: (sheetId: string, data: any) => void;
    setSheets: (sheetsData: Record<string, any>) => void;
    subscribe: (sheetId: string, widgetId: string, range: RangeConfig, callback: DependentWidgetCallback) => void;
    unsubscribe: (sheetId: string, widgetId: string) => void;

    // Internal method to trigger updates to dependents
    _notifyDependents: (sheetId: string) => void;
}

const DEBOUNCE_MS = 5 * 1000; // 5 seconds

export function extractRangeData(sheet: SheetData, range: RangeConfig): any[][] {
    const result: any[][] = [];

    // Always extract row 0 (headers) for the specified columns
    const headerRow: any[] = [];
    for (let c = range.startCol; c <= range.endCol; c++) {
        headerRow.push(sheet[0]?.[c]?.v ?? null);
    }
    result.push(headerRow);

    // Then extract the requested range rows, skipping row 0 if it was included in the range
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

export const useSheetStore = create<SheetState>((set, get) => ({
    sheets: {},
    updateTimeouts: {},
    subscriptions: {},

    updateCell: (sheetId, row, col, value) => {
        console.log("sending update", sheetId, row, col, value);
        get().updateCells(sheetId, [{ row, col, value }]);
    },

    updateCells: (sheetId, updates) => {
        set((state) => {
            const sheet = state.sheets[sheetId] || {};
            const newSheet = { ...sheet };

            updates.forEach(({ row, col, value }) => {
                if (!newSheet[row]) newSheet[row] = {};
                newSheet[row] = {
                    ...newSheet[row],
                    [col]: { v: value }
                };
            });

            return {
                sheets: { ...state.sheets, [sheetId]: newSheet }
            };
        });

        // Handle debouncing for notifying dependents
        const state = get();
        if (state.updateTimeouts[sheetId]) {
            clearTimeout(state.updateTimeouts[sheetId]);
        }

        const timeout = setTimeout(() => {
            get()._notifyDependents(sheetId);
        }, DEBOUNCE_MS);

        set((state) => ({
            updateTimeouts: { ...state.updateTimeouts, [sheetId]: timeout }
        }));
    },

    setSheets: (sheetsData) => {
        console.log("setting multiple sheets data");
        set((state) => ({
            sheets: { ...state.sheets, ...sheetsData }
        }));

        const state = get();
        Object.keys(sheetsData).forEach(sheetId => {
            if (state.updateTimeouts[sheetId]) {
                clearTimeout(state.updateTimeouts[sheetId]);
            }

            const timeout = setTimeout(() => {
                get()._notifyDependents(sheetId);
            }, DEBOUNCE_MS);

            set((state) => ({
                updateTimeouts: { ...state.updateTimeouts, [sheetId]: timeout }
            }));
        });
    },

    setSheet: (sheetId, data) => {
        console.log("setting full sheet data for", sheetId);
        set((state) => ({
            sheets: { ...state.sheets, [sheetId]: data }
        }));

        const state = get();
        if (state.updateTimeouts[sheetId]) {
            clearTimeout(state.updateTimeouts[sheetId]);
        }

        const timeout = setTimeout(() => {
            get()._notifyDependents(sheetId);
        }, DEBOUNCE_MS);

        set((state) => ({
            updateTimeouts: { ...state.updateTimeouts, [sheetId]: timeout }
        }));
    },

    subscribe: (sheetId, widgetId, range, callback) => {
        set((state) => {
            const sheetSubs = state.subscriptions[sheetId] || [];
            const filtered = sheetSubs.filter(sub => sub.widgetId !== widgetId);
            return {
                subscriptions: {
                    ...state.subscriptions,
                    [sheetId]: [...filtered, { widgetId, range, callback }]
                }
            };
        });

        // Trigger initial update immediately
        const sheet = get().sheets[sheetId];
        if (sheet) {
            const extracted = extractRangeData(sheet, range);
            callback(extracted);
        }
    },

    unsubscribe: (sheetId, widgetId) => {
        set((state) => {
            const sheetSubs = state.subscriptions[sheetId] || [];
            return {
                subscriptions: {
                    ...state.subscriptions,
                    [sheetId]: sheetSubs.filter(sub => sub.widgetId !== widgetId)
                }
            };
        });
    },

    _notifyDependents: (sheetId) => {
        const state = get();
        const sheet = state.sheets[sheetId];
        const subs = state.subscriptions[sheetId];

        if (!sheet || !subs) return;

        subs.forEach(sub => {
            const data = extractRangeData(sheet, sub.range);
            console.log("sending data to widget", data);
            sub.callback(data);
        });
    }
}));
