// Re-exported from backoffice-core so the widget library and app-level code
// share the same store singleton.
export {
  useFinancialTradingAccountsStore,
  type TradingAccount,
} from "@gsc-tech/backoffice-core";

// App-local variants (not consumed by widgets).
import { create } from "zustand";
import { devtools } from "zustand/middleware";

interface TradingAccountsStore {
  tradingAccounts: any[];
  selectedAccounts: string[];
  setTradingAccounts: (accounts: any[]) => void;
  setSelectedAccounts: (accounts: string[]) => void;
}

function makeStore(name: string) {
  return create<TradingAccountsStore>()(
    devtools(
      (set) => ({
        tradingAccounts: [],
        selectedAccounts: [],
        setTradingAccounts: (tradingAccounts) => set({ tradingAccounts }),
        setSelectedAccounts: (selectedAccounts) => set({ selectedAccounts }),
      }),
      { name },
    ),
  );
}

export const useProductWiseTradingAccountsStore = makeStore("useProductWiseTradingAccountsStore");
export const useWeeklyReportTradingAccountsStore = makeStore("useWeeklyReportTradingAccountsStore");
export const useManualAdjustmentTradingAccountsStore = makeStore("useManualAdjustmentTradingAccountsStore");
export const useJournalTradingAccountsStore = makeStore("useJournalTradingAccountsStore");

// Deep-analysis variant: per-group account selection (groups A/B/C/D)
type GroupId = "A" | "B" | "C" | "D";
const GROUP_IDS: GroupId[] = ["A", "B", "C", "D"];

type DeepAnalysisTradingAccountsStore = {
  tradingAccounts: any[];
  selectedAccounts: Record<GroupId, string[]>;
  setTradingAccounts: (accounts: any[]) => void;
  setSelectedAccounts: (group: GroupId, accounts: string[]) => void;
};

const initialSelectedAccounts = (): Record<GroupId, string[]> =>
  Object.fromEntries(GROUP_IDS.map((id): [GroupId, string[]] => [id, []])) as Record<GroupId, string[]>;

export const useDeepAnalysisTradingAccountsStore = create<DeepAnalysisTradingAccountsStore>()(
  devtools(
    (set) => ({
      tradingAccounts: [],
      selectedAccounts: initialSelectedAccounts(),
      setTradingAccounts: (accounts) =>
        set(() => ({ tradingAccounts: accounts }), false, "deepAnalysisTradingAccounts/setTradingAccounts"),
      setSelectedAccounts: (group, accounts) =>
        set(
          (state) => ({ selectedAccounts: { ...state.selectedAccounts, [group]: accounts } }),
          false,
          "deepAnalysisTradingAccounts/setSelectedAccounts",
        ),
    }),
    { name: "useDeepAnalysisTradingAccountsStore" },
  ),
);
