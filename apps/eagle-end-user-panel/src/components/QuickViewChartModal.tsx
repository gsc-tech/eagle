/**
 * `<QuickViewChartModal>` (T5.3) — global modal mounted at the app root.
 *
 * Listens for `chart:quick-view` and resolves the chart renderer from a
 * registry keyed by the event's `kind`. The registry is extensible — pass
 * `renderers={{...}}` to merge new kinds without touching this file.
 *
 * Adding a new chart kind in future:
 *   1. Emit `chart:quick-view` with your own `kind` string + any payload extras.
 *   2. Mount this modal with `renderers={{ 'my-kind': (p, ctx) => <MyChart .../> }}`.
 *
 * Use case today: rows in `SeasonalityWatchlistWidget` (T5.1) and the alerts
 * table (T6.1) emit `chart:quick-view` so the user gets an instant chart
 * preview without leaving the current dashboard.
 */

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import {
  SeasonalityChart,
  widgetEventBus,
  useSeasonalityAlertsStore,
  alertConditionToOverlayMarkers,
  type OverlayMarker,
} from "@gsc-tech/eagle-widget-library";
import { useThemeStore } from "@/store/themeStore";

// ─── Public types ────────────────────────────────────────────────────────────

export interface QuickViewPayload {
  kind: string;
  title?: string;
  [key: string]: unknown;
}

export interface QuickViewRenderContext {
  darkMode: boolean;
  close: () => void;
}

export type QuickViewRenderer = (
  payload: QuickViewPayload,
  ctx: QuickViewRenderContext,
) => ReactNode;

interface Props {
  /** Extra renderers merged on top of the built-ins. */
  renderers?: Record<string, QuickViewRenderer>;
}

// ─── Built-in renderers (seasonality) ────────────────────────────────────────

/**
 * Inner component so we can use hooks to subscribe to the alerts store.
 * Overlay markers are derived from live store state (keyed by IDs from the
 * original event payload) so they update immediately when an alert is edited
 * or deleted without needing to re-open the modal.
 */
function SeasonalityQuickView({
  payload,
  ctx,
  chartType,
}: {
  payload: QuickViewPayload;
  ctx: QuickViewRenderContext;
  chartType: "stacked" | "monthly" | "average" | "heatmap";
}) {
  const expression = String(payload.expression ?? "");
  const alerts = useSeasonalityAlertsStore((s) => s.alerts);
  const deleteAlert = useSeasonalityAlertsStore((s) => s.deleteAlert);
  const updateAlertCondition = useSeasonalityAlertsStore((s) => s.updateAlertCondition);

  // Alert IDs referenced in the original payload
  const payloadAlertIds = useMemo(() => {
    const raw = payload.overlayMarkers as OverlayMarker[] | undefined;
    return new Set((raw ?? []).map((m) => m.id).filter(Boolean) as string[]);
  }, [payload.overlayMarkers]);

  // Recompute markers from live store so edits/deletes reflect instantly
  const overlayMarkers = useMemo(() => {
    if (!payloadAlertIds.size) return undefined;
    const markers: OverlayMarker[] = [];
    for (const alert of alerts) {
      if (!payloadAlertIds.has(alert.id)) continue;
      const derived = alertConditionToOverlayMarkers(alert.condition, alert.id);
      if (!derived) continue;
      for (const m of derived) {
        markers.push({
          ...m,
          onDelete: () => deleteAlert(alert.id).catch((e) =>
            console.error("[QuickViewChartModal] deleteAlert failed", e)
          ),
        });
      }
    }
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
      console.error("[QuickViewChartModal] updateAlertCondition failed", e)
    );
  };

  return (
    <SeasonalityChart
      type={chartType}
      expression={expression}
      overlayMarkers={overlayMarkers}
      onOverlayMarkerDragEnd={handleDragEnd}
      darkMode={ctx.darkMode}
    />
  );
}

const seasonalityRenderer =
  (chartType: "stacked" | "monthly" | "average" | "heatmap"): QuickViewRenderer =>
  (payload, ctx) => (
    <SeasonalityQuickView payload={payload} ctx={ctx} chartType={chartType} />
  );

const BUILTIN_RENDERERS: Record<string, QuickViewRenderer> = {
  "seasonality-stacked": seasonalityRenderer("stacked"),
  "seasonality-monthly": seasonalityRenderer("monthly"),
  "seasonality-average": seasonalityRenderer("average"),
  "seasonality-heatmap": seasonalityRenderer("heatmap"),
};

// ─── Component ───────────────────────────────────────────────────────────────

export function QuickViewChartModal({ renderers }: Props = {}) {
  const [payload, setPayload] = useState<QuickViewPayload | null>(null);
  const isDark = useThemeStore((s) => s.isDark);

  const registry = useMemo(
    () => ({ ...BUILTIN_RENDERERS, ...(renderers ?? {}) }),
    [renderers],
  );

  useEffect(() => {
    return widgetEventBus.subscribe("chart:quick-view", (p) => {
      setPayload(p as QuickViewPayload);
    });
  }, []);

  // Close on Escape.
  useEffect(() => {
    if (!payload) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPayload(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [payload]);

  if (!payload) return null;

  const renderer = registry[payload.kind];
  const close = () => setPayload(null);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={close}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-[min(90vw,900px)] h-[min(80vh,600px)] rounded-lg shadow-xl flex flex-col ${
          isDark ? "bg-zinc-900 text-zinc-100" : "bg-white text-slate-800"
        }`}
      >
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 dark:border-zinc-700">
          <div className="flex flex-col min-w-0">
            <h2 className="text-sm font-semibold truncate">
              {payload.title || "Quick view"}
            </h2>
            {typeof payload.expression === "string" && (
              <span className="text-xs font-mono text-slate-500 dark:text-zinc-400 truncate">
                {payload.expression}
              </span>
            )}
          </div>
          <button
            onClick={close}
            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-zinc-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 min-h-0">
          {renderer ? (
            renderer(payload, { darkMode: isDark, close })
          ) : (
            <div className="flex items-center justify-center h-full text-sm text-slate-400 dark:text-zinc-500">
              No renderer registered for chart kind "{payload.kind}".
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

