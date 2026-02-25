import React from "react";
import type { BaseWidgetProps } from "../types";
export interface AmBarSeriesConfig {
    name: string;
    valueField: string;
    color?: string;
    strokeWidth?: number;
}
export interface AmBarChartWidgetProps extends BaseWidgetProps {
    categoryField?: string;
    seriesConfig?: AmBarSeriesConfig[];
    orientation?: "vertical" | "horizontal";
    stacked?: boolean;
    darkMode?: boolean;
}
export declare const AmBarChartWidget: React.FC<AmBarChartWidgetProps>;
export declare const AmBarChartWidgetDef: {
    component: React.FC<AmBarChartWidgetProps>;
};
