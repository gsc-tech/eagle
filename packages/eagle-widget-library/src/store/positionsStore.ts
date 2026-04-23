import { create } from "zustand";

export interface PositionsState {
    /** Aggregated Marex positions across all accounts: product → contractLabel → quantity */
    marex: Record<string, Record<string, number>>;
    /** Aggregated Excel positions across all accounts: product → contractLabel → quantity */
    excel: Record<string, Record<string, number>>;

    /** Per-account Marex positions: accountId → product → contractLabel → quantity */
    marexByAccount: Record<string, Record<string, Record<string, number>>>;
    /** Per-account Excel positions: accountId → product → contractLabel → quantity */
    excelByAccount: Record<string, Record<string, Record<string, number>>>;

    setMarexForProduct: (product: string, updates: Record<string, number>) => void;
    setExcelForProduct: (product: string, updates: Record<string, number>) => void;

    /** Bulk-replace all Marex positions at once (full snapshot update). */
    setAllMarex: (positions: Record<string, Record<string, number>>) => void;
    /** Bulk-replace all Excel positions at once (full snapshot update). */
    setAllExcel: (positions: Record<string, Record<string, number>>) => void;

    /**
     * Store positions for a specific account and recompute the aggregated total for that product.
     * The aggregated marex/excel maps are always the sum across all accounts.
     */
    setMarexForAccount: (accountId: string, product: string, updates: Record<string, number>) => void;
    setExcelForAccount: (accountId: string, product: string, updates: Record<string, number>) => void;

    /**
     * Returns the Marex and Excel position for a given symbol + contractLabel.
     * contractLabel is the human-readable form used in positionsStore keys, e.g. "MAR26".
     *
     * NOTE: Marex and Excel represent the same underlying net position from different risk
     * systems. Do NOT sum them — use coalesce: take Marex if non-zero, else Excel.
     * `active` is the best single value to use for display/alerting.
     */
    getPosition: (symbol: string, label: string) => { marex: number; excel: number; active: number };

    /** Returns the position for a specific account. */
    getPositionByAccount: (accountId: string, symbol: string, label: string) => { marex: number; excel: number; active: number };

    /** Returns sorted list of all account IDs that have reported positions. */
    getAccountIds: () => string[];

    reset: () => void;
}

function sumAcrossAccounts(
    byAccount: Record<string, Record<string, Record<string, number>>>,
    product: string
): Record<string, number> {
    const result: Record<string, number> = {};
    for (const acctData of Object.values(byAccount)) {
        for (const [label, qty] of Object.entries(acctData[product] ?? {})) {
            result[label] = (result[label] ?? 0) + qty;
        }
    }
    return result;
}

export const usePositionsStore = create<PositionsState>((set, get) => ({
    marex: {},
    excel: {},
    marexByAccount: {},
    excelByAccount: {},

    setMarexForProduct: (product, updates) =>
        set((s) => ({
            marex: {
                ...s.marex,
                [product]: { ...(s.marex[product] ?? {}), ...updates },
            },
        })),

    setExcelForProduct: (product, updates) =>
        set((s) => ({
            excel: {
                ...s.excel,
                [product]: { ...(s.excel[product] ?? {}), ...updates },
            },
        })),

    setAllMarex: (positions) => set({ marex: positions }),
    setAllExcel: (positions) => set({ excel: positions }),

    setMarexForAccount: (accountId, product, updates) =>
        set((s) => {
            const newMarexByAccount = {
                ...s.marexByAccount,
                [accountId]: {
                    ...(s.marexByAccount[accountId] ?? {}),
                    [product]: {
                        ...(s.marexByAccount[accountId]?.[product] ?? {}),
                        ...updates,
                    },
                },
            };
            return {
                marexByAccount: newMarexByAccount,
                marex: {
                    ...s.marex,
                    [product]: sumAcrossAccounts(newMarexByAccount, product),
                },
            };
        }),

    setExcelForAccount: (accountId, product, updates) =>
        set((s) => {
            const newExcelByAccount = {
                ...s.excelByAccount,
                [accountId]: {
                    ...(s.excelByAccount[accountId] ?? {}),
                    [product]: {
                        ...(s.excelByAccount[accountId]?.[product] ?? {}),
                        ...updates,
                    },
                },
            };
            return {
                excelByAccount: newExcelByAccount,
                excel: {
                    ...s.excel,
                    [product]: sumAcrossAccounts(newExcelByAccount, product),
                },
            };
        }),

    getPosition: (symbol, label) => {
        const { marex, excel } = get();
        const m = marex[symbol]?.[label] ?? 0;
        const e = excel[symbol]?.[label] ?? 0;
        // Coalesce: Marex and Excel represent the same net position from different systems.
        // Prefer Marex when available; fall back to Excel. Never sum.
        const active = e !== 0 ? e : m;
        return { marex: m, excel: e, active };
    },

    getPositionByAccount: (accountId, symbol, label) => {
        const { marexByAccount, excelByAccount } = get();
        const m = marexByAccount[accountId]?.[symbol]?.[label] ?? 0;
        const e = excelByAccount[accountId]?.[symbol]?.[label] ?? 0;
        const active = e !== 0 ? e : m;
        return { marex: m, excel: e, active };
    },

    getAccountIds: () => {
        const { marexByAccount, excelByAccount } = get();
        const ids = new Set([
            ...Object.keys(marexByAccount),
            ...Object.keys(excelByAccount),
        ]);
        return Array.from(ids).sort();
    },

    reset: () => set({ marex: {}, excel: {}, marexByAccount: {}, excelByAccount: {} }),
}));
