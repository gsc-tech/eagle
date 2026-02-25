import type { BaseWidgetProps } from "../types";
export interface HorizontalBarChartWidgetProps extends BaseWidgetProps {
    nameField?: string;
    valueField?: string;
    colorMode?: "value-based" | "static" | "custom";
    positiveColor?: string;
    negativeColor?: string;
    staticColor?: string;
    backgroundColor?: string;
    textColor?: string;
    sortBy?: "value" | "name" | "none";
    sortOrder?: "ascending" | "descending";
    diverging?: boolean;
    showZeroLine?: boolean;
    barHeight?: number;
    maxBars?: number;
    showValues?: boolean;
}
export declare const HorizontalBarChartWidget: React.FC<HorizontalBarChartWidgetProps & {
    darkMode?: boolean;
}>;
export declare const HorizontalBarChartWidgetDef: {
    component: import("react").FC<HorizontalBarChartWidgetProps & {
        darkMode?: boolean;
    }>;
};
