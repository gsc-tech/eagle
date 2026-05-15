"use client";

import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import type { BaseWidgetProps, ParameterValues } from "../types";
import { useWidgetData } from "../hooks/useWidgetData";
import { useSheetDependency } from "../hooks/useSheetDependency";
import { useParameterDefaults } from "../hooks/useParameterDefaults";
import { WidgetContainer } from "../components/WidgetContainer";
import * as am5 from "@amcharts/amcharts5";
import * as am5xy from "@amcharts/amcharts5/xy";
import Animated from "@amcharts/amcharts5/themes/Animated";

// ── Prop interfaces ────────────────────────────────────────────────────────────

export interface SeriesConfig {
  name: string;
  /** Field name in the data object to read Y values from. */
  valueField: string;
  color?: string;
  strokeWidth?: number;
  /** Comma-separated dash array e.g. "4,4" */
  strokeDasharray?: string;
  /** Fill the area under the line. */
  fill?: boolean;
  /** Fill opacity (0–1). Defaults to 0.15 when fill is true. */
  fillOpacity?: number;
  /** Show circular bullets on each data point. */
  bullets?: boolean;
  /** Draw as a step line instead of a smooth curve. */
  stepped?: boolean;
  /** Stack this series on top of the previous one (area fill required). */
  stacked?: boolean;
  /** 0 = left Y axis (default), 1 = right Y axis. */
  yAxisIndex?: 0 | 1;
}

export interface LineChartWidgetProps extends BaseWidgetProps {
  /** Field name used as the X axis value (date string, category, or number). */
  dateField?: string;
  xAxisType?: "date" | "category" | "value";
  seriesConfig?: SeriesConfig[];
  /** Show a horizontal scrollbar / zoom range selector. */
  showScrollbar?: boolean;
  /**
   * Force legend visibility. Defaults to `true` when more than one series
   * is present; set explicitly to override that behaviour.
   */
  showLegend?: boolean;
  legendPosition?: "bottom" | "top" | "right";
  /** Label rendered next to the left Y axis. */
  yAxisLabel?: string;
  /** Label rendered below the X axis. */
  xAxisLabel?: string;
  yAxisMin?: number;
  yAxisMax?: number;
  /** Enable a second (right-side) Y axis for series that set yAxisIndex=1. */
  dualYAxis?: boolean;
  /** Right Y axis label (only used when dualYAxis=true). */
  yAxisRightLabel?: string;
  /** amCharts date format string for the X axis labels e.g. "MM/dd". */
  xAxisDateFormat?: string;
  /** Time unit for DateAxis base interval. Defaults to "day". */
  baseTimeUnit?: am5.time.TimeUnit;
  /** Show chart grid lines. Defaults to true. */
  showGridLines?: boolean;
  /** cursor behaviour. */
  cursorBehavior?: "none" | "selectX" | "zoomX" | "zoomY" | "zoomXY";
  showRefreshButton?: boolean;
}

// ── Defaults ───────────────────────────────────────────────────────────────────

const CHART_PALETTE = [
  "#00998b", // brand teal
  "#2962FF", // chart primary blue
  "#FFD600", // yellow
  "#FF5252", // ask red
  "#00BFA5", // bid teal
  "#AA00FF", // purple
];

const DEFAULT_SERIES_CONFIG: SeriesConfig[] = [{
  name: "Series",
  valueField: "value",
  color: CHART_PALETTE[0],
  strokeWidth: 2,
}];

// ── Component ──────────────────────────────────────────────────────────────────

