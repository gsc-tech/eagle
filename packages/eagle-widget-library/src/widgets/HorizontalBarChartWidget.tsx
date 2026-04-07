"use client"

import { useEffect, useMemo, useState } from "react";
import type { BaseWidgetProps, ParameterValues } from "../types";
import { useWidgetData } from "../hooks/useWidgetData";
import { useParameterDefaults } from "../hooks/useParameterDefaults";
import { WidgetContainer } from "../components/WidgetContainer";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    Cell,
    ReferenceLine,
    LabelList
} from "recharts";

export interface HorizontalBarChartWidgetProps extends BaseWidgetProps {
    nameField?: string;           // Field name for category labels (e.g., "symbol", "name")
    valueField?: string;          // Field name for values (e.g., "change", "percentage")
    colorMode?: "value-based" | "static" | "custom";
    positiveColor?: string;       // Color for positive values
    negativeColor?: string;       // Color for negative values
    staticColor?: string;         // Color when using static mode
    backgroundColor?: string;
    textColor?: string;
    sortBy?: "value" | "name" | "none";
    sortOrder?: "ascending" | "descending";
    diverging?: boolean;          // Use diverging layout (negative left, positive right) vs traditional left-aligned
    showZeroLine?: boolean;       // Show reference line at zero (for diverging charts)
    barHeight?: number;           // Height of each bar in pixels
    maxBars?: number;             // Maximum number of bars to display
    showValues?: boolean;         // Show value labels on bars
}

export const HorizontalBarChartWidget: React.FC<HorizontalBarChartWidgetProps & { darkMode?: boolean }> = ({
    apiUrl = "http://localhost:8080/api/data",
    title,
    nameField = "name",
    valueField = "value",
    colorMode = "value-based",
    positiveColor = "#26a69a",
    negativeColor = "#ef5350",
    staticColor = "#2962FF",
    backgroundColor = "#ffffff",
    textColor = "#191919",
    sortBy = "none",
    sortOrder = "descending",
    diverging = false,
    showZeroLine = true,
    barHeight = 32,
    maxBars = 20,
    showValues = true,
    parameters,
    darkMode = false,
    onGroupedParametersChange,
    groupedParametersValues,
    initialWidgetState,
    onWidgetStateChange,
}) => {
    const defaultParams = useParameterDefaults(parameters);
    const [currentParams, setCurrentParams] = useState<ParameterValues>(() => {
        return initialWidgetState?.parameters || defaultParams;
    });

    useEffect(() => {
        if (onWidgetStateChange) {
            onWidgetStateChange({ parameters: currentParams });
        }
    }, [currentParams, onWidgetStateChange]);

    const { data } = useWidgetData(apiUrl as string, {
        parameters: currentParams,
    });

    const handleParametersChange = (values: ParameterValues) => {
        setCurrentParams(values);
    };

    const processedData = useMemo(() => {
        if (!data || !Array.isArray(data)) return [];

        let processed = data.map((item: any) => ({
            name: item[nameField] || "",
            value: Number(item[valueField] || 0),
            color: item.color || null,
            originalData: item,
        }));

        // Apply sorting
        if (sortBy === "value") {
            processed.sort((a, b) => {
                return sortOrder === "ascending" ? a.value - b.value : b.value - a.value;
            });
        } else if (sortBy === "name") {
            processed.sort((a, b) => {
                const comparison = a.name.localeCompare(b.name);
                return sortOrder === "ascending" ? comparison : -comparison;
            });
        }

        // Limit number of bars
        if (maxBars && maxBars > 0) {
            processed = processed.slice(0, maxBars);
        }

        // Add display properties
        return processed.map(item => ({
            ...item,
            // If not diverging, we want all bars to extend positively from 0 (magnitude)
            // but we keep the sign for coloring
            displayValue: diverging ? item.value : Math.abs(item.value),
            fillColor: (() => {
                if (colorMode === "custom" && item.color) return item.color;
                if (colorMode === "value-based") return item.value >= 0 ? positiveColor : negativeColor;
                return staticColor;
            })()
        }));
    }, [data, nameField, valueField, sortBy, sortOrder, maxBars, diverging, colorMode, positiveColor, negativeColor, staticColor]);

    // Calculate total height needed for the chart to support scrolling
    // barHeight + gap (approx 8px)
    const gap = 8;
    const chartHeight = Math.max(processedData.length * (barHeight + gap), 100);

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-white p-2 border border-black/10 rounded shadow-md text-sm text-black">
                    <p className="font-semibold">{data.name}</p>
                    <p>Value: {data.value.toFixed(2)}</p>
                </div>
            );
        }
        return null;
    };

    const effectiveBackgroundColor = (backgroundColor === '#ffffff' && darkMode) ? 'transparent' : backgroundColor;
    const effectiveTextColor = (textColor === '#191919' && darkMode) ? '#D1D5DB' : textColor;

    return (
        <WidgetContainer
            title={title}
            parameters={parameters}
            onParametersChange={handleParametersChange}
            darkMode={darkMode}
            initialParameterValues={currentParams}
            onGroupedParametersChange={onGroupedParametersChange}
            groupedParametersValues={groupedParametersValues}
        >
            <div
                className="w-full h-full overflow-auto"
                style={{ backgroundColor: effectiveBackgroundColor }}
            >
                {processedData.length === 0 ? (
                    <div
                        className="flex items-center justify-center h-full"
                        style={{ color: effectiveTextColor }}
                    >
                        No data available
                    </div>
                ) : (
                    <div style={{ height: `${chartHeight}px`, width: "100%", paddingRight: '16px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                layout="vertical"
                                data={processedData}
                                margin={{ top: 5, bottom: 5 }}
                                barGap={2}
                            >
                                <XAxis type="number" hide />
                                <YAxis
                                    type="category"
                                    dataKey="name"
                                    width={70}
                                    tickMargin={2}
                                    tick={{ fill: effectiveTextColor, fontSize: 12 }}
                                    interval={0}
                                />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                                {diverging && showZeroLine && (
                                    <ReferenceLine x={0} stroke={effectiveTextColor} strokeOpacity={0.3} />
                                )}
                                <Bar
                                    dataKey="displayValue"
                                    barSize={barHeight}
                                    radius={[0, 4, 4, 0]}
                                >
                                    {processedData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fillColor} />
                                    ))}
                                    {showValues && (
                                        <LabelList
                                            dataKey="value"
                                            position="right"
                                            fill={effectiveTextColor}
                                            fontSize={12}
                                            formatter={(val: any) => val ? Number(val).toFixed(2) : ""}
                                        />
                                    )}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>
        </WidgetContainer>
    );
};

export const HorizontalBarChartWidgetDef = {
    component: HorizontalBarChartWidget,
};
