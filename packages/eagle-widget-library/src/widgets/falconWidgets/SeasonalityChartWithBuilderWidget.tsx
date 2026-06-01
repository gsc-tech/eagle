/**
 * Internal — backs the four chart-with-builder widgets (T4.1). Vertically
 * composes `<SeasonalityExpressionBuilder marketScope='all'>` on top of
 * `<SeasonalityChart type=…>`, sharing a `groupId` so the chart below this
 * builder *and* any sibling bound widgets on the dashboard all react to the
 * Chart button.
 *
 * The composition is intentionally one widget rather than two side-by-side:
 * users on Falcon's SeasonalityUI page expect builder-above-chart as a single
 * unit; splitting them into two widgets here would force re-aligning every
 * time the dashboard is resized.
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import { WidgetContainer } from "../../components/WidgetContainer";
import {
  SeasonalityExpressionBuilder,
  type MarketScope,
} from "../../components/seasonality/SeasonalityExpressionBuilder";
import { AddToWatchlistModal } from "../../components/seasonality/AddToWatchlistModal";
import { SetAlertModal } from "../../components/seasonality/SetAlertModal";
import { SeasonalityChart, extractYearLabel, type SeasonalityChartType } from "../../components/seasonality/SeasonalityChart";
import { widgetEventBus, WIDGET_EVENTS } from "../../store/widgetEventBus";
import { usePendingBuilderNavStore } from "../../store/pendingBuilderNavStore";
import { falconApiClient } from "../../utils/falconApiClient";
import { useSeasonalityAlertsStore } from "../../store/seasonalityAlertsStore";
import { alertConditionToOverlayMarkers } from "../../utils/seasonality";
import type { BaseWidgetProps } from "../../types";
import type { ProductContract, SymbolMatrix } from "../../utils/seasonality";
import type { SeasonalityMarket } from "../../store/seasonalityWatchlistStore";
import type { OverlayMarker } from "../LineChartWidget";

export interface SeasonalityChartWithBuilderWidgetProps extends BaseWidgetProps {
  /** Chart variant — fixed per public widget. */
  chartType: SeasonalityChartType;
  /** Market tab strip scope. Defaults to 'all' (full Single/IM1/IM2/IM3/Custom strip). */
  marketScope?: MarketScope;
  /** Group key for cursor + expression sync. Sibling charts using this id auto-bind. */
  groupId?: string;
  /** Symbol metadata fed to the builder. */
  symbols?: ProductContract[];
  symbolsByMarket?: Partial<Record<Exclude<MarketScope, "all">, ProductContract[]>>;
  symbolUniverse?: ProductContract[];
  /** Years-back window for the chart fetch. */
  yearsBack?: string;
}

const YEARS_OPTIONS = [
  { label: "1Y", value: "1" },
  { label: "2Y", value: "2" },
  { label: "5Y", value: "5" },
  { label: "10Y", value: "10" },
  { label: "All", value: "All" },
];

