import type { BaseWidgetProps } from "../types";
export interface MarketDepthWidgetProps extends BaseWidgetProps {
    wsUrl?: string;
}
export declare const MarketDepthWidget: React.FC<MarketDepthWidgetProps & {
    darkMode?: boolean;
}>;
export declare const MarketDepthWidgetDef: {
    component: import("react").FC<MarketDepthWidgetProps & {
        darkMode?: boolean;
    }>;
};
