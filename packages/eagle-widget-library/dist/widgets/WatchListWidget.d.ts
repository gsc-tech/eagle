import { BaseWidgetProps } from "../types";
export interface WatchListWidgetProps extends BaseWidgetProps {
    historicalDataUrl?: string;
    wsUrl?: string;
}
declare const WatchListWidget: React.FC<WatchListWidgetProps>;
export default WatchListWidget;
export declare const WatchListWidgetDef: {
    component: import("react").FC<WatchListWidgetProps>;
};
