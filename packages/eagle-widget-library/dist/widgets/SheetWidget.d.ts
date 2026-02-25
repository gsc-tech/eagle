import React from "react";
import type { BaseWidgetProps } from "../types";
import "@univerjs/presets/lib/styles/preset-sheets-core.css";
export interface SheetWidgetProps extends BaseWidgetProps {
    wsUrl?: string;
    sheetName?: string;
    wsColumnMapping?: Record<string, string>;
}
export declare const SheetWidget: React.FC<SheetWidgetProps>;
export declare const SheetWidgetDef: {
    component: React.FC<SheetWidgetProps>;
};
