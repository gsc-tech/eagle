import type { Meta, StoryObj } from "@storybook/react";
import React, { useEffect, useId, useRef } from "react";
import { WidgetContainer } from "../components/WidgetContainer";
import { BaseWidgetProps } from "../types";
import * as am5 from "@amcharts/amcharts5";
import * as am5xy from "@amcharts/amcharts5/xy";
import Animated from "@amcharts/amcharts5/themes/Animated";
import { AmBarSeriesConfig } from "../widgets/AmBarChartWidget";

interface ChartData {
    category: string;
    [key: string]: any;
}

interface StoryWrapperProps extends BaseWidgetProps {
    dummyData: ChartData[];
    darkMode?: boolean;
    categoryField?: string;
    seriesConfig?: AmBarSeriesConfig[];
    orientation?: "vertical" | "horizontal";
    stacked?: boolean;
}

// Wrapper component to render the chart in Storybook
const AmBarChartStoryWrapper: React.FC<StoryWrapperProps> = ({
    parameters = [],
    fetchMode = 'manual',
    darkMode = false,
    dummyData,
    categoryField = "category",
    seriesConfig = [{
        name: "Series 1",
        valueField: "value",
        color: "#6366f1",
    }],
    orientation = "vertical",
    stacked = false,
}) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const rootRef = useRef<am5.Root | null>(null);
    const chartRef = useRef<am5xy.XYChart | null>(null);
    const chartId = useId();

    useEffect(() => {
        let disposed = false;

        const initChart = () => {
            const container = containerRef.current;
            if (!container || disposed) return;

            if (rootRef.current) {
                rootRef.current.dispose();
            }

            try {
                const root = am5.Root.new(chartId);
                rootRef.current = root;
                root.setThemes([Animated.new(root)]);

                const chart = root.container.children.push(
                    am5xy.XYChart.new(root, {
                        panX: false,
                        panY: false,
                        wheelX: "panX",
                        wheelY: "zoomX",
                        layout: root.verticalLayout,
                    })
                );
                chartRef.current = chart;

                // Cursor
                const cursor = chart.set("cursor", am5xy.XYCursor.new(root, {}));
                cursor.lineY.set("visible", false);
                if (orientation === "horizontal") {
                    cursor.lineX.set("visible", false);
                    cursor.lineY.set("visible", true);
                }

                // Axes
                let xAxis, yAxis;
                const isHorizontal = orientation === "horizontal";

                if (isHorizontal) {
                    const yRenderer = am5xy.AxisRendererY.new(root, {
                        minGridDistance: 30,
                        inversed: true,
                        cellStartLocation: 0.1,
                        cellEndLocation: 0.9
                    });
                    if (darkMode) yRenderer.labels.template.set("fill", am5.color(0xffffff));

                    yAxis = chart.yAxes.push(
                        am5xy.CategoryAxis.new(root, {
                            categoryField: categoryField,
                            renderer: yRenderer,
                            tooltip: am5.Tooltip.new(root, {}),
                        })
                    );

                    const xRenderer = am5xy.AxisRendererX.new(root, {});
                    if (darkMode) xRenderer.labels.template.set("fill", am5.color(0xffffff));

                    xAxis = chart.xAxes.push(
                        am5xy.ValueAxis.new(root, {
                            renderer: xRenderer,
                        })
                    );
                } else {
                    const xRenderer = am5xy.AxisRendererX.new(root, {
                        minGridDistance: 30,
                        cellStartLocation: 0.1,
                        cellEndLocation: 0.9
                    });
                    if (darkMode) xRenderer.labels.template.set("fill", am5.color(0xffffff));

                    xAxis = chart.xAxes.push(
                        am5xy.CategoryAxis.new(root, {
                            categoryField: categoryField,
                            renderer: xRenderer,
                            tooltip: am5.Tooltip.new(root, {}),
                        })
                    );

                    const yRenderer = am5xy.AxisRendererY.new(root, {});
                    if (darkMode) yRenderer.labels.template.set("fill", am5.color(0xffffff));

                    yAxis = chart.yAxes.push(
                        am5xy.ValueAxis.new(root, {
                            renderer: yRenderer,
                        })
                    );
                }

                // Series
                seriesConfig.forEach((config) => {
                    const seriesSettings: any = {
                        name: config.name,
                        xAxis: xAxis,
                        yAxis: yAxis,
                        valueYField: isHorizontal ? undefined : config.valueField,
                        valueXField: isHorizontal ? config.valueField : undefined,
                        categoryXField: isHorizontal ? undefined : categoryField,
                        categoryYField: isHorizontal ? categoryField : undefined,
                        stacked: stacked,
                        tooltip: am5.Tooltip.new(root, {
                            labelText: "{name}: {valueY}{valueX}"
                        }),
                    };

                    const series = chart.series.push(am5xy.ColumnSeries.new(root, seriesSettings));

                    if (config.color) {
                        series.columns.template.setAll({
                            fill: am5.color(config.color),
                            stroke: am5.color(config.color),
                        });
                    }

                    series.columns.template.adapters.add("tooltipText", () => {
                        return isHorizontal ? `{name}: {valueX}` : `{name}: {valueY}`;
                    });

                    series.data.setAll(dummyData);
                });

                // Set data for category axis
                if (isHorizontal) {
                    if (yAxis instanceof am5xy.CategoryAxis) yAxis.data.setAll(dummyData);
                } else {
                    if (xAxis instanceof am5xy.CategoryAxis) xAxis.data.setAll(dummyData);
                }

                // Legend
                if (seriesConfig.length > 1) {
                    const legend = chart.children.push(am5.Legend.new(root, {
                        centerX: am5.p50,
                        x: am5.p50
                    }));
                    if (darkMode) legend.labels.template.set("fill", am5.color(0xffffff));
                    legend.data.setAll(chart.series.values);
                }

                chart.appear(1000, 100);

            } catch (error) {
                console.error("Failed to initialize chart:", error);
            }
        };

        initChart();

        return () => {
            disposed = true;
            if (rootRef.current) {
                rootRef.current.dispose();
                rootRef.current = null;
            }
        };
    }, [chartId, seriesConfig, categoryField, orientation, stacked, dummyData, darkMode]);

    return (
        <WidgetContainer
            parameters={parameters}
            onParametersChange={() => { }}
            fetchMode={fetchMode}
            darkMode={darkMode}
        >
            <div
                id={chartId}
                ref={containerRef}
                className="w-full h-full"
                style={{ minHeight: '400px' }}
            />
        </WidgetContainer>
    );
};

