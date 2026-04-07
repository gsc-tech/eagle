"use client"

import React, { useEffect, useId, useRef, useState } from "react";
import type { BaseWidgetProps, ParameterValues } from "../types";
import { useWidgetData } from "../hooks/useWidgetData";
import { useParameterDefaults } from "../hooks/useParameterDefaults";
import { WidgetContainer } from "../components/WidgetContainer";
import * as am5 from "@amcharts/amcharts5";
import * as am5hierarchy from "@amcharts/amcharts5/hierarchy";
import Animated from "@amcharts/amcharts5/themes/Animated";


export interface SunburstChartWidgetProps extends BaseWidgetProps {
    valueField?: string;
    categoryField?: string;
    childField?: string;
}

export const SunburstChartWidget: React.FC<SunburstChartWidgetProps & { darkMode?: boolean }> = ({
    apiUrl = "http://localhost:8080/api/data",
    title,
    parameters,
    valueField = "value",
    categoryField = "name",
    childField = "children",
    darkMode = false,
    groupedParametersValues,
    onGroupedParametersChange,
    initialWidgetState,
    onWidgetStateChange,
}) => {
    const chartId = useId();
    const rootRef = useRef<any>(null);
    const chartRef = useRef<any>(null);
    const seriesRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);

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
        // Dispose existing chart if any
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

                // Create wrapper container
                const chartContainer = root.container.children.push(
                    am5.Container.new(root, {
                        width: am5.percent(100),
                        height: am5.percent(100),
                        layout: root.verticalLayout
                    })
                );

                // Create series
                const series = chartContainer.children.push(
                    am5hierarchy.Sunburst.new(root, {
                        singleBranchOnly: true,
                        downDepth: 1,
                        initialDepth: 10,
                        topDepth: 1,
                        innerRadius: am5.percent(10),
                        valueField: valueField,
                        categoryField: categoryField,
                        childDataField: childField,
                    })
                );

                chartRef.current = series;
                seriesRef.current = series;

                series.slices.template.set("tooltipText", "{category}: {value}");

                // Make the labels more readable
                series.labels.template.setAll({
                    fontSize: 12,
                    text: "{category}",
                    fill: darkMode ? am5.color(0xffffff) : am5.color(0x000000),
                });

                // Set data if available
                if (data && Array.isArray(data)) {
                    series.data.setAll(data);
                } else if (data && typeof data === 'object') {
                    // Sometimes sunburst data comes as a single root object
                    series.data.setAll([data]);
                }

                // Animate
                series.appear(1000, 100);
            } catch (error) {
                console.error("Failed to initialize Sunburst chart: ", error);
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
    }, [chartId, valueField, categoryField, childField, darkMode]);

    // Update data when it changes
    useEffect(() => {
        if (seriesRef.current && data) {
            if (Array.isArray(data)) {
                seriesRef.current.data.setAll(data);
            } else if (typeof data === 'object') {
                seriesRef.current.data.setAll([data]);
            }
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
                ref={containerRef}
                id={chartId}
                className="w-full h-full"
                style={{ width: "100%", height: "100%" }}
            />
        </WidgetContainer>
    );
}

export const SunburstChartWidgetDef = {
    component: SunburstChartWidget,
};
