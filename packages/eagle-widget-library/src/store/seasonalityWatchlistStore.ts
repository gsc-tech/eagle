import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Market, SymbolMatrix } from "../utils/seasonality";
import { falconApiClient } from "../utils/falconApiClient";

// Re-export so consumers can import the canonical type from this store
export type { Market as SeasonalityMarket };

export interface WatchlistMarketConfig {
    market: Market;
    /** Populated for IM1–IM3; absent for Single Market and Custom. */
    symbolMatrix?: SymbolMatrix[];
}

export interface WatchlistItem {
    id: string;
    /** Raw expression string, e.g. "CLH27 + CLJ27". */
    expression: string;
    /** Human-readable label, defaults to expression if not set. */
    altName?: string;
    marketConfig: WatchlistMarketConfig;
    /** Latest close price — populated by the backend, absent until fetched. */
    price?: number;
    /** Percentile rank — populated by the backend. */
    percentile?: number;
    /**
     * Sparkline data — populated by the backend in the watchlist payload
     * (Falcon parity). Time-scale shape: `{x: ISO date | timestamp, y: number}`.
     */
    sparkline?: { x: string | number; y: number }[];
    createdAt: string;
}

export interface Watchlist {
    id: string;
    name: string;
    tags?: string[];
    items: WatchlistItem[];
    createdAt: string;
}

// ─── Store interface ──────────────────────────────────────────────────────────

interface SeasonalityWatchlistState {
    /** Keyed by watchlist id. */
    lists: Record<string, Watchlist>;

    createList: (params: { 
        name: string; 
        tags?: string[];
        initialItem?: Omit<WatchlistItem, "id" | "createdAt">;
    }) => Promise<Watchlist>;

    /**
     * Permanently delete a watchlist and all its items.
     * T1.7: replace stub with DELETE /api/watchlist/deleteEntireWatchlist
     */
    deleteList: (watchlistId: string) => Promise<void>;

    /**
     * Rename a watchlist.
     * T1.7: replace stub with PUT /api/watchlist/renameWatchlist
     */
    renameList: (watchlistId: string, name: string) => Promise<void>;

    /**
     * Append an item to an existing watchlist.
     * T1.7: replace stub with POST /api/watchlist/createWatchlist (add expression)
     */
    addItem: (
        watchlistId: string,
        item: Omit<WatchlistItem, "id" | "createdAt">
    ) => Promise<WatchlistItem>;

    /**
     * Remove a single item from a watchlist.
     * T1.7: replace stub with DELETE /api/watchlist/deleteWatchlist
     */
    removeItem: (watchlistId: string, itemId: string) => Promise<void>;

    /**
     * Replace the full item list (used to sync server order after drag-reorder).
     * T1.7: replace stub with POST /api/watchlist/exprOrder
     */
    reorderItems: (watchlistId: string, orderedItems: WatchlistItem[]) => Promise<void>;

    /**
     * Fetch all watchlists for the current user and hydrate the store.
     * T1.7: replace stub with GET /api/watchlist/readWatchlist
     */
    fetchLists: () => Promise<void>;

    /**
     * Wipe local persisted state. Call on sign-out to prevent a subsequent
     * user from seeing the previous user's watchlists before the first fetch.
     */
    clearPersistedState: () => void;
}

export const positionForMarket = (market: Market): string =>
    market === "Custom"
        ? "Seasonality/Futures/Custom"
        : "Seasonality/Futures/Intermarket";

// ─── Store ────────────────────────────────────────────────────────────────────

