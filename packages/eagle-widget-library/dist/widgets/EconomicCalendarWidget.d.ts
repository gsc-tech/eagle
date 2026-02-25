import React from "react";
import type { BaseWidgetProps } from "../types";
export interface EconomicCalendarWidgetProps extends BaseWidgetProps {
    defaultCountry?: string;
    defaultImportance?: "low" | "medium" | "high";
    timezone?: "local" | "utc";
}
export declare const EconomicCalendarWidget: React.FC<EconomicCalendarWidgetProps & {
    darkMode?: boolean;
}>;
export declare const EconomicCalendarWidgetDef: {
    component: React.FC<EconomicCalendarWidgetProps & {
        darkMode?: boolean;
    }>;
};
export default EconomicCalendarWidget;
