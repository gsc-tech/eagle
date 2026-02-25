import React, { useEffect, useRef, useState } from "react";
import {
    createChart,
    ColorType,
    type CandlestickData,
    type Time,
    type IChartApi,
    type ISeriesApi,
    CandlestickSeries,
} from "lightweight-charts";
import type { BaseWidgetProps, ParameterValues } from "../types";
import { useWidgetData } from "../hooks/useWidgetData";
import { useParameterDefaults } from "../hooks/useParameterDefaults";
import { WidgetContainer } from "../components/WidgetContainer";
import { useRealtimeWidgetData, type WebSocketMessage } from "../hooks/useRealtimeWidgetData";

/**
 * TvLiveCandlestickChartWidget - A real-time candlestick chart widget using TradingView's Lightweight Charts
 * 
 * This widget combines REST API for initial data and WebSocket for real-time updates.
 * 
 * Data Flow:
 * 1. Initial load: Fetches historical data via REST API (apiUrl)
 * 2. Real-time updates: Receives live data via WebSocket (wsUrl)
 * 
 * Parameter Change Flow:
 * When parameters change, the following sequence occurs:
 * 1. Unsubscribe from previous WebSocket subscription (if exists)
 * 2. Fetch new initial data via REST API (automatic via useWidgetData)
 * 3. Subscribe to WebSocket with new parameters
 * 
 * WebSocket Message Format:
 * - Subscribe: { type: 'subscribe', params: { ...parameterValues } }
 * - Unsubscribe: { type: 'unsubscribe', params: { ...parameterValues } }
 * - Update: { type: 'update', data: { date: string|number|Date, open: number, high: number, low: number, close: number } }
 */

export interface TvLiveCandlestickChartWidgetProps extends BaseWidgetProps {
    upColor?: string;
    downColor?: string;
    wickUpColor?: string;
    wickDownColor?: string;
    borderVisible?: boolean;
    wsUrl?: string; // WebSocket URL
    timeFormat?: 'date' | 'time' | 'datetime';
}

interface ChartData {
    date: string | number | Date;
    open: number;
    high: number;
    low: number;
    close: number;
}

const TvLiveCandlestickChartWidget: React.FC<TvLiveCandlestickChartWidgetProps & { darkMode?: boolean }> = ({
    apiUrl = "http://localhost:8080/api/data",
    title,
    parameters,
    upColor = "#26a69a",
    downColor = "#ef5350",
    wickUpColor = "#26a69a",
    wickDownColor = "#ef5350",
    borderVisible = false,
    wsUrl = "",
    timeFormat = 'date',
    darkMode = false,
    groupedParametersValues,
    onGroupedParametersChange,
}) => {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

    const [data, setData] = useState<ChartData[]>([]);

    const defaultParams = useParameterDefaults(parameters);
    const [currentParams, setCurrentParams] = useState<ParameterValues>(defaultParams);

    const { data: rawData } = useWidgetData(apiUrl as string, {
        parameters: currentParams,
    });

    const handleParametersChange = (values: ParameterValues) => {
        setCurrentParams(values);
    };

    // Use the reusable real-time data hook
    const { isConnected } = useRealtimeWidgetData<CandlestickData>({
        wsUrl,
        currentParams,
        messageParser: (message: WebSocketMessage) => {
            if (message.type === 'update' && message.data) {
                const timestamp = new Date(message.data.date).getTime() / 1000;
                return {
                    time: timestamp as Time,
                    open: Number(message.data.open),
                    high: Number(message.data.high),
                    low: Number(message.data.low),
                    close: Number(message.data.close),
                };
            }
            return null;
        },
        onUpdate: (newDataPoint) => {
            if (seriesRef.current) {
                seriesRef.current.update(newDataPoint);
            }
        },
    });



    useEffect(() => {
        if (rawData && rawData.length > 0) {
            setData(
                rawData.map((item: any) => ({
                    date: new Date(item.date).getTime() / 1000,
                    open: Number(item.open),
                    high: Number(item.high),
                    low: Number(item.low),
                    close: Number(item.close),
                }))
            );
        }
    }, [rawData]);

    useEffect(() => {
        if (!chartContainerRef.current) return;
        const getTickMarkFormatter = () => {
            if (timeFormat === 'time') {
                return (time: Time) => {
                    const date = new Date((time as number) * 1000);
                    return date.toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: false
                    });
                };
            } else if (timeFormat === 'datetime') {
                return (time: Time) => {
                    const date = new Date((time as number) * 1000);
                    return date.toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false
                    });
                };
            }
            return undefined;
        };

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: "transparent" },
                textColor: darkMode ? "#D1D5DB" : "#333",
            },
            grid: {
                vertLines: { color: darkMode ? "rgba(255, 255, 255, 0.05)" : "#eee" },
                horzLines: { color: darkMode ? "rgba(255, 255, 255, 0.05)" : "#eee" },
            },
            crosshair: {
                mode: 1,
            },
            timeScale: {
                borderColor: darkMode ? "rgba(255, 255, 255, 0.1)" : "#ccc",
                timeVisible: timeFormat === 'time' || timeFormat === 'datetime',
                secondsVisible: timeFormat === 'time' || timeFormat === 'datetime',
                tickMarkFormatter: getTickMarkFormatter(),
            },
            rightPriceScale: {
                borderColor: darkMode ? "rgba(255, 255, 255, 0.1)" : "#ccc",
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
    }, [upColor, downColor, wickUpColor, wickDownColor, borderVisible, timeFormat, darkMode]);

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
            title={title}
            parameters={parameters}
            onParametersChange={handleParametersChange}
            darkMode={darkMode}
            onGroupedParametersChange={onGroupedParametersChange}
            groupedParametersValues={groupedParametersValues}
        >
            <div className="relative w-full h-full">
                {/* WebSocket connection indicator */}
                {wsUrl && (
                    <div className="absolute top-2 right-2 z-10">
                        <div
                            className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'
                                }`}
                            title={isConnected ? 'Connected' : 'Disconnected'}
                        />
                    </div>
                )}
                <div
                    ref={chartContainerRef}
                    className="w-full h-full"
                />
            </div>
        </WidgetContainer>
    );
};

export default TvLiveCandlestickChartWidget;

export const TvLiveCandlestickChartWidgetDef = {
    component: TvLiveCandlestickChartWidget,
};
