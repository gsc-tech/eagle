import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ConnectorType } from "@gsc-tech/eagle-widget-library";

export interface DataConnectorConfig {
    id: string;
    type: ConnectorType;
    name: string;
    wsUrl: string;
    accountId: string;
}

interface ConnectorsState {
    connectors: DataConnectorConfig[];
    upsertConnector: (config: DataConnectorConfig) => void;
    removeConnector: (id: string) => void;
    getByType: (type: ConnectorType) => DataConnectorConfig | undefined;
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