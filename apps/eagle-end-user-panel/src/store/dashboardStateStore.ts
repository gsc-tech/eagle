import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { LayoutItem } from "@/components/dashboard-renderer/types";
import { GRID_COLS } from "@/components/dashboard-renderer/types";
import { findBestFitPosition } from "@gsc-tech/eagle-widget-library";
import type { AddWidgetTarget } from "@gsc-tech/eagle-widget-library";

interface DashboardState {
    /** dashboardId -> activeTabId */
    activeTabIds: Record<string, string>;
    /** dashboardId -> tabId -> layout */
    layouts: Record<string, Record<string, LayoutItem[]>>;
    /** dashboardId -> widgetId -> state */
    widgetStates: Record<string, Record<string, any>>;

    setActiveTabId: (dashboardId: string, tabId: string) => void;
    setTabLayouts: (dashboardId: string, layouts: Record<string, LayoutItem[]>) => void;
    updateTabLayout: (dashboardId: string, tabId: string, layout: LayoutItem[]) => void;
    setWidgetState: (dashboardId: string, widgetId: string, state: any) => void;
    getDashboardState: (dashboardId: string) => {
        activeTabId: string | null;
        layouts: Record<string, LayoutItem[]>;
        widgetStates: Record<string, any>;
    };
    clearDashboardState: (dashboardId: string) => void;
    /**
     * Adds a widget to a dashboard tab using findBestFitPosition to avoid overlap.
     * Updates persisted store state; callers are responsible for syncing local UI state.
     */
    addItem: (target: AddWidgetTarget) => LayoutItem;
    /**
     * Instantiates a pre-built dashboard template for the current user.
     * Stub — implemented in T7.1 when template infrastructure exists.
     */
    instantiateTemplate: (templateId: string) => void;
}

export const useDashboardStateStore = create<DashboardState>()(
    persist(
        (set, get) => ({
            activeTabIds: {},
            layouts: {},
            widgetStates: {},

            setActiveTabId: (dashboardId, tabId) =>
                set((state) => ({
                    activeTabIds: { ...state.activeTabIds, [dashboardId]: tabId },
                })),

            setTabLayouts: (dashboardId, layouts) =>
                set((state) => ({
                    layouts: { ...state.layouts, [dashboardId]: layouts },
                })),

            updateTabLayout: (dashboardId, tabId, layout) =>
                set((state) => ({
                    layouts: {
                        ...state.layouts,
                        [dashboardId]: {
                            ...(state.layouts[dashboardId] || {}),
                            [tabId]: layout,
                        },
                    },
                })),

            setWidgetState: (dashboardId, widgetId, widgetState) =>
                set((state) => ({
                    widgetStates: {
                        ...state.widgetStates,
                        [dashboardId]: {
                            ...(state.widgetStates[dashboardId] || {}),
                            [widgetId]: widgetState,
                        },
                    },
                })),

            getDashboardState: (dashboardId) => ({
                activeTabId: get().activeTabIds[dashboardId] || null,
                layouts: get().layouts[dashboardId] || {},
                widgetStates: get().widgetStates[dashboardId] || {},
            }),

            clearDashboardState: (dashboardId) =>
                set((state) => {
                    const newActiveTabIds = { ...state.activeTabIds };
                    const newLayouts = { ...state.layouts };
                    const newWidgetStates = { ...state.widgetStates };
                    delete newActiveTabIds[dashboardId];
                    delete newLayouts[dashboardId];
                    delete newWidgetStates[dashboardId];
                    return {
                        activeTabIds: newActiveTabIds,
                        layouts: newLayouts,
                        widgetStates: newWidgetStates,
                    };
                }),

            addItem: (target) => {
                const { dashboardId, tabId, widget } = target;
                const currentLayout = get().layouts[dashboardId]?.[tabId] || [];
                const { w, h } = widget.suggestedSize ?? { w: 3, h: 4 };
                const { x, y } = findBestFitPosition(currentLayout, w, h, GRID_COLS);
                const newItem: LayoutItem = {
                    i: `user-widget-${Date.now()}`,
                    x, y, w, h,
                    widget: {
                        componentName: widget.componentName,
                        defaultProps: { ...widget.defaultProps, userAdded: true },
                    },
                };
                set((state) => ({
                    layouts: {
                        ...state.layouts,
                        [dashboardId]: {
                            ...(state.layouts[dashboardId] || {}),
                            [tabId]: [...currentLayout, newItem],
                        },
                    },
                }));
                return newItem;
            },

            instantiateTemplate: (_templateId) => {
                // Stub — implemented in T7.1 when template infrastructure exists.
                console.warn('[dashboardStateStore] instantiateTemplate: not yet implemented');
            },
        }),
        {
            name: "eagle-dashboard-state",
            storage: createJSONStorage(() => localStorage),
        }
    )
);
