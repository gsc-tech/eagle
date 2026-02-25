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
    sheets: Record<string, SheetData>;
    updateTimeouts: Record<string, NodeJS.Timeout>;
    subscriptions: Record<string, SheetSubscription[]>;
    updateCell: (sheetId: string, row: number, col: number, value: any) => void;
    updateCells: (sheetId: string, updates: {
        row: number;
        col: number;
        value: any;
    }[]) => void;
    subscribe: (sheetId: string, widgetId: string, range: RangeConfig, callback: DependentWidgetCallback) => void;
    unsubscribe: (sheetId: string, widgetId: string) => void;
    _notifyDependents: (sheetId: string) => void;
}
export declare function extractRangeData(sheet: SheetData, range: RangeConfig): any[][];
export declare const useSheetStore: import("zustand").UseBoundStore<import("zustand").StoreApi<SheetState>>;
export {};
