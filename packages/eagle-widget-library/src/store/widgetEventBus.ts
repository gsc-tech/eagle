// Widget-to-widget event bus — typed pub/sub for cross-widget communication.

// ─── Event payload map ────────────────────────────────────────────────────────
// Add a new entry here when introducing a new cross-widget event.
// The key is the event type string; the value is the payload shape.

import type { SeasonalityMarket } from "./seasonalityWatchlistStore";
import type { AlertOverlayMarker, SymbolMatrix } from "../utils/seasonality";

export interface WidgetEventMap {
    'trader-limits:request-submitted':    { row: unknown };
    'trader-limits:request-approved':     { ids: string[]; action: string };
    'trader-limits:request-rejected':     { ids: string[]; action: string };
    'trader-limits:request-acknowledged': { ids: string[]; action: string };

    // ── Seasonality events (plan §5.1) ────────────────────────────────────────
    // (Quick-view is the generic `chart:quick-view` event below — emit with
    // `kind: 'seasonality-stacked'` etc. to open the modal for a seasonality
    // expression. Alert thresholds travel as `overlayMarkers` in the payload.)

    // Navigates to the Seasonality deep-dive dashboard and loads
    // the expression into the appropriate market-scoped builder widget.
    // `targetDashboardId` + `targetTabId` come from the emitting widget's
    // `navTargets` config — the navigation handler (T7.2) is a dumb router
    // and does no market→tab resolution itself.
    // `_dispatchedByNavigation` is set when the nav handler re-emits the
    // event post-navigation so the destination tab's builder picks up the
    // expression on mount — the handler ignores re-emits to avoid loops.
    'seasonality:open-in-builder': {
        expression: string;
        market: SeasonalityMarket;
        symbolMatrix?: SymbolMatrix[];
        /** Alert threshold markers to overlay on the builder's embedded chart. */
        overlayMarkers?: AlertOverlayMarker[];
        targetDashboardId?: string;
        targetTabId?: string;
        _dispatchedByNavigation?: boolean;
    };

    // Emitted by any builder widget when the user clicks "Chart".
    // Bound chart widgets refetch on receipt.
    'seasonality:expression-loaded': {
        expression: string;
        sourceWidgetId: string;
        groupId: string;
    };

    // Emitted after a watchlist item is added or a list is mutated.
    // SeasonalityWatchlistWidget instances re-fetch on receipt.
    'seasonality:watchlist-changed': {
        watchlistId: string;
    };

    // ── Generic quick-view event ──────────────────────────────────────────────
    // Any widget can pop open the QuickViewChartModal for ANY chart kind.
    // `kind` selects which renderer in the modal's registry handles it
    // (default registry covers seasonality; other domains register their own).
    // The remaining payload is opaque to the bus — kind-specific.
    'chart:quick-view': {
        kind: string;
        title?: string;
        // Renderer-specific extras. Typed as `unknown` rather than `any` so
        // each renderer narrows it at the call site.
        [key: string]: unknown;
    };

    // ── Generic platform navigation event (plan §5.1) ─────────────────────────
    // Any widget can request a dashboard/tab change; the end-user panel
    // root listener calls the router and dashboardStateStore.
    'dashboard:navigate-to': {
        dashboardId: string;
        tabId?: string;
        initialState?: Record<string, unknown>;
    };
}

export type WidgetEventType =
keyof WidgetEventMap;

// ─── WIDGET_EVENTS constant (maps readable names → typed keys) ────────────────

export const WIDGET_EVENTS = {
    LIMIT_REQUEST_SUBMITTED:    'trader-limits:request-submitted',
    LIMIT_REQUEST_APPROVED:     'trader-limits:request-approved',
    LIMIT_REQUEST_REJECTED:     'trader-limits:request-rejected',
    LIMIT_REQUEST_ACKNOWLEDGED: 'trader-limits:request-acknowledged',

    // Seasonality
    SEASONALITY_OPEN_IN_BUILDER:   'seasonality:open-in-builder',
    SEASONALITY_EXPRESSION_LOADED: 'seasonality:expression-loaded',
    SEASONALITY_WATCHLIST_CHANGED: 'seasonality:watchlist-changed',

    // Generic platform
    CHART_QUICK_VIEW:              'chart:quick-view',
    DASHBOARD_NAVIGATE_TO:         'dashboard:navigate-to',
} as const satisfies Record<string, WidgetEventType>;

// ─── Bus implementation ───────────────────────────────────────────────────────

type Callback<T extends WidgetEventType> = (payload: WidgetEventMap[T]) => void;

const subscribers = new Map<WidgetEventType, Set<Callback<any>>>();

export const widgetEventBus = {
    emit<T extends WidgetEventType>(eventType: T, payload: WidgetEventMap[T]): void {
        subscribers.get(eventType)?.forEach((cb) => {
            try {
                cb(payload);
            } catch (e) {
                console.error(`[widgetEventBus] handler error for "${eventType}"`, e);
            }
        });
    },

    subscribe<T extends WidgetEventType>(
        eventType: T,
        callback: Callback<T>
    ): () => void {
        if (!subscribers.has(eventType)) {
            subscribers.set(eventType, new Set());
        }
        subscribers.get(eventType)!.add(callback);
        return () => subscribers.get(eventType)?.delete(callback);
    },
};