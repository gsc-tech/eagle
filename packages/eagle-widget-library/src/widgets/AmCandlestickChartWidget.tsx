"use client"

import React, { useEffect, useRef, useState, useId } from "react";
import type { BaseWidgetProps, ParameterValues } from "../types";
import { useWidgetData } from "../hooks/useWidgetData";
import { useParameterDefaults } from "../hooks/useParameterDefaults";
import { WidgetContainer } from "../components/WidgetContainer";
import * as am5 from "@amcharts/amcharts5";
import * as am5xy from "@amcharts/amcharts5/xy";
import Animated from "@amcharts/amcharts5/themes/Animated";

export interface ChartData {
    date: string | number | Date;
    open: number;
    high: number;
    low: number;
    close: number;
}

export const AmCandlestickChartWidget: React.FC<BaseWidgetProps & { darkMode?: boolean }> = ({
    apiUrl = "http://localhost:8080/api/data",
    title,
    parameters,
    darkMode = false,
    groupedParametersValues,
    onGroupedParametersChange,
}) => {
    // Auto-generate a unique ID if chartId is not provided
    const chartId = useId();

    const containerRef = useRef<HTMLDivElement | null>(null);
    const rootRef = useRef<any>(null);
    const seriesRef = useRef<any>(null);

    const defaultParams = useParameterDefaults(parameters);
    const [currentParams, setCurrentParams] = useState<ParameterValues>(defaultParams);

    const { data: rawData } = useWidgetData(apiUrl as string, {
        parameters: currentParams,
    });

    // Transform data: convert date strings to timestamps for amCharts
    const data = React.useMemo(() => {
        if (!rawData || !Array.isArray(rawData)) return [];

        return rawData.map((item: any) => ({
            ...item,
            date: new Date(item.date).getTime(), // Convert to timestamp
        }));
    }, [rawData]);

    const handleParametersChange = (values: ParameterValues) => {
        setCurrentParams(values);
    };

    useEffect(() => {
        let disposed = false;

        const initChart = () => {
            if (!data) return;
            const container = containerRef.current;
            if (!container || disposed) return;

            try {
                const root = am5.Root.new(chartId);
                rootRef.current = root;
                root.setThemes([Animated.new(root)]);

                const chart = root.container.children.push(
                    am5xy.XYChart.new(root, {
                        panX: true,
                        panY: true,
                        wheelX: "panX",
                        wheelY: "zoomX",
                    })
                );

                // X-Axis
                const xRenderer = am5xy.AxisRendererX.new(root, {});
                if (darkMode) {
                    xRenderer.labels.template.set("fill", am5.color(0xffffff));
                }

                const xAxis = chart.xAxes.push(
                    am5xy.DateAxis.new(root, {
                        baseInterval: { timeUnit: "day", count: 1 },
                        renderer: xRenderer,
                    })
                );

                // Y-Axis
                const yRenderer = am5xy.AxisRendererY.new(root, {});
                if (darkMode) {
                    yRenderer.labels.template.set("fill", am5.color(0xffffff));
                }

                const yAxis = chart.yAxes.push(
                    am5xy.ValueAxis.new(root, {
                        renderer: yRenderer
                    })
                );

                const series = chart.series.push(
                    am5xy.CandlestickSeries.new(root, {
                        xAxis,
                        yAxis,
                        valueYField: "close",
                        openValueYField: "open",
                        lowValueYField: "low",
                        highValueYField: "high",
                        valueXField: "date",
                        tooltip: am5.Tooltip.new(root, {
                            labelText: "Open: {openValueY}\nHigh: {highValueY}\nLow: {lowValueY}\nClose: {valueY}"
                        }),
                    })
                );

                // Apply TvLive colors
                series.columns.template.states.create("riseFromOpen", {
                    fill: am5.color(0x26a69a),
                    stroke: am5.color(0x26a69a)
                });

                series.columns.template.states.create("dropFromOpen", {
                    fill: am5.color(0xef5350),
                    stroke: am5.color(0xef5350)
                });

                if (data) {
                    series.data.setAll(data);
                }
                seriesRef.current = series;

                chart.appear(1000, 100);
            } catch (error) {
                console.error("Failed to initialize chart: ", error);
            }
        };

        initChart();

        return () => {
            if (rootRef.current) {
                disposed = true;
                rootRef.current.dispose();
                rootRef.current = null;
            }
        };
    }, [chartId, darkMode]);

    useEffect(() => {
        if (seriesRef.current && data) {
            seriesRef.current.data.setAll(data);
        }
    }, [data]);

    return (
        <WidgetContainer
            title={title}
            parameters={parameters}
            onParametersChange={handleParametersChange}
            darkMode={darkMode}
            groupedParametersValues={groupedParametersValues}
            onGroupedParametersChange={onGroupedParametersChange}
        >
            <div
                ref={containerRef}
                id={chartId}
                className="w-full h-full"
            />
        </WidgetContainer>
    );
}

export const AmCandlestickChartWidgetDef = {
    component: AmCandlestickChartWidget,
}