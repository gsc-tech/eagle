import type { Meta, StoryObj } from "@storybook/react";
import { HorizontalBarChartWidget } from "../widgets/HorizontalBarChartWidget";
import { mockHorizontalBarData, mockLargeHorizontalBarData, mockPositiveHorizontalBarData } from "./mocks/mockWidgetData";
import { useMemo, useState } from "react";
import { WidgetContainer } from "../components/WidgetContainer";
import type { BaseWidgetProps } from "../types";
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

interface HorizontalBarChartStoryProps extends BaseWidgetProps {
    dummyData: any[];
    nameField?: string;
    valueField?: string;
    colorMode?: "value-based" | "static" | "custom";
    positiveColor?: string;
    negativeColor?: string;
    staticColor?: string;
    backgroundColor?: string;
    textColor?: string;
    sortBy?: "value" | "name" | "none";
    sortOrder?: "ascending" | "descending";
    diverging?: boolean;
    showZeroLine?: boolean;
    barHeight?: number;
    maxBars?: number;
    showValues?: boolean;
}

const HorizontalBarChartStoryWrapper: React.FC<HorizontalBarChartStoryProps> = ({
    parameters = [],
    fetchMode = 'manual',
    dummyData,
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
}) => {
    const processedData = useMemo(() => {
        if (!dummyData || !Array.isArray(dummyData)) return [];

        let processed = dummyData.map((item: any) => ({
            name: item[nameField] || "",
            value: Number(item[valueField] || 0),
            color: item.color || null,
            originalData: item,
        }));

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

        if (maxBars && maxBars > 0) {
            processed = processed.slice(0, maxBars);
        }

        return processed.map(item => ({
            ...item,
            displayValue: diverging ? item.value : Math.abs(item.value),
            fillColor: (() => {
                if (colorMode === "custom" && item.color) return item.color;
                if (colorMode === "value-based") return item.value >= 0 ? positiveColor : negativeColor;
                return staticColor;
            })()
        }));
    }, [dummyData, nameField, valueField, sortBy, sortOrder, maxBars, diverging, colorMode, positiveColor, negativeColor, staticColor]);

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

    return (
        <WidgetContainer
            parameters={parameters}
            onParametersChange={() => { }}
            fetchMode={fetchMode}
        >
            <div
                className="w-full h-full overflow-auto"
                style={{ backgroundColor }}
            >
                {processedData.length === 0 ? (
                    <div
                        className="flex items-center justify-center h-full"
                        style={{ color: textColor }}
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
                                    tick={{ fill: textColor, fontSize: 12 }}
                                    interval={0}
                                />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                                {diverging && showZeroLine && (
                                    <ReferenceLine x={0} stroke={textColor} strokeOpacity={0.3} />
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
                                            fill={textColor}
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

const meta: Meta<typeof HorizontalBarChartStoryWrapper> = {
    title: "Widgets/HorizontalBarChartWidget",
    component: HorizontalBarChartStoryWrapper,
    args: {
        fetchMode: "manual",
        parameters: [],
        dummyData: mockHorizontalBarData,
        nameField: "name",
        valueField: "value",
        colorMode: "value-based",
        positiveColor: "#26a69a",
        negativeColor: "#ef5350",
        staticColor: "#2962FF",
        backgroundColor: "#ffffff",
        textColor: "#191919",
        sortBy: "none",
        sortOrder: "descending",
        diverging: false,
        showZeroLine: true,
        barHeight: 32,
        maxBars: 20,
        showValues: true,
    },
    parameters: {
        layout: 'padded',
    },
};

export default meta;

type Story = StoryObj<typeof HorizontalBarChartStoryWrapper>;

export const Default: Story = {
    args: {
        dummyData: mockHorizontalBarData,
    },
};

export const SortedByValue: Story = {
    args: {
        dummyData: mockHorizontalBarData,
        sortBy: "value",
        sortOrder: "descending",
    },
};

export const LargeDataset: Story = {
    args: {
        dummyData: mockLargeHorizontalBarData,
        maxBars: 15,
    },
};

export const PositiveOnly: Story = {
    args: {
        dummyData: mockPositiveHorizontalBarData,
    },
};

export const StaticColor: Story = {
    args: {
        dummyData: mockHorizontalBarData,
        colorMode: "static",
        staticColor: "#8b5cf6",
    },
};

export const NoValues: Story = {
    args: {
        dummyData: mockHorizontalBarData,
        showValues: false,
    },
};

export const EmptyChart: Story = {
    args: {
        dummyData: [],
    },
};
