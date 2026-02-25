"use client"

import { ColorType, createChart, type HistogramData, HistogramSeries, type IChartApi, type ISeriesApi, type Time } from "lightweight-charts";
import { useEffect, useMemo, useRef, useState } from "react";
import type { BaseWidgetProps, ParameterValues } from "../types";
import { useWidgetData } from "../hooks/useWidgetData";
import { useParameterDefaults } from "../hooks/useParameterDefaults";
import { WidgetContainer } from "../components/WidgetContainer";
import { useRealtimeWidgetData, type WebSocketMessage } from "../hooks/useRealtimeWidgetData";

/**
 * TvLiveBarChartWidget - A real-time bar/histogram chart widget using TradingView's Lightweight Charts
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
 * - Update: { type: 'update', data: { time/date: string|number|Date, value: number, color?: string, open?: number, close?: number } }
 */

export interface LiveBarChartWidgetProps extends BaseWidgetProps {
    upColor?: string;
    downColor?: string;
    backgroundColor?: string;
    textColor?: string;
    valueField?: string;
    colorMode?: "static" | "price-based" | "custom";
    staticColor?: string;
    showYAxis?: boolean;
    wsUrl?: string; // WebSocket URL
    timeFormat?: 'date' | 'time' | 'datetime'; // Time axis format
}

export const LiveBarChartWidget: React.FC<LiveBarChartWidgetProps & { darkMode?: boolean }> = ({
    apiUrl = "http://localhost:8080/api/data",
    title,
    upColor = "#26a69a",
    downColor = "#ef5350",
    backgroundColor = "#ffffff",
    textColor = "#191919",
    valueField = "volume",
    colorMode = "price-based",
    staticColor = "#2962FF",
    showYAxis = true,
    parameters,
    wsUrl = "",
    timeFormat = 'date',
    darkMode = false,
    onGroupedParametersChange,
    groupedParametersValues,
}) => {
    const chartContainerRef = useRef<HTMLDivElement | null>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const seriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);

    const defaultParams = useParameterDefaults(parameters);
    const [currentParams, setCurrentParams] = useState<ParameterValues>(defaultParams);

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

    const { data } = useWidgetData(apiUrl as string, {
        parameters: currentParams,
    });

    const handleParametersChange = (values: ParameterValues) => {
        setCurrentParams(values);
    };

    const processedData = useMemo(() => {
        return processBarData(data);
    }, [data, colorMode, staticColor, upColor, downColor, valueField]);

    // Use the reusable real-time data hook
    const { isConnected } = useRealtimeWidgetData<HistogramData>({
        wsUrl,
        currentParams,
        messageParser: (message: WebSocketMessage) => {
            if (message.type === 'update' && message.data) {
                const timeValue = message.data.time || message.data.date;
                const timestamp = new Date(timeValue as any).getTime() / 1000;

                let color = staticColor;
                if (colorMode === 'price-based') {
                    if (message.data.open !== undefined && message.data.close !== undefined) {
                        color = message.data.close >= message.data.open ? upColor : downColor;
                    } else if (message.data.color) {
                        color = message.data.color;
                    } else {
                        color = upColor;
                    }
                } else if (colorMode === "custom") {
                    color = message.data.color || staticColor;
                } else if (colorMode === "static") {
                    color = staticColor;
                }

                return {
                    time: timestamp as Time,
                    value: Number(message.data[valueField] || message.data.value || 0),
                    color: color,
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
        if (!chartContainerRef.current) return;

        const container = chartContainerRef.current;

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

        const effectiveBackgroundColor = (backgroundColor === '#ffffff' && darkMode) ? 'transparent' : backgroundColor;
        const effectiveTextColor = (textColor === '#191919' && darkMode) ? '#D1D5DB' : textColor;

        const chart = createChart(container, {
            layout: {
                background: {
                    type: ColorType.Solid,
                    color: effectiveBackgroundColor
                },
                textColor: effectiveTextColor,
            },
            grid: {
                vertLines: { color: darkMode ? "rgba(255, 255, 255, 0.05)" : "rgba(197, 203, 206, 0.5)" },
                horzLines: { color: darkMode ? "rgba(255, 255, 255, 0.05)" : "rgba(197, 203, 206, 0.5)" },
            },
            rightPriceScale: {
                borderColor: darkMode ? "rgba(255, 255, 255, 0.1)" : "rgba(197, 203, 206, 0.8)",
                visible: showYAxis,
            },
            timeScale: {
                borderColor: darkMode ? "rgba(255, 255, 255, 0.1)" : "rgba(197, 203, 206, 0.8)",
                timeVisible: timeFormat === 'time' || timeFormat === 'datetime',
                secondsVisible: timeFormat === 'time' || timeFormat === 'datetime',
                tickMarkFormatter: getTickMarkFormatter(),
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
            seriesRef.current = null;
        };
    }, [backgroundColor, textColor, showYAxis, timeFormat, darkMode]);

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
}


export const LiveBarChartWidgetDef = {
    component: LiveBarChartWidget,
}
