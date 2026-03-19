import React from "react";
import type { ParameterDefinition, ParameterValues } from "../types";
import { ParameterForm } from "./ParameterForm";

interface WidgetContainerProps {
    children: React.ReactNode;
    title?: string;
    parameters?: ParameterDefinition[];
    onParametersChange?: (values: ParameterValues) => void;
    groupedParametersValues?: Record<string, string>;
    onGroupedParametersChange?: (values: Record<string, any>) => void;
}

export const WidgetContainer: React.FC<WidgetContainerProps & { darkMode?: boolean }> = ({
    children,
    title,
    parameters,
    onParametersChange,
    darkMode = false,
    groupedParametersValues,
    onGroupedParametersChange,
}) => {
    const hasTitleOrParams = title || (parameters && parameters.length > 0 && onParametersChange);
    console.log("parameters in widget container is ", parameters);
    return (
        <div
            className={`w-full h-full border overflow-hidden flex flex-col shadow-premium transition-all duration-300 hover:shadow-premium-hover ${darkMode
                ? 'dark bg-[#1f2937] border-gray-700 text-gray-100'
                : 'bg-white border-border-light text-text-primary'
                }`}
        >
            {hasTitleOrParams && (
                <div className={`${darkMode ? 'bg-[#1f2937]' : 'bg-white'}`}>
                    <div className={`flex drag-handle items-center gap-3 px-3 py-2 ${title && parameters && parameters.length > 0 && onParametersChange ? 'flex-wrap' : ''}`}>
                        {title && (
                            <h3 className={`text-sm font-semibold whitespace-nowrap ${darkMode ? 'text-gray-100' : 'text-text-primary'}`}>
                                {title}
                            </h3>
                        )}
                        {parameters && parameters.length > 0 && onParametersChange && (
                            <ParameterForm
                                parameters={parameters}
                                onParametersChange={onParametersChange}
                                darkMode={darkMode}
                                groupedParametersValues={groupedParametersValues}
                                onGroupedParametersChange={onGroupedParametersChange}
                            />
                        )}
                    </div>
                </div>
            )}
            <div className="flex-1 overflow-hidden relative">
                {children}
            </div>
        </div>
    );
};
