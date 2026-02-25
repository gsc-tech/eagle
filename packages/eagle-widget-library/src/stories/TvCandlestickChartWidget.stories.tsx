import type { Meta, StoryObj } from "@storybook/react";
import TvCandlestickChartWidget from "../widgets/TvCandlestickChartWidget";
import { mockTvCandlestickData, mockTvBullishCandlestickData, mockTvBearishCandlestickData } from "./mocks/mockWidgetData";
import { useEffect, useRef, useState, useMemo } from "react";
import { WidgetContainer } from "../components/WidgetContainer";
import type { BaseWidgetProps } from "../types";
import {
    createChart,
    ColorType,
    type CandlestickData,
    type Time,
    CandlestickSeries,
} from "lightweight-charts";

interface TvCandlestickStoryProps extends BaseWidgetProps {
    dummyData: any[];
}

const TvCandlestickStoryWrapper: React.FC<TvCandlestickStoryProps> = ({
    parameters = [],
    fetchMode = 'manual',
    dummyData,
}) => {
    const chartContainerRef = useRef<HTMLDivElement>(null);

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
                background: { type: ColorType.Solid, color: "transparent" },
                textColor: "#6B7280", // text-secondary
                fontFamily: "'Inter', sans-serif",
                fontSize: 11,
            },
            grid: {
                vertLines: { color: "rgba(0, 0, 0, 0.04)" },
                horzLines: { color: "rgba(0, 0, 0, 0.04)" },
            },
            rightPriceScale: {
                borderColor: "rgba(0, 0, 0, 0.08)",
            },
            timeScale: {
                borderColor: "rgba(0, 0, 0, 0.08)",
            },
            crosshair: {
                mode: 1,
                vertLine: {
                    labelBackgroundColor: "#2962FF",
                },
                horzLine: {
                    labelBackgroundColor: "#2962FF",
                },
            },
        });

        const candleSeries = chart.addSeries(CandlestickSeries, {
            upColor: "#00C853", // chart-up
            downColor: "#FF1744", // chart-down
            wickUpColor: "#00C853",
            wickDownColor: "#FF1744",
            borderVisible: false,
        });

        const candleData: CandlestickData[] = data.map((d) => ({
            time: d.date as Time,
            open: d.open,
            high: d.high,
            low: d.low,
            close: d.close,
        }));

        candleSeries.setData(candleData);

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
        };
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

const meta: Meta<typeof TvCandlestickStoryWrapper> = {
    title: "Widgets/TvCandlestickChartWidget",
    component: TvCandlestickStoryWrapper,
    args: {
        fetchMode: "manual",
        parameters: [],
        dummyData: mockTvCandlestickData,
    },
    parameters: {
        layout: 'padded',
    },
};

export default meta;

type Story = StoryObj<typeof TvCandlestickStoryWrapper>;

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

export const EmptyChart: Story = {
    args: {
        dummyData: [],
    },
};
