/**
 * `<SeasonalityChart>` — internal wrapper that fetches data from the Falcon
 * middleware and renders the matching Eagle widget extension with cursor sync.
 *
 * Composition strategy (per T2.1 spike): the extended `LineChartWidget` covers
 * stacked / monthly / average variants. For `heatmap`, we use the existing
 * `CartesianHeatmapWidget` (extended in T2.2 with the same cursor props) —
 * NOT the cal-heatmap `HeatMapWidget`, which is calendar-shaped and doesn't
 * fit Falcon's matrix heatmap response.
 *
 * Cursor sync uses `useSeasonalityCursorStore`, keyed by `groupId`. Sibling
 * SeasonalityChart instances on the same dashboard with the same `groupId`
 * share cursor X position via the store's rAF-coalesced setter.
 *
 * Phase 3.5 UX polish applied per variant:
 *   - stacked  → year-label extraction, latest-year emphasis, smoothed curves,
 *                legend hover dim
 *   - monthly  → stepped lines
 *   - average  → client-side year filter + computed mean overlay series
 *   - heatmap  → diverging red/white/green visualMap, value/10000 formatting
 */

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type * as am5xy from "@amcharts/amcharts5/xy";
import {
  LineChartWidget,
  type OverlayMarker,
  type ReferenceLine,
  type SeriesConfig,
  type SeriesStylingFn,
} from "../../widgets/LineChartWidget";
import { CartesianHeatmapWidget } from "../../widgets/CartesianHeatmapWidget";
import { POSITIVE_COLORS, NEGATIVE_COLORS } from "../../widgets/CartesianHeatmapWidget/cartesianHeatmapConfig";
import { useSeasonalityCursorStore } from "../../store/seasonalityCursorStore";
import { falconApiClient } from "../../utils/falconApiClient";

export type SeasonalityChartType = "stacked" | "monthly" | "average" | "heatmap";

export interface SeasonalityChartProps {
  type: SeasonalityChartType;
  expression: string;
  /** Cursor sync group. Sibling charts in the same group share cursor X. */
  groupId?: string;
  /** Years-back time period (Falcon `time_period` query param). Defaults to "10". */
  yearsBack?: string;
  /** Years to include when type === 'average'. Client-side filter. */
  selectedYears?: string[];
  /**
   * Fires whenever the chart's response yields a fresh list of year series
   * names (only meaningful for `type === 'average'`). The owning widget uses
   * this to populate the year-filter UI without doing its own fetch.
   */
  onAvailableYears?: (years: string[]) => void;
  /** Threshold markers (alert overlays) — only honoured for line variants. */
  overlayMarkers?: OverlayMarker[];
  /** Fires when a draggable overlay marker is dropped. */
  onOverlayMarkerDragEnd?: (marker: OverlayMarker, newValue: number) => void;
  /** When provided, overrides the cursor store; for use inside QuickViewChartModal. */
  cursorX?: number | null;
  onCursorChange?: (x: number | null) => void;
  darkMode?: boolean;
  title?: string;
  /**
   * Dollar-Equivalent flag from the expression builder. When true, stacked and
   * average charts use the abbreviated Y-axis number format `#,###a` (Falcon
   * parity: the DE flag drives `numberFormat` on the ValueAxis).
   */
  de?: boolean;
}

// ─── Falcon response shapes ────────────────────────────────────────────────────

type FalconLinePoint = { x: string | number; y: number };
type FalconLineSeries = { name: string; lineData?: FalconLinePoint[]; data?: FalconLinePoint[] };

interface StackedResponse {
  // GET /data returns `FalconLineSeries[]` directly.
  series?: FalconLineSeries[];
}

interface MonthlyResponse {
  monthly: FalconLineSeries[];
  MonthlyHeatMap?: unknown;
}

type AverageResponse = Record<string, FalconLinePoint[]>;

