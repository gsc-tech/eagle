import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/**
 * Zustand store for grouped parameter values shared across all widgets in a dashboard.
 * ...
 */

interface GroupedParamsState {
    /** dashboardId → groupId → current value */
    groupedParametersValues: Record<string, Record<string, string>>;

    /** Replace one group's value for a specific dashboard */
    setGroupValue: (dashboardId: string, groupId: string, value: string) => void;

    /** Merge new values for a dashboard */
    mergeGroupValues: (dashboardId: string, values: Record<string, string>) => void;

    /** Clear grouped parameter state for a specific dashboard */
    clearDashboardGroups: (dashboardId: string) => void;
}

export const useGroupedParamsStore = create<GroupedParamsState>()(
    persist(
        (set) => ({
            groupedParametersValues: {},

            setGroupValue: (dashboardId, groupId, value) =>
                set((state) => ({
                    groupedParametersValues: {
                        ...state.groupedParametersValues,
                        [dashboardId]: {
                            ...(state.groupedParametersValues[dashboardId] || {}),
                            [groupId]: value,
                        },
                    },
                })),

            mergeGroupValues: (dashboardId, values) =>
                set((state) => ({
                    groupedParametersValues: {
                        ...state.groupedParametersValues,
                        [dashboardId]: {
                            ...(state.groupedParametersValues[dashboardId] || {}),
                            ...values,
                        },
                    },
                })),

            clearDashboardGroups: (dashboardId) =>
                set((state) => {
                    const newValues = { ...state.groupedParametersValues };
                    delete newValues[dashboardId];
                    return { groupedParametersValues: newValues };
                }),
        }),
        {
            name: "eagle-grouped-params",
            storage: createJSONStorage(() => localStorage),
        }
    )
);
