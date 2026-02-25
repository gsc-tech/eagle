import type { Meta, StoryObj } from "@storybook/react";
import { BarChartWidget } from "../widgets/BarChartWidget";
import { mockBarChartData, mockHighVolumeBarData, mockLowVolumeBarData } from "./mocks/mockWidgetData";
import { ColorType, createChart, HistogramSeries, type IChartApi, type ISeriesApi, type HistogramData } from "lightweight-charts";
import { useEffect, useMemo, useRef } from "react";
import { WidgetContainer } from "../components/WidgetContainer";
import type { BaseWidgetProps } from "../types";

interface BarChartStoryProps extends BaseWidgetProps {
    dummyData: any[];
    upColor?: string;
    downColor?: string;
    backgroundColor?: string;
    textColor?: string;
    valueField?: string;
    colorMode?: "static" | "price-based" | "custom";
    staticColor?: string;
    showYAxis?: boolean;
}

const BarChartStoryWrapper: React.FC<BarChartStoryProps> = ({
    parameters = [],
    fetchMode = 'manual',
    dummyData,
    upColor = "#26a69a",
    downColor = "#ef5350",
    backgroundColor = "#ffffff",
    textColor = "#191919",
    valueField = "volume",
    colorMode = "price-based",
    staticColor = "#2962FF",
    showYAxis = true,
}) => {
    const chartContainerRef = useRef<HTMLDivElement | null>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const seriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);

    const processBarData = (rawData: any[]): HistogramData[] => {
        return rawData.map((item: any) => {
            const timestamp = typeof item.time === 'string' ? new Date(item.time).getTime() / 1000 : typeof item.date === 'string' ? new Date(item.date).getTime() / 1000 : item.time;
            let color = staticColor;

            if (colorMode === 'price-based') {
                if (item.open !== undefined && item.close !== undefined) {
                    color = item.close >= item.open ? upColor : downColor;
                } else if (item.color) {
                    color = item.color;
                } else {
                    color = upColor;
                }
            } else if (colorMode === "custom") {
                color = item.color || staticColor;
            } else if (colorMode === "static") {
                color = staticColor;
            }

            return {
                time: timestamp as any,
                value: Number(item[valueField] || item.value || 0),
                color: color,
            };
        });
    };

    const processedData = useMemo(() => {
        return processBarData(dummyData);
    }, [dummyData, colorMode, staticColor, upColor, downColor, valueField]);

    useEffect(() => {
        if (!chartContainerRef.current) return;

        const container = chartContainerRef.current;

        const chart = createChart(container, {
            layout: {
                background: {
                    type: ColorType.Solid,
                    color: backgroundColor
                },
            },
            grid: {
                vertLines: { color: "rgba(197, 203, 206, 0.5)" },
                horzLines: { color: "rgba(197, 203, 206, 0.5)" },
            },
            rightPriceScale: {
                borderColor: "rgba(197, 203, 206, 0.8)",
                visible: showYAxis,
            },
            timeScale: {
                borderColor: "rgba(197, 203, 206, 0.8)",
                timeVisible: true,
                secondsVisible: false,
            },
        });

        chartRef.current = chart;

        const series = chart.addSeries(HistogramSeries, {
            color: staticColor,
            priceFormat: {
                type: valueField === "volume" ? "volume" : "price",
            },
            priceScaleId: showYAxis ? "right" : "",
        });

        seriesRef.current = series;

        if (processedData && processedData.length > 0) {
            series.setData(processedData);
            chart.timeScale().fitContent();
        }

        const observer = new ResizeObserver(() => {
            if (chartContainerRef.current) {
                chart.applyOptions({
                    width: chartContainerRef.current.clientWidth,
                    height: chartContainerRef.current.clientHeight,
                });
            }
        });

        observer.observe(chartContainerRef.current);

        return () => {
            observer.disconnect();
            if (chartRef.current) {
                chartRef.current.remove();
                chartRef.current = null;
            }
        };
    }, [backgroundColor, textColor, showYAxis]);

    useEffect(() => {
        if (seriesRef.current && processedData && processedData.length > 0) {
            seriesRef.current.setData(processedData);
            if (chartRef.current) {
                chartRef.current.timeScale().fitContent();
            }
        }
    }, [processedData]);

    return (
        <WidgetContainer
            parameters={parameters}
            onParametersChange={() => { }}
            fetchMode={fetchMode}
        >
            <div
                ref={chartContainerRef}
                className="w-full h-full"
                style={{ minHeight: '400px' }}
            />
        </WidgetContainer>
    );
};

const meta: Meta<typeof BarChartStoryWrapper> = {
    title: "Widgets/BarChartWidget",
    component: BarChartStoryWrapper,
    args: {
        fetchMode: "manual",
        parameters: [],
        dummyData: mockBarChartData,
        upColor: "#26a69a",
        downColor: "#ef5350",
        backgroundColor: "#ffffff",
        textColor: "#191919",
        valueField: "volume",
        colorMode: "price-based",
        staticColor: "#2962FF",
        showYAxis: true,
    },
    parameters: {
        layout: 'padded',
    },
};

export default meta;

type Story = StoryObj<typeof BarChartStoryWrapper>;

export const Default: Story = {
    args: {
        dummyData: mockBarChartData,
    },
};

export const HighVolume: Story = {
    args: {
        dummyData: mockHighVolumeBarData,
    },
};

export const LowVolume: Story = {
    args: {
        dummyData: mockLowVolumeBarData,
    },
};

export const StaticColor: Story = {
    args: {
        dummyData: mockBarChartData,
        colorMode: "static",
        staticColor: "#8b5cf6",
    },
};

export const NoYAxis: Story = {
    args: {
        dummyData: mockBarChartData,
        showYAxis: false,
    },
};

export const EmptyChart: Story = {
    args: {
        dummyData: [],
    },
};
