"use client";

import React, { useEffect, useRef, useState, useId } from "react";
import type { BaseWidgetProps, ParameterValues } from "../types";
import { useWidgetData } from "../hooks/useWidgetData";
import { useParameterDefaults } from "../hooks/useParameterDefaults";
import { WidgetContainer } from "../components/WidgetContainer";
import * as am5 from "@amcharts/amcharts5";
import * as am5xy from "@amcharts/amcharts5/xy";
import Animated from "@amcharts/amcharts5/themes/Animated";

export interface ScatterPlotWidgetProps extends BaseWidgetProps {
    xField?: string;
    yField?: string;
    sizeField?: string;
    categoryField?: string;
    pointColor?: string;
    pointSize?: number;
    showTrendLine?: boolean;
    enableZoom?: boolean;
}

export const ScatterPlotWidget: React.FC<ScatterPlotWidgetProps & { darkMode?: boolean }> = ({
    apiUrl = "http://localhost:8080/api/data",
    title,
    parameters,
    xField = "x",
    yField = "y",
    sizeField = "size",
    categoryField = "category",
    pointColor = "#6366f1",
    pointSize = 10,
    showTrendLine = false,
    enableZoom = true,
    darkMode = false,
    groupedParametersValues,
    onGroupedParametersChange,
}) => {
    const rootRef = useRef<any>(null);
    const chartRef = useRef<any>(null);
    const seriesRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const autoId = useId();
    const chartId = `amchart-scatter-${autoId}`;

    const defaultParams = useParameterDefaults(parameters);
    const [currentParams, setCurrentParams] = useState<ParameterValues>(defaultParams);

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
                        panX: enableZoom,
                        panY: enableZoom,
                        wheelX: enableZoom ? "panX" : "none",
                        wheelY: enableZoom ? "zoomX" : "none",
                        pinchZoomX: enableZoom,
                        pinchZoomY: enableZoom,
                    })
                );
                chartRef.current = chart;

                // Cursor
                const cursor = chart.set("cursor", am5xy.XYCursor.new(root, {
                    behavior: "zoomXY"
                }));
                cursor.lineX.set("visible", true);
                cursor.lineY.set("visible", true);

                // X-Axis
                const xRenderer = am5xy.AxisRendererX.new(root, {});
                if (darkMode) {
                    xRenderer.labels.template.set("fill", am5.color(0xffffff));
                    xRenderer.grid.template.set("stroke", am5.color(0x444444));
                }

                const xAxis = chart.xAxes.push(
                    am5xy.ValueAxis.new(root, {
                        renderer: xRenderer,
                        tooltip: am5.Tooltip.new(root, {})
                    })
                );

                // Y-Axis
                const yRenderer = am5xy.AxisRendererY.new(root, {});
                if (darkMode) {
                    yRenderer.labels.template.set("fill", am5.color(0xffffff));
                    yRenderer.grid.template.set("stroke", am5.color(0x444444));
                }

                const yAxis = chart.yAxes.push(
                    am5xy.ValueAxis.new(root, {
                        renderer: yRenderer
                    })
                );

                // Create series based on whether we have categories
                const hasCategories = data && data.length > 0 && data[0][categoryField];

                if (hasCategories) {
                    // Group data by category
                    const categories = [...new Set(data.map((item: any) => item[categoryField]))];
                    const colors = [
                        "#6366f1", "#ec4899", "#10b981", "#f59e0b",
                        "#8b5cf6", "#14b8a6", "#f43f5e", "#06b6d4"
                    ];

                    categories.forEach((category, index) => {
                        const categoryData = data.filter((item: any) => item[categoryField] === category);
                        const color = colors[index % colors.length];

                        const series = chart.series.push(
                            am5xy.LineSeries.new(root, {
                                name: String(category),
                                xAxis: xAxis,
                                yAxis: yAxis,
                                valueYField: yField,
                                valueXField: xField,
                                tooltip: am5.Tooltip.new(root, {
                                    labelText: `${category}\n{valueX}: {valueY}`
                                }),
                                stroke: am5.color(color),
                                fill: am5.color(color)
                            })
                        );


                        series.strokes.template.set("visible", false);

                        series.bullets.push(() => {
                            const bulletCircle = am5.Circle.new(root, {
                                radius: sizeField && categoryData[0][sizeField] ? undefined : pointSize,
                                fill: series.get("fill"),
                                stroke: root.interfaceColors.get("background"),
                                strokeWidth: 2,
                                tooltipText: `${category}\n${xField}: {valueX}\n${yField}: {valueY}${sizeField ? `\n${sizeField}: {${sizeField}}` : ''}`
                            });

                            // If size field is provided, make the size dynamic
                            if (sizeField) {
                                bulletCircle.adapters.add("radius", (radius, target) => {
                                    const dataItem = target.dataItem as any;
                                    if (dataItem && dataItem.dataContext) {
                                        const sizeValue = dataItem.dataContext[sizeField];
                                        return sizeValue ? Math.sqrt(sizeValue) * 2 : pointSize;
                                    }
                                    return pointSize;
                                });
                            }

                            return am5.Bullet.new(root, {
                                sprite: bulletCircle
                            });
                        });

                        series.data.setAll(categoryData);
                    });

                    // Add legend
                    const legend = chart.children.push(
                        am5.Legend.new(root, {
                            centerX: am5.p50,
                            x: am5.p50,
                            layout: root.horizontalLayout
                        })
                    );

                    if (darkMode) {
                        legend.labels.template.set("fill", am5.color(0xffffff));
                    }

                    legend.data.setAll(chart.series.values);
                } else {
                    // Single series without categories
                    const series = chart.series.push(
                        am5xy.LineSeries.new(root, {
                            name: "Data Points",
                            xAxis: xAxis,
                            yAxis: yAxis,
                            valueYField: yField,
                            valueXField: xField,
                            tooltip: am5.Tooltip.new(root, {
                                labelText: `{valueX}: {valueY}`
                            }),
                            stroke: am5.color(pointColor),
                            fill: am5.color(pointColor)
                        })
                    );

                    seriesRef.current = series;

                    // Configure bullets (points)
                    series.strokes.template.set("visible", false);

                    series.bullets.push(() => {
                        const bulletCircle = am5.Circle.new(root, {
                            radius: sizeField ? undefined : pointSize,
                            fill: series.get("fill"),
                            stroke: root.interfaceColors.get("background"),
                            strokeWidth: 2,
                            tooltipText: `${xField}: {valueX}\n${yField}: {valueY}${sizeField ? `\n${sizeField}: {${sizeField}}` : ''}`
                        });

                        // If size field is provided, make the size dynamic
                        if (sizeField) {
                            bulletCircle.adapters.add("radius", (radius, target) => {
                                const dataItem = target.dataItem as any;
                                if (dataItem && dataItem.dataContext) {
                                    const sizeValue = dataItem.dataContext[sizeField];
                                    return sizeValue ? Math.sqrt(sizeValue) * 2 : pointSize;
                                }
                                return pointSize;
                            });
                        }

                        return am5.Bullet.new(root, {
                            sprite: bulletCircle
                        });
                    });

                    if (data && Array.isArray(data)) {
                        series.data.setAll(data);
                    }

                    // Add trend line if enabled
                    if (showTrendLine && data && data.length > 1) {
                        const trendSeries = chart.series.push(
                            am5xy.LineSeries.new(root, {
                                xAxis: xAxis,
                                yAxis: yAxis,
                                valueYField: "trendY",
                                valueXField: "trendX",
                                stroke: am5.color(darkMode ? 0xffffff : 0x000000)
                            })
                        );

                        // Set stroke properties on the template
                        trendSeries.strokes.template.setAll({
                            strokeWidth: 2,
                            strokeDasharray: [5, 5]
                        });

                        // Calculate trend line using linear regression
                        const n = data.length;
                        const sumX = data.reduce((sum: number, item: any) => sum + item[xField], 0);
                        const sumY = data.reduce((sum: number, item: any) => sum + item[yField], 0);
                        const sumXY = data.reduce((sum: number, item: any) => sum + (item[xField] * item[yField]), 0);
                        const sumX2 = data.reduce((sum: number, item: any) => sum + (item[xField] * item[xField]), 0);

                        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
                        const intercept = (sumY - slope * sumX) / n;

                        const minX = Math.min(...data.map((item: any) => item[xField]));
                        const maxX = Math.max(...data.map((item: any) => item[xField]));

                        const trendData = [
                            { trendX: minX, trendY: slope * minX + intercept },
                            { trendX: maxX, trendY: slope * maxX + intercept }
                        ];

                        trendSeries.data.setAll(trendData);
                    }
                }

                chart.appear(1000, 100);

            } catch (error) {
                console.error("Failed to initialize scatter plot chart: ", error);
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
    }, [chartId, pointColor, pointSize, showTrendLine, enableZoom, xField, yField, sizeField, categoryField, darkMode, data]);

    // Update data
    useEffect(() => {
        if (seriesRef.current && data && Array.isArray(data)) {
            seriesRef.current.data.setAll(data);
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
            <div
                ref={containerRef}
                id={chartId}
                className="w-full h-full"
                style={{ width: "100%", height: "100%" }}
            />
        </WidgetContainer>
    );
}

export const ScatterPlotWidgetDef = {
    component: ScatterPlotWidget,
}
