import type { Meta, StoryObj } from "@storybook/react";
import {
    mockLineChartData,
    mockVolatileChartData,
    mockSteadyGrowthData
} from "./mocks/mockWidgetData";
import { useEffect, useId, useRef } from "react";
import { WidgetContainer } from "../components/WidgetContainer";
import { BaseWidgetProps } from "../types";
import * as am5 from "@amcharts/amcharts5";
import * as am5xy from "@amcharts/amcharts5/xy";
import Animated from "@amcharts/amcharts5/themes/Animated";
import { SeriesConfig } from "../widgets/LineChartWidget";

interface ChartData {
    date: string | number | Date;
    [key: string]: any;
}

interface StoryWrapperProps extends BaseWidgetProps {
    dummyData: ChartData[];
    darkMode?: boolean;
    dateField?: string;
    seriesConfig?: SeriesConfig[];
}

const LineChartStoryWrapper: React.FC<StoryWrapperProps> = ({
    parameters = [],
    fetchMode = 'manual',
    darkMode = false,
    dummyData,
    dateField = "date",
    seriesConfig = [{
        name: "Series",
        valueField: "value",
        color: "#6366f1",
        strokeWidth: 2,
    }],
}) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const rootRef = useRef<any>(null);
    const chartRef = useRef<any>(null);
    const seriesRefs = useRef<any[]>([]);
    const chartId = useId();

    const isMultiSeries = seriesConfig.length > 1;

    useEffect(() => {
        let disposed = false;

        const initChart = () => {
            console.log("darkmode", darkMode);
            const container = containerRef.current;
            if (!container || disposed) return;

            try {
                const root = am5.Root.new(chartId);
                rootRef.current = root;
                root.setThemes([Animated.new(root)]);

                const chart = root.container.children.push(
                    am5xy.XYChart.new(root, {
                        panX: true,
                        panY: true,
                        wheelX: "panX",
                        wheelY: "zoomX",
                        pinchZoomX: true,
                    })
                );
                chartRef.current = chart;

                const cursor = chart.set("cursor", am5xy.XYCursor.new(root, {
                    behavior: "none"
                }));
                cursor.lineY.set("visible", false);

                const xRenderer = am5xy.AxisRendererX.new(root, {});
                if (darkMode) {
                    xRenderer.labels.template.set("fill", am5.color(0xffffff));
                }

                const xAxis = chart.xAxes.push(
                    am5xy.DateAxis.new(root, {
                        maxDeviation: 0.2,
                        baseInterval: { timeUnit: "day", count: 1 },
                        renderer: xRenderer,
                        tooltip: am5.Tooltip.new(root, {}),
                    })
                );

                const yRenderer = am5xy.AxisRendererY.new(root, {});
                if (darkMode) {
                    yRenderer.labels.template.set("fill", am5.color(0xffffff));
                }

                const yAxis = chart.yAxes.push(
                    am5xy.ValueAxis.new(root, {
                        renderer: yRenderer,
                    })
                );

                seriesRefs.current = [];

                seriesConfig.forEach((config) => {
                    const series = chart.series.push(
                        am5xy.LineSeries.new(root, {
                            name: config.name,
                            xAxis: xAxis,
                            yAxis: yAxis,
                            valueYField: config.valueField,
                            valueXField: dateField,
                            tooltip: am5.Tooltip.new(root, {
                                labelText: isMultiSeries ? `${config.name}: {valueY}` : "{valueY}"
                            }),
                        })
                    );

                    series.strokes.template.setAll({
                        stroke: am5.color(config.color || "#6366f1"),
                        strokeWidth: config.strokeWidth || 2,
                    });

                    if (config.strokeDasharray) {
                        series.strokes.template.setAll({
                            strokeDasharray: config.strokeDasharray.split(',').map(Number)
                        });
                    }

                    seriesRefs.current.push(series);
                });

                if (isMultiSeries) {
                    const legend = chart.children.push(
                        am5.Legend.new(root, {
                            centerX: am5.percent(50),
                            x: am5.percent(50),
                        })
                    );

                    if (darkMode) {
                        legend.labels.template.set("fill", am5.color(0xffffff));
                    }

                    legend.data.setAll(chart.series.values);
                }

                if (seriesRefs.current.length > 0 && dummyData && Array.isArray(dummyData)) {
                    console.log("dummyData", dummyData);
                    const sortedData = [...dummyData].sort(
                        (a, b) => new Date(a[dateField]).getTime() - new Date(b[dateField]).getTime()
                    );

                    const processedData = sortedData.map(item => ({
                        ...item,
                        [dateField]: new Date(item[dateField]).getTime()
                    }));

                    seriesRefs.current.forEach(series => {
                        series.data.setAll(processedData);
                    });
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
    }, [chartId, seriesConfig, dateField, darkMode]);

    useEffect(() => {
        if (seriesRefs.current.length > 0 && dummyData && Array.isArray(dummyData)) {
            const sortedData = [...dummyData].sort(
                (a, b) => new Date(a[dateField]).getTime() - new Date(b[dateField]).getTime()
            );

            const processedData = sortedData.map(item => ({
                ...item,
                [dateField]: new Date(item[dateField]).getTime()
            }));

            seriesRefs.current.forEach(series => {
                series.data.setAll(processedData);
            });
        }
    }, [dummyData, dateField]);

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

const meta: Meta<typeof LineChartStoryWrapper> = {
    title: "Widgets/LineChartWidget",
    component: LineChartStoryWrapper,
    args: {
        fetchMode: "manual",
        parameters: [],
        dummyData: mockLineChartData,
        darkMode: false,
    },
    parameters: {
        layout: 'padded',
    },
};

export default meta;

type Story = StoryObj<typeof LineChartStoryWrapper>;

// ========== SINGLE SERIES EXAMPLES ==========

export const Default: Story = {
    args: {
        dummyData: mockLineChartData,
    },
};

export const VolatileMarket: Story = {
    args: {
        dummyData: mockVolatileChartData,
    },
};

export const SteadyGrowth: Story = {
    args: {
        dummyData: mockSteadyGrowthData,
    },
};

export const CustomColor: Story = {
    args: {
        dummyData: mockLineChartData,
        seriesConfig: [
            {
                name: "Price",
                valueField: "value",
                color: "#10b981",
                strokeWidth: 3,
            }
        ],
    },
};

export const ShortTerm: Story = {
    args: {
        dummyData: Array.from({ length: 7 }, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - (7 - i));
            return {
                date: date.toISOString(),
                value: 21000 + (Math.random() - 0.5) * 200,
            };
        }),
    },
};

export const LongTerm: Story = {
    args: {
        dummyData: Array.from({ length: 90 }, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - (90 - i));
            return {
                date: date.toISOString(),
                value: 18000 + (i * 40) + (Math.random() - 0.5) * 300,
            };
        }),
    },
};

