import type { BaseWidgetProps } from "../types";
import 'cal-heatmap/cal-heatmap.css';
export interface HeatMapWidgetProps extends BaseWidgetProps {
    range?: number;
    domainType?: 'year' | 'month' | 'week' | 'day' | 'hour';
    subDomainType?: 'year' | 'month' | 'week' | 'day' | 'hour' | 'minute';
    domainSort?: 'asc' | 'desc';
    startDate?: Date | string;
    colorSchemeLight?: string;
    colorSchemeDark?: string;
    dateField?: string;
    valueField?: string;
}
export declare const HeatMapWidget: React.FC<HeatMapWidgetProps & {
    darkMode?: boolean;
}>;
export declare const HeatMapWidgetDef: {
    component: import("react").FC<HeatMapWidgetProps & {
        darkMode?: boolean;
    }>;
};
