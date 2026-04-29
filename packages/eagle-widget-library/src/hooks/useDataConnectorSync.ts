import { useEffect, useRef, useState } from "react";
import { parseSymbol } from "../utils/symbolParser";
import { usePositionsStore } from "../store/positionsStore";
import type { ConnectorType, ConnectorStatus } from "../types";

export type { ConnectorType, ConnectorStatus };

export interface DataConnectorConfig {
    type: ConnectorType;
    wsUrl: string;
    accountId: string;
    getFirebaseToken?: () => Promise<string>;
}

const MAX_ATTEMPTS = 5;

/**
 * Establishes and maintains a single data connector WebSocket connection.
 * Parses incoming positions data and writes it to positionsStore per account.
 * All accounts returned by the server are stored — not just the configured accountId.
 *
 * Marex protocol: sends { token, account_id } on open.
 * Excel protocol: sends { msg: "send_snapshot" } on open.
 */
export function useDataConnectorSync(config: DataConnectorConfig | null): {
    status: ConnectorStatus;
    reconnect: () => void;
} {
    const [status, setStatus] = useState<ConnectorStatus>(config ? "connecting" : "idle");
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const attemptRef = useRef(0);
    const configRef = useRef(config);
    const [connectTrigger, setConnectTrigger] = useState(0);

    useEffect(() => {
        configRef.current = config;
    }, [config]);

    useEffect(() => {
        if (!config) {
            setStatus("idle");
            return;
        }

        const { type, wsUrl, accountId, getFirebaseToken } = config;
        const setMarexForAccount = usePositionsStore.getState().setMarexForAccount;
        const setExcelForAccount = usePositionsStore.getState().setExcelForAccount;

        function connect() {
            if (reconnectTimerRef.current) {
                clearTimeout(reconnectTimerRef.current);
                reconnectTimerRef.current = null;
            }

            setStatus("connecting");
            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.onopen = async () => {
                try {
                    if (type === "marex") {
                        const token = getFirebaseToken ? await getFirebaseToken() : "";
                        console.log("token for websocket", token);
                        if (ws.readyState === WebSocket.OPEN) {
                            ws.send(JSON.stringify({ token, account_id: accountId }));
                        }
                    } else {
                        if (ws.readyState === WebSocket.OPEN) {
                            ws.send(JSON.stringify({ msg: "send_snapshot" }));
                        }
                    }
                } catch (err) {
                    console.error(`[DataConnector:${type}] Failed to send init message:`, err);
                }
            };

            ws.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data);
                    if (msg.data && Array.isArray(msg.data)) {
                        setStatus("connected");
                        attemptRef.current = 0;

                        const writeFn = type === "marex" ? setMarexForAccount : setExcelForAccount;

                        // Process all accounts returned by the server
                        for (const item of msg.data) {
                            if (!item?.data || !item?.accountId) continue;
                            const acctId = String(item.accountId);

                            // Group raw symbol → qty by product
                            const byProduct: Record<string, Record<string, number>> = {};
                            for (const [symbol, value] of Object.entries(item.data as Record<string, any>)) {
                                const parsed = parseSymbol(symbol);
                                if (!parsed) continue;
                                if (!byProduct[parsed.product]) byProduct[parsed.product] = {};
                                byProduct[parsed.product][parsed.label] =
                                    value === "" || value == null ? 0 : Number(value);
                            }

                            for (const [product, updates] of Object.entries(byProduct)) {
                                writeFn(acctId, product, updates);
                            }
                        }
                    }
                } catch (err) {
                    console.error(`[DataConnector:${type}] Message parse error:`, err);
                }
            };

            ws.onclose = () => {
                attemptRef.current += 1;
                const attempt = attemptRef.current;

                if (attempt >= MAX_ATTEMPTS) {
                    setStatus("failed");
                } else {
                    setStatus("error");
                    const delay = Math.min(3000 * Math.pow(2, attempt - 1), 30_000);
                    reconnectTimerRef.current = setTimeout(connect, delay);
                }
            };

            ws.onerror = () => {
                setStatus("error");
            };
        }

        connect();

        return () => {
            if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
            if (wsRef.current) {
                wsRef.current.onclose = null; // prevent reconnect loop on unmount
                wsRef.current.close();
            }
        };
        // connectTrigger is intentionally included so reconnect() can re-run this effect
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [config?.type, config?.wsUrl, config?.accountId, connectTrigger]);

    const reconnect = () => {
        attemptRef.current = 0;
        setStatus("connecting");
        setConnectTrigger((n) => n + 1);
    };

    return { status, reconnect };
}
