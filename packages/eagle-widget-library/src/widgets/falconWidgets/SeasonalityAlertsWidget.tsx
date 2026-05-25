/**
 * `SeasonalityAlertsWidget` (T6.1) — tabular view of the user's seasonality
 * alerts. Falcon reference: `falcon-ui/src/components/alert/AllAlertPage.tsx`.
 *
 *   Columns: Alert Name | Condition | Expiry | Status
 *   Row left-click  → highlight + emit `chart:quick-view` (opens QuickView
 *                       modal with the threshold overlay from `overlayMarkers`).
 *   Row right-click → emit `seasonality:open-in-builder` (Custom tab seed).
 *   Row `...` menu  → Delete.
 *   Header refresh  → re-runs `fetchAlerts`.
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import { MoreVertical, RefreshCcw, Trash2 } from "lucide-react";
import {
  useSeasonalityAlertsStore,
  type SeasonalityAlert,
} from "../../store/seasonalityAlertsStore";
import { widgetEventBus, WIDGET_EVENTS } from "../../store/widgetEventBus";
import { alertConditionToOverlayMarkers } from "../../utils/seasonality";
import { pickSeasonalityTabId, type SeasonalityNavTargets } from "../../utils/seasonalityNav";
import { marketFromExpression } from "../../utils/seasonality";
import { WidgetContainer } from "../../components/WidgetContainer";
import type { BaseWidgetProps } from "../../types";

export interface SeasonalityAlertsWidgetProps extends BaseWidgetProps {
  /**
   * Optional filter — when set, only alerts whose status matches this value
   * are rendered. Omit to show all alerts.
   */
  statusFilter?: "active" | "stopped" | "triggered";
  /**
   * Right-click navigation target (T7.2). When set, right-clicking a row
   * routes to this dashboard's matching market tab via the app-root
   * navigation handler. Omit to disable right-click navigation.
   */
  navTargets?: SeasonalityNavTargets;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCondition(a: SeasonalityAlert): string {
  if (!a.condition) return "—";
  const { type, value } = a.condition;
  if (type === "inRange") {
    return `in [${fmt(value.low)}, ${fmt(value.high)}]`;
  }
  return `${type} ${fmt(value.rhs)}`;
}

function exprLabel(e: string[] | string | undefined): string {
  if (Array.isArray(e)) return e.join(", ");
  return e ?? "";
}

