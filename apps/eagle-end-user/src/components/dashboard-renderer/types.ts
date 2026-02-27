export interface LayoutItem {
    i: string; // unique identifier
    x: number;
    y: number;
    w: number;
    h: number;
    minW?: number;
    maxW?: number;
    minH?: number;
    maxH?: number;
    static?: boolean;
    widget: Record<string, any>;
}

// Grid configuration constants
export const GRID_COLS = 12;
export const GRID_ROW_HEIGHT = 60; // pixels
export const GRID_MARGIN: [number, number] = [16, 16];
