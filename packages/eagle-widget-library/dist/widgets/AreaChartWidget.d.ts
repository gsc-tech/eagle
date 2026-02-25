import React from "react";
import type { BaseWidgetProps } from "../types";
export interface AreaChartWidgetProps extends BaseWidgetProps {
    valueField?: string;
    dateField?: string;
    lineColor?: string;
    fillColor?: string;
    fillOpacity?: number;
    strokeWidth?: number;
}
export declare const AreaChartWidget: React.FC<AreaChartWidgetProps & {
    darkMode?: boolean;
}>;
export declare const AreaChartWidgetDef: {
    component: React.FC<AreaChartWidgetProps & {
        darkMode?: boolean;
    }>;
};
