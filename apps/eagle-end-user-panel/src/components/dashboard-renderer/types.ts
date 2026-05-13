import type { FormulaStep } from "@/lib/formulaEngine";

export interface LocalDataConfig {
    datasetId: string;
    formulaSteps: FormulaStep[];
    /** widgetField → column name in the dataset (including computed columns). */
    fieldMapping: Record<string, string>;
}

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
    widget?: Record<string, any>;
}

// Grid configuration constants
export const GRID_COLS = 12;
export const GRID_ROW_HEIGHT = 60; // pixels
export const GRID_MARGIN: [number, number] = [16, 16];
