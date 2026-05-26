// Re-exported from backoffice-core so the widget library and app-level code
// share the same store singleton.
export {
  useFinancialTimeInputStore,
  type DateRange,
} from "@gsc-tech/backoffice-core";

// Product-wise and fills variants remain app-local (not consumed by widgets).
import dayjs from "dayjs";
import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { DateRange } from "@gsc-tech/backoffice-core";

interface TimeInputStore {
  date: DateRange;
  selectedWeeks: string[];
  selectedMonths: string[];
  selectedYears: string[];
  setDate: (date: DateRange) => void;
  setSelectedWeeks: (vals: string[]) => void;
  setSelectedMonths: (vals: string[]) => void;
  setSelectedYears: (vals: string[]) => void;
  resetTimeFilters: () => void;
}

function makeTimeStore(name: string) {
  return create<TimeInputStore>()(
    devtools(
      (set) => ({
        date: { from: null, to: null },
        selectedWeeks: [],
        selectedMonths: [],
        selectedYears: [dayjs().format("YYYY")],
        setDate: (date) => set({ date }),
        setSelectedWeeks: (selectedWeeks) => set({ selectedWeeks }),
        setSelectedMonths: (selectedMonths) => set({ selectedMonths }),
        setSelectedYears: (selectedYears) => set({ selectedYears }),
        resetTimeFilters: () => set({ selectedYears: [], selectedMonths: [], selectedWeeks: [] }),
      }),
      { name },
    ),
  );
}

export const useProductWiseTimeInputStore = makeTimeStore("useProductWiseTimeInputStore");
export const useFillsTimeInputStore = makeTimeStore("useFillsTimeInputStore");
