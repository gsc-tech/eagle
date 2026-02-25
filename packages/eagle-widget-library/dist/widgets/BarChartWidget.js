"use client";
import { jsx as _jsx } from "react/jsx-runtime";
import { ColorType, createChart, HistogramSeries } from "lightweight-charts";
import { useEffect, useMemo, useRef, useState } from "react";
import { useWidgetData } from "../hooks/useWidgetData";
import { useSheetDependency } from "../hooks/useSheetDependency";
import { useParameterDefaults } from "../hooks/useParameterDefaults";
import { WidgetContainer } from "../components/WidgetContainer";
export const BarChartWidget = ({ apiUrl = "http://localhost:8080/api/data", title, upColor = "#26a69a", downColor = "#ef5350", backgroundColor = "#ffffff", textColor = "#191919", valueField = "volume", colorMode = "price-based", staticColor = "#2962FF", showYAxis = true, parameters, darkMode = false, onGroupedParametersChange, groupedParametersValues, sheetDependency, }) => {
    const chartContainerRef = useRef(null);
    const chartRef = useRef(null);
    const seriesRef = useRef(null);
    const processBarData = (rawData) => {
        return rawData.map((item) => {
            const timestamp = typeof item.time === 'string' ? new Date(item.time).getTime() / 1000 : typeof item.date === 'string' ? new Date(item.date).getTime() / 1000 : item.time;
            let color = staticColor;
            if (colorMode === 'price-based') {
                if (item.open !== undefined && item.close !== undefined) {
                    color = item.close >= item.open ? upColor : downColor;
                }
                else if (item.color) {
                    color = item.color;
                }
                else {
                    color = upColor;
                }
            }
            else if (colorMode === "custom") {
                color = item.color || staticColor;
            }
            else if (colorMode === "static") {
                color = staticColor;
            }
            return {
                time: timestamp,
                value: Number(item[valueField] || item.value || 0),
                color: color,
            };
        });
    };
    const defaultParams = useParameterDefaults(parameters);
    const [currentParams, setCurrentParams] = useState(defaultParams);
    const { data: routeData } = useWidgetData(apiUrl, {
        parameters: currentParams,
    });
    const { sheetData } = useSheetDependency(sheetDependency);
    const data = sheetDependency?.isDependent ? (sheetData || []) : routeData;
    const handleParametersChange = (values) => {
        setCurrentParams(values);
    };
    const processedData = useMemo(() => {
        return processBarData(data || []);
    }, [data, colorMode, staticColor, upColor, downColor, valueField]);
    useEffect(() => {
        if (!chartContainerRef.current)
            return;
        const container = chartContainerRef.current;
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
    }, [backgroundColor, textColor, showYAxis, darkMode]);
    useEffect(() => {
        if (seriesRef.current && processedData && processedData.length > 0) {
            seriesRef.current.setData(processedData);
            if (chartRef.current) {
                chartRef.current.timeScale().fitContent();
            }
        }
    }, [processedData]);
    return (_jsx(WidgetContainer, { title: title, parameters: parameters, onParametersChange: handleParametersChange, darkMode: darkMode, onGroupedParametersChange: onGroupedParametersChange, groupedParametersValues: groupedParametersValues, children: _jsx("div", { ref: chartContainerRef, className: "w-full h-full" }) }));
};
export const BarChartWidgetDef = {
    component: BarChartWidget,
};
