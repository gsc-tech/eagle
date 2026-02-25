import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import { createChart, ColorType, CandlestickSeries, } from "lightweight-charts";
import { useWidgetData } from "../hooks/useWidgetData";
import { useParameterDefaults } from "../hooks/useParameterDefaults";
import { WidgetContainer } from "../components/WidgetContainer";
const TvCandlestickChartWidget = ({ apiUrl = "http://localhost:8080/api/data", title, parameters, darkMode = false, groupedParametersValues, onGroupedParametersChange, }) => {
    const chartContainerRef = useRef(null);
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
        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: "transparent" },
                textColor: darkMode ? "#D1D5DB" : "#6B7280", // text-secondary
                fontFamily: "'Inter', sans-serif",
                fontSize: 11,
            },
            grid: {
                vertLines: { color: darkMode ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.04)" },
                horzLines: { color: darkMode ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.04)" },
            },
            rightPriceScale: {
                borderColor: darkMode ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.08)",
            },
            timeScale: {
                borderColor: darkMode ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.08)",
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
            upColor: "#26a69a",
            downColor: "#ef5350",
            wickUpColor: "#26a69a",
            wickDownColor: "#ef5350",
            borderVisible: false,
        });
        const candleData = data.map((d) => ({
            time: d.date,
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
    }, [data, darkMode]);
    return (_jsx(WidgetContainer, { title: title, parameters: parameters, onParametersChange: handleParametersChange, darkMode: darkMode, onGroupedParametersChange: onGroupedParametersChange, groupedParametersValues: groupedParametersValues, children: _jsx("div", { ref: chartContainerRef, className: "w-full h-full" }) }));
};
export default TvCandlestickChartWidget;
export const TvCandlestickChartWidgetDef = {
    component: TvCandlestickChartWidget,
};
