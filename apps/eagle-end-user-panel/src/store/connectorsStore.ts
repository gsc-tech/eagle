import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ConnectorRecord } from "@gsc-tech/eagle-widget-library";
import type { ConnectorType } from "@gsc-tech/eagle-widget-library";

export type { ConnectorRecord };
export type DataConnectorConfig = ConnectorRecord;

export const NATIVE_CONNECTOR_URLS: Record<ConnectorType, string> = {
    marex: `ws://${import.meta.env.VITE_MAREX_WS_URL}/ws`,
    excel: "ws://localhost:8004/ws",
};

interface ConnectorsState {
    connectors: ConnectorRecord[];
    upsertConnector: (config: ConnectorRecord) => void;
    removeConnector: (id: string) => void;
    getByType: (type: ConnectorType) => ConnectorRecord | undefined;
}

export const useConnectorsStore = create<ConnectorsState>()(
    persist(
        (set, get) => ({
            connectors: [],

            upsertConnector: (config) =>
                set((s) => {
                    const exists = s.connectors.some((c) => c.id === config.id);
                    return {
                        connectors: exists
                            ? s.connectors.map((c) => (c.id === config.id ? config : c))
                            : [...s.connectors, config],
                    };
                }),

            removeConnector: (id) =>
                set((s) => ({
                    connectors: s.connectors.filter((c) => c.id !== id),
                })),

            getByType: (type) => get().connectors.find((c) => c.type === type),
        }),
        { name: "eagle-data-connectors" }
    )
);