function fmt(n: number | string | undefined | null): string {
  if (n === undefined || n === null || n === "") return "—";
  const num = typeof n === "number" ? n : Number(n);
  if (Number.isNaN(num)) return "—";
  n = num;
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SeasonalityAlertsWidget(props: SeasonalityAlertsWidgetProps) {
  const { statusFilter, navTargets, darkMode = false } = props;
  const alerts = useSeasonalityAlertsStore((s) => s.alerts);
  const fetchAlerts = useSeasonalityAlertsStore((s) => s.fetchAlerts);
  const deleteAlert = useSeasonalityAlertsStore((s) => s.deleteAlert);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Initial load
  useEffect(() => {
    fetchAlerts().catch((e) =>
      console.error("[SeasonalityAlertsWidget] fetchAlerts failed", e),
    );
  }, [fetchAlerts]);

  // Close menu on outside click. The listener is attached on the next tick so
  // it doesn't fire immediately on the same click that opened the menu.
  useEffect(() => {
    if (openMenuId === null) return;
    const handler = () => setOpenMenuId(null);
    const tid = window.setTimeout(() => window.addEventListener("click", handler), 0);
    return () => {
      window.clearTimeout(tid);
      window.removeEventListener("click", handler);
    };
  }, [openMenuId]);

  const filtered = useMemo(() => {
    const safeAlerts = Array.isArray(alerts) ? alerts : [];
    if (!statusFilter) return safeAlerts;
    return safeAlerts.filter((a) => a.status === statusFilter);
  }, [alerts, statusFilter]);

  // ── Row interactions ────────────────────────────────────────────────────────
  const handleRowLeftClick = (alert: SeasonalityAlert) => {
    setSelectedId(alert.id);
    // Overlay markers travel with the quick-view payload so they only appear
    // inside the modal — bound dashboard charts do not react to alert clicks.
    widgetEventBus.emit(WIDGET_EVENTS.CHART_QUICK_VIEW, {
      kind: "seasonality-stacked",
      title: alert.altName || alert.name || exprLabel(alert.expression),
      expression: alert.expression[0] ?? "",
      overlayMarkers: alertConditionToOverlayMarkers(alert.condition, alert.id),
    });
  };

  const handleRowRightClick = (alert: SeasonalityAlert) => {
    const expr = alert.expression[0] ?? "";
    const market = alert.market ?? marketFromExpression(expr);
    console.log("[SeasonalityAlertsWidget] right-click alert:", {
      id: alert.id,
      name: alert.name,
      rawExpression: alert.expression,
      resolvedExpr: expr,
      market,
      navTargets,
      targetTabId: navTargets ? pickSeasonalityTabId(navTargets, market) : "no navTargets",
    });
    widgetEventBus.emit(WIDGET_EVENTS.SEASONALITY_OPEN_IN_BUILDER, {
      expression: expr,
      market,
      overlayMarkers: alertConditionToOverlayMarkers(alert.condition),
      ...(navTargets && {
        targetDashboardId: navTargets.dashboardId,
        targetTabId: pickSeasonalityTabId(navTargets, market),
      }),
    });
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchAlerts();
    } catch (e) {
      console.error("[SeasonalityAlertsWidget] fetchAlerts failed", e);
    } finally {
      setRefreshing(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <WidgetContainer darkMode={darkMode}>
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="drag-handle flex items-center justify-between px-3 py-2 border-b border-slate-200 dark:border-zinc-800">
        <h2 className="font-semibold text-sm text-slate-800 dark:text-zinc-100">
          Alerts {filtered.length > 0 && (
            <span className="text-slate-400 dark:text-zinc-500 font-normal">({filtered.length})</span>
          )}
        </h2>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-1 rounded hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-500 dark:text-zinc-400 disabled:opacity-50"
          title="Refresh"
        >
          <RefreshCcw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Column headings */}
      <div className="grid grid-cols-[1fr_120px_100px_70px_28px] gap-2 px-3 py-1.5 text-[11px] uppercase tracking-wide text-slate-500 dark:text-zinc-500 border-b border-slate-200 dark:border-zinc-800">
        <span>Alert Name</span>
        <span>Condition</span>
        <span>Last Triggered</span>
        <span>Status</span>
        <span />
      </div>

      {/* Rows */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-slate-400 dark:text-zinc-500">
            No alerts.
          </div>
        ) : (
          filtered.map((alert) => {
            const isSelected = selectedId === alert.id;
            const isMenuOpen = openMenuId === alert.id;
            return (
              <div
                key={alert.id}
                onClick={() => handleRowLeftClick(alert)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  handleRowRightClick(alert);
                }}
                className={`grid grid-cols-[1fr_120px_100px_70px_28px] gap-2 items-center px-3 py-2 cursor-pointer border-l-2 group ${
                  isSelected
                    ? "border-l-amber-500 bg-amber-50/60 dark:bg-amber-900/10"
                    : "border-l-transparent hover:bg-slate-50 dark:hover:bg-zinc-800/40"
                }`}
              >
                <div className="min-w-0">
                  <div className="text-sm text-slate-800 dark:text-zinc-100 truncate" title={alert.name}>
                    {alert.name || exprLabel(alert.expression)}
                  </div>
                  {alert.altName && alert.altName !== alert.name && (
                    <div className="font-mono text-[10px] text-slate-400 dark:text-zinc-500 truncate">
                      {alert.altName}
                    </div>
                  )}
                </div>
                <span className="font-mono text-xs text-slate-600 dark:text-zinc-300 truncate">
                  {formatCondition(alert)}
                </span>
                <span className="text-xs text-slate-500 dark:text-zinc-400">
                  {alert.lastTriggeredAt
                    ? new Date(alert.lastTriggeredAt).toLocaleDateString()
                    : "—"}
                </span>
                <span
                  className={`text-xs font-medium ${
                    alert.status === "active"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : alert.status === "triggered"
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-slate-400 dark:text-zinc-500"
                  }`}
                >
                  {alert.status}
                </span>

                <div className="relative" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => setOpenMenuId(isMenuOpen ? null : alert.id)}
                    className="p-1 rounded hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-500 dark:text-zinc-400 opacity-0 group-hover:opacity-100"
                  >
                    <MoreVertical className="w-3.5 h-3.5" />
                  </button>
                  {isMenuOpen && (
                    <div className="absolute right-0 top-full mt-1 w-36 rounded-md border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-lg z-10">
                      <button
                        onClick={() => {
                          setOpenMenuId(null);
                          if (window.confirm(`Delete alert "${alert.name || exprLabel(alert.expression)}"?`)) {
                            deleteAlert(alert.id).catch((e) =>
                              console.error("[SeasonalityAlertsWidget] deleteAlert failed", e),
                            );
                          }
                        }}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
    </WidgetContainer>
  );
}

export const SeasonalityAlertsWidgetDef = {
  component: SeasonalityAlertsWidget,
  category: "Seasonality",
} as const;