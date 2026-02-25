import type { Meta, StoryObj } from "@storybook/react";
import { MetricWidget } from "../widgets/MetricWidget";
import { mockMetricData, mockSingleMetric, mockMultipleMetrics } from "./mocks/mockWidgetData";
import { useMemo } from "react";
import { WidgetContainer } from "../components/WidgetContainer";
import type { BaseWidgetProps } from "../types";

interface MetricStoryProps extends BaseWidgetProps {
    dummyData: any[];
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

const MetricStoryWrapper: React.FC<MetricStoryProps> = ({
    parameters = [],
    fetchMode = 'manual',
    dummyData,
    labelField = "label",
    valueField = "value",
    deltaField = "delta",
    positiveColor = "#00C853",
    negativeColor = "#FF1744",
    neutralColor = "#9CA3AF",
    backgroundColor = "#ffffff",
    textColor = "#111827",
    itemsPerRow = 3,
    showDelta = true,
}) => {
    const processedData = useMemo(() => {
        if (!dummyData) return [];
        const dataArray = Array.isArray(dummyData) ? dummyData : [dummyData];

        return dataArray.map((item: any) => ({
            label: item[labelField] || "Label",
            value: item[valueField] || "-",
            delta: item[deltaField] !== undefined ? item[deltaField] : null,
            originalData: item,
        }));
    }, [dummyData, labelField, valueField, deltaField]);

    return (
        <WidgetContainer
            parameters={parameters}
            onParametersChange={() => { }}
            fetchMode={fetchMode}
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
                            // Simulate Icons
                            let DeltaIcon = <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="mr-0.5"><path d="M5 12h14" /></svg>;

                            if (!isNaN(deltaValue)) {
                                if (deltaValue > 0) {
                                    deltaColor = positiveColor;
                                    DeltaIcon = <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="mr-0.5"><path d="m5 12 7-7 7 7" /><path d="M12 19V5" /></svg>;
                                } else if (deltaValue < 0) {
                                    deltaColor = negativeColor;
                                    DeltaIcon = <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="mr-0.5"><path d="M12 5v14" /><path d="m19 12-7 7-7-7" /></svg>;
                                }
                            }

                            return (
                                <div
                                    key={index}
                                    className="flex flex-col p-4 rounded-xl border border-border-light bg-bg-card shadow-sm hover:shadow-premium-hover transition-all duration-300 group cursor-default"
                                    style={{
                                        backgroundColor: backgroundColor === '#ffffff' ? undefined : backgroundColor, // Use class bg if default
                                    }}
                                >
                                    <div
                                        className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2 truncate group-hover:text-chart-primary transition-colors"
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
                                                {DeltaIcon}
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

const meta: Meta<typeof MetricStoryWrapper> = {
    title: "Widgets/MetricWidget",
    component: MetricStoryWrapper,
    args: {
        fetchMode: "manual",
        parameters: [],
        dummyData: mockMetricData,
        labelField: "label",
        valueField: "value",
        deltaField: "delta",
        positiveColor: "#22c55e",
        negativeColor: "#ef4444",
        neutralColor: "#6b7280",
        backgroundColor: "#ffffff",
        textColor: "#191919",
        itemsPerRow: 3,
        showDelta: true,
    },
    parameters: {
        layout: 'padded',
    },
};

export default meta;

type Story = StoryObj<typeof MetricStoryWrapper>;

export const Default: Story = {
    args: {
        dummyData: mockMetricData,
    },
};

export const SingleMetric: Story = {
    args: {
        dummyData: mockSingleMetric,
        itemsPerRow: 1,
    },
};

export const MultipleMetrics: Story = {
    args: {
        dummyData: mockMultipleMetrics,
        itemsPerRow: 3,
    },
};

export const TwoColumns: Story = {
    args: {
        dummyData: mockMetricData,
        itemsPerRow: 2,
    },
};

export const FourColumns: Story = {
    args: {
        dummyData: mockMultipleMetrics,
        itemsPerRow: 4,
    },
};

export const NoDelta: Story = {
    args: {
        dummyData: mockMetricData,
        showDelta: false,
    },
};

export const EmptyMetrics: Story = {
    args: {
        dummyData: [],
    },
};
