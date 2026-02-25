import type { BaseWidgetProps } from "../types";
export interface RealtimeWidgetProps extends BaseWidgetProps {
    wsUrl?: string;
    primaryKey?: string;
}
export declare const RealtimeDataTableWidget: React.FC<RealtimeWidgetProps & {
    darkMode?: boolean;
}>;
export declare const RealtimeDataTableWidgetDef: {
    component: import("react").FC<RealtimeWidgetProps & {
        darkMode?: boolean;
    }>;
};
