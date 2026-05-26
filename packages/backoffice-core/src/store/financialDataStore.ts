import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { GroupId, GROUP_IDS } from "./groups";

export interface Stats {
  winPercentage: number;
  avgWinDay: number;
  avgLossDay: number;
  profitFactorDay: number;
  avgWinWeek: number;
  avgLossWeek: number;
  profitFactorWeek: number;
}

interface FinancialDataStore {
  dailyData: any[];
  weeklyData: any[];
  monthlyData: any[];
  overallStatistics: Stats | null;
  kpis: any[];
  setFinancialData: (data: any) => void;
  clearFinancialData: () => void;
}

export const useFinancialDataStore = create<FinancialDataStore>()(
  devtools(
    (set) => ({
      dailyData: [],
      weeklyData: [],
      monthlyData: [],
      overallStatistics: null,
      kpis: [],
      setFinancialData: (data) =>
        set({
          dailyData: data.dailyFinancialStatement.reverse(),
          weeklyData: data.weeklyFinancialStatement.reverse(),
          monthlyData: data.monthlyFinancialStatement.reverse(),
          overallStatistics: data.overallStatistics,
          kpis: data.kpi,
        }),
      clearFinancialData: () =>
        set({
          dailyData: [],
          weeklyData: [],
          monthlyData: [],
          overallStatistics: null,
          kpis: [],
        }),
    }),
    { name: "useFinancialDataStore" },
  ),
);

export const useJournalFinancialDataStore = create<FinancialDataStore>()(
  devtools(
    (set) => ({
      dailyData: [],
      weeklyData: [],
      monthlyData: [],
      overallStatistics: null,
      kpis: [],
      setFinancialData: (data) =>
        set({
          dailyData: data.dailyFinancialStatement.reverse(),
          weeklyData: data.weeklyFinancialStatement.reverse(),
          monthlyData: data.monthlyFinancialStatement.reverse(),
          overallStatistics: data.overallStatistics,
          kpis: data.kpi,
        }),
      clearFinancialData: () =>
        set({
          dailyData: [],
          weeklyData: [],
          monthlyData: [],
          overallStatistics: null,
          kpis: [],
        }),
    }),
    { name: "useJournalFinancialDataStore" },
  ),
);

export type FinancialSlice = {
  dailyData: any[];
  weeklyData: any[];
  monthlyData: any[];
  overallStatistics: any;
  kpis: any[];
};

type DeepAnalysisFinancialStore = {
  data: Record<GroupId, FinancialSlice>;
  setFinancialData: (group: GroupId, apiData: any) => void;
  setFinancialSlice: (group: GroupId, slice: FinancialSlice) => void;
  clearFinancialData: (group?: GroupId) => void;
};

const emptyFinancialSlice = (): FinancialSlice => ({
  dailyData: [],
  weeklyData: [],
  monthlyData: [],
  overallStatistics: null,
  kpis: [],
});

const initialFinancialData = (): Record<GroupId, FinancialSlice> =>
  Object.fromEntries(
    GROUP_IDS.map((id) => [id, emptyFinancialSlice()]),
  ) as Record<GroupId, FinancialSlice>;

export const useDeepAnalysisFinancialDataStore =
  create<DeepAnalysisFinancialStore>()(
    devtools(
      (set) => ({
        data: initialFinancialData(),

        setFinancialData: (group, apiData) =>
          set(
            (state) => ({
              data: {
                ...state.data,
                [group]: {
                  dailyData: apiData.dailyFinancialStatement.reverse(),
                  weeklyData: apiData.weeklyFinancialStatement.reverse(),
                  monthlyData: apiData.monthlyFinancialStatement.reverse(),
                  overallStatistics: apiData.overallStatistics,
                  kpis: apiData.kpi,
                },
              },
            }),
            false,
            "deepAnalysisFinancial/setFinancialData",
          ),

        setFinancialSlice: (group, slice) =>
          set(
            (state) => ({ data: { ...state.data, [group]: slice } }),
            false,
            "deepAnalysisFinancial/setFinancialSlice",
          ),

        clearFinancialData: (group) =>
          set(
            (state) => {
              if (group === undefined) {
                return {
                  data: Object.fromEntries(
                    Object.keys(state.data).map((k) => [
                      k,
                      emptyFinancialSlice(),
                    ]),
                  ) as Record<GroupId, FinancialSlice>,
                };
              }
              return { data: { ...state.data, [group]: emptyFinancialSlice() } };
            },
            false,
            "deepAnalysisFinancial/clearFinancialData",
          ),
      }),
      { name: "useDeepAnalysisFinancialDataStore" },
    ),
  );
