import type { ComponentType } from "react";

export interface WidgetLibraryEntry {
    component: ComponentType<any>;
    fields: Record<string, Record<string, any>>;
    defaultProps: Record<string, any>;
}

export interface BackendWidgetConfig {
    name: string;
    componentName: string;
    defaultProps: Record<string, any>
    [key: string]: any;
}

export type WidgetLibrary = Record<string, WidgetLibraryEntry>;

export interface DragItem {
    widget: BackendWidgetConfig;
}

export interface CommonLayoutItem {
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
}

export interface saveLayoutItem extends CommonLayoutItem {
    widgetId: string;
}

export interface LayoutItem extends CommonLayoutItem {
    widget: BackendWidgetConfig;
}

export const WIDGET_DRAG_TYPE = "WIDGET";

// Default dimensions for new widgets
export const DEFAULT_WIDGET_WIDTH = 4; // grid units
export const DEFAULT_WIDGET_HEIGHT = 3; // grid units
export const GRID_COLS = 12;
export const GRID_ROW_HEIGHT = 60; // pixels
export const GRID_MARGIN: [number, number] = [16, 16];
export const GRID_PADDING: [number, number] = [16, 16];
