import type { BaseWidgetProps } from "../types";
export interface MetricWidgetProps extends BaseWidgetProps {
    labelField?: string;
    valueField?: string;
    deltaField?: string;
    positiveColor?: string;
    negativeColor?: string;
    neutralColor?: string;
    backgroundColor?: string;
    textColor?: string;
    itemsPerRow?: number;
    showDelta?: boolean;
}
export declare const MetricWidget: React.FC<MetricWidgetProps & {
    darkMode?: boolean;
}>;
export declare const MetricWidgetDef: {
    component: import("react").FC<MetricWidgetProps & {
        darkMode?: boolean;
    }>;
};
