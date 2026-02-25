import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import { createChart, ColorType, LineSeries, } from "lightweight-charts";
import { useWidgetData } from "../hooks/useWidgetData";
import { useParameterDefaults } from "../hooks/useParameterDefaults";
import { WidgetContainer } from "../components/WidgetContainer";
import { useRealtimeWidgetData } from "../hooks/useRealtimeWidgetData";
const TvLiveLineChartWidget = ({ apiUrl = "http://localhost:8080/api/data", title, parameters, lineColor = "#2962FF", lineWidth = 2, wsUrl = "", timeFormat = 'date', darkMode = false, groupedParametersValues, onGroupedParametersChange, }) => {
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
                    value: Number(message.data.value),
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
                value: Number(item.value),
            })));
        }
    }, [rawData]);
    // Initialize chart
    useEffect(() => {
        if (!chartContainerRef.current)
            return;
        // Custom time formatter based on timeFormat prop
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
            // Default 'date' format - let the library handle it
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
        const lineSeries = chart.addSeries(LineSeries, {
            color: lineColor,
            lineWidth: lineWidth,
        });
        seriesRef.current = lineSeries;
        if (data.length > 0) {
            const lineData = data.map((d) => ({
                time: d.date,
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
    }, [lineColor, lineWidth, timeFormat, darkMode]);
    useEffect(() => {
        if (seriesRef.current && data.length > 0) {
            const lineData = data.map((d) => ({
                time: d.date,
                value: d.value,
            }));
            seriesRef.current.setData(lineData);
        }
    }, [data]);
    return (_jsx(WidgetContainer, { title: title, parameters: parameters, onParametersChange: handleParametersChange, darkMode: darkMode, groupedParametersValues: groupedParametersValues, onGroupedParametersChange: onGroupedParametersChange, children: _jsxs("div", { className: "relative w-full h-full", children: [wsUrl && (_jsx("div", { className: "absolute top-2 right-2 z-10", children: _jsx("div", { className: `w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`, title: isConnected ? 'Connected' : 'Disconnected' }) })), _jsx("div", { ref: chartContainerRef, className: "w-full h-full" })] }) }));
};
export default TvLiveLineChartWidget;
export const TvLiveLineChartWidgetDef = {
    component: TvLiveLineChartWidget,
};
