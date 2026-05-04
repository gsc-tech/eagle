"use client"

import React, { useEffect, useRef, useState, useId } from "react";
import type { BaseWidgetProps, ParameterValues } from "../types";
import { useWidgetData } from "../hooks/useWidgetData";
import { useParameterDefaults } from "../hooks/useParameterDefaults";
import { WidgetContainer } from "../components/WidgetContainer";
import * as am5 from "@amcharts/amcharts5";
import * as am5xy from "@amcharts/amcharts5/xy";
import Animated from "@amcharts/amcharts5/themes/Animated";

export interface AreaChartWidgetProps extends BaseWidgetProps {
    valueField?: string;
    dateField?: string;
    lineColor?: string;
    fillColor?: string;
    fillOpacity?: number;
    strokeWidth?: number;
}

export const AreaChartWidget: React.FC<AreaChartWidgetProps & { darkMode?: boolean }> = ({
    apiUrl = "http://localhost:8080/api/data",
    title,
    parameters,
    valueField = "value",
    dateField = "date",
    lineColor = "#6366f1",
    fillColor = "#6366f1",
    fillOpacity = 0.3,
    strokeWidth = 2,
    darkMode = false,
    onGroupedParametersChange,
    groupedParametersValues,
    initialWidgetState,
    onWidgetStateChange,
}) => {
    const rootRef = useRef<any>(null);
    const chartRef = useRef<any>(null);
    const seriesRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const autoId = useId();
    const chartId = `amchart-${autoId}`;

    const defaultParams = useParameterDefaults(parameters);
    const [currentParams, setCurrentParams] = useState<ParameterValues>(() => {
        return initialWidgetState?.parameters || defaultParams;
    });

    useEffect(() => {
        if (onWidgetStateChange) {
            onWidgetStateChange({ parameters: currentParams });
        }
    }, [currentParams, onWidgetStateChange]);

    const { data } = useWidgetData(apiUrl as string, {
        parameters: currentParams,
    });

    const handleParametersChange = (values: ParameterValues) => {
        setCurrentParams(values);
    };

    useEffect(() => {
        if (rootRef.current) {
            rootRef.current.dispose();
            rootRef.current = null;
        }

        let disposed = false;

        const initChart = () => {
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
                        pinchZoomX: true
                    })
                );
                chartRef.current = chart;

                // Cursor
                const cursor = chart.set("cursor", am5xy.XYCursor.new(root, {
                    behavior: "none"
                }));
                cursor.lineY.set("visible", false);

                // X-Axis
                const xRenderer = am5xy.AxisRendererX.new(root, {});
                if (darkMode) {
                    xRenderer.labels.template.set("fill", am5.color(0xffffff));
                }

                const xAxis = chart.xAxes.push(
                    am5xy.DateAxis.new(root, {
                        maxDeviation: 0.2,
                        baseInterval: {
                            timeUnit: "day",
                            count: 1
                        },
                        renderer: xRenderer,
                        tooltip: am5.Tooltip.new(root, {})
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

                // Series
                const series = chart.series.push(
                    am5xy.LineSeries.new(root, {
                        name: "Series",
                        xAxis: xAxis,
                        yAxis: yAxis,
                        valueYField: valueField,
                        valueXField: dateField,
                        tooltip: am5.Tooltip.new(root, {
                            labelText: "{valueY}"
                        }),
                        fill: am5.color(fillColor)
                    })
                );

                series.strokes.template.setAll({
                    stroke: am5.color(lineColor),
                    strokeWidth: strokeWidth
                });

                // Add Fill Gradient
                series.fills.template.setAll({
                    fillOpacity: fillOpacity,
                    visible: true
                });

                seriesRef.current = series;

                if (data && Array.isArray(data)) {
                    // Ensure data is sorted by date
                    const sortedData = [...data].sort((a, b) => new Date(a[dateField]).getTime() - new Date(b[dateField]).getTime());

                    // Convert date strings to timestamps if needed
                    const processedData = sortedData.map(item => ({
                        ...item,
                        [dateField]: new Date(item[dateField]).getTime()
                    }));

                    series.data.setAll(processedData);
                }

                series.appear(1000);
                chart.appear(1000, 100);

            } catch (error) {
                console.error("Failed to initialize Area chart: ", error);
            }
        };

        initChart();

        return () => {
            disposed = true;
            if (rootRef.current) {
                rootRef.current.dispose();
                rootRef.current = null;
            }
        };
    }, [chartId, lineColor, fillColor, fillOpacity, strokeWidth, valueField, dateField, darkMode]);

    // Update data
    useEffect(() => {
        if (seriesRef.current && data && Array.isArray(data)) {
            const sortedData = [...data].sort((a, b) => new Date(a[dateField]).getTime() - new Date(b[dateField]).getTime());
            const processedData = sortedData.map(item => ({
                ...item,
                [dateField]: new Date(item[dateField]).getTime()
            }));
            seriesRef.current.data.setAll(processedData);
        }
    }, [data, dateField]);

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
                ref={containerRef}
                id={chartId}
                className="w-full h-full"
                style={{ width: "100%", height: "100%" }}
            />
        </WidgetContainer>
    );
}

export const AreaChartWidgetDef = {
    component: AreaChartWidget,
}
