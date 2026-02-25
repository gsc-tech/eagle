import React from "react";
import type { BaseWidgetProps } from "../types";
export interface SeriesConfig {
    name: string;
    valueField: string;
    color?: string;
    strokeWidth?: number;
    strokeDasharray?: string;
}
export interface LineChartWidgetProps extends BaseWidgetProps {
    dateField?: string;
    xAxisType?: "date" | "category" | "value";
    seriesConfig?: SeriesConfig[];
    darkMode?: boolean;
}
export declare const LineChartWidget: React.FC<LineChartWidgetProps>;
export declare const LineChartWidgetDef: {
    component: React.FC<LineChartWidgetProps>;
};
