import type { Meta, StoryObj } from "@storybook/react";
import TvLineChartWidget from "../widgets/TvLineChartWidget";
import { mockTvLineChartData, mockTvVolatileLineData, mockTvSteadyLineData } from "./mocks/mockWidgetData";
import { useEffect, useRef, useMemo } from "react";
import { WidgetContainer } from "../components/WidgetContainer";
import type { BaseWidgetProps } from "../types";
import {
    createChart,
    ColorType,
    type LineData,
    type Time,
    type IChartApi,
    type ISeriesApi,
    LineSeries,
} from "lightweight-charts";

interface TvLineChartStoryProps extends BaseWidgetProps {
    dummyData: any[];
    lineColor?: string;
    lineWidth?: number;
}

const TvLineChartStoryWrapper: React.FC<TvLineChartStoryProps> = ({
    parameters = [],
    fetchMode = 'manual',
    dummyData,
    lineColor = "#2962FF",
    lineWidth = 2,
}) => {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const seriesRef = useRef<ISeriesApi<"Line"> | null>(null);

    const data = useMemo(() => {
        if (!dummyData || dummyData.length === 0) return [];
        return dummyData.map((item: any) => ({
            date: new Date(item.date).getTime() / 1000,
            value: Number(item.value),
        }));
    }, [dummyData]);

    useEffect(() => {
        if (!chartContainerRef.current) return;

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: "#ffffff" },
                textColor: "#333",
            },
            grid: {
                vertLines: { color: "#eee" },
                horzLines: { color: "#eee" },
            },
            crosshair: {
                mode: 1,
            },
            timeScale: {
                borderColor: "#ccc",
            },
        });

        chartRef.current = chart;

        const lineSeries = chart.addSeries(LineSeries, {
            color: lineColor,
            lineWidth: lineWidth as any,
        });

        seriesRef.current = lineSeries;

        if (data.length > 0) {
            const lineData: LineData[] = data.map((d) => ({
                time: d.date as Time,
                value: d.value,
            }));
            seriesRef.current.setData(lineData);
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
            chart.remove();
            observer.disconnect();
            chartRef.current = null;
            seriesRef.current = null;
        };
    }, [lineColor, lineWidth]);

    useEffect(() => {
        if (seriesRef.current && data.length > 0) {
            const lineData: LineData[] = data.map((d) => ({
                time: d.date as Time,
                value: d.value,
            }));

            seriesRef.current.setData(lineData);
        }
    }, [data]);

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

const meta: Meta<typeof TvLineChartStoryWrapper> = {
    title: "Widgets/TvLineChartWidget",
    component: TvLineChartStoryWrapper,
    args: {
        fetchMode: "manual",
        parameters: [],
        dummyData: mockTvLineChartData,
        lineColor: "#2962FF",
        lineWidth: 2,
    },
    parameters: {
        layout: 'padded',
    },
};

export default meta;

type Story = StoryObj<typeof TvLineChartStoryWrapper>;

export const Default: Story = {
    args: {
        dummyData: mockTvLineChartData,
    },
};

export const VolatileMarket: Story = {
    args: {
        dummyData: mockTvVolatileLineData,
        lineColor: "#ef4444",
    },
};

export const SteadyGrowth: Story = {
    args: {
        dummyData: mockTvSteadyLineData,
        lineColor: "#10b981",
    },
};

export const ThickLine: Story = {
    args: {
        dummyData: mockTvLineChartData,
        lineWidth: 4,
    },
};

export const EmptyChart: Story = {
    args: {
        dummyData: [],
    },
};
