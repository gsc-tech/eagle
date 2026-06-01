/**
 * Internal — backs the four chart-only seasonality widgets (T3.2).
 * Wraps `<SeasonalityChart>` with the mode (bound / standalone) logic and
 * event-bus subscriptions that all four variants share.
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import { WidgetContainer } from "../../components/WidgetContainer";
import { SeasonalityChart, extractYearLabel, type SeasonalityChartType } from "../../components/seasonality/SeasonalityChart";
import type { BaseWidgetProps } from "../../types";
import { widgetEventBus } from "../../store/widgetEventBus";
import { useSeasonalityAlertsStore } from "../../store/seasonalityAlertsStore";
import { alertConditionToOverlayMarkers } from "../../utils/seasonality";
import type { OverlayMarker } from "../LineChartWidget";

export type SeasonalityChartWidgetMode = "bound" | "standalone";

export interface SeasonalityChartWidgetProps extends BaseWidgetProps {
  type: SeasonalityChartType;
  mode?: SeasonalityChartWidgetMode;
  groupId?: string;
  defaultExpression?: string;
  lockExpression?: boolean;
  yearsBack?: string;
}

const YEARS_OPTIONS = [
  { label: "1Y", value: "1" },
  { label: "2Y", value: "2" },
  { label: "5Y", value: "5" },
  { label: "10Y", value: "10" },
  { label: "All", value: "All" },
];

export function SeasonalityChartWidget(props: SeasonalityChartWidgetProps) {
  const {
    type,
    mode = "bound",
    groupId = "seasonality-expr",
    defaultExpression = "",
    lockExpression = false,
    yearsBack,
    title,
    darkMode,
    groupedParametersValues,
    onGroupedParametersChange,
    initialWidgetState,
    onWidgetStateChange,
  } = props;

  // ── Live group ID (editable in-widget) ───────────────────────────────────────
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

  // ── Years-back (shared via groupedParametersValues) ───────────────────────────
  const yearsGroupKey = `${liveGroupId}__years`;
  const sharedYears = groupedParametersValues?.[yearsGroupKey];
  const effectiveYearsBack = sharedYears ?? yearsBack ?? "10";

  const handleYearsChange = (value: string) => {
    onGroupedParametersChange?.({ [yearsGroupKey]: value });
  };

  // ── Expression resolution ─────────────────────────────────────────────────────
  const groupValue = groupedParametersValues?.[liveGroupId];
  const [boundExpression, setBoundExpression] = useState<string>(groupValue ?? "");
  const [standaloneExpression, setStandaloneExpression] = useState<string>(defaultExpression);

  useEffect(() => {
    if (mode === "bound" && groupValue !== undefined && groupValue !== boundExpression) {
      setBoundExpression(groupValue);
    }
  }, [mode, groupValue, boundExpression]);

  // ── Alert overlay markers (live from store, same pattern as QuickViewChartModal) ─
  const [payloadAlertIds, setPayloadAlertIds] = useState<Set<string>>(new Set());
  const alerts = useSeasonalityAlertsStore((s) => s.alerts);
  const deleteAlert = useSeasonalityAlertsStore((s) => s.deleteAlert);
  const updateAlertCondition = useSeasonalityAlertsStore((s) => s.updateAlertCondition);

  const overlayMarkers = useMemo<OverlayMarker[] | undefined>(() => {
    if (!payloadAlertIds.size) return undefined;
    const markers: OverlayMarker[] = [];
    for (const alert of alerts) {
      if (!payloadAlertIds.has(alert.id)) continue;
      const derived = alertConditionToOverlayMarkers(alert.condition, alert.id);
      if (!derived) continue;
      for (const m of derived) {
        markers.push({
          ...m,
          onDelete: () =>
            deleteAlert(alert.id).catch((e) =>
              console.error("[SeasonalityChartWidget] deleteAlert failed", e),
            ),
        });
      }
    }
    console.log("[SeasonalityChartWidget] overlayMarkers recomputed →", {
      payloadAlertIds: [...payloadAlertIds], markerCount: markers.length,
    });
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
      console.error("[SeasonalityChartWidget] updateAlertCondition failed", e),
    );
  };

  useEffect(() => {
    if (mode !== "bound") return;
    const unsub = widgetEventBus.subscribe("seasonality:expression-loaded", (p) => {
      if (p.groupId !== liveGroupId) return;
      setBoundExpression(p.expression);
      const ids = p.overlayMarkers
        ? new Set(p.overlayMarkers.map((m) => m.id).filter(Boolean) as string[])
        : new Set<string>();
      console.log("[SeasonalityChartWidget] expression-loaded →", {
        expr: p.expression, extractedIds: [...ids],
      });
      setPayloadAlertIds(ids);
    });
    return unsub;
  }, [mode, liveGroupId]);

  const expression = mode === "bound" ? boundExpression : standaloneExpression;

  // ── Average year-filter ───────────────────────────────────────────────────────
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [selectedYears, setSelectedYears] = useState<string[]>([]);

  useEffect(() => {
    if (type !== "average") return;
    setSelectedYears((prev) => {
      const cleaned = prev.filter((y) => availableYears.includes(y));
      return cleaned.length === prev.length ? prev : cleaned;
    });
  }, [availableYears, type]);

  const toggleYear = (year: string) => {
    setSelectedYears((prev) =>
      prev.includes(year) ? prev.filter((y) => y !== year) : [...prev, year],
    );
  };

  const border = darkMode ? "border-zinc-800" : "border-slate-200";

  return (
    <WidgetContainer title={title} darkMode={darkMode}>
      <div className="flex flex-col h-full">
        {/* Standalone expression input */}
        {mode === "standalone" && !lockExpression && (
          <div className={`px-3 pt-2 pb-1 border-b ${border}`}>
            <input
              type="text"
              value={standaloneExpression}
              onChange={(e) => setStandaloneExpression(e.target.value)}
              onBlur={() => {
                if (liveGroupId) onGroupedParametersChange?.({ [liveGroupId]: standaloneExpression });
              }}
              placeholder="Enter a Falcon expression (e.g. RBH26 - RBJ26)…"
              className="w-full px-2 py-1.5 rounded-md border border-slate-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {/* Years selector + Group ID row */}
        <div className={`px-3 py-1 flex items-center justify-between border-b ${border}`}>
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
        {type === "average" && availableYears.length > 0 && (
          <div className={`px-3 py-1.5 border-b ${border} flex flex-wrap gap-1.5 items-center`}>
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
              type={type}
              expression={expression}
              groupId={liveGroupId}
              yearsBack={effectiveYearsBack}
              overlayMarkers={overlayMarkers}
              onOverlayMarkerDragEnd={handleDragEnd}
              darkMode={darkMode}
              selectedYears={type === "average" ? selectedYears : undefined}
              onAvailableYears={type === "average" ? setAvailableYears : undefined}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-sm text-slate-400 dark:text-zinc-500">
              {mode === "bound"
                ? "No expression — load one from a builder widget."
                : "Enter an expression above to render the chart."}
            </div>
          )}
        </div>
      </div>
    </WidgetContainer>
  );
}
