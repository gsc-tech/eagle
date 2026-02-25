import React from "react";
import type { BaseWidgetProps } from "../types";
export interface PieChartWidgetProps extends BaseWidgetProps {
    valueField?: string;
    categoryField?: string;
    donut?: boolean;
    innerRadius?: number;
}
export declare const PieChartWidget: React.FC<PieChartWidgetProps & {
    darkMode?: boolean;
}>;
export declare const PieChartWidgetDef: {
    component: React.FC<PieChartWidgetProps & {
        darkMode?: boolean;
    }>;
};