/**
 * Falcon `/heatmap` response. Each row is a contract/year series; each cell
 * is `{x: dateString, y: number | null}`. Top-level `xLabels`/`yLabels` are
 * not actually returned by the upstream service — we derive them from the
 * row names and cell x-coordinates. They remain optional here as an
 * escape-hatch override.
 */
type HeatmapRowCell = { x: string | number; y: number | string | null };
type HeatmapRow = { name: string; data: HeatmapRowCell[] };
interface HeatmapResponse {
  HeatMap: HeatmapRow[];
  xLabels?: string[];
  yLabels?: string[];
}

// ─── Year-label extraction (Falcon SeasonChartNew parity) ──────────────────────
// Series names look like "RBH24", "CL_Z25", "BRN24", "2024", or DE-scaled
// expressions like "42000*(RBQ25+RBU25-RBF26)". The original `/\d{2,4}/` regex
// fails for DE expressions because it greedily matches "4200" from "42000" and
// returns "00". Fix: prefer a letter-preceded 2-digit pattern (contract code
// suffix), then fall back to full-year, then to the old behaviour.
export function extractYearLabel(seriesName: string): string {
  // Contract code pattern: letter immediately before exactly 2 digits (RBH24 → "24",
  // "42000*(RBQ25+RBU25-RBF26)" → first match "Q25" → "25").
  const contractMatch = seriesName.match(/[A-Za-z](\d{2})(?!\d)/);
  if (contractMatch) return contractMatch[1];
  // Full 4-digit year (e.g. "2024").
  const yearMatch = seriesName.match(/\b(20\d{2})\b/);
  if (yearMatch) return yearMatch[1].slice(2);
  // Legacy fallback: first 2–4 digit run.
  const m = seriesName.match(/\d{2,4}/);
  if (!m) return seriesName;
  const digits = m[0];
  if (digits.length === 4) {
    const n = parseInt(digits, 10);
    if (n >= 2000 && n <= 2099) return digits.slice(2);
  }
  return digits.slice(-2);
}

// ─── Adapters: Falcon → Eagle widget input ─────────────────────────────────────

interface JoinedLineData {
  rows: Array<Record<string, number>>;
  seriesConfig: SeriesConfig[];
}

function parseX(x: string | number): number {
  if (typeof x === "number") return x;
  // Numeric string (e.g. ms-epoch "1705276800000") — Date.parse returns NaN for these.
  if (/^\d+(\.\d+)?$/.test(x)) return Number(x);
  return Date.parse(x);
}

function joinSeriesByX(
  seriesList: FalconLineSeries[],
  configMod?: (cfg: SeriesConfig, rawSeries: FalconLineSeries, index: number) => SeriesConfig,
): JoinedLineData {
  const byX = new Map<number, Record<string, number>>();
  const seriesConfig: SeriesConfig[] = [];

  seriesList.forEach((s, i) => {
    // Keep the raw `s.name` as the unique field key so two series with the
    // same display year never collide on join. `name` (legend label) can be
    // overridden by the configMod hook.
    const fieldName = s.name;
    let cfg: SeriesConfig = { name: s.name, valueField: fieldName };
    if (configMod) cfg = configMod(cfg, s, i);
    seriesConfig.push(cfg);

    const points = s.lineData ?? s.data ?? [];
    points.forEach((p) => {
      const ts = parseX(p.x);
      if (!Number.isFinite(ts)) return;
      const row = byX.get(ts) ?? { date: ts };
      row[fieldName] = p.y;
      byX.set(ts, row);
    });
  });

  const rows = Array.from(byX.values()).sort((a, b) => a.date - b.date);
  return { rows, seriesConfig };
}

/** Append a computed mean series to a joined line dataset. */
function appendAverageOverlay(joined: JoinedLineData, sourceFieldNames: string[]): JoinedLineData {
  const AVG_FIELD = "__seasonality_average__";
  if (sourceFieldNames.length === 0) return joined;

  joined.rows.forEach((row) => {
    let sum = 0, n = 0;
    sourceFieldNames.forEach((f) => {
      const v = row[f];
      if (typeof v === "number" && Number.isFinite(v)) { sum += v; n += 1; }
    });
    if (n > 0) row[AVG_FIELD] = sum / n;
  });
  joined.seriesConfig.push({
    name: "Average",
    valueField: AVG_FIELD,
    color: "#0ea5e9",
    strokeWidth: 3,
  });
  return joined;
}

