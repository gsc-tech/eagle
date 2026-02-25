import React from "react";
import type { BaseWidgetProps } from "../types";
export interface ChartData {
    date: string | number | Date;
    open: number;
    high: number;
    low: number;
    close: number;
}
export declare const AmCandlestickChartWidget: React.FC<BaseWidgetProps & {
    darkMode?: boolean;
}>;
export declare const AmCandlestickChartWidgetDef: {
    component: React.FC<BaseWidgetProps & {
        darkMode?: boolean;
    }>;
};
