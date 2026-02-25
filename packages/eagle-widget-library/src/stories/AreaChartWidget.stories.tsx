import type { Meta, StoryObj } from "@storybook/react";
import { AreaChartWidget } from "../widgets/AreaChartWidget";
import { mockAreaChartData, mockVolatileAreaData, mockSteadyAreaData } from "./mocks/mockWidgetData";
import { useEffect, useId, useRef, useMemo } from "react";
import { WidgetContainer } from "../components/WidgetContainer";
import type { BaseWidgetProps } from "../types";

interface ChartData {
    date: string | number | Date;
    value: number;
}

interface AreaChartStoryProps extends BaseWidgetProps {
    dummyData: ChartData[];
    valueField?: string;
    dateField?: string;
    lineColor?: string;
    fillColor?: string;
    fillOpacity?: number;
    strokeWidth?: number;
}

const AreaChartStoryWrapper: React.FC<AreaChartStoryProps> = ({
    parameters = [],
    fetchMode = 'manual',
    dummyData,
    valueField = "value",
    dateField = "date",
    lineColor = "#6366f1",
    fillColor = "#6366f1",
    fillOpacity = 0.3,
    strokeWidth = 2,
}) => {
    const rootRef = useRef<any>(null);
    const chartRef = useRef<any>(null);
    const seriesRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const autoId = useId();
    const chartId = `amchart-${autoId}`;

    const data = useMemo(() => {
        if (!dummyData || dummyData.length === 0) return [];
        const sortedData = [...dummyData].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        return sortedData.map(item => ({
            ...item,
            [dateField]: new Date(item.date).getTime()
        }));
    }, [dummyData, dateField]);

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
                const am5xy = await import("@amcharts/amcharts5/xy");
                const Animated = (await import("@amcharts/amcharts5/themes/Animated")).default;

                const root = am5.Root.new(chartId);
                rootRef.current = root;
                root.setThemes([Animated.new(root)]);

                const chart = root.container.children.push(
                    am5xy.XYChart.new(root, {
                        panX: true,
                        panY: true,
                        wheelX: "panX",
                        wheelY: "zoomX",
                        pinchZoomX: true
                    })
                );
                chartRef.current = chart;

                const cursor = chart.set("cursor", am5xy.XYCursor.new(root, {
                    behavior: "none"
                }));
                cursor.lineY.set("visible", false);

                const xAxis = chart.xAxes.push(
                    am5xy.DateAxis.new(root, {
                        maxDeviation: 0.2,
                        baseInterval: {
                            timeUnit: "day",
                            count: 1
                        },
                        renderer: am5xy.AxisRendererX.new(root, {}),
                        tooltip: am5.Tooltip.new(root, {})
                    })
                );

                const yAxis = chart.yAxes.push(
                    am5xy.ValueAxis.new(root, {
                        renderer: am5xy.AxisRendererY.new(root, {})
                    })
                );

                const series = chart.series.push(
                    am5xy.LineSeries.new(root, {
                        name: "Series",
                        xAxis: xAxis,
                        yAxis: yAxis,
                        valueYField: valueField,
                        valueXField: dateField,
                        tooltip: am5.Tooltip.new(root, {
                            labelText: "{valueY}"
                        }),
                        fill: am5.color(fillColor)
                    })
                );

                series.strokes.template.setAll({
                    stroke: am5.color(lineColor),
                    strokeWidth: strokeWidth
                });

                series.fills.template.setAll({
                    fillOpacity: fillOpacity,
                    visible: true
                });

                seriesRef.current = series;

                if (data && data.length > 0) {
                    series.data.setAll(data);
                }

                series.appear(1000);
                chart.appear(1000, 100);

            } catch (error) {
                console.error("Failed to initialize Area chart: ", error);
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
    }, [chartId, lineColor, fillColor, fillOpacity, strokeWidth, valueField, dateField, data]);

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

const meta: Meta<typeof AreaChartStoryWrapper> = {
    title: "Widgets/AreaChartWidget",
    component: AreaChartStoryWrapper,
    args: {
        fetchMode: "manual",
        parameters: [],
        dummyData: mockAreaChartData,
        lineColor: "#6366f1",
        fillColor: "#6366f1",
        fillOpacity: 0.3,
        strokeWidth: 2,
    },
    parameters: {
        layout: 'padded',
    },
};

export default meta;

type Story = StoryObj<typeof AreaChartStoryWrapper>;

export const Default: Story = {
    args: {
        dummyData: mockAreaChartData,
    },
};

export const VolatileMarket: Story = {
    args: {
        dummyData: mockVolatileAreaData,
        lineColor: "#ef4444",
        fillColor: "#ef4444",
    },
};

export const SteadyGrowth: Story = {
    args: {
        dummyData: mockSteadyAreaData,
        lineColor: "#10b981",
        fillColor: "#10b981",
    },
};

export const CustomColors: Story = {
    args: {
        dummyData: mockAreaChartData,
        lineColor: "#f59e0b",
        fillColor: "#f59e0b",
        fillOpacity: 0.5,
        strokeWidth: 3,
    },
};

export const EmptyChart: Story = {
    args: {
        dummyData: [],
    },
};
