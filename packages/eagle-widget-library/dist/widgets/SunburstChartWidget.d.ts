import React from "react";
import type { BaseWidgetProps } from "../types";
export interface SunburstChartWidgetProps extends BaseWidgetProps {
    valueField?: string;
    categoryField?: string;
    childField?: string;
}
export declare const SunburstChartWidget: React.FC<SunburstChartWidgetProps & {
    darkMode?: boolean;
}>;
export declare const SunburstChartWidgetDef: {
    component: React.FC<SunburstChartWidgetProps & {
        darkMode?: boolean;
    }>;
};
