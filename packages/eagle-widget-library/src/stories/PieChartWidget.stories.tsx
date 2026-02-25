import type { Meta, StoryObj } from "@storybook/react";
import { PieChartWidget } from "../widgets/PieChartWidget";
import { mockPieChartData, mockLargePieChartData } from "./mocks/mockWidgetData";
import { useEffect, useId, useRef, useState, useMemo } from "react";
import { WidgetContainer } from "../components/WidgetContainer";
import type { BaseWidgetProps } from "../types";

interface PieChartStoryProps extends BaseWidgetProps {
    dummyData: any[];
    valueField?: string;
    categoryField?: string;
    donut?: boolean;
    innerRadius?: number;
}

const PieChartStoryWrapper: React.FC<PieChartStoryProps> = ({
    parameters = [],
    fetchMode = 'manual',
    dummyData,
    valueField = "value",
    categoryField = "category",
    donut = false,
    innerRadius = 50,
}) => {
    const chartId = useId();
    const rootRef = useRef<any>(null);
    const chartRef = useRef<any>(null);
    const seriesRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (rootRef.current) {
            rootRef.current.dispose();
            rootRef.current = null;
        }

        let disposed = false;

        const initChart = async () => {
            const container = containerRef.current;

            if (!container || disposed) return;

            try {
                const am5 = await import("@amcharts/amcharts5");
                const am5percent = await import("@amcharts/amcharts5/percent");
                const Animated = (await import("@amcharts/amcharts5/themes/Animated")).default;

                const root = am5.Root.new(chartId);
                rootRef.current = root;

                root.setThemes([Animated.new(root)]);

                const chart = root.container.children.push(
                    am5percent.PieChart.new(root, {
                        layout: root.verticalLayout,
                        innerRadius: donut ? am5.percent(innerRadius) : 0,
                    })
                );
                chartRef.current = chart;

                const series = chart.series.push(
                    am5percent.PieSeries.new(root, {
                        valueField: valueField,
                        categoryField: categoryField,
                        alignLabels: false,
                    })
                );

                series.labels.template.setAll({
                    textType: "circular",
                    radius: 10
                });

                series.slices.template.setAll({
                    tooltipText: "{category}: {valuePercentTotal.formatNumber('0.00')}% ({value})",
                    cornerRadius: 5,
                });

                const legend = chart.children.push(am5.Legend.new(root, {
                    centerX: am5.percent(50),
                    x: am5.percent(50),
                    marginTop: 15,
                    marginBottom: 15,
                }));

                legend.data.setAll(series.dataItems);

                seriesRef.current = series;

                if (dummyData && Array.isArray(dummyData)) {
                    series.data.setAll(dummyData);
                }

                series.appear(1000, 100);
            } catch (error) {
                console.error("Failed to initialize Pie chart: ", error);
            }
        };

        const timeoutId = setTimeout(initChart, 100);

        return () => {
            disposed = true;
            clearTimeout(timeoutId);
            if (rootRef.current) {
                rootRef.current.dispose();
                rootRef.current = null;
            }
        };
    }, [chartId, valueField, categoryField, donut, innerRadius, dummyData]);

    return (
        <WidgetContainer
            parameters={parameters}
            onParametersChange={() => { }}
            fetchMode={fetchMode}
        >
            <div
                ref={containerRef}
                id={chartId}
                className="w-full h-full"
                style={{ minHeight: '400px' }}
            />
        </WidgetContainer>
    );
};

const meta: Meta<typeof PieChartStoryWrapper> = {
    title: "Widgets/PieChartWidget",
    component: PieChartStoryWrapper,
    args: {
        fetchMode: "manual",
        parameters: [],
        dummyData: mockPieChartData,
        valueField: "value",
        categoryField: "category",
        donut: false,
        innerRadius: 50,
    },
    parameters: {
        layout: 'padded',
    },
};

export default meta;

type Story = StoryObj<typeof PieChartStoryWrapper>;

export const Default: Story = {
    args: {
        dummyData: mockPieChartData,
    },
};

export const DonutChart: Story = {
    args: {
        dummyData: mockPieChartData,
        donut: true,
        innerRadius: 50,
    },
};

export const LargeDonut: Story = {
    args: {
        dummyData: mockPieChartData,
        donut: true,
        innerRadius: 70,
    },
};

export const PortfolioAllocation: Story = {
    args: {
        dummyData: mockLargePieChartData,
    },
};

export const EmptyChart: Story = {
    args: {
        dummyData: [],
    },
};
