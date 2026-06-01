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
    if (!market) return null;
    const dashboards = useAvailableDashboardsStore.getState().dashboards;

    const dash = dashboards.find((d) => d.name.trim().toLowerCase() === SEASONALITY_DASHBOARD_NAME)
        ?? dashboards.find((d) => d.name.toLowerCase().includes(SEASONALITY_DASHBOARD_NAME));

    if (!dash) {
        console.warn("[SeasonalityNav] no dashboard matching 'seasonality' found");
        return null;
    }

    const keywords = MARKET_TAB_KEYWORDS[market] ?? [];
    const customFallback = dash.tabs.find((t) => t.title.toLowerCase().includes("custom"));

    for (const kw of keywords) {
        const tab = dash.tabs.find((t) => t.title.toLowerCase().includes(kw));
        if (tab) return { dashboardId: dash.id, tabId: tab.id };
    }
    if (customFallback) {
        console.warn("[SeasonalityNav] no market-specific tab for", market, "— falling back to custom");
        return { dashboardId: dash.id, tabId: customFallback.id };
    }
    console.warn("[SeasonalityNav] no tab found for market:", market);
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
            console.log("[SeasonalityNav] (a) open-in-builder →", {
                expr: p.expression, market: p.market,
                markerCount: Array.isArray(p.overlayMarkers) ? p.overlayMarkers.length : 0,
                markerIds: Array.isArray(p.overlayMarkers) ? p.overlayMarkers.map((m: { id?: string }) => m.id) : [],
                targetDashboardId: p.targetDashboardId, targetTabId: p.targetTabId,
            });
            let dashboardId = p.targetDashboardId;
            let tabId = p.targetTabId;
            if (!dashboardId || !tabId) {
                const resolved = resolveSeasonalityTarget(p.market);
                if (!resolved) {
                    console.warn("[SeasonalityNav] auto-resolve failed, navigation aborted");
                    return;
                }
                dashboardId = resolved.dashboardId;
                tabId = resolved.tabId;
            }
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
            const ok = handlersRef.current.selectDashboard(p.dashboardId);
            if (!ok) {
                console.warn(`[SeasonalityNav] dashboard "${p.dashboardId}" not found`);
                return;
            }
            if (p.tabId) handlersRef.current.setActiveTab(p.tabId);

            const init = p.initialState;
            if (init && typeof init.expression === "string") {
                const navPayload = {
                    expression: init.expression as string,
                    market: init.market as SeasonalityMarket,
                    symbolMatrix: init.symbolMatrix as SymbolMatrix[] | undefined,
                    overlayMarkers: init.overlayMarkers as AlertOverlayMarker[] | undefined,
                };
                usePendingBuilderNavStore.getState().set(navPayload);
                console.log("[SeasonalityNav] (b) wrote pending store →", {
                    expr: navPayload.expression,
                    markerCount: navPayload.overlayMarkers?.length ?? 0,
                    markerIds: navPayload.overlayMarkers?.map((m) => m.id),
                });
                setTimeout(() => {
                    console.log("[SeasonalityNav] (b) re-emitting open-in-builder →", {
                        expr: navPayload.expression,
                        markerCount: navPayload.overlayMarkers?.length ?? 0,
                        markerIds: navPayload.overlayMarkers?.map((m) => m.id),
                    });
                    widgetEventBus.emit("seasonality:open-in-builder", {
                        ...navPayload,
                        _dispatchedByNavigation: true,
                    });
                }, REEMIT_DELAY_MS);
            } else {
                console.warn("[SeasonalityNav] ❌ no expression in initialState, builder will not be hydrated", init);
            }
        });

        return () => { unsubOpen(); unsubNav(); };
    }, []);
}