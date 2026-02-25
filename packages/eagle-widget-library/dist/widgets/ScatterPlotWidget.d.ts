import React from "react";
import type { BaseWidgetProps } from "../types";
export interface ScatterPlotWidgetProps extends BaseWidgetProps {
    xField?: string;
    yField?: string;
    sizeField?: string;
    categoryField?: string;
    pointColor?: string;
    pointSize?: number;
    showTrendLine?: boolean;
    enableZoom?: boolean;
}
export declare const ScatterPlotWidget: React.FC<ScatterPlotWidgetProps & {
    darkMode?: boolean;
}>;
export declare const ScatterPlotWidgetDef: {
    component: React.FC<ScatterPlotWidgetProps & {
        darkMode?: boolean;
    }>;
};
