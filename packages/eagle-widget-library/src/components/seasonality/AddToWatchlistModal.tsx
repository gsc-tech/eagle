/**
 * `<AddToWatchlistModal>` — port of falcon-ui/.../AddWatchlistModal.tsx with
 * Redux ripped out and replaced with `useSeasonalityWatchlistStore`.
 *
 * Behaviour (T2.7):
 *   - Toggle between "add to existing list" and "create new list".
 *   - Optional `altName` (display label) and `tags` (new lists only).
 *   - "Show as widget" checkbox (default on) — when checked, the consumer's
 *     `addWidgetToDashboard` callback is invoked so the new entry appears as
 *     a widget on the current dashboard tab.
 *   - On save, emits `seasonality:watchlist-changed` so the watchlist widgets
 *     re-fetch / re-render.
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import {
  useSeasonalityWatchlistStore,
  type WatchlistMarketConfig,
} from "../../store/seasonalityWatchlistStore";
import { useAvailableDashboardsStore } from "../../store/availableDashboardsStore";
import { widgetEventBus, WIDGET_EVENTS } from "../../store/widgetEventBus";
import type { AddWidgetTarget } from "../../types";

export interface AddToWatchlistModalProps {
  open: boolean;
  onClose: () => void;
  expression: string;
  /** Market config recorded with the item — used by SeasonalityWatchlistWidget to reopen the builder. */
  marketConfig: WatchlistMarketConfig;
  /** Current dashboard/tab — used as the default selection in the widget picker. */
  widgetTarget?: { dashboardId: string; tabId: string };
  /** Host-injected callback that places a widget on a dashboard tab. */
  addWidgetToDashboard?: (target: AddWidgetTarget) => Promise<void>;
  darkMode?: boolean;
}

