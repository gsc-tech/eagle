import { create } from "zustand";
import { devtools } from "zustand/middleware";

export interface TradingAccount {
  nickname: string;
  /** The account identifier sent as `accountId` in API payloads (maps to BackOffice's `accountName` field). */
  accountName?: string;
  name?: string;
  clearer?: string;
  endDate: string | null;
  team?: string;
  [key: string]: any;
}

interface TradingAccountsStore {
  tradingAccounts: TradingAccount[];
  selectedAccounts: string[];
  setTradingAccounts: (accounts: TradingAccount[]) => void;
  setSelectedAccounts: (accounts: string[]) => void;
}

export const useFinancialTradingAccountsStore = create<TradingAccountsStore>()(
  devtools(
    (set) => ({
      tradingAccounts: [],
      selectedAccounts: [],
      setTradingAccounts: (tradingAccounts) => set({ tradingAccounts }),
      setSelectedAccounts: (selectedAccounts) => set({ selectedAccounts }),
    }),
    { name: "useFinancialTradingAccountsStore" },
  ),
);
