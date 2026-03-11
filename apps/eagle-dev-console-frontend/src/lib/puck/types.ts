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