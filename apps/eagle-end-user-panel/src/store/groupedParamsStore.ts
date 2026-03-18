import { create } from "zustand";

/**
 * Zustand store for grouped parameter values shared across all widgets in a dashboard.
 *
 * `groupedParametersValues` is a flat map: groupId → value.
 * Any widget whose parameter carries a `groupId` syncs its value through this store
 * instead of through React prop-drilling.
 */

interface GroupedParamsState {
    /** groupId → current value */
    groupedParametersValues: Record<string, string>;

    /** Replace one group's value (and propagate to every subscribed widget) */
    setGroupValue: (groupId: string, value: string) => void;

    /** Merge in a full new values map (used for bulk updates) */
    mergeGroupValues: (values: Record<string, string>) => void;

    /** Clear all grouped parameter state (e.g. when switching dashboards) */
    reset: () => void;
}

export const useGroupedParamsStore = create<GroupedParamsState>((set) => ({
    groupedParametersValues: {},

    setGroupValue: (groupId, value) =>
        set((state) => ({
            groupedParametersValues: {
                ...state.groupedParametersValues,
                [groupId]: value,
            },
        })),

    mergeGroupValues: (values) =>
        set((state) => ({
            groupedParametersValues: {
                ...state.groupedParametersValues,
                ...values,
            },
        })),

    reset: () => set({ groupedParametersValues: {} }),
}));
