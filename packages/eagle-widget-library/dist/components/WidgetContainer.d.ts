import React from "react";
import type { ParameterDefinition, ParameterValues } from "../types";
interface WidgetContainerProps {
    children: React.ReactNode;
    title?: string;
    parameters?: ParameterDefinition[];
    onParametersChange?: (values: ParameterValues) => void;
    groupedParametersValues?: Record<string, string>;
    onGroupedParametersChange?: (values: Record<string, any>) => void;
}
export declare const WidgetContainer: React.FC<WidgetContainerProps & {
    darkMode?: boolean;
}>;
export {};
