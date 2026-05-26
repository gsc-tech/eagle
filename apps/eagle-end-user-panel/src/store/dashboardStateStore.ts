import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { LayoutItem } from "@/components/dashboard-renderer/types";
import type { WidgetConfig } from "@gsc-tech/backoffice-core";

interface DashboardState {
    /** dashboardId -> activeTabId */
    activeTabIds: Record<string, string>;
    /** dashboardId -> tabId -> layout */
    layouts: Record<string, Record<string, LayoutItem[]>>;
    /** dashboardId -> widgetId -> state */
    widgetStates: Record<string, Record<string, any>>;
    /** dashboardId -> widgetId -> WidgetConfig override (for BackOffice v2 widgets) */
    widgetConfigOverrides: Record<string, Record<string, Partial<WidgetConfig>>>;
    /** dashboardId -> widgetId -> arbitrary defaultProps patch (for non-v2 BackOffice widgets) */
    widgetPropsOverrides: Record<string, Record<string, Record<string, any>>>;

    setActiveTabId: (dashboardId: string, tabId: string) => void;
    setTabLayouts: (dashboardId: string, layouts: Record<string, LayoutItem[]>) => void;
    updateTabLayout: (dashboardId: string, tabId: string, layout: LayoutItem[]) => void;
    setWidgetState: (dashboardId: string, widgetId: string, state: any) => void;
    setWidgetConfigOverride: (dashboardId: string, widgetId: string, override: Partial<WidgetConfig>) => void;
    clearWidgetConfigOverride: (dashboardId: string, widgetId: string) => void;
    setWidgetPropsOverride: (dashboardId: string, widgetId: string, override: Record<string, any>) => void;
    clearWidgetPropsOverride: (dashboardId: string, widgetId: string) => void;
    getDashboardState: (dashboardId: string) => {
        activeTabId: string | null;
        layouts: Record<string, LayoutItem[]>;
        widgetStates: Record<string, any>;
        widgetConfigOverrides: Record<string, Partial<WidgetConfig>>;
        widgetPropsOverrides: Record<string, Record<string, any>>;
    };
    clearDashboardState: (dashboardId: string) => void;
}

export const useDashboardStateStore = create<DashboardState>()(
    persist(
        (set, get) => ({
            activeTabIds: {},
            layouts: {},
            widgetStates: {},
            widgetConfigOverrides: {},
            widgetPropsOverrides: {},

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

            setWidgetConfigOverride: (dashboardId, widgetId, override) =>
                set((state) => ({
                    widgetConfigOverrides: {
                        ...state.widgetConfigOverrides,
                        [dashboardId]: {
                            ...(state.widgetConfigOverrides[dashboardId] || {}),
                            [widgetId]: override,
                        },
                    },
                })),

            clearWidgetConfigOverride: (dashboardId, widgetId) =>
                set((state) => {
                    const perDash = { ...(state.widgetConfigOverrides[dashboardId] || {}) };
                    delete perDash[widgetId];
                    return {
                        widgetConfigOverrides: {
                            ...state.widgetConfigOverrides,
                            [dashboardId]: perDash,
                        },
                    };
                }),

            setWidgetPropsOverride: (dashboardId, widgetId, override) =>
                set((state) => ({
                    widgetPropsOverrides: {
                        ...state.widgetPropsOverrides,
                        [dashboardId]: {
                            ...(state.widgetPropsOverrides[dashboardId] || {}),
                            [widgetId]: override,
                        },
                    },
                })),

            clearWidgetPropsOverride: (dashboardId, widgetId) =>
                set((state) => {
                    const perDash = { ...(state.widgetPropsOverrides[dashboardId] || {}) };
                    delete perDash[widgetId];
                    return {
                        widgetPropsOverrides: {
                            ...state.widgetPropsOverrides,
                            [dashboardId]: perDash,
                        },
                    };
                }),

            getDashboardState: (dashboardId) => ({
                activeTabId: get().activeTabIds[dashboardId] || null,
                layouts: get().layouts[dashboardId] || {},
                widgetStates: get().widgetStates[dashboardId] || {},
                widgetConfigOverrides: get().widgetConfigOverrides[dashboardId] || {},
                widgetPropsOverrides: get().widgetPropsOverrides[dashboardId] || {},
            }),

            clearDashboardState: (dashboardId) =>
                set((state) => {
                    const newActiveTabIds = { ...state.activeTabIds };
                    const newLayouts = { ...state.layouts };
                    const newWidgetStates = { ...state.widgetStates };
                    const newOverrides = { ...state.widgetConfigOverrides };
                    const newPropsOverrides = { ...state.widgetPropsOverrides };
                    delete newActiveTabIds[dashboardId];
                    delete newLayouts[dashboardId];
                    delete newWidgetStates[dashboardId];
                    delete newOverrides[dashboardId];
                    delete newPropsOverrides[dashboardId];
                    return {
                        activeTabIds: newActiveTabIds,
                        layouts: newLayouts,
                        widgetStates: newWidgetStates,
                        widgetConfigOverrides: newOverrides,
                        widgetPropsOverrides: newPropsOverrides,
                    };
                }),
        }),
        {
            name: "eagle-dashboard-state",
            storage: createJSONStorage(() => localStorage),
        }
    )
);
