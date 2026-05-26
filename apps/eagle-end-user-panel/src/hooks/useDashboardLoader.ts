import { useDashboardStateStore } from "@/store/dashboardStateStore";
import type { LayoutItem } from "@/components/dashboard-renderer/types";
import type { Tab } from "@/pages/home";
import { BACKOFFICE_PRESET_ID } from "@/presets/backofficePresetDashboard";

function parseBackendTabs(publishedLayout: any): Tab[] {
    if (publishedLayout?.tabs && Array.isArray(publishedLayout.tabs)) {
        return publishedLayout.tabs;
    }
    return [{ id: "default", title: "Main", layout: [] }];
}

function isUserAdded(item: LayoutItem): boolean {
    return Boolean(item.widget?.defaultProps?.localDataConfig);
}

/**
 * Merges stored (user-positioned) layout with the authoritative backend layout.
 *
 * Rules:
 * - If the backend added/removed widgets, stored positions are discarded and
 *   the backend layout wins (user-added CSV widgets are carried over).
 * - If the widget set matches, stored x/y/w/h is applied on top of backend config
 *   so users keep their positions across page reloads.
 */
export function useDashboardLoader() {
    const getDashboardState  = useDashboardStateStore((s) => s.getDashboardState);
    const setStoredTabLayouts = useDashboardStateStore((s) => s.setTabLayouts);

    function loadDashboard(dashboardID: string, publishedLayout: any): {
        tabs: Tab[];
        activeTabId: string | null;
    } {
        const backendTabs = parseBackendTabs(publishedLayout);
        const stored = getDashboardState(dashboardID);

        // ── First-time load ───────────────────────────────────────────────────
        if (!stored.layouts || Object.keys(stored.layouts).length === 0) {
            const layoutsMap: Record<string, LayoutItem[]> = {};
            backendTabs.forEach((t) => { layoutsMap[t.id] = t.layout; });
            setStoredTabLayouts(dashboardID, layoutsMap);
            return { tabs: backendTabs, activeTabId: backendTabs[0]?.id ?? null };
        }

        // ── Check if backend changed since last visit ─────────────────────────
        const storedTabIds  = Object.keys(stored.layouts);
        const backendTabIds = backendTabs.map((t) => t.id);

        const tabsMatch = storedTabIds.length === backendTabIds.length &&
            storedTabIds.every((id) => backendTabIds.includes(id));

        let widgetsMatch = true;
        if (tabsMatch && backendTabs.length > 0) {
            const firstTabId     = backendTabs[0].id;
            const backendWidgets = backendTabs[0].layout.map((l) => l.i).sort().join(",");
            const storedWidgets  = (stored.layouts[firstTabId] || [])
                .filter((l) => !isUserAdded(l))
                .map((l) => l.i).sort().join(",");
            if (backendWidgets !== storedWidgets) {
            // For the preset the published layout never changes, so a stored subset
            // just means the user intentionally removed some widgets — not a reset.
            if (dashboardID === BACKOFFICE_PRESET_ID) {
                const storedIds = storedWidgets.split(",").filter(Boolean);
                const backendSet = new Set(backendWidgets.split(",").filter(Boolean));
                if (!storedIds.every((id) => backendSet.has(id))) widgetsMatch = false;
            } else {
                widgetsMatch = false;
            }
        }
        }

        // ── Backend changed: reset positions, carry over user-added widgets ───
        if (!tabsMatch || !widgetsMatch) {
            console.log("[Eagle] Dashboard changed in dev console — resetting stored positions.");
            const layoutsMap: Record<string, LayoutItem[]> = {};
            backendTabs.forEach((t) => {
                const userAdded = (stored.layouts[t.id] || []).filter(isUserAdded);
                layoutsMap[t.id] = [...t.layout, ...userAdded];
            });
            setStoredTabLayouts(dashboardID, layoutsMap);
            return {
                tabs: backendTabs.map((bt) => ({ ...bt, layout: layoutsMap[bt.id] })),
                activeTabId: backendTabs[0]?.id ?? null,
            };
        }

        // ── Same widget set: apply stored positions on top of backend config ──
        const tabs = backendTabs.map((bt) => {
            const storedLayout = stored.layouts[bt.id];
            if (!storedLayout) return bt;

            // For the preset: only render widgets the user still has (respects removals).
            // For regular dashboards: render all backend widgets so newly published ones appear.
            const storedNonUserIds = new Set(
                storedLayout.filter((s) => !isUserAdded(s)).map((s) => s.i)
            );
            const backendSource = dashboardID === BACKOFFICE_PRESET_ID
                ? bt.layout.filter((item) => storedNonUserIds.has(item.i))
                : bt.layout;

            const merged = backendSource.map((backendItem) => {
                const stored = storedLayout.find((s) => s.i === backendItem.i);
                if (!stored) return backendItem;
                return { ...backendItem, x: stored.x, y: stored.y, w: stored.w, h: stored.h };
            });

            // Append user-added widgets that aren't in the backend layout
            storedLayout.filter(isUserAdded).forEach((userItem) => {
                if (!merged.find((m) => m.i === userItem.i)) merged.push(userItem);
            });

            return { ...bt, layout: merged };
        });

        const activeTabId =
            stored.activeTabId && backendTabIds.includes(stored.activeTabId)
                ? stored.activeTabId
                : backendTabs[0]?.id ?? null;

        return { tabs, activeTabId };
    }

    return { loadDashboard };
}
