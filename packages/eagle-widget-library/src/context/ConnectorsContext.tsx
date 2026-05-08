import { createContext, useContext } from "react";
import type { ConnectorRecord } from "../types";

const ConnectorsContext = createContext<ConnectorRecord[]>([]);

export function ConnectorsProvider({
    connectors,
    children,
}: {
    connectors: ConnectorRecord[];
    children: React.ReactNode;
}) {
    return (
        <ConnectorsContext.Provider value={connectors}>
            {children}
        </ConnectorsContext.Provider>
    );
}

export function useConnectors(): ConnectorRecord[] {
    return useContext(ConnectorsContext);
}
