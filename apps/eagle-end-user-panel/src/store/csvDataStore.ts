/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { FormulaStep } from "@/lib/formulaEngine";

export interface CsvDataset {
    id: string;
    name: string;
    headers: string[];
    rows: Record<string, any>[];
    uploadedAt: number;
    sizeBytes: number;
    /** Formula definitions saved by the user for this dataset — reloaded each time. */
    savedFormulas: FormulaStep[];
}

interface CsvDataState {
    datasets: Record<string, CsvDataset>;
    addDataset: (dataset: CsvDataset) => void;
    removeDataset: (id: string) => void;
    getDataset: (id: string) => CsvDataset | undefined;
    saveFormulas: (id: string, steps: FormulaStep[]) => void;
}

export const useCsvDataStore = create<CsvDataState>()(
    persist(
        (set, get) => ({
            datasets: {},

            addDataset: (dataset) =>
                set((state) => ({
                    datasets: {
                        ...state.datasets,
                        [dataset.id]: { savedFormulas: [], ...dataset },
                    },
                })),

            removeDataset: (id) =>
                set((state) => {
                    const next = { ...state.datasets };
                    delete next[id];
                    return { datasets: next };
                }),

            getDataset: (id) => get().datasets[id],

            saveFormulas: (id, steps) =>
                set((state) => {
                    const existing = state.datasets[id];
                    if (!existing) return state;
                    return {
                        datasets: {
                            ...state.datasets,
                            [id]: { ...existing, savedFormulas: steps },
                        },
                    };
                }),
        }),
        {
            name: "eagle-csv-datasets",
            storage: createJSONStorage(() => localStorage),
        }
    )
);