export const DarkMode: Story = {
    args: {
        dummyData: mockLineChartData,
        darkMode: true,
    },
};

export const EmptyChart: Story = {
    args: {
        dummyData: [],
    },
};

// ========== MULTI SERIES EXAMPLES ==========

export const MultiSeriesBasic: Story = {
    args: {
        dummyData: Array.from({ length: 30 }, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - (30 - i));
            return {
                date: date.toISOString(),
                price: 20000 + (i * 50) + (Math.random() - 0.5) * 500,
                volume: 1000 + (Math.random() * 500),
                movingAvg: 20000 + (i * 50),
            };
        }),
        seriesConfig: [
            {
                name: "Price",
                valueField: "price",
                color: "#6366f1",
                strokeWidth: 2,
            },
            {
                name: "Volume",
                valueField: "volume",
                color: "#10b981",
                strokeWidth: 2,
            },
            {
                name: "Moving Average",
                valueField: "movingAvg",
                color: "#f59e0b",
                strokeWidth: 2,
                strokeDasharray: "5,5",
            },
        ],
    },
};

export const MultiSeriesComparison: Story = {
    args: {
        dummyData: Array.from({ length: 60 }, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - (60 - i));
            return {
                date: date.toISOString(),
                btc: 40000 + (i * 100) + (Math.random() - 0.5) * 2000,
                eth: 2500 + (i * 10) + (Math.random() - 0.5) * 100,
                bnb: 300 + (i * 2) + (Math.random() - 0.5) * 20,
            };
        }),
        seriesConfig: [
            {
                name: "Bitcoin",
                valueField: "btc",
                color: "#f7931a",
                strokeWidth: 3,
            },
            {
                name: "Ethereum",
                valueField: "eth",
                color: "#627eea",
                strokeWidth: 2,
            },
            {
                name: "Binance Coin",
                valueField: "bnb",
                color: "#f3ba2f",
                strokeWidth: 2,
            },
        ],
    },
};

export const MultiSeriesDashedLines: Story = {
    args: {
        dummyData: Array.from({ length: 30 }, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - (30 - i));
            const baseValue = 20000 + (i * 50);
            return {
                date: date.toISOString(),
                actual: baseValue + (Math.random() - 0.5) * 500,
                forecast: baseValue + 100,
                upperBound: baseValue + 300,
                lowerBound: baseValue - 300,
            };
        }),
        seriesConfig: [
            {
                name: "Actual",
                valueField: "actual",
                color: "#6366f1",
                strokeWidth: 3,
            },
            {
                name: "Forecast",
                valueField: "forecast",
                color: "#10b981",
                strokeWidth: 2,
                strokeDasharray: "5,5",
            },
            {
                name: "Upper Bound",
                valueField: "upperBound",
                color: "#ef4444",
                strokeWidth: 1,
                strokeDasharray: "3,3",
            },
            {
                name: "Lower Bound",
                valueField: "lowerBound",
                color: "#ef4444",
                strokeWidth: 1,
                strokeDasharray: "3,3",
            },
        ],
    },
};

export const MultiSeriesDarkMode: Story = {
    args: {
        dummyData: Array.from({ length: 30 }, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - (30 - i));
            return {
                date: date.toISOString(),
                series1: 20000 + (i * 50) + (Math.random() - 0.5) * 500,
                series2: 21000 + (i * 40) + (Math.random() - 0.5) * 400,
                series3: 19000 + (i * 60) + (Math.random() - 0.5) * 600,
            };
        }),
        seriesConfig: [
            {
                name: "Series 1",
                valueField: "series1",
                color: "#6366f1",
                strokeWidth: 2,
            },
            {
                name: "Series 2",
                valueField: "series2",
                color: "#10b981",
                strokeWidth: 2,
            },
            {
                name: "Series 3",
                valueField: "series3",
                color: "#f59e0b",
                strokeWidth: 2,
            },
        ],
        darkMode: true,
    },
};
