import type { Meta, StoryObj } from "@storybook/react";
import TvLiveCandlestickChartWidget from "../widgets/TvLiveCandlestickChartWidget";
import { mockTvCandlestickData, mockTvBullishCandlestickData, mockTvBearishCandlestickData } from "./mocks/mockWidgetData";
import { useEffect, useRef, useState, useMemo } from "react";
import { WidgetContainer } from "../components/WidgetContainer";
import type { BaseWidgetProps } from "../types";
import {
    createChart,
    ColorType,
    type CandlestickData,
    type Time,
    type IChartApi,
    type ISeriesApi,
    CandlestickSeries,
} from "lightweight-charts";

interface TvLiveCandlestickStoryProps extends BaseWidgetProps {
    dummyData: any[];
    upColor?: string;
    downColor?: string;
    wickUpColor?: string;
    wickDownColor?: string;
    borderVisible?: boolean;
    timeFormat?: 'date' | 'time' | 'datetime';
}

const TvLiveCandlestickStoryWrapper: React.FC<TvLiveCandlestickStoryProps> = ({
    parameters = [],
    fetchMode = 'manual',
    dummyData,
    upColor = "#26a69a",
    downColor = "#ef5350",
    wickUpColor = "#26a69a",
    wickDownColor = "#ef5350",
    borderVisible = false,
    timeFormat = 'date',
}) => {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

    const data = useMemo(() => {
        if (!dummyData || dummyData.length === 0) return [];
        return dummyData.map((item: any) => ({
            date: new Date(item.date).getTime() / 1000,
            open: Number(item.open),
            high: Number(item.high),
            low: Number(item.low),
            close: Number(item.close),
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
                timeVisible: timeFormat === 'time' || timeFormat === 'datetime',
                secondsVisible: timeFormat === 'time' || timeFormat === 'datetime',
            },
        });

        chartRef.current = chart;

        const candleSeries = chart.addSeries(CandlestickSeries, {
            upColor: upColor,
            downColor: downColor,
            wickUpColor: wickUpColor,
            wickDownColor: wickDownColor,
            borderVisible: borderVisible,
        });

        seriesRef.current = candleSeries;

        if (data.length > 0) {
            const candlestickData: CandlestickData[] = data.map((d) => ({
                time: d.date as Time,
                open: Number(d.open),
                high: Number(d.high),
                low: Number(d.low),
                close: Number(d.close),
            }));
            seriesRef.current.setData(candlestickData);
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
    }, [upColor, downColor, wickUpColor, wickDownColor, borderVisible, timeFormat]);

    useEffect(() => {
        if (seriesRef.current && data.length > 0) {
            const candleData: CandlestickData[] = data.map((d) => ({
                time: d.date as Time,
                open: d.open,
                high: d.high,
                low: d.low,
                close: d.close,
            }));

            seriesRef.current.setData(candleData);
        }
    }, [data]);

    return (
        <WidgetContainer
            parameters={parameters}
            onParametersChange={() => { }}
            fetchMode={fetchMode}
        >
            <div className="relative w-full h-full">
                {/* Connection indicator (disconnected in storybook) */}
                <div className="absolute top-2 right-2 z-10">
                    <div
                        className="w-3 h-3 rounded-full bg-gray-400"
                        title="WebSocket not connected (Storybook mode)"
                    />
                </div>
                <div
                    ref={chartContainerRef}
                    className="w-full h-full"
                    style={{ minHeight: '400px' }}
                />
            </div>
        </WidgetContainer>
    );
};

const meta: Meta<typeof TvLiveCandlestickStoryWrapper> = {
    title: "Widgets/TvLiveCandlestickChartWidget",
    component: TvLiveCandlestickStoryWrapper,
    args: {
        fetchMode: "manual",
        parameters: [],
        dummyData: mockTvCandlestickData,
        upColor: "#26a69a",
        downColor: "#ef5350",
        wickUpColor: "#26a69a",
        wickDownColor: "#ef5350",
        borderVisible: false,
        timeFormat: 'date',
    },
    parameters: {
        layout: 'padded',
    },
};

export default meta;

type Story = StoryObj<typeof TvLiveCandlestickStoryWrapper>;

export const Default: Story = {
    args: {
        dummyData: mockTvCandlestickData,
    },
};

export const BullishTrend: Story = {
    args: {
        dummyData: mockTvBullishCandlestickData,
    },
};

export const BearishTrend: Story = {
    args: {
        dummyData: mockTvBearishCandlestickData,
    },
};

export const TimeFormat: Story = {
    args: {
        dummyData: mockTvCandlestickData,
        timeFormat: 'datetime',
    },
};

export const EmptyChart: Story = {
    args: {
        dummyData: [],
    },
};
