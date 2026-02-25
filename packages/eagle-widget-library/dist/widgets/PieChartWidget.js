"use client";
import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useId, useRef, useState } from "react";
import { useWidgetData } from "../hooks/useWidgetData";
import { useParameterDefaults } from "../hooks/useParameterDefaults";
import { WidgetContainer } from "../components/WidgetContainer";
import * as am5 from "@amcharts/amcharts5";
import Animated from "@amcharts/amcharts5/themes/Animated";
import * as am5percent from "@amcharts/amcharts5/percent";
export const PieChartWidget = ({ apiUrl = "http://localhost:8080/api/data", title, parameters, valueField = "value", categoryField = "category", donut = false, innerRadius = 50, darkMode = false, groupedParametersValues, onGroupedParametersChange, }) => {
    const chartId = useId();
    const rootRef = useRef(null);
    const chartRef = useRef(null);
    const seriesRef = useRef(null);
    const containerRef = useRef(null);
    const defaultParams = useParameterDefaults(parameters);
    const [currentParams, setCurrentParams] = useState(defaultParams);
    console.log("currentParams are", currentParams);
    const { data } = useWidgetData(apiUrl, {
        parameters: currentParams,
    });
    console.log(data);
    const handleParametersChange = (values) => {
        setCurrentParams(values);
    };
    useEffect(() => {
        // Dispose existing chart if any
        if (rootRef.current) {
            rootRef.current.dispose();
            rootRef.current = null;
        }
        let disposed = false;
        const initChart = async () => {
            const container = containerRef.current;
            if (!container || disposed)
                return;
            try {
                const root = am5.Root.new(chartId);
                rootRef.current = root;
                root.setThemes([Animated.new(root)]);
                const chart = root.container.children.push(am5percent.PieChart.new(root, {
                    layout: root.verticalLayout,
                    innerRadius: donut ? am5.percent(innerRadius) : 0,
                }));
                chartRef.current = chart;
                // Create series
                const series = chart.series.push(am5percent.PieSeries.new(root, {
                    valueField: valueField,
                    categoryField: categoryField,
                    alignLabels: false,
                }));
                // Configure labels and slices
                series.labels.template.setAll({
                    textType: "circular",
                    radius: 10,
                    fill: darkMode ? am5.color(0xffffff) : am5.color(0x000000),
                });
                series.slices.template.setAll({
                    tooltipText: "{category}: {valuePercentTotal.formatNumber('0.00')}% ({value})",
                    cornerRadius: 5,
                    stroke: darkMode ? am5.color(0x1f2937) : am5.color(0xffffff),
                    strokeWidth: 2,
                });
                // Add legend
                const legend = chart.children.push(am5.Legend.new(root, {
                    centerX: am5.percent(50),
                    x: am5.percent(50),
                    marginTop: 15,
                    marginBottom: 15,
                }));
                if (darkMode) {
                    legend.labels.template.set("fill", am5.color(0xffffff));
                    legend.valueLabels.template.set("fill", am5.color(0xffffff));
                }
                legend.data.setAll(series.dataItems);
                seriesRef.current = series;
                // Set data if available
                if (data && Array.isArray(data)) {
                    series.data.setAll(data);
                }
                console.log(series.data);
                // Animate
                series.appear(1000, 100);
            }
            catch (error) {
                console.error("Failed to initialize Pie chart: ", error);
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
    }, [chartId, valueField, categoryField, donut, innerRadius, darkMode]);
    // Update data when it changes
    useEffect(() => {
        if (seriesRef.current && data && Array.isArray(data)) {
            seriesRef.current.data.setAll(data);
        }
    }, [data]);
    return (_jsx(WidgetContainer, { title: title, parameters: parameters, onParametersChange: handleParametersChange, darkMode: darkMode, onGroupedParametersChange: onGroupedParametersChange, groupedParametersValues: groupedParametersValues, children: _jsx("div", { ref: containerRef, id: chartId, className: "w-full h-full", style: { width: "100%", height: "100%" } }) }));
};
export const PieChartWidgetDef = {
    component: PieChartWidget,
};
