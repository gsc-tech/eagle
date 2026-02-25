"use client"

import { useMemo, useState } from "react";
import type { BaseWidgetProps, ParameterValues } from "../types";
import { useWidgetData } from "../hooks/useWidgetData";
import { useParameterDefaults } from "../hooks/useParameterDefaults";
import { WidgetContainer } from "../components/WidgetContainer";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";

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

export const MetricWidget: React.FC<MetricWidgetProps & { darkMode?: boolean }> = (props) => {
    const { darkMode = false } = props;
    const {
        apiUrl = "http://localhost:8080/api/data",
        title,
        labelField = "label",
        valueField = "value",
        deltaField = "delta",
        positiveColor = "#00C853",
        negativeColor = "#FF1744",
        neutralColor = darkMode ? "#9CA3AF" : "#9CA3AF",
        backgroundColor = darkMode ? "#1f2937" : "#ffffff",
        textColor = darkMode ? "#f3f4f6" : "#111827",
        itemsPerRow = 3,
        showDelta = true,
        parameters,
        groupedParametersValues,
        onGroupedParametersChange,
    } = props;
    const defaultParams = useParameterDefaults(parameters);
    const [currentParams, setCurrentParams] = useState<ParameterValues>(defaultParams);

    const { data } = useWidgetData(apiUrl as string, {
        parameters: currentParams,
    });

    const handleParametersChange = (values: ParameterValues) => {
        setCurrentParams(values);
    };

    const processedData = useMemo(() => {
        if (!data) return [];
        const dataArray = Array.isArray(data) ? data : [data];

        return dataArray.map((item: any) => ({
            label: item[labelField] || "Label",
            value: item[valueField] || "-",
            delta: item[deltaField] !== undefined ? item[deltaField] : null,
            originalData: item,
        }));
    }, [data, labelField, valueField, deltaField]);

    return (
        <WidgetContainer
            title={title}
            parameters={parameters}
            onParametersChange={handleParametersChange}
            darkMode={darkMode}
            onGroupedParametersChange={onGroupedParametersChange}
            groupedParametersValues={groupedParametersValues}
        >
            <div
                className="w-full h-full overflow-auto p-4"
                style={{ backgroundColor }}
            >
                {processedData.length === 0 ? (
                    <div
                        className="flex flex-col items-center justify-center h-full text-text-muted animate-pulse"
                    >
                        <span>No data available</span>
                    </div>
                ) : (
                    <div
                        className="grid gap-3"
                        style={{
                            gridTemplateColumns: `repeat(${itemsPerRow}, minmax(0, 1fr))`
                        }}
                    >
                        {processedData.map((item, index) => {
                            const deltaValue = parseFloat(item.delta);
                            let deltaColor = neutralColor;
                            let DeltaIcon = Minus;

                            if (!isNaN(deltaValue)) {
                                if (deltaValue > 0) {
                                    deltaColor = positiveColor;
                                    DeltaIcon = ArrowUp;
                                } else if (deltaValue < 0) {
                                    deltaColor = negativeColor;
                                    DeltaIcon = ArrowDown;
                                }
                            }

                            return (
                                <div
                                    key={index}
                                    className={`flex flex-col p-4 rounded-xl border shadow-sm hover:shadow-premium-hover transition-all duration-300 group cursor-default ${darkMode
                                        ? 'bg-gray-800 border-gray-700'
                                        : 'bg-bg-card border-border-light'
                                        }`}
                                    style={{
                                        backgroundColor: (backgroundColor === '#ffffff' || backgroundColor === '#1f2937') ? undefined : backgroundColor, // Use class bg if default
                                    }}
                                >
                                    <div
                                        className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2 truncate group-hover:text-chart-primary dark:group-hover:text-gray-100 transition-colors"
                                        title={item.label}
                                    >
                                        {item.label}
                                    </div>
                                    <div className="flex items-end justify-between gap-2">
                                        <div
                                            className="text-2xl font-bold tracking-tight truncate leading-none"
                                            style={{ color: textColor }}
                                            title={String(item.value)}
                                        >
                                            {item.value}
                                        </div>

                                        {showDelta && item.delta !== null && (
                                            <div
                                                className="flex items-center text-xs font-bold px-1.5 py-0.5 rounded-full bg-opacity-10"
                                                style={{
                                                    color: deltaColor,
                                                    backgroundColor: `${deltaColor}15` // 15% opacity hex
                                                }}
                                            >
                                                <DeltaIcon size={12} className="mr-0.5 stroke-[3px]" />
                                                <span>{Math.abs(Number(item.delta))}{typeof item.delta === 'number' ? '%' : ''}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </WidgetContainer>
    );
};

export const MetricWidgetDef = {
    component: MetricWidget,
};