function averageToSeries(resp: AverageResponse): FalconLineSeries[] {
  return Object.entries(resp).map(([name, points]) => ({ name, lineData: points }));
}

function heatmapToCartesian(resp: HeatmapResponse): {
  data: Array<[number, number, number]>;
  xLabels: string[];
  yLabels: string[];
} {
  const rows = resp.HeatMap ?? [];

  // Y axis: row .name in source order (Falcon already reverses upstream so
  // newest is at the top).
  const yLabels = resp.yLabels ?? rows.map((r) => r.name);

  // X axis: union of all cell.x values across rows, preserved in first-seen
  // order. Most rows share the same x-grid, but we union to be safe.
  let xLabels: string[];
  if (resp.xLabels) {
    xLabels = resp.xLabels;
  } else {
    const seen = new Set<string>();
    const collected: string[] = [];
    rows.forEach((r) => {
      r.data?.forEach((c) => {
        const key = String(c.x);
        if (!seen.has(key)) {
          seen.add(key);
          collected.push(key);
        }
      });
    });
    xLabels = collected;
  }
  const xIndex = new Map(xLabels.map((label, i) => [label, i]));

  const data: Array<[number, number, number]> = [];
  rows.forEach((row, y) => {
    row.data?.forEach((cell) => {
      if (cell.y === null || cell.y === undefined || cell.y === "-" || cell.y === "") return;
      const numVal = Number(cell.y);
      if (!isFinite(numVal)) return;
      const x = xIndex.get(String(cell.x));
      if (x === undefined) return;
      data.push([x, y, numVal]);
    });
  });
  return { data, xLabels, yLabels };
}

// ─── Heatmap visualMap (gradient piecewise, magnitude-mapped) ─────────────────
// Builds a diverging red/white/green piecewise visualMap from the actual data
// range so that cell intensity reflects magnitude, not just sign.
function buildSeasonalityVisualMap(data: Array<[number, number, number]>) {
  const numericVals = data.map((d) => d[2]);
  const posValues = numericVals.filter((v) => v > 0);
  const negValues = numericVals.filter((v) => v < 0);

  const positiveMax = posValues.length > 0 ? Math.max(...posValues) : 1;
  const negativeMin = negValues.length > 0 ? Math.min(...negValues) : -1;

  const pieces: Record<string, unknown>[] = [];

  // Zero — white
  pieces.push({ value: 0, color: "#ffffff" });

  // Positive: light green (index 0, near zero) → dark green (last index, near max)
  const posSteps = POSITIVE_COLORS.length;
  for (let i = 0; i < posSteps; i++) {
    const lo = (positiveMax / posSteps) * i;
    const hi = (positiveMax / posSteps) * (i + 1);
    pieces.push({
      gt: i === 0 ? 1e-10 : lo,
      lte: i === posSteps - 1 ? 1e15 : hi,
      color: POSITIVE_COLORS[i],
    });
  }

  // Negative: light red (index 0, near zero) → dark red (last index, most negative)
  const negSteps = NEGATIVE_COLORS.length;
  for (let i = 0; i < negSteps; i++) {
    const hi = i === 0 ? -1e-10 : (negativeMin / negSteps) * i;
    const lo = (negativeMin / negSteps) * (i + 1);
    pieces.push({
      gt: i === negSteps - 1 ? -1e15 : lo,
      lte: hi,
      color: NEGATIVE_COLORS[i],
    });
  }

  return {
    type: "piecewise" as const,
    show: false,
    seriesIndex: 0,
    dimension: 2,
    pieces,
  };
}

