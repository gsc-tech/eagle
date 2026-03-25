"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import type { BaseWidgetProps, ParameterValues } from "../types";
import { useWidgetData } from "../hooks/useWidgetData";
import { useSheetDependency } from "../hooks/useSheetDependency";
import { useParameterDefaults } from "../hooks/useParameterDefaults";
import { WidgetContainer } from "../components/WidgetContainer";
import * as am5 from "@amcharts/amcharts5";
import * as am5xy from "@amcharts/amcharts5/xy";
import Animated from "@amcharts/amcharts5/themes/Animated";

export interface AmBarSeriesConfig {
    name: string;
    valueField: string;
    color?: string;
    strokeWidth?: number; // Usually not used for bars unless stroke is desired
}

export interface AmBarChartWidgetProps extends BaseWidgetProps {
    categoryField?: string; // Used for X axis (vertical) or Y axis (horizontal)
    seriesConfig?: AmBarSeriesConfig[];
    orientation?: "vertical" | "horizontal";
    stacked?: boolean;
    darkMode?: boolean;
}

export const AmBarChartWidget: React.FC<AmBarChartWidgetProps> = ({
    apiUrl = null,
    parameters,
    categoryField = "category",
    title = "AmBarChartWidget",
    seriesConfig = [{
        name: "Series 1",
        valueField: "value",
        color: "#6366f1",
    }],
    orientation = "vertical",
    stacked = false,
    darkMode = false,
    onGroupedParametersChange,
    groupedParametersValues,
    sheetDependency,
}) => {
    const chartId = useId();
    const containerRef = useRef<HTMLDivElement | null>(null);
    const rootRef = useRef<am5.Root | null>(null);
    const chartRef = useRef<am5xy.XYChart | null>(null);
    const seriesRefs = useRef<am5xy.ColumnSeries[]>([]);

    const defaultParams = useParameterDefaults(parameters);
    const [currentParams, setCurrentParams] = useState<ParameterValues>(defaultParams);

    let routeData: any = null;
    if (apiUrl !== null) {
        const { data } = useWidgetData(apiUrl as string, {
            parameters: currentParams,
        });
        routeData = data;
    }

    const { sheetData } = useSheetDependency(sheetDependency);
    const rawData = sheetDependency?.isDependent ? sheetData : routeData;

    const handleParametersChange = (values: ParameterValues) => {
        setCurrentParams(values);
    };

    useEffect(() => {
        let disposed = false;

        const initChart = () => {
            const container = containerRef.current;
            if (!container || disposed) return;

            if (rootRef.current) {
                rootRef.current.dispose();
            }

            try {
                const root = am5.Root.new(chartId);
                rootRef.current = root;
                root.setThemes([Animated.new(root)]);

                const chart = root.container.children.push(
                    am5xy.XYChart.new(root, {
                        panX: false,
                        panY: false,
                        wheelX: "panX",
                        wheelY: "zoomX",
                        layout: root.verticalLayout,
                    })
                );
                chartRef.current = chart;

                // Create Cursor
                const cursor = chart.set("cursor", am5xy.XYCursor.new(root, {}));
                cursor.lineY.set("visible", false);
                if (orientation === "horizontal") {
                    cursor.lineX.set("visible", false);
                    cursor.lineY.set("visible", true);
                }

                // Axes
                let xAxis, yAxis;

                const isHorizontal = orientation === "horizontal";

                if (isHorizontal) {
                    // Horizontal: Y is Category (Date/String), X is Value
                    const yRenderer = am5xy.AxisRendererY.new(root, {
                        minGridDistance: 30,
                        inversed: true,
                        cellStartLocation: 0.1,
                        cellEndLocation: 0.9
                    });

                    if (darkMode) {
                        yRenderer.labels.template.set("fill", am5.color(0xffffff));
                    }

                    yAxis = chart.yAxes.push(
                        am5xy.CategoryAxis.new(root, {
                            categoryField: categoryField,
                            renderer: yRenderer,
                            tooltip: am5.Tooltip.new(root, {}),
                        })
                    );

                    const xRenderer = am5xy.AxisRendererX.new(root, {});
                    if (darkMode) {
                        xRenderer.labels.template.set("fill", am5.color(0xffffff));
                    }

                    xAxis = chart.xAxes.push(
                        am5xy.ValueAxis.new(root, {
                            renderer: xRenderer,
                        })
                    );
                } else {
                    // Vertical: X is Category, Y is Value
                    const xRenderer = am5xy.AxisRendererX.new(root, {
                        minGridDistance: 30,
                        cellStartLocation: 0.1,
                        cellEndLocation: 0.9
                    });

                    if (darkMode) {
                        xRenderer.labels.template.set("fill", am5.color(0xffffff));
                    }

                    xAxis = chart.xAxes.push(
                        am5xy.CategoryAxis.new(root, {
                            categoryField: categoryField,
                            renderer: xRenderer,
                            tooltip: am5.Tooltip.new(root, {}),
                        })
                    );

                    const yRenderer = am5xy.AxisRendererY.new(root, {});
                    if (darkMode) {
                        yRenderer.labels.template.set("fill", am5.color(0xffffff));
                    }

                    yAxis = chart.yAxes.push(
                        am5xy.ValueAxis.new(root, {
                            renderer: yRenderer,
                        })
                    );
                }

                // Series
                seriesRefs.current = [];

                seriesConfig.forEach((config) => {
                    const seriesSettings: any = {
                        name: config.name,
                        xAxis: xAxis,
                        yAxis: yAxis,
                        valueYField: isHorizontal ? undefined : config.valueField,
                        valueXField: isHorizontal ? config.valueField : undefined,
                        categoryXField: isHorizontal ? undefined : categoryField,
                        categoryYField: isHorizontal ? categoryField : undefined,
                        stacked: stacked,
                        tooltip: am5.Tooltip.new(root, {
                            labelText: "{name}: {valueY}{valueX}" // Only one will show
                        }),
                    };

                    const series = chart.series.push(am5xy.ColumnSeries.new(root, seriesSettings));

                    if (config.color) {
                        series.columns.template.setAll({
                            fill: am5.color(config.color),
                            stroke: am5.color(config.color),
                        });
                    }

                    // Force tooltip to use the correct value depending on orientation
                    series.columns.template.adapters.add("tooltipText", () => {
                        return isHorizontal ? `{name}: {valueX}` : `{name}: {valueY}`;
                    });

                    seriesRefs.current.push(series);
                });

                // Legend
                if (seriesConfig.length > 1) {
                    const legend = chart.children.push(am5.Legend.new(root, {
                        centerX: am5.p50,
                        x: am5.p50
                    }));

                    if (darkMode) {
                        legend.labels.template.set("fill", am5.color(0xffffff));
                    }

                    legend.data.setAll(chart.series.values);
                }

                chart.appear(1000, 100);

                if (seriesRefs.current.length > 0 && rawData && Array.isArray(rawData)) {
                    let processedData = [...rawData];
                    if (routeData && Array.isArray(routeData)) {
                        processedData = processedData.map((item: any) => {
                            const mappedItem = { ...item };
                            if (mappedItem[categoryField] != null) {
                                mappedItem[categoryField] = String(mappedItem[categoryField]);
                            }
                            return mappedItem;
                        });
                    }

                    const xAxis = chartRef.current?.xAxes.getIndex(0);
                    const yAxis = chartRef.current?.yAxes.getIndex(0);

                    // For CategoryAxis, we need to set data on the axis as well
                    if (orientation === 'horizontal') {
                        if (yAxis instanceof am5xy.CategoryAxis) yAxis.data.setAll(processedData);
                    } else {
                        if (xAxis instanceof am5xy.CategoryAxis) xAxis.data.setAll(processedData);
                    }

                            seriesRefs.current.forEach(series => {
                        const isHorizontal = orientation === 'horizontal';
                        const valueField = isHorizontal ? series.get("valueXField") : series.get("valueYField");

                        if (isHorizontal) {
                            series.set("valueXField", valueField);
                        } else {
                            series.set("valueYField", valueField);
                        }
                        series.data.setAll(processedData);
                    });
                }

            } catch (error) {
                console.error("Failed to initialize chart:", error);
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
    }, [chartId, seriesConfig, categoryField, orientation, stacked, darkMode]);

    // Update Data
    useEffect(() => {
        if (seriesRefs.current.length > 0 && rawData && Array.isArray(rawData)) {
            let processedData = [...rawData];
            if (routeData && Array.isArray(routeData)) {
                processedData = processedData.map((item: any) => {
                    const mappedItem = { ...item };
                    if (mappedItem[categoryField] != null) {
                        mappedItem[categoryField] = String(mappedItem[categoryField]);
                    }
                    return mappedItem;
                });
            }

            const xAxis = chartRef.current?.xAxes.getIndex(0);
            const yAxis = chartRef.current?.yAxes.getIndex(0);

            // For CategoryAxis, we need to set data on the axis as well
            if (orientation === 'horizontal') {
                if (yAxis instanceof am5xy.CategoryAxis) yAxis.data.setAll(processedData);
            } else {
                if (xAxis instanceof am5xy.CategoryAxis) xAxis.data.setAll(processedData);
            }

            seriesRefs.current.forEach(series => {
                const isHorizontal = orientation === 'horizontal';
                const valueField = isHorizontal ? series.get("valueXField") : series.get("valueYField");

                if (isHorizontal) {
                    series.set("valueXField", valueField);
                } else {
                    series.set("valueYField", valueField);
                }
                series.data.setAll(processedData);
            });
        }
    }, [rawData, orientation, categoryField, sheetDependency]);

    return (
        <WidgetContainer
            parameters={parameters}
            onParametersChange={handleParametersChange}
            darkMode={darkMode}
            onGroupedParametersChange={onGroupedParametersChange}
            groupedParametersValues={groupedParametersValues}
            title={title}
        >
            <div
                id={chartId}
                ref={containerRef}
                className="w-full h-full"
            />
        </WidgetContainer>
    );
};

export const AmBarChartWidgetDef = {
    component: AmBarChartWidget,
};
