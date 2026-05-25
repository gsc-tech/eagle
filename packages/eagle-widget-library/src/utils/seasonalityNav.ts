/**
 * Right-click → open-in-builder navigation config (T7.2).
 *
 * The seasonality template was dropped (FALCON_INTEGRATION_TASKS.md T7.1) —
 * operators compose the 5-tab seasonality dashboard themselves. So instead of
 * the navigation handler resolving target dashboard/tab from a baked-in
 * template, the *emitting* widget carries a `SeasonalityNavTargets` config
 * that names the destination dashboard and the per-market tab IDs.
 *
 * `pickSeasonalityTabId` applies the §5.3.1 mapping rules at emit time so the
 * navigation handler can stay a dumb router (just switches dashboard + tab).
 */

import type { Market } from "./seasonality";

/**
 * Per-market tab IDs inside the target seasonality dashboard. `custom` is the
 * required fallback for expressions Falcon's matrix builder can't represent.
 */
export interface SeasonalityNavTargets {
    /** Destination dashboard's ID (the one the operator built). */
    dashboardId: string;
    /** Map from market scope → tabId on the destination dashboard. */
    tabIds: {
        single?: string;
        im1?: string;
        im2?: string;
        im3?: string;
        /** Required — universal fallback per §5.3.1. */
        custom: string;
    };
}

/**
 * Resolve the destination tab ID for a saved expression's market context.
 * Falls back to `tabIds.custom` whenever the matrix-friendly tab isn't
 * configured or the symbolMatrix is missing/invalid.
 */
export function pickSeasonalityTabId(
    targets: SeasonalityNavTargets,
    market: Market,
    symbolMatrix?: unknown[],
): string {
    const { tabIds } = targets;
    const hasMatrix = Array.isArray(symbolMatrix) && symbolMatrix.length > 0;
    switch (market) {
        case "Single Market": return tabIds.single ?? tabIds.custom;
        case "Intermarket 1": return hasMatrix && tabIds.im1 ? tabIds.im1 : tabIds.custom;
        case "Intermarket 2": return hasMatrix && tabIds.im2 ? tabIds.im2 : tabIds.custom;
        case "Intermarket 3": return hasMatrix && tabIds.im3 ? tabIds.im3 : tabIds.custom;
        case "Custom":        return tabIds.custom;
        default:              return tabIds.custom;
    }
}