export const useSeasonalityWatchlistStore = create<SeasonalityWatchlistState>()(
    persist(
        (set, get) => ({
            lists: {},

            createList: async ({ name, tags, initialItem }) => {
                const expressions = [];
                if (initialItem) {
                    expressions.push({
                        altName: initialItem.expression,
                        name: initialItem.altName ?? initialItem.expression,
                        tags: tags ?? [],
                        data: {
                            inputExpression: initialItem.expression
                        },
                        position: positionForMarket(initialItem.marketConfig.market),
                    });
                }
                const res = await falconApiClient.post<{ watchlist: any }>("/api/watchlist/createWatchlist", {
                    watchlist: { name, expressions }
                });
                const list = res.watchlist;
                const eagleList: Watchlist = {
                    id: list._id,
                    name: list.name,
                    tags: [],
                    items: (list.expressions || []).map((e: any) => ({
                        id: e._id,
                        expression: e.altName,
                        altName: e.name,
                        marketConfig: e.data,
                        price: e.price,
                        percentile: e.percentile,
                        sparkline: e.sparkline,
                        createdAt: new Date().toISOString(),
                    })),
                    createdAt: new Date().toISOString(),
                };
                set((s) => ({ lists: { ...s.lists, [eagleList.id]: eagleList } }));
                return eagleList;
            },

            deleteList: async (watchlistId) => {
                await falconApiClient.delete(`/api/watchlist/deleteEntireWatchlist`, {
                    body: { watchlistId }
                });
                set((s) => {
                    const next = { ...s.lists };
                    delete next[watchlistId];
                    return { lists: next };
                });
            },

            renameList: async (watchlistId, name) => {
                await falconApiClient.put(`/api/watchlist/renameWatchlist`, { watchlistId, name });
                set((s) => {
                    const list = s.lists[watchlistId];
                    if (!list) return s;
                    return { lists: { ...s.lists, [watchlistId]: { ...list, name } } };
                });
            },

            addItem: async (watchlistId, itemData) => {
                const state = get();
                const currentList = state.lists[watchlistId];
                if (!currentList) throw new Error("Watchlist not found");

                const expressionPayload = {
                    altName: itemData.expression,
                    name: itemData.altName ?? itemData.expression,
                    tags: [],
                    data: {
                        inputExpression: itemData.expression
                    },
                    position: positionForMarket(itemData.marketConfig.market),
                };

                const res = await falconApiClient.post<{ watchlist: any }>("/api/watchlist/createWatchlist", {
                    watchlist: {
                        _id: watchlistId,
                        name: currentList.name,
                        expressions: [expressionPayload]
                    }
                });

                const updatedList = res.watchlist;
                const lastFalconItem = updatedList.expressions[updatedList.expressions.length - 1];

                const eagleItem: WatchlistItem = {
                    id: lastFalconItem._id,
                    expression: lastFalconItem.altName,
                    altName: lastFalconItem.name,
                    marketConfig: lastFalconItem.data,
                    price: lastFalconItem.price,
                    percentile: lastFalconItem.percentile,
                    sparkline: lastFalconItem.sparkline,
                    createdAt: new Date().toISOString(),
                };

                set((s) => {
                    const l = s.lists[watchlistId];
                    if (!l) return s;
                    return {
                        lists: {
                            ...s.lists,
                            [watchlistId]: { ...l, items: [...l.items, eagleItem] },
                        },
                    };
                });
                return eagleItem;
            },

            removeItem: async (watchlistId, itemId) => {
                await falconApiClient.delete(`/api/watchlist/deleteWatchlist`, {
                    body: { expressionId: itemId }
                });
                set((s) => {
                    const list = s.lists[watchlistId];
                    if (!list) return s;
                    return {
                        lists: {
                            ...s.lists,
                            [watchlistId]: {
                                ...list,
                                items: list.items.filter((i) => i.id !== itemId),
                            },
                        },
                    };
                });
            },

            reorderItems: async (watchlistId, orderedItems) => {
                const newExpressionsOrder = orderedItems.map(i => ({
                    _id: i.id,
                    name: i.expression,
                    altName: i.altName,
                    data: i.marketConfig,
                    tags: [],
                    position: positionForMarket(i.marketConfig.market)
                }));
                await falconApiClient.post("/api/watchlist/exprOrder", { watchlistId, newExpressionsOrder });
                set((s) => {
                    const list = s.lists[watchlistId];
                    if (!list) return s;
                    return {
                        lists: {
                            ...s.lists,
                            [watchlistId]: { ...list, items: orderedItems },
                        },
                    };
                });
            },

            fetchLists: async () => {
                const res = await falconApiClient.get<{ watchlist: any[] }>("/api/watchlist/readWatchlist");
                const falconLists = res.watchlist ?? [];

                const byId = falconLists.reduce<Record<string, Watchlist>>((acc, l) => {
                    acc[l._id] = {
                        id: l._id,
                        name: l.name,
                        tags: [],
                        items: (l.expressions || []).map((e: any) => ({
                            id: e._id,
                            expression: e.altName,
                            altName: e.name,
                            marketConfig: e.data,
                            price: e.price,
                            percentile: e.percentile,
                            sparkline: e.sparkline,
                            createdAt: new Date().toISOString(),
                        })),
                        createdAt: new Date().toISOString(),
                    };
                    return acc;
                }, {});
                set({ lists: byId });
            },

            clearPersistedState: () => set({ lists: {} }),
        }),
        {
            name: "eagle-seasonality-watchlists",
            storage: createJSONStorage(() => localStorage),
        }
    )
);