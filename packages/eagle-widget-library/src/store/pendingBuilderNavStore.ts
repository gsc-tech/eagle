/**
 * Holds the last `seasonality:open-in-builder` payload dispatched by the
 * navigation hook. Because the destination tab's DashboardCanvas is remounted
 * on tab switch (keyed by dashboardId+tabId), the builder widget won't exist
 * as a subscriber yet when the 80ms re-emit fires. The builder reads this store
 * on mount and clears it so only the first builder to mount claims the payload.
 */

import { create } from "zustand";
import type { SeasonalityMarket } from "./seasonalityWatchlistStore";
import type { AlertOverlayMarker, SymbolMatrix } from "../utils/seasonality";

export interface PendingBuilderNav {
    expression: string;
    market: SeasonalityMarket;
    symbolMatrix?: SymbolMatrix[];
    overlayMarkers?: AlertOverlayMarker[];
}

interface PendingBuilderNavState {
    pending: PendingBuilderNav | null;
    set: (p: PendingBuilderNav) => void;
    clear: () => void;
}

export const usePendingBuilderNavStore = create<PendingBuilderNavState>((set) => ({
    pending: null,
    set: (p) => set({ pending: p }),
    clear: () => set({ pending: null }),
}));