export function AddToWatchlistModal(props: AddToWatchlistModalProps) {
  const {
    open,
    onClose,
    expression,
    marketConfig,
    widgetTarget,
    addWidgetToDashboard,
    darkMode,
  } = props;

  const lists = useSeasonalityWatchlistStore((s) => s.lists);
  const createList = useSeasonalityWatchlistStore((s) => s.createList);
  const addItem = useSeasonalityWatchlistStore((s) => s.addItem);

  const availableDashboards = useAvailableDashboardsStore((s) => s.dashboards);
  const canAddWidget = !!addWidgetToDashboard && availableDashboards.length > 0;

  const listsArr = useMemo(() => Object.values(lists), [lists]);

  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<"existing" | "new">(
    listsArr.length > 0 ? "existing" : "new",
  );
  const [selectedListId, setSelectedListId] = useState<string>(listsArr[0]?.id ?? "");
  const [newListName, setNewListName] = useState("");
  const [newListTags, setNewListTags] = useState("");
  const [altName, setAltName] = useState("");
  const [showAsWidget, setShowAsWidget] = useState(listsArr.length === 0);

  // Dashboard / tab picker state — defaults to widgetTarget (current tab) when available.
  const [selectedDashId, setSelectedDashId] = useState<string>("");
  const [selectedTabId, setSelectedTabId] = useState<string>("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset transient fields each time the modal re-opens.
  useEffect(() => {
    if (!open) return;
    setError(null);
    setSaving(false);
    setAltName("");
    setNewListName("");
    setNewListTags("");
    const nextMode = listsArr.length > 0 ? "existing" : "new";
    setMode(nextMode);
    setShowAsWidget(nextMode === "new");
    setSelectedListId(listsArr[0]?.id ?? "");

    // Default dashboard/tab selection: prefer widgetTarget (current tab), else first available.
    const defaultDashId = widgetTarget?.dashboardId ?? availableDashboards[0]?.id ?? "";
    setSelectedDashId(defaultDashId);
    const defaultDash = availableDashboards.find((d) => d.id === defaultDashId);
    const defaultTabId =
      widgetTarget?.dashboardId === defaultDashId
        ? (widgetTarget?.tabId ?? defaultDash?.tabs[0]?.id ?? "")
        : (defaultDash?.tabs[0]?.id ?? "");
    setSelectedTabId(defaultTabId);
  }, [open, listsArr.length]);

  if (!open || !mounted) return null;

  const canSave =
    expression.trim().length > 0 &&
    (mode === "existing" ? !!selectedListId : newListName.trim().length > 0);

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      let listId = selectedListId;
      if (mode === "new") {
        const tags = newListTags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean);
        const newList = await createList({
          name: newListName.trim(),
          tags: tags.length ? tags : undefined,
          initialItem: {
            expression: expression.trim(),
            altName: altName.trim() || undefined,
            marketConfig,
          }
        });
        listId = newList.id;
      } else {
        await addItem(listId, {
          expression: expression.trim(),
          altName: altName.trim() || undefined,
          marketConfig,
        });
      }

      if (showAsWidget && canAddWidget && selectedDashId && selectedTabId) {
        await addWidgetToDashboard!({
          dashboardId: selectedDashId,
          tabId: selectedTabId,
          widget: {
            componentName: "SeasonalityWatchlistWidget",
            defaultProps: { watchlistId: listId },
            suggestedSize: { w: 4, h: 6 },
          },
        });
      }

      widgetEventBus.emit(WIDGET_EVENTS.SEASONALITY_WATCHLIST_CHANGED, {
        watchlistId: listId,
      });

      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-md rounded-lg shadow-xl ${
          darkMode ? "bg-zinc-900 text-zinc-100" : "bg-white text-slate-800"
        }`}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-zinc-700">
          <h2 className="text-base font-semibold">Add to Watchlist</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-zinc-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 flex flex-col gap-4">
          <div>
            <label className="text-xs font-medium text-slate-500 dark:text-zinc-400">Expression</label>
            <div className="mt-1 px-3 py-2 rounded-md font-mono text-sm bg-slate-50 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 break-all">
              {expression || <span className="opacity-50">(empty)</span>}
            </div>
          </div>

          <div className="flex gap-2 text-sm">
            <button
              type="button"
              onClick={() => setMode("existing")}
              disabled={listsArr.length === 0}
              className={`flex-1 px-3 py-1.5 rounded-md font-medium border transition-colors ${
                mode === "existing"
                  ? "bg-blue-600 border-blue-600 text-white"
                  : "border-slate-300 dark:border-zinc-600 hover:bg-slate-100 dark:hover:bg-zinc-800"
              } disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              Existing list
            </button>
            <button
              type="button"
              onClick={() => setMode("new")}
              className={`flex-1 px-3 py-1.5 rounded-md font-medium border transition-colors ${
                mode === "new"
                  ? "bg-blue-600 border-blue-600 text-white"
                  : "border-slate-300 dark:border-zinc-600 hover:bg-slate-100 dark:hover:bg-zinc-800"
              }`}
            >
              New list
            </button>
          </div>

          {mode === "existing" ? (
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-zinc-400">Watchlist</label>
              <select
                value={selectedListId}
                onChange={(e) => setSelectedListId(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-md border border-slate-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {listsArr.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>
          ) : (
            <>
              <div>
                <label className="text-xs font-medium text-slate-500 dark:text-zinc-400">New list name</label>
                <input
                  type="text"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  placeholder="e.g. Energy spreads"
                  className="mt-1 w-full px-3 py-2 rounded-md border border-slate-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 dark:text-zinc-400">Tags (comma-separated, optional)</label>
                <input
                  type="text"
                  value={newListTags}
                  onChange={(e) => setNewListTags(e.target.value)}
                  placeholder="e.g. crude, intermarket"
                  className="mt-1 w-full px-3 py-2 rounded-md border border-slate-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </>
          )}

          <div>
            <label className="text-xs font-medium text-slate-500 dark:text-zinc-400">Display name (optional)</label>
            <input
              type="text"
              value={altName}
              onChange={(e) => setAltName(e.target.value)}
              placeholder="Defaults to the expression"
              className="mt-1 w-full px-3 py-2 rounded-md border border-slate-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {canAddWidget && (
            <div className="flex flex-col gap-3 pt-1 border-t border-slate-200 dark:border-zinc-700">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={showAsWidget}
                  onChange={(e) => setShowAsWidget(e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                Also add a Watchlist widget to a dashboard
              </label>

              {showAsWidget && (
                <div className="flex flex-col gap-2 pl-6">
                  <div>
                    <label className="text-xs font-medium text-slate-500 dark:text-zinc-400">Dashboard</label>
                    <select
                      value={selectedDashId}
                      onChange={(e) => {
                        const newDashId = e.target.value;
                        setSelectedDashId(newDashId);
                        const dash = availableDashboards.find((d) => d.id === newDashId);
                        setSelectedTabId(dash?.tabs[0]?.id ?? "");
                      }}
                      className="mt-1 w-full px-3 py-2 rounded-md border border-slate-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {availableDashboards.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-500 dark:text-zinc-400">Tab</label>
                    <select
                      value={selectedTabId}
                      onChange={(e) => setSelectedTabId(e.target.value)}
                      className="mt-1 w-full px-3 py-2 rounded-md border border-slate-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {(availableDashboards.find((d) => d.id === selectedDashId)?.tabs ?? []).map((t) => (
                        <option key={t.id} value={t.id}>{t.title}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {error && <div className="text-sm text-red-600 dark:text-red-400">{error}</div>}
        </div>

        <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-200 dark:border-zinc-700">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm font-medium rounded-md hover:bg-slate-100 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave || saving}
            className="px-3 py-1.5 text-sm font-medium rounded-md bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}