export function SeasonalityChartWithBuilderWidget(
  props: SeasonalityChartWithBuilderWidgetProps,
) {
  const {
    id,
    title,
    darkMode,
    chartType,
    marketScope = "all",
    groupId = "seasonality-expr",
    symbols,
    symbolsByMarket,
    symbolUniverse,
    yearsBack,
    addWidgetToDashboard,
    widgetTarget,
    onGroupedParametersChange,
    groupedParametersValues,
    initialWidgetState,
    onWidgetStateChange,
  } = props;

  // ── Live group ID (editable in-widget) ───────────────────────────────────────
  // Widget state wins over the prop so a user-edited groupId survives re-renders.
  const [liveGroupId, setLiveGroupId] = useState<string>(
    initialWidgetState?.groupId ?? groupId,
  );
  const [editingGroupId, setEditingGroupId] = useState(false);
  const [groupIdDraft, setGroupIdDraft] = useState(liveGroupId);

  const commitGroupId = () => {
    const next = groupIdDraft.trim();
    if (next && next !== liveGroupId) {
      setLiveGroupId(next);
      onWidgetStateChange?.({ ...(initialWidgetState ?? {}), groupId: next });
    }
    setEditingGroupId(false);
  };

  // Self-fetch symbols when none are injected by the host (e.g. user-added widget).
  const [fetchedSymbols, setFetchedSymbols] = useState<ProductContract[] | undefined>(undefined);
  useEffect(() => {
    if (symbols !== undefined) return;
    const ctrl = new AbortController();
    falconApiClient
      .get<{ productContract: ProductContract[] }>("/api/product", { signal: ctrl.signal })
      .then((res) => setFetchedSymbols(res?.productContract ?? []))
      .catch((e) => {
        if ((e as Error).name !== "AbortError")
          console.error("[SeasonalityChartWithBuilderWidget] /api/product failed", e);
      });
    return () => ctrl.abort();
  }, [symbols]);

  const [expression, setExpression] = useState<string>("");
  const [pendingFromBus, setPendingFromBus] = useState<string | null>(null);
  const [pendingMatrix, setPendingMatrix] = useState<SymbolMatrix[] | undefined>(undefined);
  const [pendingMarket, setPendingMarket] = useState<SeasonalityMarket | undefined>(undefined);

  // Alert IDs referenced by the last alert navigation — used to derive live markers.
  const [payloadAlertIds, setPayloadAlertIds] = useState<Set<string>>(new Set());

  // On mount: claim a pending navigation payload written by the nav hook before
  // the tab switch. This handles the race where the 80ms re-emit fires before
  // the widget mounts (canvas is gated by isLoadingSnapshots).
  useEffect(() => {
    const p = usePendingBuilderNavStore.getState().pending;
    if (!p) return;
    usePendingBuilderNavStore.getState().clear();
    setPendingFromBus(p.expression);
    setPendingMatrix(p.symbolMatrix);
    setPendingMarket(p.market);
    setExpression(p.expression);
    const ids = p.overlayMarkers
      ? new Set(p.overlayMarkers.map((m) => m.id).filter(Boolean) as string[])
      : new Set<string>();
    setPayloadAlertIds(ids);
    console.log("[SeasonalityChartWithBuilder] claimed pending nav on mount →", {
      expr: p.expression, markerCount: p.overlayMarkers?.length ?? 0,
      markerIds: p.overlayMarkers?.map((m) => m.id),
    });
    onGroupedParametersChange?.({ [liveGroupId]: p.expression });
    widgetEventBus.emit(WIDGET_EVENTS.SEASONALITY_EXPRESSION_LOADED, {
      expression: p.expression,
      sourceWidgetId: id ?? "",
      groupId: liveGroupId,
      overlayMarkers: p.overlayMarkers,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // mount only

  // Live alerts store — same pattern as QuickViewChartModal so drag/delete
  // reflect immediately without reopening the widget.
  const alerts = useSeasonalityAlertsStore((s) => s.alerts);
  const deleteAlert = useSeasonalityAlertsStore((s) => s.deleteAlert);
  const updateAlertCondition = useSeasonalityAlertsStore((s) => s.updateAlertCondition);

  const overlayMarkers = useMemo<OverlayMarker[] | undefined>(() => {
    console.log("[SeasonalityChartWithBuilder] useMemo overlayMarkers →", {
      payloadAlertIds: [...payloadAlertIds],
      storeAlertCount: alerts.length,
      storeAlertIds: alerts.map((a) => a.id),
    });
    if (!payloadAlertIds.size) return undefined;
    const markers: OverlayMarker[] = [];
    for (const alert of alerts) {
      if (!payloadAlertIds.has(alert.id)) continue;
      const derived = alertConditionToOverlayMarkers(alert.condition, alert.id);
      console.log("[SeasonalityChartWithBuilder] derived markers for alert", alert.id, "→", derived);
      if (!derived) continue;
      for (const m of derived) {
        markers.push({
          ...m,
          onDelete: () =>
            deleteAlert(alert.id).catch((e) =>
              console.error("[SeasonalityChartWithBuilderWidget] deleteAlert failed", e),
            ),
        });
      }
    }
    console.log("[SeasonalityChartWithBuilder] final overlayMarkers →", markers);
    return markers.length ? markers : undefined;
  }, [alerts, payloadAlertIds, deleteAlert]);

  const handleDragEnd = (marker: OverlayMarker, newValue: number) => {
    if (!marker.id) return;
    const alert = useSeasonalityAlertsStore.getState().alerts.find((a) => a.id === marker.id);
    if (!alert) return;
    const condition = { ...alert.condition, value: { ...alert.condition.value } };
    if (condition.type === "inRange") {
      const distLow = Math.abs((condition.value.low ?? 0) - marker.value);
      const distHigh = Math.abs((condition.value.high ?? 0) - marker.value);
      if (distLow < distHigh) condition.value = { ...condition.value, low: newValue };
      else condition.value = { ...condition.value, high: newValue };
    } else {
      condition.value = { ...condition.value, rhs: newValue };
    }
    updateAlertCondition(marker.id, condition).catch((e) =>
      console.error("[SeasonalityChartWithBuilderWidget] updateAlertCondition failed", e),
    );
  };

  const [watchlistOpen, setWatchlistOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [modalExpression, setModalExpression] = useState("");
  const [de, setDe] = useState(false);

  // ── Years-back (shared via groupedParametersValues) ───────────────────────────
  const yearsGroupKey = `${liveGroupId}__years`;
  const sharedYears = groupedParametersValues?.[yearsGroupKey];
  const effectiveYearsBack = sharedYears ?? yearsBack ?? "10";

  const handleYearsChange = (value: string) => {
    onGroupedParametersChange?.({ [yearsGroupKey]: value });
  };

  // ── Average year-filter (visible only for average chartType) ─────────────────
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [selectedYears, setSelectedYears] = useState<string[]>([]);

  useEffect(() => {
    if (chartType !== "average") return;
    setSelectedYears((prev) => {
      const cleaned = prev.filter((y) => availableYears.includes(y));
      return cleaned.length === prev.length ? prev : cleaned;
    });
  }, [availableYears, chartType]);

  const toggleYear = (year: string) => {
    setSelectedYears((prev) =>
      prev.includes(year) ? prev.filter((y) => y !== year) : [...prev, year],
    );
  };

  // ── Event bus: inbound open-in-builder ────────────────────────────────────────
  // Always pull the expression onto the embedded chart (so right-click from a
  // watchlist re-renders this chart). Matrix payloads also hydrate the builder
  // above. Overlay markers travel with alert right-clicks only.
  useEffect(() => {
    const unsub = widgetEventBus.subscribe("seasonality:open-in-builder", (p) => {
      const ids = p.overlayMarkers
        ? new Set(
            (p.overlayMarkers as OverlayMarker[])
              .map((m) => m.id)
              .filter(Boolean) as string[],
          )
        : new Set<string>();
      console.log("[SeasonalityChartWithBuilder] open-in-builder received →", {
        expr: p.expression,
        rawMarkers: p.overlayMarkers,
        extractedIds: [...ids],
      });
      setPendingFromBus(p.expression);
      setPendingMatrix(p.symbolMatrix);
      setPendingMarket(p.market);
      setExpression(p.expression);
      setPayloadAlertIds(ids);
      onGroupedParametersChange?.({ [liveGroupId]: p.expression });
      widgetEventBus.emit(WIDGET_EVENTS.SEASONALITY_EXPRESSION_LOADED, {
        expression: p.expression,
        sourceWidgetId: id ?? "",
        groupId: liveGroupId,
      });
    });
    return unsub;
  }, [liveGroupId, id, onGroupedParametersChange]);

  // ── Event bus: sibling builder drives this chart ──────────────────────────────
  useEffect(() => {
    const unsub = widgetEventBus.subscribe("seasonality:expression-loaded", (p) => {
      if (p.groupId === liveGroupId && p.sourceWidgetId !== id) {
        setExpression(p.expression);
      }
    });
    return unsub;
  }, [liveGroupId, id]);

  // ── Chart button handler ──────────────────────────────────────────────────────
  const handleChart = (expr: string) => {
    if (!expr) return;
    setExpression(expr);
    setPayloadAlertIds(new Set());
    onGroupedParametersChange?.({ [liveGroupId]: expr });
    widgetEventBus.emit(WIDGET_EVENTS.SEASONALITY_EXPRESSION_LOADED, {
      expression: expr,
      sourceWidgetId: id ?? "",
      groupId: liveGroupId,
    });
  };

  const border = darkMode ? "border-zinc-800" : "border-slate-200";

  return (
    <WidgetContainer title={title} darkMode={darkMode}>
      <div className="flex flex-col h-full">
        {/* Expression builder */}
        <div className={`shrink-0 border-b ${border}`}>
          <SeasonalityExpressionBuilder
            marketScope={marketScope}
            symbols={symbols ?? fetchedSymbols}
            symbolsByMarket={symbolsByMarket}
            symbolUniverse={symbolUniverse}
            defaultExpression={pendingFromBus ?? undefined}
            pendingMatrix={pendingMatrix}
            pendingMarket={pendingMarket}
            darkMode={darkMode}
            onChart={handleChart}
            onAddToWatchlist={(expr) => { setModalExpression(expr); setWatchlistOpen(true); }}
            onSetAlert={(expr) => { setModalExpression(expr); setAlertOpen(true); }}
            onDeChange={(nextDe) => setDe(nextDe)}
          />
        </div>

        {/* Years selector + Group ID row */}
        <div className={`shrink-0 px-3 py-1 flex items-center justify-between border-b ${border}`}>
          <div className="flex items-center gap-1">
            {YEARS_OPTIONS.map(({ label, value }) => {
              const active = effectiveYearsBack === value;
              return (
                <button
                  key={value}
                  onClick={() => handleYearsChange(value)}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono border transition-colors ${
                    active
                      ? darkMode
                        ? "bg-blue-500/20 border-blue-500/50 text-blue-300"
                        : "bg-blue-500/10 border-blue-500/40 text-blue-700"
                      : darkMode
                      ? "bg-transparent border-zinc-700 text-zinc-500 hover:text-zinc-300"
                      : "bg-transparent border-slate-200 text-slate-400 hover:text-slate-600"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Inline Group ID editor */}
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className={darkMode ? "text-zinc-600" : "text-slate-400"}>Group:</span>
            {editingGroupId ? (
              <input
                autoFocus
                value={groupIdDraft}
                onChange={(e) => setGroupIdDraft(e.target.value)}
                onBlur={commitGroupId}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitGroupId();
                  if (e.key === "Escape") setEditingGroupId(false);
                }}
                className="w-20 px-1.5 py-0.5 rounded border border-blue-500 bg-transparent text-[11px] font-mono focus:outline-none text-white"
              />
            ) : (
              <button
                title="Click to change group ID"
                onClick={() => { setGroupIdDraft(liveGroupId); setEditingGroupId(true); }}
                className={`px-1.5 py-0.5 rounded border font-mono transition-colors ${
                  darkMode
                    ? "border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
                    : "border-slate-300 text-slate-500 hover:border-slate-400 hover:text-slate-700"
                }`}
              >
                {liveGroupId || "—"}
              </button>
            )}
          </div>
        </div>

        {/* Average historical year filter */}
        {chartType === "average" && availableYears.length > 0 && (
          <div className={`shrink-0 px-3 py-1.5 border-b ${border} flex flex-wrap gap-1.5 items-center`}>
            <span className={`text-[11px] uppercase tracking-wide mr-1 ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>
              Avg
            </span>
            {availableYears.map((y) => {
              const active = selectedYears.includes(y);
              return (
                <button
                  key={y}
                  onClick={() => toggleYear(y)}
                  className={`px-1.5 py-0.5 rounded text-[11px] font-mono border transition-colors ${
                    active
                      ? "bg-blue-500/10 border-blue-500/40 text-blue-700 dark:text-blue-300"
                      : "bg-transparent border-slate-200 dark:border-zinc-700 text-slate-400 dark:text-zinc-500"
                  }`}
                >
                  {extractYearLabel(y)}
                </button>
              );
            })}
          </div>
        )}

        {/* Chart */}
        <div className="flex-1 min-h-0">
          {expression ? (
            <SeasonalityChart
              type={chartType}
              expression={expression}
              groupId={liveGroupId}
              yearsBack={effectiveYearsBack}
              overlayMarkers={overlayMarkers}
              onOverlayMarkerDragEnd={handleDragEnd}
              darkMode={darkMode}
              de={de}
              selectedYears={chartType === "average" ? selectedYears : undefined}
              onAvailableYears={chartType === "average" ? setAvailableYears : undefined}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-sm text-slate-400 dark:text-zinc-500">
              Build an expression above and click Chart.
            </div>
          )}
        </div>
      </div>

      <AddToWatchlistModal
        open={watchlistOpen}
        onClose={() => setWatchlistOpen(false)}
        expression={modalExpression}
        marketConfig={{ market: "Custom" }}
        widgetTarget={widgetTarget}
        addWidgetToDashboard={addWidgetToDashboard}
        darkMode={darkMode}
      />

      <SetAlertModal
        open={alertOpen}
        onClose={() => setAlertOpen(false)}
        expression={modalExpression}
        market="Custom"
        darkMode={darkMode}
      />
    </WidgetContainer>
  );
}
