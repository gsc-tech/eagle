import React from "react";
import type { BaseWidgetProps } from "../types";
export interface TvCandlestickChartWidgetProps extends BaseWidgetProps {
}
declare const TvCandlestickChartWidget: React.FC<TvCandlestickChartWidgetProps & {
    darkMode?: boolean;
}>;
export default TvCandlestickChartWidget;
export declare const TvCandlestickChartWidgetDef: {
    component: React.FC<TvCandlestickChartWidgetProps & {
        darkMode?: boolean;
    }>;
};