const HEATMAP_VALUE_FORMATTER = (v: number) => (v / 10000).toFixed(2);

// ─── Dark-mode color palette (Falcon `darkLineColorPalette` parity) ───────────
// Matches the active palette in falcon-ui/src/components/chart/utils/darkLineColors.ts.
// Applied as a custom am5.ColorSet on the chart when `darkMode=true`.
const DARK_LINE_PALETTE: string[] = [
  "#7a67c2", // Dark Violet
  "#4a99cc", // Dark Sky Blue
  "#b3801f", // Dark Amber
  "#269973", // Dark Emerald
  "#bf4d88", // Dark Pink
  "#4a7acc", // Dark Blue
  "#8946cc", // Dark Purple
  "#bf455d", // Dark Rose
  "#3ea363", // Dark Green
  "#bfb32a", // Dark Yellow
  "#2699bf", // Dark Cyan
  "#bf743b", // Dark Orange
  "#575ecc", // Dark Indigo
  "#269998", // Dark Teal
  "#bf45bf", // Dark Fuchsia
];

// ─── Endpoint routing ──────────────────────────────────────────────────────────

// Stacked uses the auth-backend POST endpoint.
// Heatmap/Monthly/Average use the legacy seasonality-service GET endpoints.
type FetchStrategy = { method: "POST"; path: string } | { method: "GET"; path: string };

