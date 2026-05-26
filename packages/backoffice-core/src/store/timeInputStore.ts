import dayjs, { Dayjs } from "dayjs";
import { create } from "zustand";
import { devtools } from "zustand/middleware";

export interface DateRange {
  from: Dayjs | null;
  to: Dayjs | null;
}

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

export const useFinancialTimeInputStore = create<TimeInputStore>()(
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
    { name: "useFinancialTimeInputStore" },
  ),
);
