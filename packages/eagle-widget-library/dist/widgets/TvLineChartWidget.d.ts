import React from "react";
import type { BaseWidgetProps } from "../types";
export interface TvLineChartWidgetProps extends BaseWidgetProps {
    lineColor?: string;
    lineWidth?: number;
}
declare const TvLineChartWidget: React.FC<TvLineChartWidgetProps & {
    darkMode?: boolean;
}>;
export default TvLineChartWidget;
export declare const TvLineChartWidgetDef: {
    component: React.FC<TvLineChartWidgetProps & {
        darkMode?: boolean;
    }>;
};