export const LineChartWidget: React.FC<LineChartWidgetProps> = ({
  apiUrl = "",
  title,
  parameters,
  dateField = "date",
  xAxisType = "date",
  seriesConfig = DEFAULT_SERIES_CONFIG,
  darkMode = false,
  groupedParametersValues,
  onGroupedParametersChange,
  sheetDependency,
  initialWidgetState,
  onWidgetStateChange,
  staticData,
  showScrollbar = false,
  showLegend,
  legendPosition = "bottom",
  yAxisLabel,
  xAxisLabel,
  yAxisMin,
  yAxisMax,
  dualYAxis = false,
  yAxisRightLabel,
  xAxisDateFormat,
  baseTimeUnit = "day",
  showGridLines = true,
  cursorBehavior = "zoomX",
  showRefreshButton = false,
}) => {
  const chartId = useId();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rootRef = useRef<am5.Root | null>(null);
  const seriesRefs = useRef<am5xy.LineSeries[]>([]);
  const xAxisRef = useRef<am5xy.Axis<am5xy.AxisRenderer> | null>(null);

  const defaultParams = useParameterDefaults(parameters);
  const [currentParams, setCurrentParams] = useState<ParameterValues>(
    () => initialWidgetState?.parameters || defaultParams
  );

  useEffect(() => {
    onWidgetStateChange?.({ parameters: currentParams });
  }, [currentParams, onWidgetStateChange]);

  let routeData: ReturnType<typeof useWidgetData> | null = null;
  if (apiUrl) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    routeData = useWidgetData(apiUrl, { parameters: currentParams });
  }

  const { sheetData } = useSheetDependency(sheetDependency);
  const rawData = staticData ?? (sheetDependency?.isDependent ? sheetData : routeData?.data);

  const handleParametersChange = (values: ParameterValues) => setCurrentParams(values);

  const handleRefresh = useCallback(() => {
    routeData?.refetch();
  }, [routeData]);

  const shouldShowLegend =
    showLegend !== undefined ? showLegend : seriesConfig.length > 1;

  // ── Chart initialisation ────────────────────────────────────────────────────

  useEffect(() => {
    let disposed = false;

    const initChart = () => {
      const container = containerRef.current;
      if (!container || disposed) return;

      try {
        // ── Root ──────────────────────────────────────────────────────────────
        const root = am5.Root.new(chartId);
        rootRef.current = root;
        root.setThemes([Animated.new(root)]);

        if (xAxisDateFormat) {
          root.dateFormatter.setAll({ dateFormat: xAxisDateFormat });
        }

        // ── Chart ─────────────────────────────────────────────────────────────
        // Right-legend layout: root container becomes horizontal so chart and
        // legend panel sit side-by-side instead of stacking vertically.
        const isRightLegend = shouldShowLegend && legendPosition === "right";
        if (isRightLegend) {
          root.container.set("layout", root.horizontalLayout);
        }

        const chart = root.container.children.push(
          am5xy.XYChart.new(root, {
            panX: true,
            panY: false,
            // wheelX pans, drag-select (cursorBehavior="zoomX") zooms — user
            // gets rubber-band zoom on drag and pan on scroll.
            wheelX: "panX",
            wheelY: "panY",
            pinchZoomX: true,
            layout: root.verticalLayout,
            ...(isRightLegend ? { width: am5.percent(78) } : {}),
          })
        );

        // ── Cursor ────────────────────────────────────────────────────────────
        const cursor = chart.set(
          "cursor",
          am5xy.XYCursor.new(root, { behavior: cursorBehavior })
        );
        cursor.lineY.set("visible", false);

        // ── Axis renderers ────────────────────────────────────────────────────
        const xRenderer = am5xy.AxisRendererX.new(root, { minGridDistance: 60 });
        const yRenderer = am5xy.AxisRendererY.new(root, {});

        const gridStroke = am5.color(darkMode ? 0x2e2e2e : 0xe5e7eb);
        const labelFill = am5.color(darkMode ? 0xf0f0f0 : 0x374151);

        xRenderer.labels.template.setAll({ fill: labelFill, fontSize: 11 });
        yRenderer.labels.template.setAll({ fill: labelFill, fontSize: 11 });

        xRenderer.grid.template.setAll({
          stroke: gridStroke,
          strokeOpacity: showGridLines ? 1 : 0,
        });
        yRenderer.grid.template.setAll({
          stroke: gridStroke,
          strokeOpacity: showGridLines ? 1 : 0,
        });

        // ── X Axis ────────────────────────────────────────────────────────────
        let xAxis: am5xy.Axis<am5xy.AxisRenderer>;

        const xTooltip = am5.Tooltip.new(root, {});
        xTooltip.get("background")?.setAll({
          fill: am5.color(darkMode ? 0x1a1a1a : 0xffffff),
          stroke: am5.color(darkMode ? 0x2e2e2e : 0xe5e7eb),
          strokeOpacity: 1,
        });

        if (xAxisType === "category") {
          xAxis = chart.xAxes.push(
            am5xy.CategoryAxis.new(root, {
              categoryField: dateField,
              renderer: xRenderer,
              tooltip: xTooltip,
            })
          );
        } else if (xAxisType === "value") {
          xAxis = chart.xAxes.push(
            am5xy.ValueAxis.new(root, {
              renderer: xRenderer,
              tooltip: xTooltip,
            })
          );
        } else {
          xAxis = chart.xAxes.push(
            am5xy.DateAxis.new(root, {
              maxDeviation: 0.2,
              baseInterval: { timeUnit: baseTimeUnit, count: 1 },
              renderer: xRenderer,
              tooltip: xTooltip,
            })
          );
        }
        xAxisRef.current = xAxis;

        if (xAxisLabel) {
          xAxis.children.push(
            am5.Label.new(root, {
              text: xAxisLabel,
              x: am5.percent(50),
              centerX: am5.percent(50),
              fill: am5.color(darkMode ? 0x909090 : 0x6b7280),
              fontSize: 11,
              paddingTop: 6,
            })
          );
        }

        // ── Left Y Axis ───────────────────────────────────────────────────────
        const yAxisLeft = chart.yAxes.push(
          am5xy.ValueAxis.new(root, {
            renderer: yRenderer,
            ...(yAxisMin !== undefined ? { min: yAxisMin } : {}),
            ...(yAxisMax !== undefined ? { max: yAxisMax } : {}),
          })
        );

        if (yAxisLabel) {
          yAxisLeft.children.unshift(
            am5.Label.new(root, {
              rotation: -90,
              text: yAxisLabel,
              y: am5.percent(50),
              centerX: am5.percent(50),
              fill: am5.color(darkMode ? 0x909090 : 0x6b7280),
              fontSize: 11,
              paddingRight: 8,
            })
          );
        }

        // ── Right Y Axis (optional) ───────────────────────────────────────────
        let yAxisRight: am5xy.ValueAxis<am5xy.AxisRenderer> | undefined;
        if (dualYAxis) {
          const yRendererRight = am5xy.AxisRendererY.new(root, { opposite: true });
          yRendererRight.labels.template.setAll({ fill: labelFill, fontSize: 11 });
          yRendererRight.grid.template.setAll({ strokeOpacity: 0 });

          yAxisRight = chart.yAxes.push(
            am5xy.ValueAxis.new(root, { renderer: yRendererRight })
          ) as am5xy.ValueAxis<am5xy.AxisRenderer>;

          if (yAxisRightLabel) {
            yAxisRight.children.push(
              am5.Label.new(root, {
                rotation: -90,
                text: yAxisRightLabel,
                y: am5.percent(50),
                centerX: am5.percent(50),
                fill: am5.color(darkMode ? 0x909090 : 0x6b7280),
                fontSize: 11,
                paddingLeft: 8,
              })
            );
          }
        }

        // ── Series ────────────────────────────────────────────────────────────
        seriesRefs.current = [];

        seriesConfig.forEach((cfg, i) => {
          const seriesColor = am5.color(cfg.color ?? CHART_PALETTE[i % CHART_PALETTE.length]);
          const yAxis = (dualYAxis && cfg.yAxisIndex === 1 && yAxisRight) ? yAxisRight : yAxisLeft;

          const tooltip = am5.Tooltip.new(root, {
            labelText: seriesConfig.length > 1 ? `${cfg.name}: {valueY}` : "{valueY}",
          });
          tooltip.get("background")?.setAll({
            fill: am5.color(darkMode ? 0x1a1a1a : 0xffffff),
            stroke: am5.color(darkMode ? 0x2e2e2e : 0xe5e7eb),
            strokeOpacity: 1,
          });

          const xValueField =
            xAxisType === "category" ? { categoryXField: dateField } : { valueXField: dateField };

          const series = chart.series.push(
            am5xy.LineSeries.new(root, {
              name: cfg.name,
              xAxis,
              yAxis,
              valueYField: cfg.valueField,
              stroke: seriesColor,
              fill: (cfg.fill ?? false) ? seriesColor : undefined,
              ...xValueField,
              tooltip,
              connect: true,
              ...(cfg.stacked ? { stacked: true } : {}),
              ...(cfg.stepped ? { step: "middle" } : {}),
            })
          );

          series.strokes.template.setAll({
            strokeWidth: cfg.strokeWidth ?? 2,
            ...(cfg.strokeDasharray
              ? { strokeDasharray: cfg.strokeDasharray.split(",").map(Number) }
              : {}),
          });

          if (cfg.fill) {
            series.fills.template.setAll({
              visible: true,
              fillOpacity: cfg.fillOpacity ?? 0.15,
            });
          }

          if (cfg.bullets) {
            series.bullets.push(() =>
              am5.Bullet.new(root, {
                sprite: am5.Circle.new(root, {
                  radius: 4,
                  fill: seriesColor,
                  stroke: am5.color(darkMode ? 0x1a1a1a : 0xffffff),
                  strokeWidth: 1.5,
                }),
              })
            );
          }

          seriesRefs.current.push(series);
        });

        // ── Legend ────────────────────────────────────────────────────────────
        if (shouldShowLegend) {
          let legend: am5.Legend;

          if (isRightLegend) {
            // Vertical legend panel next to the chart
            const panel = root.container.children.push(
              am5.Container.new(root, {
                width: am5.percent(22),
                height: am5.percent(100),
                layout: root.verticalLayout,
              })
            );
            legend = panel.children.push(
              am5.Legend.new(root, {
                layout: root.verticalLayout,
                y: am5.percent(50),
                centerY: am5.percent(50),
              })
            );
          } else if (legendPosition === "top") {
            legend = chart.children.unshift(
              am5.Legend.new(root, {
                centerX: am5.percent(50),
                x: am5.percent(50),
                marginBottom: 8,
              })
            );
          } else {
            legend = chart.children.push(
              am5.Legend.new(root, {
                centerX: am5.percent(50),
                x: am5.percent(50),
                marginTop: 8,
              })
            );
          }

          legend.labels.template.setAll({
            fill: am5.color(darkMode ? 0xf0f0f0 : 0x374151),
            fontSize: 11,
          });
          legend.valueLabels.template.setAll({
            fill: am5.color(darkMode ? 0x909090 : 0x6b7280),
            fontSize: 11,
          });

          legend.data.setAll(chart.series.values);

        }

        // ── Scrollbar ─────────────────────────────────────────────────────────
        if (showScrollbar) {
          const scrollbar = chart.set(
            "scrollbarX",
            am5xy.XYChartScrollbar.new(root, { orientation: "horizontal", height: 40 })
          );
          scrollbar.get("background")?.setAll({
            fill: am5.color(darkMode ? 0x1a1a1a : 0xf5f7fb),
            fillOpacity: 1,
          });

          const sbChart = scrollbar.chart;
          const sbxRenderer = am5xy.AxisRendererX.new(root, {});
          sbxRenderer.labels.template.setAll({ visible: false });
          sbxRenderer.grid.template.setAll({ strokeOpacity: 0 });
          const sbxAxis =
            xAxisType === "category"
              ? sbChart.xAxes.push(am5xy.CategoryAxis.new(root, { categoryField: dateField, renderer: sbxRenderer }))
              : xAxisType === "value"
              ? sbChart.xAxes.push(am5xy.ValueAxis.new(root, { renderer: sbxRenderer }))
              : sbChart.xAxes.push(am5xy.DateAxis.new(root, { baseInterval: { timeUnit: baseTimeUnit, count: 1 }, renderer: sbxRenderer }));

          const sbRenderer = am5xy.AxisRendererY.new(root, {});
          sbRenderer.labels.template.setAll({ visible: false });
          sbRenderer.grid.template.setAll({ strokeOpacity: 0 });
          const sbYAxis = sbChart.yAxes.push(am5xy.ValueAxis.new(root, { renderer: sbRenderer }));

          seriesConfig.forEach((cfg, i) => {
            const sbColor = am5.color(cfg.color ?? CHART_PALETTE[i % CHART_PALETTE.length]);
            const xValueField =
              xAxisType === "category"
                ? { categoryXField: dateField }
                : { valueXField: dateField };
            const sbSeries = sbChart.series.push(
              am5xy.LineSeries.new(root, {
                xAxis: sbxAxis,
                yAxis: sbYAxis,
                valueYField: cfg.valueField,
                stroke: sbColor,
                ...xValueField,
              })
            );
            sbSeries.strokes.template.setAll({ strokeWidth: 1 });
            // mirror data onto scrollbar series
            seriesRefs.current[i]?.events.on("datavalidated", () => {
              sbSeries.data.setAll(seriesRefs.current[i].data.values);
              if (xAxisType === "category") {
                (sbxAxis as am5xy.CategoryAxis<am5xy.AxisRendererX>).data.setAll(
                  seriesRefs.current[i].data.values
                );
              }
            });
          });
        }

        // ── Initial data load ─────────────────────────────────────────────────
        if (rawData && Array.isArray(rawData)) {
          loadData(rawData);
        }

        chart.appear(1000, 100);
      } catch (error) {
        console.error("LineChartWidget: failed to init chart", error);
      }
    };

    initChart();

    return () => {
      disposed = true;
      if (rootRef.current) {
        rootRef.current.dispose();
        rootRef.current = null;
      }
      seriesRefs.current = [];
      xAxisRef.current = null;
    };
    // Re-initialise whenever visual config or theme changes.
  }, [
    chartId,
    darkMode,
    xAxisType,
    dateField,
    baseTimeUnit,
    xAxisDateFormat,
    showScrollbar,
    showLegend,
    legendPosition,
    yAxisLabel,
    xAxisLabel,
    yAxisMin,
    yAxisMax,
    dualYAxis,
    yAxisRightLabel,
    showGridLines,
    cursorBehavior,
    shouldShowLegend,
  ]);

  // ── Data processing helpers ─────────────────────────────────────────────────

  const processData = (data: any[]): any[] => {
    let processed = [...data];

    if (xAxisType === "date") {
      processed.sort(
        (a, b) =>
          new Date(a[dateField]).getTime() - new Date(b[dateField]).getTime()
      );
      processed = processed.map((item: any) => {
        const mapped = { ...item };
        const dateValue = item[dateField] ?? item.$x;
        if (dateValue != null) {
          const ts = typeof dateValue === "number" ? dateValue : new Date(dateValue).getTime();
          mapped[dateField] = ts;
        }
        return mapped;
      });
    } else {
      processed = processed.map((item: any) => {
        const mapped = { ...item };
        if (item.$x !== undefined && mapped[dateField] === undefined) {
          mapped[dateField] = item.$x;
        }
        if (xAxisType === "category" && mapped[dateField] != null) {
          mapped[dateField] = String(mapped[dateField]);
        }
        return mapped;
      });
    }

    return processed;
  };

  const loadData = (data: any[]) => {
    if (!seriesRefs.current.length) return;
    const processed = processData(data);

    if (xAxisType === "category" && xAxisRef.current) {
      (xAxisRef.current as am5xy.CategoryAxis<am5xy.AxisRendererX>).data.setAll(processed);
    }

    seriesRefs.current.forEach((series) => {
      series.data.setAll(processed);
    });
  };

  // ── Reactive data update ────────────────────────────────────────────────────

  useEffect(() => {
    if (rawData && Array.isArray(rawData) && seriesRefs.current.length > 0) {
      loadData(rawData);
    }
  }, [rawData, dateField, xAxisType]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <WidgetContainer
      title={title}
      parameters={parameters}
      onParametersChange={handleParametersChange}
      initialParameterValues={currentParams}
      darkMode={darkMode}
      onGroupedParametersChange={onGroupedParametersChange}
      groupedParametersValues={groupedParametersValues}
      showRefreshButton={showRefreshButton}
      onRefresh={handleRefresh}
    >
      <div id={chartId} ref={containerRef} className="w-full h-full" />
    </WidgetContainer>
  );
};

export const LineChartWidgetDef = {
  component: LineChartWidget,
};
