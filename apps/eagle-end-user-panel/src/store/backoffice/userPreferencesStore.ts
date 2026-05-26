import { create } from "zustand";
import { devtools } from "zustand/middleware";

interface UserPreferencesStore {
  tableTotalOrAvgFooter: string;
  aggregateAccounts: boolean;
  aggregateProducts: boolean;
  showSum: boolean;
  setTableTotalOrAvgFooter: (tableTotalOrAvgFooter: string) => void;
  setAggregateAccounts: (aggregateAccounts: boolean) => void;
  setAggregateProducts: (aggregateProducts: boolean) => void;
  setShowSum: (showSum: boolean) => void;
}

export const useUserPreferencesStore = create<UserPreferencesStore>()(
  devtools((set) => ({
    showSum: true,
    tableTotalOrAvgFooter: "Total",
    aggregateAccounts: false,
    aggregateProducts: false,
    setTableTotalOrAvgFooter: (tableTotalOrAvgFooter) => set({ tableTotalOrAvgFooter }),
    setAggregateAccounts: (aggregateAccounts) => set({ aggregateAccounts }),
    setAggregateProducts: (aggregateProducts) => set({ aggregateProducts }),
    setShowSum: (showSum) => set({ showSum }),
  }))
);
