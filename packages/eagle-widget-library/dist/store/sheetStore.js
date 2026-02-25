import { create } from 'zustand';
const DEBOUNCE_MS = 5 * 1000; // 5 seconds
export function extractRangeData(sheet, range) {
    const result = [];
    for (let r = range.startRow; r <= range.endRow; r++) {
        const rowData = [];
        for (let c = range.startCol; c <= range.endCol; c++) {
            rowData.push(sheet[r]?.[c]?.v ?? null);
        }
        result.push(rowData);
    }
    return result;
}
export const useSheetStore = create((set, get) => ({
    sheets: {},
    updateTimeouts: {},
    subscriptions: {},
    updateCell: (sheetId, row, col, value) => {
        get().updateCells(sheetId, [{ row, col, value }]);
    },
    updateCells: (sheetId, updates) => {
        set((state) => {
            const sheet = state.sheets[sheetId] || {};
            const newSheet = { ...sheet };
            updates.forEach(({ row, col, value }) => {
                if (!newSheet[row])
                    newSheet[row] = {};
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
        if (!sheet || !subs)
            return;
        subs.forEach(sub => {
            const data = extractRangeData(sheet, sub.range);
            console.log("sending data to widget", data);
            sub.callback(data);
        });
    }
}));