const meta: Meta<typeof AmBarChartStoryWrapper> = {
    title: "Widgets/AmBarChartWidget",
    component: AmBarChartStoryWrapper,
    args: {
        fetchMode: "manual",
        parameters: [],
        dummyData: [
            { category: "Jan", value: 100, expenses: 80, profit: 20 },
            { category: "Feb", value: 120, expenses: 90, profit: 30 },
            { category: "Mar", value: 140, expenses: 100, profit: 40 },
            { category: "Apr", value: 130, expenses: 95, profit: 35 },
            { category: "May", value: 170, expenses: 110, profit: 60 },
        ],
        darkMode: false,
    },
    parameters: {
        layout: 'padded',
    },
};

export default meta;

type Story = StoryObj<typeof AmBarChartStoryWrapper>;

// Stories

export const VerticalSingle: Story = {
    args: {
        orientation: "vertical",
        seriesConfig: [{
            name: "Sales",
            valueField: "value",
            color: "#6366f1",
        }],
    }
};

export const HorizontalSingle: Story = {
    args: {
        orientation: "horizontal",
        seriesConfig: [{
            name: "Sales",
            valueField: "value",
            color: "#6366f1",
        }],
    }
};

export const VerticalStacked: Story = {
    args: {
        orientation: "vertical",
        stacked: true,
        seriesConfig: [
            { name: "Expenses", valueField: "expenses", color: "#ef4444" },
            { name: "Profit", valueField: "profit", color: "#10b981" },
        ],
    }
};

export const HorizontalStacked: Story = {
    args: {
        orientation: "horizontal",
        stacked: true,
        seriesConfig: [
            { name: "Expenses", valueField: "expenses", color: "#ef4444" },
            { name: "Profit", valueField: "profit", color: "#10b981" },
        ],
    }
};

export const ClusteredMultiSeries: Story = {
    args: {
        orientation: "vertical",
        stacked: false,
        seriesConfig: [
            { name: "Expenses", valueField: "expenses", color: "#ef4444" },
            { name: "Profit", valueField: "profit", color: "#10b981" },
        ],
    }
};

export const DarkMode: Story = {
    args: {
        darkMode: true,
        orientation: "vertical",
        stacked: true,
        seriesConfig: [
            { name: "Expenses", valueField: "expenses", color: "#ef4444" },
            { name: "Profit", valueField: "profit", color: "#10b981" },
        ],
    }
};
