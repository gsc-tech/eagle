import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import { createChart, ColorType, CandlestickSeries, } from "lightweight-charts";
import { useWidgetData } from "../hooks/useWidgetData";
import { useParameterDefaults } from "../hooks/useParameterDefaults";
import { WidgetContainer } from "../components/WidgetContainer";
import { useRealtimeWidgetData } from "../hooks/useRealtimeWidgetData";
const TvLiveCandlestickChartWidget = ({ apiUrl = "http://localhost:8080/api/data", title, parameters, upColor = "#26a69a", downColor = "#ef5350", wickUpColor = "#26a69a", wickDownColor = "#ef5350", borderVisible = false, wsUrl = "", timeFormat = 'date', darkMode = false, groupedParametersValues, onGroupedParametersChange, }) => {
    const chartContainerRef = useRef(null);
    const chartRef = useRef(null);
    const seriesRef = useRef(null);
    const [data, setData] = useState([]);
    const defaultParams = useParameterDefaults(parameters);
    const [currentParams, setCurrentParams] = useState(defaultParams);
    const { data: rawData } = useWidgetData(apiUrl, {
        parameters: currentParams,
    });
    const handleParametersChange = (values) => {
        setCurrentParams(values);
    };
    // Use the reusable real-time data hook
    const { isConnected } = useRealtimeWidgetData({
        wsUrl,
        currentParams,
        messageParser: (message) => {
            if (message.type === 'update' && message.data) {
                const timestamp = new Date(message.data.date).getTime() / 1000;
                return {
                    time: timestamp,
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
            setData(rawData.map((item) => ({
                date: new Date(item.date).getTime() / 1000,
                open: Number(item.open),
                high: Number(item.high),
                low: Number(item.low),
                close: Number(item.close),
            })));
        }
    }, [rawData]);
    useEffect(() => {
        if (!chartContainerRef.current)
            return;
        const getTickMarkFormatter = () => {
            if (timeFormat === 'time') {
                return (time) => {
                    const date = new Date(time * 1000);
                    return date.toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: false
                    });
                };
            }
            else if (timeFormat === 'datetime') {
                return (time) => {
                    const date = new Date(time * 1000);
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
            const candlestickData = data.map((d) => ({
                time: d.date,
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
            const candleData = data.map((d) => ({
                time: d.date,
                open: d.open,
                high: d.high,
                low: d.low,
                close: d.close,
            }));
            seriesRef.current.setData(candleData);
        }
    }, [data]);
    return (_jsx(WidgetContainer, { title: title, parameters: parameters, onParametersChange: handleParametersChange, darkMode: darkMode, onGroupedParametersChange: onGroupedParametersChange, groupedParametersValues: groupedParametersValues, children: _jsxs("div", { className: "relative w-full h-full", children: [wsUrl && (_jsx("div", { className: "absolute top-2 right-2 z-10", children: _jsx("div", { className: `w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`, title: isConnected ? 'Connected' : 'Disconnected' }) })), _jsx("div", { ref: chartContainerRef, className: "w-full h-full" })] }) }));
};
export default TvLiveCandlestickChartWidget;
export const TvLiveCandlestickChartWidgetDef = {
    component: TvLiveCandlestickChartWidget,
};
