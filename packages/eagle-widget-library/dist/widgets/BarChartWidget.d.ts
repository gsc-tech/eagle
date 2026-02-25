import { BaseWidgetProps } from "../types";
export interface BarChartWidgetProps extends BaseWidgetProps {
    upColor?: string;
    downColor?: string;
    backgroundColor?: string;
    textColor?: string;
    valueField?: string;
    colorMode?: "static" | "price-based" | "custom";
    staticColor?: string;
    showYAxis?: boolean;
}
export declare const BarChartWidget: React.FC<BarChartWidgetProps & {
    darkMode?: boolean;
}>;
export declare const BarChartWidgetDef: {
    component: import("react").FC<BarChartWidgetProps & {
        darkMode?: boolean;
    }>;
};