function strategyFor(type: SeasonalityChartType): FetchStrategy {
  switch (type) {
    case "stacked":
      return { method: "POST", path: "/api/seasonality/Stacked" };
    case "monthly":
      return { method: "GET", path: "/api/seasonality/monthly" };
    case "average":
      return { method: "GET", path: "/api/seasonality/average" };
    case "heatmap":
      return { method: "GET", path: "/api/seasonality/heatmap" };
  }
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function SeasonalityChart(props: SeasonalityChartProps) {
  const {
    type,
    expression,
    groupId,
    yearsBack = "10",
    selectedYears: externalSelectedYears,
    onAvailableYears,
    overlayMarkers,
    onOverlayMarkerDragEnd,
    cursorX: cursorXOverride,
    onCursorChange,
    darkMode,
    title,
    de,
  } = props;

  // Internal year-filter state for `type === "average"` when no external
  // controller supplies `selectedYears`. Lets the year-chip UI work for any
  // bare-`SeasonalityChart` consumer (e.g. QuickViewChartModal) without
  // needing a parent widget wrapper.
  const [internalSelectedYears, setInternalSelectedYears] = useState<string[] | null>(null);
  const selectedYears =
    externalSelectedYears !== undefined ? externalSelectedYears : internalSelectedYears ?? undefined;
  const managesYearFilterInternally =
    type === "average" && externalSelectedYears === undefined;

  const [raw, setRaw] = useState<unknown | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  // Historical year expressions from getCheckBoxList — drives the chip/checkbox UI.
  // Decoupled from `raw` response keys so whitespace normalization differences don't hide chips.
  const [checkboxYears, setCheckboxYears] = useState<string[] | null>(null);

  // ── Fetch A: getCheckBoxList (average only) ───────────────────────────────
  // Runs when expression or yearsBack changes. Populates `checkboxYears` for
  // the chip/checkbox UI. Does NOT depend on selectedYears.
  useEffect(() => {
    if (type !== "average" || !expression) {
      setCheckboxYears(null);
      return;
    }
    const controller = new AbortController();
    setCheckboxYears(null);
    falconApiClient
      .get<{ selected_symbols?: string[] }>(
        `/api/seasonality/getCheckBoxList?${new URLSearchParams({ input_expr: expression, time_period: yearsBack })}`,
        { signal: controller.signal },
      )
      .then((res) => {
        const all = res?.selected_symbols ?? [];
        setCheckboxYears(all.filter((y) => y !== expression));
      })
      .catch((err) => { if (err.name !== "AbortError") console.error("[SeasonalityChart] getCheckBoxList failed", err); });
    return () => controller.abort();
  }, [type, expression, yearsBack]);

  // ── Fetch B: chart data ───────────────────────────────────────────────────
  // For average: re-fetches whenever selectedYears changes so the server can
  // recompute the "avg" key with the new set of selected historical years.
  // The API response shape is: { [expression]: FalconLinePoint[], avg?: FalconLinePoint[] }
  // For all other types: runs only on expression/yearsBack/type changes.
  useEffect(() => {
    if (!expression) {
      setRaw(null);
      setFetchError(null);
      return;
    }
    const controller = new AbortController();
    setFetchError(null);

    if (type === "average") {
      const avgParams = new URLSearchParams({ input_expr: expression, time_period: yearsBack });
      (selectedYears ?? []).forEach((y) => avgParams.append("selected_years", y));
      falconApiClient
        .get<AverageResponse>(`/api/seasonality/average?${avgParams}`, { signal: controller.signal })
        .then((res) => { if (res !== undefined) setRaw(res); })
        .catch((err) => {
          if (err.name === "AbortError") return;
          console.error("[SeasonalityChart] average fetch failed", err);
          setFetchError(err instanceof Error ? err.message : String(err));
          setRaw(null);
        });
    } else {
      const strategy = strategyFor(type);
      const fetchPromise =
        strategy.method === "POST"
          ? falconApiClient.post<unknown>(
              strategy.path,
              { expression, time_period: yearsBack },
              { signal: controller.signal },
            )
          : falconApiClient.get<unknown>(
              `${strategy.path}?${new URLSearchParams({ input_expr: expression, time_period: yearsBack })}`,
              { signal: controller.signal },
            );

      fetchPromise
        .then((res) => setRaw(res))
        .catch((err) => {
          if (err.name === "AbortError") return;
          console.error("[SeasonalityChart] fetch failed", err);
          setFetchError(err instanceof Error ? err.message : String(err));
          setRaw(null);
        });
    }

    return () => controller.abort();
    // selectedYears?.join is the stable dep that triggers a re-fetch when the
    // user checks/unchecks a year — the server recomputes the "avg" key.
  }, [type, expression, yearsBack, selectedYears?.join(",")]);

  // ── Cursor sync (value-based, store-backed) ────────────────────────────────
  // Dashboard mode: each chart emits its cursor's date value into the shared
  // store; peers read it and apply it via `externalCursorAxisX` (which calls
  // `triggerMove` at the correct pixel for *their* axis scale).
  //
  // This replaces the old `syncWith` approach which synced by screen-pixel
  // coordinates — that caused wrong dates when sibling charts have different
  // date ranges (e.g. stacked vs average with different yearsBack extents).
  //
  // Modal mode (`cursorXOverride !== undefined`): parent controls the cursor
  // directly; skip the store so the modal cursor isn't coupled to dashboard
  // siblings.
  const isModalMode = cursorXOverride !== undefined;

  // True while the local mouse is hovering this chart's plot area. Used to
  // suppress applying the store's cursor back to the chart that is driving it
  // (self-echo guard). A ref (not state) because toggling it must not cause
  // a re-render — only the Zustand store update triggers re-renders here.
  const isLocallyHoveredRef = useRef(false);

  const storeCursorX = useSeasonalityCursorStore((s) =>
    groupId ? s.byGroup[groupId] ?? null : null,
  );
  const setStoreCursor = useSeasonalityCursorStore((s) => s.setCursor);

  // Unified cursor-change handler — works in both modal and dashboard modes.
  const handleCursorChange = useCallback(
    (x: number | null) => {
      if (isModalMode) {
        onCursorChange?.(x);
        return;
      }
      if (groupId) {
        isLocallyHoveredRef.current = x !== null;
        setStoreCursor(groupId, x);
      }
    },
    [isModalMode, groupId, onCursorChange, setStoreCursor],
  );

  // Apply the store's cursor date to this chart only when another chart is
  // driving it (isLocallyHovered = false). When this chart's own mouse is
  // active, the local cursor already shows at the right position.
  const effectiveCursorX = isModalMode
    ? (cursorXOverride ?? null)
    : !isLocallyHoveredRef.current
    ? (storeCursorX ?? null)
    : null;

  // onCursorReady is no longer needed for dashboard sync (syncWith removed).
  const handleCursorReady = useCallback(
    (_cursor: am5xy.XYCursor) => {
      if (!isModalMode) return; // value-based sync needs no cursor registration
    },
    [isModalMode],
  );

  // ── X-axis range sync (store-backed; siblings on the same group mirror the
  //    visible window when one chart zooms/pans). Skipped when the chart is
  //    being driven by a `cursorXOverride` parent (modal mode) — that parent
  //    controls its own state and we don't want to spam the global store.
  const storeRange = useSeasonalityCursorStore((s) =>
    groupId ? s.rangeByGroup[groupId] ?? null : null,
  );
  const setStoreRange = useSeasonalityCursorStore((s) => s.setRange);
  const handleRangeChange = (range: { start: number; end: number } | null) => {
    if (groupId && cursorXOverride === undefined) setStoreRange(groupId, range);
  };

  // ── Adapt fetched data once per response/type ─────────────────────────────
  const heatmapAdapted = useMemo(() => {
    if (type !== "heatmap" || !raw) return null;
    return heatmapToCartesian(raw as HeatmapResponse);
  }, [raw, type]);

  // `checkboxYears` is the authoritative list of historical year expressions for
  // the chip/checkbox UI. Set by the getCheckBoxList response before average data arrives.
  // Use it directly as `availableYears` so the UI name is consistent with the prop interface.
  const availableYears = checkboxYears;

  useEffect(() => {
    if (availableYears !== null && onAvailableYears) onAvailableYears(availableYears);
  }, [availableYears, onAvailableYears]);

  // When we manage the filter ourselves, seed selection to empty (current year only by
  // default — matches Falcon). On subsequent expression changes, drop any selected year
  // no longer in the set.
  useEffect(() => {
    if (!managesYearFilterInternally || availableYears === null) return;
    setInternalSelectedYears((prev) => {
      if (prev === null) return [];
      const cleaned = prev.filter((y) => availableYears.includes(y));
      return cleaned.length === prev.length ? prev : cleaned;
    });
  }, [availableYears, managesYearFilterInternally]);

  const toggleInternalYear = (y: string) => {
    setInternalSelectedYears((prev) => {
      const base = prev ?? availableYears ?? [];
      return base.includes(y) ? base.filter((v) => v !== y) : [...base, y];
    });
  };

  const lineAdapted = useMemo(() => {
    if (type === "heatmap" || !raw) return null;

    if (type === "monthly") {
      const seriesList = (raw as MonthlyResponse).monthly ?? [];
      // Falcon's monthly chart is a stepped *range/band* — each series fills
      // between its y value and a constant midline (50). Set `openValueField`
      // on each series and inject the constant `__open__: 50` on every joined
      // row. Names stay as-is ("5Y", "Max", "Min" etc. — not year codes).
      // Custom pink / blue / green palette matches Falcon.
      const MONTHLY_PALETTE = ["#ec4899", "#3b82f6", "#22c55e"];
      const joined = joinSeriesByX(seriesList, (cfg, _s, i) => ({
        ...cfg,
        stepped: true,
        fill: true,
        fillOpacity: 0.2,
        openValueField: "__open__",
        color: MONTHLY_PALETTE[i % MONTHLY_PALETTE.length],
      }));
      joined.rows.forEach((row) => {
        row.__open__ = 50;
      });
      return joined;
    }

    if (type === "average") {
      const all = raw as AverageResponse;
      // Response shape: { [expression]: FalconLinePoint[], avg?: FalconLinePoint[] }
      // The API computes the average server-side when selected_years are passed.
      const avgPoints = all["avg"];
      const seriesForRows: FalconLineSeries[] = [
        { name: expression, lineData: all[expression] ?? [] },
        ...(avgPoints?.length ? [{ name: "__avg__", lineData: avgPoints }] : []),
      ];
      return joinSeriesByX(seriesForRows, (cfg) => {
        if (cfg.valueField === "__avg__") {
          return { ...cfg, name: "Average", color: "#0ea5e9", strokeWidth: 3 };
        }
        return { ...cfg, name: extractYearLabel(expression) };
      });
    }

    // 'stacked' — Falcon returns the bare array directly.
    const seriesList: FalconLineSeries[] = Array.isArray(raw)
      ? (raw as FalconLineSeries[])
      : (raw as StackedResponse).series ?? [];
    // T3.5.1 (year label): map display name to trailing 2-digit year.
    // The stacked endpoint ignores time_period; we filter the time-series data range client-side.
    const joined = joinSeriesByX(seriesList, (cfg) => ({
      ...cfg,
      name: extractYearLabel(cfg.name),
    }));

    if (yearsBack && yearsBack !== "All") {
      const n = parseInt(yearsBack, 10);
      if (!isNaN(n) && n > 0 && joined.rows.length > 0) {
        const maxDate = joined.rows[joined.rows.length - 1].date;
        const minDate = new Date(maxDate);
        minDate.setFullYear(minDate.getFullYear() - n);
        const cutoff = minDate.getTime();
        joined.rows = joined.rows.filter(r => r.date >= cutoff);
      }
    }

    return joined;
  }, [raw, type, expression, yearsBack]);

  // ── Stacked-only: latest-year emphasis (T3.5.1) ───────────────────────────
  // Falcon highlights the last (newest) series with a thicker stroke + dark
  // color and dims the historical years.
  const stackedSeriesStyling = useMemo<SeriesStylingFn | undefined>(() => {
    if (type !== "stacked" || !lineAdapted) return undefined;
    const lastIndex = lineAdapted.seriesConfig.length - 1;
    const accent = darkMode ? "#e2e8f0" : "#343C44";
    return (index) => {
      if (index === lastIndex) {
        return {
          color: accent,
          strokeWidth: 3,
          opacity: 1,
          // Drop-shadow on the latest year in dark mode (Falcon parity:
          // series.strokes.template.setAll({ filter: "drop-shadow(0 0 2px #FFFFFF)" }))
          ...(darkMode ? { filter: "drop-shadow(0 0 2px #FFFFFF)" } : {}),
        };
      }
      return { strokeWidth: 1.5, opacity: 0.65 };
    };
  }, [type, lineAdapted, darkMode]);

  if (fetchError) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-red-500 dark:text-red-400 px-4 text-center">
        {fetchError}
      </div>
    );
  }

  if (type === "heatmap") {
    if (!heatmapAdapted) {
      return <div className="flex items-center justify-center h-full text-gray-500">Loading…</div>;
    }
    // No cursor sync on heatmap — it's a grouped matrix view, not a
    // time-series, so a shared X cursor has no geometric meaning here.
    const heatmapVisualMap = buildSeasonalityVisualMap(heatmapAdapted.data);
    return (
      <CartesianHeatmapWidget
        id={`seasonality-heatmap-${groupId ?? "solo"}`}
        title={title}
        darkMode={darkMode}
        xLabels={heatmapAdapted.xLabels}
        yLabels={heatmapAdapted.yLabels}
        staticData={heatmapAdapted.data}
        visualMapOverride={heatmapVisualMap}
        valueFormatter={HEATMAP_VALUE_FORMATTER}
        xAxisLabelRotate={45}
      />
    );
  }

  if (!lineAdapted) {
    return <div className="flex items-center justify-center h-full text-gray-500">Loading…</div>;
  }

  // Stacked + monthly both use Falcon's right-side fixed-width 150 legend.
  // Average uses the default bottom legend since the year-chip strip above
  // the chart already does the heavy lifting on series identification.
  const usesRightLegend = type === "stacked" || type === "monthly";

  // Monthly is rendered as a stepped band with `openValueYField`, % axis on
  // the right, and a dashed 50% midline reference — matches Falcon
  // `MonthlyStepLineChart`.
  const monthlyReferenceLines: ReferenceLine[] | undefined =
    type === "monthly" ? [{ value: 50, dashed: true, strokeWidth: 1.5 }] : undefined;

  // Y-axis abbreviation format for stacked/average when DE is active
  // (Falcon parity: numberFormat: DE && "#,###a" on the ValueAxis).
  const deYAxisFormat = de && (type === "stacked" || type === "average") ? "#,###a" : undefined;

  // Include the series key in the chart DOM id so each remount gets a truly
  // fresh amCharts root element. Without this, a key-driven remount disposes
  // the old root and immediately creates a new one on the same DOM id — amCharts
  // 5 throws "ghostLabel" internally because the element is still in teardown.
  // yearsBack is included so a years change forces a full amCharts remount even
  // when series field names are unchanged (e.g. monthly "5Y/Max/Min", average).
  const chartKey = `${lineAdapted.seriesConfig.map(c => c.valueField).join("|")}|y=${yearsBack ?? "10"}`;
  const chartDomId = `seasonality-line-${groupId ?? "solo"}-${chartKey.replace(/[^a-zA-Z0-9_-]/g, "_")}`;

  const chart = (
    <LineChartWidget
      key={chartKey}
      id={chartDomId}
      title={title}
      darkMode={darkMode}
      dateField="date"
      xAxisType="date"
      seriesConfig={lineAdapted.seriesConfig}
      staticData={lineAdapted.rows}
      overlayMarkers={overlayMarkers}
      onOverlayMarkerDragEnd={onOverlayMarkerDragEnd}
      referenceLines={monthlyReferenceLines}
      onCursorAxisXChange={handleCursorChange}
      externalCursorAxisX={effectiveCursorX}
      onCursorReady={handleCursorReady}
      onAxisRangeChange={handleRangeChange}
      externalAxisRange={storeRange}
      smoothed
      legendHoverDim
      singleTooltip
      showScrollbar
      cursorBehavior="zoomXY"
      seriesStyling={stackedSeriesStyling}
      darkColorPalette={darkMode ? DARK_LINE_PALETTE : undefined}
      {...(usesRightLegend ? { legendPosition: "right" as const, legendWidth: 150 } : {})}
      {...(type === "monthly"
        ? { yAxisOpposite: true, yAxisNumberFormat: "#'%'", baseTimeUnit: "month" as const }
        : type === "stacked"
        ? { yAxisOpposite: true }
        : {})}
      {...(deYAxisFormat ? { yAxisNumberFormat: deYAxisFormat } : {})}
    />
  );

  if (managesYearFilterInternally && availableYears && availableYears.length > 0) {
    // availableYears already excludes the current-year key (expression), so
    // every entry here is a selectable historical year variant.
    const currentSelection = internalSelectedYears ?? [];

    return (
      <div className="flex flex-col h-full w-full">
        <div className="flex-1 min-h-0">{chart}</div>
        <div
          className={`px-3 py-2 flex flex-wrap gap-x-3 gap-y-1 items-center justify-center border-t ${
            darkMode ? "border-zinc-800" : "border-slate-200"
          }`}
        >
          {availableYears.map((y) => {
            const active = currentSelection.includes(y);
            const label = extractYearLabel(y);
            return (
              <label
                key={y}
                className={`flex items-center gap-1 text-[11px] font-mono cursor-pointer select-none ${
                  active
                    ? darkMode ? "text-zinc-200" : "text-slate-700"
                    : darkMode ? "text-zinc-600" : "text-slate-400"
                }`}
              >
                <input
                  type="checkbox"
                  checked={active}
                  onChange={() => toggleInternalYear(y)}
                  className="w-3 h-3 cursor-pointer"
                />
                {label}
              </label>
            );
          })}
        </div>
      </div>
    );
  }

  return chart;
}
