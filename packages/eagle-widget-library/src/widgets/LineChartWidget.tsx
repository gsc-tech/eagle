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


export interface SeriesConfig {
  name: string;
  valueField: string;
  color?: string;
  strokeWidth?: number;
  strokeDasharray?: string;
}

export interface LineChartWidgetProps extends BaseWidgetProps {
  dateField?: string;
  xAxisType?: "date" | "category" | "value";
  seriesConfig?: SeriesConfig[];
  darkMode?: boolean;
}

const DEFAULT_SERIES_CONFIG: SeriesConfig[] = [{
  name: "Series",
  valueField: "value",
  color: "#6366f1",
  strokeWidth: 2,
}];

export const LineChartWidget: React.FC<LineChartWidgetProps> = ({
  apiUrl = "",
  title,
  parameters,
  dateField = "date",
  xAxisType = "date",
  seriesConfig = DEFAULT_SERIES_CONFIG,
  groupedParametersValues,
  onGroupedParametersChange,
  darkMode = false,
  sheetDependency,
}) => {
  const chartId = useId();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rootRef = useRef<any>(null);
  const chartRef = useRef<any>(null);
  const seriesRefs = useRef<any[]>([]);

  const defaultParams = useParameterDefaults(parameters);
  const [currentParams, setCurrentParams] = useState<ParameterValues>(defaultParams);
  let routeData = null;
  if (apiUrl != "") {
    routeData = useWidgetData(apiUrl as string, {
      parameters: currentParams,
    });
  }

  const { sheetData } = useSheetDependency(sheetDependency);
  const rawData = sheetDependency?.isDependent ? sheetData : routeData;

  const handleParametersChange = (values: ParameterValues) => {
    setCurrentParams(values);
  };

  // Determine if we're in multi-series mode (more than 1 series)
  const isMultiSeries = seriesConfig.length > 1;

  useEffect(() => {
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
            pinchZoomX: true,
          })
        );
        chartRef.current = chart;

        // Add cursor
        const cursor = chart.set("cursor", am5xy.XYCursor.new(root, {
          behavior: "none"
        }));
        cursor.lineY.set("visible", false);

        // X-Axis
        const xRenderer = am5xy.AxisRendererX.new(root, {});
        if (darkMode) {
          xRenderer.labels.template.set("fill", am5.color(0xffffff));
        }

        let xAxis: any;
        if (xAxisType === "category") {
          xAxis = chart.xAxes.push(
            am5xy.CategoryAxis.new(root, {
              categoryField: dateField,
              renderer: xRenderer,
              tooltip: am5.Tooltip.new(root, {}),
            })
          );
        } else if (xAxisType === "value") {
          xAxis = chart.xAxes.push(
            am5xy.ValueAxis.new(root, {
              renderer: xRenderer,
              tooltip: am5.Tooltip.new(root, {}),
            })
          );
        } else {
          xAxis = chart.xAxes.push(
            am5xy.DateAxis.new(root, {
              maxDeviation: 0.2,
              baseInterval: { timeUnit: "day", count: 1 },
              renderer: xRenderer,
              tooltip: am5.Tooltip.new(root, {}),
            })
          );
        }

        const yRenderer = am5xy.AxisRendererY.new(root, {});
        if (darkMode) {
          yRenderer.labels.template.set("fill", am5.color(0xffffff));
        }

        const yAxis = chart.yAxes.push(
          am5xy.ValueAxis.new(root, {
            renderer: yRenderer,
          })
        );

        // Clear previous series refs
        seriesRefs.current = [];

        // Create series for each config (works for both single and multi)
        seriesConfig.forEach((config) => {
          const series = chart.series.push(
            am5xy.LineSeries.new(root, {
              name: config.name,
              xAxis: xAxis,
              yAxis: yAxis,
              valueYField: config.valueField,
              ...(xAxisType === 'category' ? { categoryXField: dateField } : { valueXField: dateField }),
              tooltip: am5.Tooltip.new(root, {
                labelText: isMultiSeries ? `${config.name}: {valueY}` : "{valueY}"
              }),
            })
          );

          // Apply styling
          series.strokes.template.setAll({
            stroke: am5.color(config.color || "#6366f1"),
            strokeWidth: config.strokeWidth || 2,
          });

          if (config.strokeDasharray) {
            series.strokes.template.setAll({
              strokeDasharray: config.strokeDasharray.split(',').map(Number)
            });
          }

          seriesRefs.current.push(series);
        });

        // Add legend only for multi-series
        if (isMultiSeries) {
          const legend = chart.children.push(
            am5.Legend.new(root, {
              centerX: am5.percent(50),
              x: am5.percent(50),
            })
          );

          if (darkMode) {
            legend.labels.template.set("fill", am5.color(0xffffff));
          }

          legend.data.setAll(chart.series.values);
        }
        if (seriesRefs.current.length > 0 && rawData && Array.isArray(rawData)) {
          let processedData = [...rawData];

          if (xAxisType === "date") {
            // Sort data by date
            const dateAxis = dateField;
            processedData.sort(
              (a, b) => new Date(a[dateAxis]).getTime() - new Date(b[dateAxis]).getTime()
            );

            // Convert date strings to timestamps
            processedData = processedData.map((item: any) => {
              const mappedItem = { ...item };
              const dateValue = item[dateAxis];
              if (dateValue) {
                mappedItem[dateAxis] = new Date(dateValue).getTime();
              }
              return mappedItem;
            });
          } else {
            // General formatting for category and value
            processedData = processedData.map((item: any) => {
              const mappedItem = { ...item };
              if (item.$x !== undefined && mappedItem[dateField] === undefined) {
                mappedItem[dateField] = item.$x;
              }
              if (xAxisType === "category" && mappedItem[dateField] != null) {
                mappedItem[dateField] = String(mappedItem[dateField]);
              }
              return mappedItem;
            });
          }

          if (xAxisType === "category") {
            xAxis.data.setAll(processedData);
          }

          // Update all series with the same data
          // Each series will pick its own valueField from the data
          seriesRefs.current.forEach(series => {
            // Apply $y mapping if explicitly provided by sheet dependency mapping
            const valueField = series.get("valueYField");
            series.set("valueYField", valueField);
            series.data.setAll(processedData);
          });
        }

        chart.appear(1000, 100);
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
  }, [chartId, seriesConfig, dateField, darkMode]);

  // Update data when rawData changes
  useEffect(() => {
    if (seriesRefs.current.length > 0 && rawData && Array.isArray(rawData)) {
      let processedData = [...rawData];

      if (xAxisType === "date") {
        // Sort data by date
        processedData.sort(
          (a, b) => new Date(a[dateField]).getTime() - new Date(b[dateField]).getTime()
        );

        // Convert date strings to timestamps
        processedData = processedData.map((item: any) => {
          const mappedItem = { ...item };
          const dateValue = item[dateField] || item.$x;
          if (dateValue) {
            mappedItem[dateField] = new Date(dateValue).getTime();
          }
          return mappedItem;
        });
      } else {
        processedData = processedData.map((item: any) => {
          const mappedItem = { ...item };
          if (item.$x !== undefined && mappedItem[dateField] === undefined) {
            mappedItem[dateField] = item.$x;
          }
          if (xAxisType === "category" && mappedItem[dateField] != null) {
            mappedItem[dateField] = String(mappedItem[dateField]);
          }
          return mappedItem;
        });
      }

      if (xAxisType === "category" && chartRef.current) {
        chartRef.current.xAxes.getIndex(0).data.setAll(processedData);
      }

      // Update all series with the same data
      // Each series will pick its own valueField from the data
      seriesRefs.current.forEach(series => {
        // Apply $y mapping if explicitly provided by sheet dependency mapping
        const valueField = series.get("valueYField");
        series.set("valueYField", valueField);
        series.data.setAll(processedData);
      });
    }
  }, [rawData, dateField, xAxisType, sheetDependency]);

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
        id={chartId}
        ref={containerRef}
        className="w-full h-full"
      />
    </WidgetContainer>
  );
};

export const LineChartWidgetDef = {
  component: LineChartWidget,
};
