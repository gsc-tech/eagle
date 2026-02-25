import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import { createChart, ColorType, LineSeries, } from "lightweight-charts";
import { useWidgetData } from "../hooks/useWidgetData";
import { useParameterDefaults } from "../hooks/useParameterDefaults";
import { WidgetContainer } from "../components/WidgetContainer";
const TvLineChartWidget = ({ apiUrl = "http://localhost:8080/api/data", title, parameters, lineColor = "#2962FF", lineWidth = 2, darkMode = false, groupedParametersValues, onGroupedParametersChange, }) => {
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
    useEffect(() => {
        if (rawData && rawData.length > 0) {
            setData(rawData.map((item) => ({
                date: new Date(item.date).getTime() / 1000,
                value: Number(item.value),
            })));
        }
    }, [rawData]);
    useEffect(() => {
        if (!chartContainerRef.current)
            return;
        console.log("line color is ", lineColor);
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
    }, [lineColor, lineWidth, darkMode]);
    useEffect(() => {
        if (seriesRef.current && data.length > 0) {
            const lineData = data.map((d) => ({
                time: d.date,
                value: d.value,
            }));
            seriesRef.current.setData(lineData);
        }
    }, [data]);
    return (_jsx(WidgetContainer, { title: title, parameters: parameters, onParametersChange: handleParametersChange, darkMode: darkMode, onGroupedParametersChange: onGroupedParametersChange, groupedParametersValues: groupedParametersValues, children: _jsx("div", { ref: chartContainerRef, className: "w-full h-full" }) }));
};
export default TvLineChartWidget;
export const TvLineChartWidgetDef = {
    component: TvLineChartWidget,
};
