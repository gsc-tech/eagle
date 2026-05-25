/**
 * App-root navigation handler for the seasonality right-click flow (T7.2).
 *
 * Two parts:
 *   (a) `seasonality:open-in-builder` → re-publishes the payload as a generic
 *       `dashboard:navigate-to` event with `initialState` carrying the
 *       expression. (Dumb router — all market→tab resolution happens at
 *       emit time inside the source widget via `pickSeasonalityTabId`.)
 *   (b) `dashboard:navigate-to` → switches the host page's dashboard + tab
 *       via the callbacks the host supplies, then re-emits
 *       `seasonality:open-in-builder` with `_dispatchedByNavigation: true`
 *       so the destination tab's builder picks the expression up on mount.
 *       The re-emit is flagged to skip the (a) handler and avoid a loop.
 *
 * The hook is host-agnostic — it doesn't know about React Router or any
 * specific store. The host (home.tsx) passes setters for "switch dashboard
 * to ID X" and "switch tab to ID Y"; the hook does the rest.
 */

import { useEffect, useRef } from "react";
import {
    widgetEventBus,
    useAvailableDashboardsStore,
    usePendingBuilderNavStore,
    type AlertOverlayMarker,
    type SeasonalityMarket,
    type SymbolMatrix,
} from "@gsc-tech/eagle-widget-library";

const SEASONALITY_DASHBOARD_NAME = "seasonality";

// Market → tab-title keyword. Matched case-insensitively against the tab's
// `title` (substring), so a tab called "IM1 — Crack Spreads" still resolves.
const MARKET_TAB_KEYWORDS: Record<SeasonalityMarket, string[]> = {
    "Single Market": ["single"],
    "Intermarket 1": ["im1", "intermarket 1"],
    "Intermarket 2": ["im2", "intermarket 2"],
    "Intermarket 3": ["im3", "intermarket 3"],
    "Custom":        ["custom"],
};

function resolveSeasonalityTarget(market: SeasonalityMarket | undefined): {
    dashboardId: string;
    tabId: string;
} | null {
    if (!market) {
        console.log("[resolveSeasonalityTarget] market is undefined, aborting");
        return null;
    }
    const dashboards = useAvailableDashboardsStore.getState().dashboards;
    console.log("[resolveSeasonalityTarget] market:", market, "| available dashboards:", dashboards.map(d => ({ id: d.id, name: d.name })));

    const dash = dashboards.find((d) => d.name.trim().toLowerCase() === SEASONALITY_DASHBOARD_NAME)
        ?? dashboards.find((d) => d.name.toLowerCase().includes(SEASONALITY_DASHBOARD_NAME));

    if (!dash) {
        console.warn("[resolveSeasonalityTarget] no dashboard matching 'seasonality' found");
        return null;
    }

    console.log("[resolveSeasonalityTarget] matched dashboard:", { id: dash.id, name: dash.name }, "| tabs:", dash.tabs.map(t => ({ id: t.id, title: t.title })));

    const keywords = MARKET_TAB_KEYWORDS[market] ?? [];
    const customFallback = dash.tabs.find((t) => t.title.toLowerCase().includes("custom"));

    for (const kw of keywords) {
        const tab = dash.tabs.find((t) => t.title.toLowerCase().includes(kw));
        if (tab) {
            console.log("[resolveSeasonalityTarget] matched tab via keyword", JSON.stringify(kw), "→", { id: tab.id, title: tab.title });
            return { dashboardId: dash.id, tabId: tab.id };
        }
    }
    if (customFallback) {
        console.warn("[resolveSeasonalityTarget] no market-specific tab matched for", market, "— falling back to custom tab:", customFallback.title);
        return { dashboardId: dash.id, tabId: customFallback.id };
    }
    console.warn("[resolveSeasonalityTarget] no tab found at all for market:", market);
    return null;
}

export interface SeasonalityNavigationHandlers {
    /**
     * Switch to the dashboard with the given ID. Should be idempotent — if
     * already on that dashboard, no-op. Returns whether the dashboard exists.
     */
    selectDashboard: (dashboardId: string) => boolean;
    /** Switch the currently-selected dashboard's active tab. */
    setActiveTab: (tabId: string) => void;
}

const REEMIT_DELAY_MS = 80;

