/**
 * `SeasonalityWatchlistWidget` (T5.1) — builds on the generic `WatchListWidget`
 * shell (T2.3) via its `rowRenderer` prop. Each row shows:
 *   EXPR  CLOSE  PER  [sparkline]  [bell-if-alert]  [hamburger]
 *
 * Header: list name + `...` menu (rename, delete).
 * Row left-click  → emits `seasonality:quick-view` (opens QuickViewChartModal).
 * Row right-click → emits `seasonality:open-in-builder` (navigates to builder).
 *
 * Sparkline rendering is delegated to `<WatchlistSparkline>` (T5.2) which
 * lazy-fetches per-row data when the row enters the viewport.
 */

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, MoreHorizontal, MoreVertical, Pencil, Trash2 } from "lucide-react";
import WatchListWidget from "../WatchListWidget";
import { WidgetContainer } from "../../components/WidgetContainer";
import { WatchlistSparkline } from "./WatchlistSparkline";
import {
  useSeasonalityWatchlistStore,
  type WatchlistItem,
} from "../../store/seasonalityWatchlistStore";
import { useSeasonalityAlertsStore } from "../../store/seasonalityAlertsStore";
import { widgetEventBus, WIDGET_EVENTS } from "../../store/widgetEventBus";
import { SetAlertModal } from "../../components/seasonality/SetAlertModal";
import { pickSeasonalityTabId, type SeasonalityNavTargets } from "../../utils/seasonalityNav";
import { marketFromExpression } from "../../utils/seasonality";
import type { BaseWidgetProps } from "../../types";

export interface SeasonalityWatchlistWidgetProps extends BaseWidgetProps {
  /**
   * Which watchlist to render. Required at runtime — typed as optional only
   * so the widget conforms to the generic `BaseWidgetProps`-based registry.
   * The dev-console widget config UI enforces it via `defaultProps`.
   */
  watchlistId?: string;
  /**
   * Right-click / "Open in builder" navigation target (T7.2). When set,
   * navigates to this dashboard's market-matching tab. Omit to disable.
   */
  navTargets?: SeasonalityNavTargets;
}

