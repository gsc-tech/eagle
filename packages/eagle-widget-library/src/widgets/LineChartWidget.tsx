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
  /**
   * Field name to read as the lower bound of a ranged/band series. When set,
   * the series renders as a step/area band between `valueField` and this
   * field's value at each point (amCharts `openValueYField`). Required for
   * the seasonality monthly bands.
   */
  openValueField?: string;
}

/**
 * Static horizontal reference line on the (left) Y axis. Differs from
 * `overlayMarkers` which are designed for dynamic alert thresholds — these are
 * constant axis decorations (e.g. the 50% midline on the seasonality monthly
 * chart).
 */
export interface ReferenceLine {
  value: number;
  dashed?: boolean;
  color?: string;
  strokeWidth?: number;
}

export interface OverlayMarker {
  value: number;
  style?: "dashed" | "solid";
  draggable?: boolean;
  id?: string;
  /** Called when the user clicks the × button on the marker label. */
  onDelete?: () => void;
}

export type SeriesStylingFn = (
  seriesIndex: number,
  seriesName: string,
) => { color?: string; opacity?: number; strokeWidth?: number; filter?: string } | undefined;

export interface LineChartWidgetProps extends BaseWidgetProps {
  /** Horizontal threshold lines drawn across the chart at a Y value. */
  overlayMarkers?: OverlayMarker[];
  /** Fires when a draggable overlay marker is dropped to a new position. */
  onOverlayMarkerDragEnd?: (marker: OverlayMarker, newValue: number) => void;
  /** Per-series visual overrides keyed by series index/name. */
  seriesStyling?: SeriesStylingFn;
  /** Fires on amCharts `cursormoved`; receives the X axis value or null on mouseout. */
  onCursorAxisXChange?: (x: number | null) => void;
  /** Programmatically positions the cursor at this X axis value. `null` clears it. */
  externalCursorAxisX?: number | null;
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
  /**
   * Render series as smoothed (Catmull-Rom) curves instead of straight
   * polylines. Applies to every series; per-series override not supported.
   */
  smoothed?: boolean;
  /**
   * When hovering a legend item, fade the non-hovered series to low opacity.
   * Off by default to preserve existing behaviour.
   */
  legendHoverDim?: boolean;
  /**
   * Fixed pixel width for the side legend panel. Only honoured when
   * `legendPosition === "right"`. Falls back to 22% when unset.
   */
  legendWidth?: number;
  /**
   * Fires when the user pans/zooms the x-axis. `start`/`end` are amCharts'
   * normalized 0..1 positions on the axis. Use with `externalAxisRange` to
   * sync the visible range across sibling charts.
   */
  onAxisRangeChange?: (range: { start: number; end: number } | null) => void;
  /** Programmatically apply a visible x-axis range. `null` clears it. */
  externalAxisRange?: { start: number; end: number } | null;
  /**
   * Render the left Y axis on the RIGHT side of the chart (amCharts
   * `opposite: true`). When `dualYAxis` is also true, only the secondary axis
   * is opposite; this prop controls the *primary* axis side.
   */
  yAxisOpposite?: boolean;
  /**
   * Custom color palette for dark mode (Falcon parity). When `darkMode=true`
   * and this array is provided, the chart uses these colors instead of the
   * default amCharts palette. Pass hex strings e.g. `["#7a67c2", "#4a99cc"]`.
   */
  darkColorPalette?: string[];
  /** amCharts number-format string for left-Y-axis labels e.g. "#'%'" or "#,###.00". */
  yAxisNumberFormat?: string;
  /** Static horizontal reference lines drawn on the left Y axis. */
  referenceLines?: ReferenceLine[];
  /**
   * Show one tooltip at a time on the nearest series instead of one per series.
   * Matches Falcon's tooltip-near-cursor + values-in-legend pattern when paired
   * with `legendHoverDim` + `legendValueText`.
   */
  singleTooltip?: boolean;
  /**
   * Fires once when the chart's XYCursor has been created. The return value,
   * if a function, runs on chart dispose. This is the integration point for
   * amCharts 5's native `cursor.syncWith: XYCursor[]` cross-chart sync —
   * SeasonalityChart uses it to register each cursor with the cursor
   * registry so siblings in the same group share X position.
   */
  onCursorReady?: (cursor: am5xy.XYCursor) => (() => void) | void;
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
  cursorBehavior = "zoomXY",
  showRefreshButton = false,
  overlayMarkers,
  onOverlayMarkerDragEnd,
  seriesStyling,
  onCursorAxisXChange,
  externalCursorAxisX,
  smoothed = false,
  legendHoverDim = false,
  legendWidth,
  onAxisRangeChange,
  externalAxisRange,
  yAxisOpposite = false,
  yAxisNumberFormat,
  referenceLines,
  singleTooltip = false,
  darkColorPalette,
  onCursorReady,
}) => {
  const chartId = useId();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rootRef = useRef<am5.Root | null>(null);
  const seriesRefs = useRef<am5xy.LineSeries[]>([]);
  const xAxisRef = useRef<am5xy.Axis<am5xy.AxisRenderer> | null>(null);
  const chartRef = useRef<am5xy.XYChart | null>(null);
  const cursorRef = useRef<am5xy.XYCursor | null>(null);
  const yAxisLeftRef = useRef<am5xy.ValueAxis<am5xy.AxisRenderer> | null>(null);
  // Loop guard: set while we programmatically reposition the cursor in
  // response to `externalCursorAxisX`. The `cursormoved` handler reads this
  // and skips `onCursorAxisXChange` so the parent doesn't re-emit and bounce
  // the cursor back. Cleared on the next frame.
  const suppressEmitRef = useRef(false);
  const suppressRangeEmitRef = useRef(false);
  const onCursorAxisXChangeRef = useRef(onCursorAxisXChange);
  const onAxisRangeChangeRef = useRef(onAxisRangeChange);
  const onCursorReadyRef = useRef(onCursorReady);
  // Cleanup returned by `onCursorReady` — runs on chart dispose so the
  // registry can drop this cursor from its group's syncWith list.
  const cursorReadyCleanupRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    onCursorAxisXChangeRef.current = onCursorAxisXChange;
  }, [onCursorAxisXChange]);
  useEffect(() => {
    onAxisRangeChangeRef.current = onAxisRangeChange;
  }, [onAxisRangeChange]);
  useEffect(() => {
    onCursorReadyRef.current = onCursorReady;
  }, [onCursorReady]);
  // Holds per-series original stroke styling so legend hover-out can restore
  // them faithfully (latest-year emphasis lives in `seriesStyling` and would
  // otherwise be lost when the dim handler resets stroke opacity).
  // `strokeColor` is stored so that the Falcon-parity hover dim (which
  // temporarily switches non-hovered strokes to black) can restore the
  // correct original color on mouse-out.
  const seriesBaselineStrokes = useRef<
    Array<{ strokeOpacity: number; strokeWidth: number; fillOpacity: number; strokeColor: am5.Color }>
  >([]);

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
        // Right legends live inside chart.rightAxesContainer (Falcon parity).
        // amCharts 5 automatically reserves space for them — no manual
        // horizontal root layout or chart-width percentage needed.
        const isRightLegend = shouldShowLegend && legendPosition === "right";

        const chart = root.container.children.push(
          am5xy.XYChart.new(root, {
            wheelY: "zoomX",
            layout: root.verticalLayout,
            // maxTooltipDistance on the CHART (not cursor) is what amCharts 5
            // actually reads. 0 = show only the nearest-series tooltip, matching
            // Falcon's "one tooltip near cursor, values in legend" behaviour.
            ...(singleTooltip ? { maxTooltipDistance: 0 } : {}),
          })
        );

        // Falcon-parity `setCtrlZoom`: wheel is inert unless Ctrl is held.
        // Ctrl+wheel pans X *and* zooms X simultaneously (Falcon's exact combo).
        chart.plotContainer.events.on("wheel", function (ev) {
          if (ev.originalEvent.ctrlKey) {
            ev.originalEvent.preventDefault();
            chart.set("wheelX", "panX");
            chart.set("wheelY", "zoomX");
          } else {
            chart.set("wheelX", "none");
            chart.set("wheelY", "none");
          }
        });
        chartRef.current = chart;

        // Custom dark-mode palette (Falcon parity: darkLineColorPalette).
        if (darkMode && darkColorPalette && darkColorPalette.length > 0) {
          const colorSet = am5.ColorSet.new(root, {
            colors: darkColorPalette.map((h) => am5.color(h)),
            reuse: false,
          });
          chart.set("colors", colorSet);
        }

        // ── Cursor ────────────────────────────────────────────────────────────
        const cursor = chart.set(
          "cursor",
          am5xy.XYCursor.new(root, { behavior: cursorBehavior })
        );
        cursor.lineY.set("visible", false);
        cursor.lineX.set("stroke", am5.color(darkMode ? 0xffffff : 0x000000));
        // Selection rectangle shown while drag-zooming. amCharts' default is a
        // near-white fill that's invisible against dark backgrounds.
        cursor.selection.setAll({
          fill: am5.color(darkMode ? 0xf0f0f0 : 0x000000),
          fillOpacity: darkMode ? 0.18 : 0.1,
          stroke: am5.color(darkMode ? 0xffffff : 0x000000),
          strokeOpacity: darkMode ? 0.5 : 0.3,
          strokeWidth: 1,
        });
        cursorRef.current = cursor;

        // Cross-chart cursor sync hook (amCharts native `syncWith` via the
        // cursorRegistry). The callback may return a cleanup to run on dispose.
        const readyResult = onCursorReadyRef.current?.(cursor);
        if (typeof readyResult === "function") {
          cursorReadyCleanupRef.current = readyResult;
        }

        cursor.events.on("cursormoved", () => {
          if (suppressEmitRef.current) return;
          const cb = onCursorAxisXChangeRef.current;
          if (!cb) return;
          const xAxis = xAxisRef.current;
          if (!xAxis) return;
          const positionX = cursor.getPrivate("positionX");
          if (positionX == null) return;
          const value = (xAxis as am5xy.DateAxis<am5xy.AxisRenderer>).positionToValue(
            xAxis.toAxisPosition(positionX),
          );
          cb(Number.isFinite(value) ? value : null);
        });
        chart.plotContainer.events.on("pointerout", () => {
          if (suppressEmitRef.current) return;
          onCursorAxisXChangeRef.current?.(null);
        });

        // ── Axis renderers ────────────────────────────────────────────────────
        // AxisRendererY MUST be attached to an axis before its templates are
        // mutated — touching `.labels` / `.grid` on an orphan renderer triggers
        // a `_changed` cycle that dereferences `ghostLabel` (set by the axis
        // during attach), throwing "Cannot read properties of undefined". So
        // we defer the yRenderer creation/styling to where the axis is built
        // and pick the correct (opposite or not) renderer there.
        const xRenderer = am5xy.AxisRendererX.new(root, { minGridDistance: 60 });

        const gridStroke = am5.color(darkMode ? 0x2e2e2e : 0xe5e7eb);
        const labelFill = am5.color(darkMode ? 0xf0f0f0 : 0x374151);

        xRenderer.labels.template.setAll({ fill: labelFill, fontSize: 11 });

        xRenderer.grid.template.setAll({
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

        // X-axis range events — emit normalized 0..1 start/end on pan/zoom so
        // sibling charts can mirror the visible window. Debounced so we emit
        // once the user finishes interacting instead of streaming a value for
        // every animation tick (which both spams the store and confuses the
        // suppress-emit guard, breaking sync visually). Guarded by
        // `suppressRangeEmitRef` while we apply an external range to avoid an
        // emit→apply→emit loop.
        let emitTimer: ReturnType<typeof setTimeout> | null = null;
        const emitRange = () => {
          if (suppressRangeEmitRef.current) return;
          if (emitTimer !== null) clearTimeout(emitTimer);
          emitTimer = setTimeout(() => {
            emitTimer = null;
            if (suppressRangeEmitRef.current) return;
            const cb = onAxisRangeChangeRef.current;
            if (!cb) return;
            const start = xAxis.get("start") ?? 0;
            const end = xAxis.get("end") ?? 1;
            if (start <= 0.0001 && end >= 0.9999) {
              cb(null);
            } else {
              cb({ start, end });
            }
          }, 120);
        };
        xAxis.on("start", emitRange);
        xAxis.on("end", emitRange);

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
        // When `yAxisOpposite` is set, the primary axis sits on the right
        // (matches Falcon's monthly chart with %-axis on the right).
        const leftRenderer = yAxisOpposite
          ? am5xy.AxisRendererY.new(root, { opposite: true })
          : am5xy.AxisRendererY.new(root, {});
        const yAxisLeft = chart.yAxes.push(
          am5xy.ValueAxis.new(root, {
            renderer: leftRenderer,
            ...(yAxisMin !== undefined ? { min: yAxisMin } : {}),
            ...(yAxisMax !== undefined ? { max: yAxisMax } : {}),
            ...(yAxisNumberFormat ? { numberFormat: yAxisNumberFormat } : {}),
          })
        );
        // Now that the renderer is attached to an axis, it's safe to mutate
        // its label/grid templates without crashing on `ghostLabel`.
        leftRenderer.labels.template.setAll({ fill: labelFill, fontSize: 11 });
        leftRenderer.grid.template.setAll({
          stroke: gridStroke,
          strokeOpacity: showGridLines ? 1 : 0,
        });
        yAxisLeftRef.current = yAxisLeft;

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
        seriesBaselineStrokes.current = [];

        seriesConfig.forEach((cfg, i) => {
          const styling = seriesStyling?.(i, cfg.name);
          const resolvedColor =
            styling?.color ?? cfg.color ?? CHART_PALETTE[i % CHART_PALETTE.length];
          const seriesColor = am5.color(resolvedColor);
          const resolvedStrokeWidth = styling?.strokeWidth ?? cfg.strokeWidth ?? 2;
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

          // `cfg.stepped` always wins over `smoothed` since stepped is more
          // specific (per-series flag explicitly requesting step rendering).
          // Stepped uses the dedicated StepLineSeries class — plain LineSeries
          // does not honour a `step` setting, which silently broke the
          // seasonality monthly band rendering.
          const SeriesCtor = cfg.stepped
            ? am5xy.StepLineSeries
            : smoothed
            ? am5xy.SmoothedXLineSeries
            : am5xy.LineSeries;
          const series = chart.series.push(
            SeriesCtor.new(root, {
              name: cfg.name,
              xAxis,
              yAxis,
              valueYField: cfg.valueField,
              stroke: seriesColor,
              fill: (cfg.fill ?? false) ? seriesColor : undefined,
              ...xValueField,
              tooltip,
              // amCharts swaps this token in dynamically as the cursor moves,
              // so the legend value column tracks the cursor position.
              // Mirrors Falcon's `legendValueText: "{valueY}"`.
              legendValueText: "{valueY}",
              connect: true,
              ...(cfg.stacked ? { stacked: true } : {}),
              ...(cfg.openValueField ? { openValueYField: cfg.openValueField } : {}),
            })
          );

          const baselineStrokeOpacity = styling?.opacity ?? 1;
          const baselineFillOpacity = cfg.fillOpacity ?? 0.15;
          const strokeSettings: Record<string, unknown> = {
            strokeWidth: resolvedStrokeWidth,
            strokeOpacity: baselineStrokeOpacity,
            ...(cfg.strokeDasharray
              ? { strokeDasharray: cfg.strokeDasharray.split(",").map(Number) }
              : {}),
          };
          if (styling?.filter) strokeSettings.filter = styling.filter;
          series.strokes.template.setAll(strokeSettings as Parameters<typeof series.strokes.template.setAll>[0]);
          seriesBaselineStrokes.current[i] = {
            strokeOpacity: baselineStrokeOpacity,
            strokeWidth: resolvedStrokeWidth,
            fillOpacity: baselineFillOpacity,
            strokeColor: seriesColor,
          };

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
            // Right legend lives INSIDE chart.rightAxesContainer (Falcon parity).
            // This is the canonical amCharts 5 approach — the chart automatically
            // adjusts plot-area width to accommodate it, and template pointer
            // events fire correctly because the legend is inside the chart tree.
            legend = chart.rightAxesContainer.children.push(
              am5.Legend.new(root, {
                width: legendWidth ?? 150,
                paddingLeft: 15,
                height: am5.percent(100),
              })
            );
            legend.itemContainers.template.set("width", am5.percent(100));
            legend.valueLabels.template.setAll({
              width: am5.percent(100),
              textAlign: "right",
            });
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

          // ── Hover + dblclick events (direct attach, not template) ─────────
          // Falcon attaches via `legend.itemContainers.template.events.on(...)`
          // and reads `e.target.dataItem.dataContext`. That pattern is flaky in
          // our amCharts 5 build: when the pointer lands on a CHILD of the item
          // container (marker / label / valueLabel), event bubbling makes
          // `e.target` the child sprite — which has no `dataItem` — so the
          // handler returns early and nothing animates.
          //
          // Direct attachment to each item container with a closure-captured
          // series reference avoids the bubbling/target ambiguity entirely.
          legend.dataItems.forEach((di) => {
            const series = di.dataContext as am5xy.LineSeries | undefined;
            const container = di.get("itemContainer");
            if (!series || !container) return;

            if (legendHoverDim) {
              container.events.on("pointerover", () => {
                chart.series.each((s) => {
                  const ls = s as am5xy.LineSeries;
                  if (ls === series) {
                    ls.strokes.template.setAll({ strokeOpacity: 1, strokeWidth: 3 });
                  } else {
                    ls.strokes.template.setAll({ strokeOpacity: 0.15, stroke: am5.color(0x000000) });
                  }
                  ls.fills.template.setAll({ fillOpacity: ls === series ? 0.2 : 0.05 });
                });
              });

              container.events.on("pointerout", () => {
                chart.series.each((s, i) => {
                  const ls = s as am5xy.LineSeries;
                  const baseline = seriesBaselineStrokes.current[i];
                  if (baseline) {
                    ls.strokes.template.setAll({
                      strokeOpacity: baseline.strokeOpacity,
                      strokeWidth: baseline.strokeWidth,
                      stroke: baseline.strokeColor,
                    });
                    ls.fills.template.setAll({ fillOpacity: baseline.fillOpacity });
                  } else {
                    ls.strokes.template.setAll({ strokeOpacity: 1 });
                    ls.fills.template.setAll({ fillOpacity: 0.15 });
                  }
                });
              });
            }

            container.events.on("dblclick", () => {
              let visibleCount = 0;
              chart.series.each((s) => { if (!s.isHidden()) visibleCount++; });
              const onlyThisVisible = visibleCount === 1 && !series.isHidden();

              if (onlyThisVisible) {
                // Restore all
                chart.series.each((s) => {
                  s.show(0);
                  const dItem = legend.dataItems.find((d) => d.dataContext === s);
                  dItem?.get("itemContainer")?.set("disabled", false);
                });
              } else {
                // Isolate clicked
                chart.series.each((s) => {
                  const dItem = legend.dataItems.find((d) => d.dataContext === s);
                  if (s === series) {
                    s.show(0);
                    dItem?.get("itemContainer")?.set("disabled", false);
                  } else {
                    s.hide(0);
                    dItem?.get("itemContainer")?.set("disabled", true);
                  }
                });
              }
            });
          });
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
      // Run cursor-registry cleanup BEFORE disposing the root, so the registry
      // can clear `syncWith` while the cursor is still valid.
      if (cursorReadyCleanupRef.current) {
        try { cursorReadyCleanupRef.current(); } catch { /* ignore */ }
        cursorReadyCleanupRef.current = null;
      }
      if (rootRef.current) {
        rootRef.current.dispose();
        rootRef.current = null;
      }
      seriesRefs.current = [];
      xAxisRef.current = null;
      chartRef.current = null;
      cursorRef.current = null;
      yAxisLeftRef.current = null;
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
    smoothed,
    legendHoverDim,
    legendWidth,
    yAxisOpposite,
    yAxisNumberFormat,
    singleTooltip,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    darkColorPalette?.join(","),
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

  // ── Overlay markers + static reference lines (horizontal lines on Y axis)
  // Overlay markers are dynamic alert thresholds (amber). Reference lines are
  // static axis decorations (dark dashed, e.g. the 50% midline on monthly).
  useEffect(() => {
    const yAxis = yAxisLeftRef.current;
    const root = rootRef.current;
    if (!yAxis || !root) return;

    yAxis.axisRanges.clear();

    (overlayMarkers ?? []).forEach((marker) => {
      const dataItem = yAxis.makeDataItem({ value: marker.value });
      const range = yAxis.createAxisRange(dataItem);

      // Grid line is always the visual — same as Falcon's AlertContainer pattern
      const strokeColor = am5.color(darkMode ? 0xf59e0b : 0xb45309);
      range.get("grid")?.setAll({
        stroke: strokeColor,
        strokeOpacity: 1,
        strokeWidth: 1.5,
        visible: true,
        ...(marker.style === "dashed" ? { strokeDasharray: [4, 4] } : {}),
        location: 0,
      });

      if (marker.draggable) {
        const container = am5.Container.new(root, {
          centerY: am5.p50,
          draggable: true,
          cursorOverStyle: "ns-resize",
          layout: root.horizontalLayout,
        });

        container.adapters.add("x", () => 0);
        container.adapters.add("y", (y) => {
          const chart = chartRef.current;
          if (!chart) return y;
          const h = chart.plotContainer.height() as number;
          return h ? Math.max(0, Math.min(h, y as number)) : y;
        });

        container.set("background", am5.RoundedRectangle.new(root, {
          fill: am5.color(darkMode ? 0x27272a : 0xffffff),
          fillOpacity: 0.92,
          stroke: am5.color(darkMode ? 0xf59e0b : 0xb45309),
          strokeOpacity: 1,
          strokeWidth: 1,
          cornerRadiusTL: 3,
          cornerRadiusTR: 3,
          cornerRadiusBL: 3,
          cornerRadiusBR: 3,
        }));

        const valueLabel = container.children.push(am5.Label.new(root, {
          text: marker.value.toFixed(4),
          fill: am5.color(darkMode ? 0xf4f4f5 : 0x1e293b),
          fontSize: 11,
          fontFamily: "monospace",
          paddingTop: 4,
          paddingBottom: 4,
          paddingLeft: 6,
          paddingRight: 3,
        }));

        if (marker.onDelete) {
          const deleteBtn = container.children.push(am5.Button.new(root, {
            cursorOverStyle: "pointer",
            paddingTop: 3,
            paddingBottom: 3,
            paddingLeft: 3,
            paddingRight: 5,
            background: am5.RoundedRectangle.new(root, {
              fill: am5.color(0xef4444),
              fillOpacity: 0,
            }),
          }));
          deleteBtn.set("label", am5.Label.new(root, {
            text: "✕",
            fill: am5.color(0xef4444),
            fontSize: 11,
          }));
          deleteBtn.events.on("click", () => {
            marker.onDelete!();
          });
        }

        // During drag: move the grid line with the handle and update the label.
        // container.y() is the absolute pixel Y on the plot area (Falcon pattern).
        container.events.on("dragged", () => {
          const chart = chartRef.current;
          if (!chart) return;
          const y = container.y() as number;
          const h = chart.plotContainer.height() as number;
          if (!h) return;
          const position = yAxis.toAxisPosition(y / h);
          const newValue = yAxis.positionToValue(position);
          dataItem.set("value", newValue);
          valueLabel.set("text", Number(newValue).toFixed(4));
        });

        container.events.on("dragstop", () => {
          const chart = chartRef.current;
          if (!chart) return;
          const y = container.y() as number;
          const h = chart.plotContainer.height() as number;
          if (!h) return;
          const position = yAxis.toAxisPosition(y / h);
          const newValue = yAxis.positionToValue(position);
          if (onOverlayMarkerDragEnd) {
            onOverlayMarkerDragEnd(marker, newValue);
          }
        });

        dataItem.set("bullet", am5xy.AxisBullet.new(root, { sprite: container }));
      }

      range.get("label")?.setAll({ visible: false });
    });

    (referenceLines ?? []).forEach((rl) => {
      const range = yAxis.createAxisRange(yAxis.makeDataItem({ value: rl.value }));
      const fallbackColor = darkMode ? 0x9ca3af : 0x000000;
      range.get("grid")?.setAll({
        stroke: am5.color(rl.color ?? fallbackColor),
        strokeOpacity: 1,
        strokeWidth: rl.strokeWidth ?? 1.5,
        visible: true,
        ...(rl.dashed === false ? {} : { strokeDasharray: [2, 2] }),
        location: 0,
      });
      range.get("label")?.setAll({ visible: false });
    });
  }, [overlayMarkers, onOverlayMarkerDragEnd, referenceLines, darkMode]);

  // ── External cursor sync (programmatic positioning + loop guard) ────────────
  useEffect(() => {
    const cursor = cursorRef.current;
    const chart = chartRef.current;
    const xAxis = xAxisRef.current;
    if (!cursor || !chart || !xAxis) return;

    if (externalCursorAxisX == null) {
      // External sync cleared — hide cursor on this chart so it doesn't linger
      // after the source chart's mouse left. Instant duration (0) avoids a
      // visible fade that would conflict with the natural local-mouseout hide.
      try { cursor.hide(0); } catch { /* disposed */ }
      return;
    }

    // Map the shared *data value* (a date timestamp) to a point on THIS chart's
    // axis. We invert the emit path exactly so the cursor lands on the same date
    // even when sibling charts have different x-ranges or zoom levels:
    //   emit:  getPrivate("positionX") --toAxisPosition--> --positionToValue--> value
    //   apply: value --valueToPosition--> --toGlobalPosition--> plot-relative pos
    // `toGlobalPosition` (am5 ≥ 5.4.2) is the documented zoom-aware inverse of
    // `toAxisPosition`; using `valueToPosition` alone breaks once a chart is zoomed.
    const dateAxis = xAxis as am5xy.DateAxis<am5xy.AxisRenderer>;
    const axisPos = dateAxis.valueToPosition(externalCursorAxisX);
    if (!Number.isFinite(axisPos)) return;
    const plotPos = xAxis.toGlobalPosition(axisPos);

    const plot = chart.plotContainer;
    // `handleMove` expects a point in the chart's GLOBAL display space, so map
    // the plot-relative position through the plot container's transform.
    const globalPoint = plot.toGlobal({ x: plotPos * plot.width(), y: plot.height() / 2 });

    // `handleMove(point, skipEvent)` is the amCharts 5 API for programmatically
    // moving the cursor (the old code called `triggerMove`, which only existed in
    // amCharts v4 — so the cursor never actually moved). It auto-shows the cursor
    // and, with skipEvent=false, also updates the axis date label + series
    // tooltips on this follower (Falcon parity).
    //
    // handleMove fires `cursormoved` synchronously; `suppressEmitRef` makes the
    // handler skip re-emitting into the store, so the synced position never
    // echoes back and bounces between charts. The dispatch is synchronous, so we
    // can clear the guard immediately after the call returns.
    suppressEmitRef.current = true;
    try {
      cursor.handleMove(globalPoint, false);
    } catch {
      /* disposed mid-frame */
    } finally {
      suppressEmitRef.current = false;
    }
  }, [externalCursorAxisX]);

  // ── External X-axis range sync (programmatic zoom/pan + loop guard) ────────
  useEffect(() => {
    const xAxis = xAxisRef.current;
    if (!xAxis) return;

    suppressRangeEmitRef.current = true;
    if (externalAxisRange == null) {
      // Reset to full extent only if the axis is currently zoomed in. This
      // avoids reflowing on every sibling pointerout that happens to write a
      // null range to the store.
      const curStart = xAxis.get("start") ?? 0;
      const curEnd = xAxis.get("end") ?? 1;
      if (curStart > 0.0001 || curEnd < 0.9999) {
        xAxis.set("start", 0);
        xAxis.set("end", 1);
      }
    } else {
      xAxis.set("start", externalAxisRange.start);
      xAxis.set("end", externalAxisRange.end);
    }
    // Hold suppression for longer than the emit debounce so any late-firing
    // start/end event from the programmatic set doesn't bounce back into the
    // store.
    setTimeout(() => {
      suppressRangeEmitRef.current = false;
    }, 200);
  }, [externalAxisRange?.start, externalAxisRange?.end]);

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