export function useSeasonalityNavigation(handlers: SeasonalityNavigationHandlers) {
    // Hold the latest handlers in a ref so the effect below subscribes once
    // and the subscriptions always call current logic.
    const handlersRef = useRef(handlers);
    useEffect(() => { handlersRef.current = handlers; }, [handlers]);

    useEffect(() => {
        // (a) seasonality:open-in-builder → dashboard:navigate-to
        const unsubOpen = widgetEventBus.subscribe("seasonality:open-in-builder", (p) => {
            if (p._dispatchedByNavigation) return; // re-emit echo; ignore
            console.log("[useSeasonalityNavigation] (a) open-in-builder received:", {
                expression: p.expression,
                market: p.market,
                targetDashboardId: p.targetDashboardId,
                targetTabId: p.targetTabId,
                hasSymbolMatrix: Array.isArray(p.symbolMatrix) && p.symbolMatrix.length > 0,
            });
            // Prefer explicit navTargets from the emitting widget; otherwise
            // auto-resolve a dashboard named "Seasonality" with market tabs.
            let dashboardId = p.targetDashboardId;
            let tabId = p.targetTabId;
            if (!dashboardId || !tabId) {
                console.log("[useSeasonalityNavigation] no explicit navTargets — falling back to auto-resolve");
                const resolved = resolveSeasonalityTarget(p.market);
                if (!resolved) {
                    console.warn("[useSeasonalityNavigation] auto-resolve failed, navigation aborted");
                    return; // can't navigate
                }
                dashboardId = resolved.dashboardId;
                tabId = resolved.tabId;
            }
            console.log("[useSeasonalityNavigation] emitting navigate-to:", { dashboardId, tabId, expression: p.expression });
            widgetEventBus.emit("dashboard:navigate-to", {
                dashboardId,
                tabId,
                initialState: {
                    expression: p.expression,
                    market: p.market,
                    symbolMatrix: p.symbolMatrix,
                    overlayMarkers: p.overlayMarkers,
                },
            });
        });

        // (b) dashboard:navigate-to → host switch + re-emit for builder hydration
        const unsubNav = widgetEventBus.subscribe("dashboard:navigate-to", (p) => {
            console.log("[useSeasonalityNavigation] (b) navigate-to received:", { dashboardId: p.dashboardId, tabId: p.tabId, initialState: p.initialState });
            const ok = handlersRef.current.selectDashboard(p.dashboardId);
            if (!ok) {
                console.warn(`[useSeasonalityNavigation] dashboard "${p.dashboardId}" not found — selectDashboard returned false`);
                return;
            }
            console.log("[useSeasonalityNavigation] selectDashboard ok, now switching tab to:", p.tabId);
            if (p.tabId) handlersRef.current.setActiveTab(p.tabId);

            const init = p.initialState;
            if (init && typeof init.expression === "string") {
                const navPayload = {
                    expression: init.expression as string,
                    market: init.market as SeasonalityMarket,
                    symbolMatrix: init.symbolMatrix as SymbolMatrix[] | undefined,
                    overlayMarkers: init.overlayMarkers as AlertOverlayMarker[] | undefined,
                };
                // Write to the pending store BEFORE the tab switch re-renders so
                // the builder can read it synchronously on mount — the 80ms event
                // re-emit is a best-effort fast path for widgets already mounted.
                usePendingBuilderNavStore.getState().set(navPayload);
                console.log("[useSeasonalityNavigation] ✅ wrote pending nav to store:", navPayload.expression, navPayload.market);
                console.log("[useSeasonalityNavigation] pending store state immediately after set:", usePendingBuilderNavStore.getState().pending);
                setTimeout(() => {
                    const stillPending = usePendingBuilderNavStore.getState().pending;
                    console.log("[useSeasonalityNavigation] ⏱ 80ms re-emit firing. Pending store still has payload?", !!stillPending, "expression:", navPayload.expression);
                    widgetEventBus.emit("seasonality:open-in-builder", {
                        ...navPayload,
                        _dispatchedByNavigation: true,
                    });
                }, REEMIT_DELAY_MS);
            } else {
                console.warn("[useSeasonalityNavigation] ❌ no expression in initialState, builder will not be hydrated", init);
            }
        });

        return () => { unsubOpen(); unsubNav(); };
    }, []);
}