export function SeasonalityWatchlistWidget(props: SeasonalityWatchlistWidgetProps) {
  const { watchlistId, darkMode, navTargets } = props;

  // All hooks must be called unconditionally before any early return.
  const list = useSeasonalityWatchlistStore((s) => watchlistId ? s.lists[watchlistId] : undefined);
  const fetchLists = useSeasonalityWatchlistStore((s) => s.fetchLists);
  const removeItem = useSeasonalityWatchlistStore((s) => s.removeItem);
  const deleteList = useSeasonalityWatchlistStore((s) => s.deleteList);
  const renameList = useSeasonalityWatchlistStore((s) => s.renameList);

  const alerts = useSeasonalityAlertsStore((s) => s.alerts);

  // Refetch on the watchlist-changed event (own list or sibling list).
  useEffect(() => {
    const unsub = widgetEventBus.subscribe("seasonality:watchlist-changed", () => {
      fetchLists().catch((e) => console.error("[SeasonalityWatchlistWidget] fetchLists failed", e));
    });
    return unsub;
  }, [fetchLists]);

  // Map expressions → alert presence (for the bell icon).
  const alertByExpression = useMemo(() => {
    const m = new Map<string, true>();
    const safeAlerts = Array.isArray(alerts) ? alerts : [];
    safeAlerts.forEach((a) => {
      if (a.status === "active") a.expression.forEach((e) => m.set(e, true));
    });
    return m;
  }, [alerts]);

  // ── Modal & menu state ────────────────────────────────────────────────────
  const [alertModalFor, setAlertModalFor] = useState<WatchlistItem | null>(null);
  const [openRowMenu, setOpenRowMenu] = useState<string | null>(null);
  const [openHeaderMenu, setOpenHeaderMenu] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  // Tracks whether the rename input was dismissed via Escape (not Enter/blur-save).
  const renameEscapedRef = useRef(false);

  // Close any open menu when the user clicks elsewhere. Attached on the next
  // tick so the click that opened the menu doesn't immediately close it.
  useEffect(() => {
    if (openRowMenu === null && !openHeaderMenu) return;
    const handler = () => {
      setOpenRowMenu(null);
      setOpenHeaderMenu(false);
    };
    const tid = window.setTimeout(() => window.addEventListener("click", handler), 0);
    return () => {
      window.clearTimeout(tid);
      window.removeEventListener("click", handler);
    };
  }, [openRowMenu, openHeaderMenu]);

  // Guard after all hooks.
  if (!watchlistId) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-slate-400 dark:text-zinc-500">
        Configure the `watchlistId` prop to load a watchlist.
      </div>
    );
  }

  // ── Row interactions ──────────────────────────────────────────────────────
  const handleRowLeftClick = (item: WatchlistItem) => {
    widgetEventBus.emit(WIDGET_EVENTS.CHART_QUICK_VIEW, {
      kind: "seasonality-stacked",
      title: item.altName || item.expression,
      expression: item.expression,
    });
  };
  const emitOpenInBuilder = (item: WatchlistItem) => {
    const market = item.marketConfig?.market ?? marketFromExpression(item.expression);
    const resolvedTabId = navTargets
      ? pickSeasonalityTabId(navTargets, market, item.marketConfig?.symbolMatrix)
      : "no navTargets";
    console.log("[SeasonalityWatchlistWidget] emitOpenInBuilder:", {
      expression: item.expression,
      market,
      marketSource: item.marketConfig?.market ? "marketConfig" : "derived from expression",
      symbolMatrix: item.marketConfig?.symbolMatrix,
      navTargets,
      resolvedTabId,
    });
    widgetEventBus.emit(WIDGET_EVENTS.SEASONALITY_OPEN_IN_BUILDER, {
      expression: item.expression,
      market,
      symbolMatrix: item.marketConfig?.symbolMatrix,
      ...(navTargets && {
        targetDashboardId: navTargets.dashboardId,
        targetTabId: resolvedTabId as string,
      }),
    });
  };
  const handleRowRightClick = (item: WatchlistItem) => {
    console.log("[SeasonalityWatchlistWidget] right-click fired on item:", item.id, item.expression);
    emitOpenInBuilder(item);
  };

  // ── Renderer ──────────────────────────────────────────────────────────────
  const rowRenderer = (raw: unknown) => {
    const item = raw as WatchlistItem;
    const hasAlert = alertByExpression.has(item.expression);
    const isMenuOpen = openRowMenu === item.id;

    return (
      <div
        key={item.id}
        onClick={() => handleRowLeftClick(item)}
        onContextMenu={(e) => {
          e.preventDefault();
          handleRowRightClick(item);
        }}
        className="flex items-center gap-2 px-3 py-2 rounded-md border border-transparent hover:border-slate-200 dark:hover:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-800/40 cursor-pointer group"
      >
        {/* EXPR / altName */}
        <div className="flex-1 min-w-0">
          <div className="font-mono text-xs text-slate-700 dark:text-zinc-200 truncate" title={item.expression}>
            {item.altName || item.expression}
          </div>
          {item.altName && (
            <div className="font-mono text-[10px] text-slate-400 dark:text-zinc-500 truncate">
              {item.expression}
            </div>
          )}
        </div>

        {/* CLOSE */}
        <div className="w-16 text-right text-sm tabular-nums text-slate-700 dark:text-zinc-200">
          {item.price !== undefined ? item.price.toFixed(2) : <span className="opacity-40">—</span>}
        </div>

        {/* PER (percentile) */}
        <div className="w-12 text-right text-xs tabular-nums text-slate-500 dark:text-zinc-400">
          {item.percentile !== undefined ? `${item.percentile.toFixed(0)}%` : <span className="opacity-40">—</span>}
        </div>

        {/* Sparkline */}
        <div className="w-20 flex justify-center">
          <WatchlistSparkline data={item.sparkline} />
        </div>

        {/* Alert bell */}
        <div className="w-5 flex justify-center">
          {hasAlert ? (
            <Bell className="w-3.5 h-3.5 text-amber-500" />
          ) : (
            <span className="w-3.5 h-3.5" />
          )}
        </div>

        {/* Hamburger menu */}
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setOpenRowMenu(isMenuOpen ? null : item.id)}
            className="p-1 rounded hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-500 dark:text-zinc-400 opacity-0 group-hover:opacity-100"
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </button>
          {isMenuOpen && (
            <div className="absolute right-0 top-full mt-1 w-44 rounded-md border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-lg z-10">
              <MenuItem
                onClick={() => {
                  setOpenRowMenu(null);
                  setAlertModalFor(item);
                }}
              >
                Set Alert
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setOpenRowMenu(null);
                  emitOpenInBuilder(item);
                }}
              >
                Open in builder
              </MenuItem>
              <MenuItem
                danger
                onClick={() => {
                  setOpenRowMenu(null);
                  removeItem(watchlistId, item.id).catch((e) =>
                    console.error("[SeasonalityWatchlistWidget] removeItem failed", e),
                  );
                }}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Remove
              </MenuItem>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ── Header `...` menu ─────────────────────────────────────────────────────
  const header = list ? (
    <div className="drag-handle flex items-center justify-between px-3 py-2 border-b border-slate-200 dark:border-zinc-800">
      {renaming ? (
        <input
          autoFocus
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onBlur={() => {
            const wasEscaped = renameEscapedRef.current;
            renameEscapedRef.current = false;
            if (!wasEscaped) {
              const trimmed = renameValue.trim();
              if (trimmed && trimmed !== list.name) {
                renameList(watchlistId, trimmed).catch((e) =>
                  console.error("[SeasonalityWatchlistWidget] renameList failed", e),
                );
              }
            }
            setRenaming(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            if (e.key === "Escape") {
              renameEscapedRef.current = true;
              setRenaming(false);
            }
          }}
          className="flex-1 px-2 py-1 rounded-md border border-slate-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-sm"
        />
      ) : (
        <h2 className="font-semibold text-sm text-slate-800 dark:text-zinc-100 truncate">{list.name}</h2>
      )}
      <div className="relative" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => setOpenHeaderMenu((v) => !v)}
          className="p-1 rounded hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-500 dark:text-zinc-400"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
        {openHeaderMenu && (
          <div className="absolute right-0 top-full mt-1 w-40 rounded-md border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-lg z-10">
            <MenuItem
              onClick={() => {
                setOpenHeaderMenu(false);
                setRenameValue(list.name);
                setRenaming(true);
              }}
            >
              <Pencil className="w-3.5 h-3.5" />
              Rename
            </MenuItem>
            <MenuItem
              danger
              onClick={() => {
                setOpenHeaderMenu(false);
                if (window.confirm(`Delete watchlist "${list.name}"?`)) {
                  deleteList(watchlistId).catch((e) =>
                    console.error("[SeasonalityWatchlistWidget] deleteList failed", e),
                  );
                }
              }}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete list
            </MenuItem>
          </div>
        )}
      </div>
    </div>
  ) : null;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <WidgetContainer darkMode={darkMode}>
    <div className="flex flex-col h-full">
      {header}
      <div className="flex-1 min-h-0">
        <WatchListWidget
          {...props}
          items={list?.items ?? []}
          rowRenderer={rowRenderer}
          headerTitle={null}
          hideAddButton
          bare
          emptyMessage={list ? "No expressions in this list." : "Watchlist not loaded."}
        />
      </div>

      <SetAlertModal
        open={alertModalFor !== null}
        onClose={() => setAlertModalFor(null)}
        expression={alertModalFor?.expression ?? ""}
        market={alertModalFor?.marketConfig.market ?? "Custom"}
        defaultAltName={alertModalFor?.altName}
        darkMode={darkMode}
      />
    </div>
    </WidgetContainer>
  );
}

// ─── Small helper ─────────────────────────────────────────────────────────────

function MenuItem({
  onClick,
  danger,
  children,
}: {
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-3 py-1.5 text-left text-sm ${
        danger
          ? "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
          : "text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800"
      }`}
    >
      {children}
    </button>
  );
}

export const SeasonalityWatchlistWidgetDef = {
  component: SeasonalityWatchlistWidget,
  category: "Seasonality",
} as const;
