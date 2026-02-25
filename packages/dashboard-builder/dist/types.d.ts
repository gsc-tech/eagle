export interface BackendWidgetConfig {
    name: string;
    componentName: string;
    defaultProps: Record<string, any>;
    [key: string]: any;
}
export type widgetInfo = {
    widgetId: string;
    name: string;
    componentName: string;
    defaultProps: Record<string, any>;
};
export type widgetGroup = Record<string, widgetInfo[]>;
export type widgetGroupWithStatus = Record<string, {
    widgets: widgetInfo[];
    isConnected: boolean;
}>;
export interface DragItem {
    widget: BackendWidgetConfig;
}
export interface CommonLayoutItem {
    i: string;
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
export declare const WIDGET_DRAG_TYPE = "WIDGET";
export declare const DEFAULT_WIDGET_WIDTH = 4;
export declare const DEFAULT_WIDGET_HEIGHT = 3;
export declare const GRID_COLS = 12;
export declare const GRID_ROW_HEIGHT = 60;
export declare const GRID_MARGIN: [number, number];
export declare const GRID_PADDING: [number, number];
