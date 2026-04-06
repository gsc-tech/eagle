import React, { useEffect, useRef, useState } from "react";
import {
    createChart,
    ColorType,
    type LineData,
    type Time,
    type IChartApi,
    type ISeriesApi,
    LineSeries,
} from "lightweight-charts";
import type { BaseWidgetProps, ParameterValues } from "../types";
import { useWidgetData } from "../hooks/useWidgetData";
import { useParameterDefaults } from "../hooks/useParameterDefaults";
import { WidgetContainer } from "../components/WidgetContainer";

export interface TvLineChartWidgetProps extends BaseWidgetProps {
    lineColor?: string;
    lineWidth?: number;
}

interface ChartData {
    date: string | number | Date;
    value: number;
}

const TvLineChartWidget: React.FC<TvLineChartWidgetProps & { darkMode?: boolean }> = ({
    apiUrl = "http://localhost:8080/api/data",
    title,
    parameters,
    lineColor = "#2962FF",
    lineWidth = 2,
    darkMode = false,
    groupedParametersValues,
    onGroupedParametersChange,
    initialWidgetState,
    onWidgetStateChange,
}) => {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const seriesRef = useRef<ISeriesApi<"Line"> | null>(null);

    const [data, setData] = useState<ChartData[]>([]);

    const defaultParams = useParameterDefaults(parameters);
    const [currentParams, setCurrentParams] = useState<ParameterValues>(() => {
        return initialWidgetState?.parameters || defaultParams;
    });

    useEffect(() => {
        if (onWidgetStateChange) {
            onWidgetStateChange({ parameters: currentParams });
        }
    }, [currentParams, onWidgetStateChange]);

    const { data: rawData } = useWidgetData(apiUrl as string, {
        parameters: currentParams,
    });

    const handleParametersChange = (values: ParameterValues) => {
        setCurrentParams(values);
    };

    useEffect(() => {
        if (rawData && rawData.length > 0) {
            setData(
                rawData.map((item: any) => ({
                    date: new Date(item.date).getTime() / 1000,
                    value: Number(item.value),
                }))
            );
        }
    }, [rawData]);

    useEffect(() => {
        if (!chartContainerRef.current) return;

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
    }, [lineColor, lineWidth, darkMode]);

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
            title={title}
            parameters={parameters}
            onParametersChange={handleParametersChange}
            darkMode={darkMode}
            initialParameterValues={currentParams}
            onGroupedParametersChange={onGroupedParametersChange}
            groupedParametersValues={groupedParametersValues}
        >
            <div
                ref={chartContainerRef}
                className="w-full h-full"
            />
        </WidgetContainer>
    );
};

export default TvLineChartWidget;

export const TvLineChartWidgetDef = {
    component: TvLineChartWidget,
};
