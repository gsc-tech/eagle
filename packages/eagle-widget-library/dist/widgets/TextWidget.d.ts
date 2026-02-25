import React from "react";
import type { BaseWidgetProps } from "../types";
export interface TextWidgetProps extends BaseWidgetProps {
    id?: string;
    text?: string;
    onSync?: (id: string, data: any) => void;
}
export declare const TextWidget: React.FC<TextWidgetProps & {
    darkMode?: boolean;
}>;
export declare const TextWidgetDef: {
    component: React.FC<TextWidgetProps & {
        darkMode?: boolean;
    }>;
};
