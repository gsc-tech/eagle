import { create } from 'zustand';
import type { ParameterValues } from '../types';
import type { WebSocketMessage } from '../hooks/useRealtimeWidgetData';

// We need a way to uniquely identify a subscription based on its parameters.
// Since parameters are objects, we stringify them to create a stable key.
export const getSubscriptionKey = (params: ParameterValues) => {
    // Sort keys to ensure {a:1, b:2} produces the same key as {b:2, a:1}
    const sortedKeys = Object.keys(params).sort();
    const normalizedParams: Record<string, any> = {};
    sortedKeys.forEach(key => {
        normalizedParams[key] = params[key];
    });
    return JSON.stringify(normalizedParams);
};

type SubscriberCallback = (message: WebSocketMessage) => void;

interface RealtimeState {
    // URL -> The actual active WebSocket instance
    connections: Record<string, WebSocket>;

    // URL -> Number of widgets currently using this connection (ref counting)
    connectionCounts: Record<string, number>;

    // Subscriber mapping: URL -> ParameterKey -> Set of callbacks
    // When a message arrives from a URL, we look at its params, generate the key,
    // and call all functions in the Set for that key.
    subscribers: Record<string, Record<string, Set<SubscriberCallback>>>;

    // Actions
    connect: (url: string) => void;
    disconnect: (url: string) => void;
    subscribe: (url: string, params: ParameterValues, callback: SubscriberCallback) => void;
    unsubscribe: (url: string, params: ParameterValues, callback: SubscriberCallback) => void;
}

export const useRealtimeStore = create<RealtimeState>((set, get) => ({
    connections: {},
    connectionCounts: {},
    subscribers: {},

    connect: (url: string) => {
        const state = get();
        const currentCount = state.connectionCounts[url] || 0;

        // If we already have a connection, just increment the ref count
        if (state.connections[url] && state.connections[url].readyState === WebSocket.OPEN) {
            set((state) => ({
                connectionCounts: { ...state.connectionCounts, [url]: currentCount + 1 }
            }));
            return;
        }

        // Otherwise, establish a new WebSocket connection
        console.log(`[RealtimeStore] Establishing new WebSocket connection to: ${url}`);
        const ws = new WebSocket(url);

        ws.onopen = () => {
            console.log(`[RealtimeStore] Connected to ${url}`);

            // Resend generic catch-up or all active subscriptions if needed here.
            // Usually, the component levels handle sending 'subscribe' after they mount,
            // but if the socket dropped and reconnected, we might want to resend all.
        };

        ws.onmessage = (event) => {
            try {
                const message: WebSocketMessage = JSON.parse(event.data);

                // Route the message to the correct subscribers based on its params
                if (message.type === 'update' && message.params) {
                    const paramKey = getSubscriptionKey(message.params);
                    const urlSubscribers = get().subscribers[url];

                    if (urlSubscribers && urlSubscribers[paramKey]) {
                        urlSubscribers[paramKey].forEach(callback => {
                            callback(message);
                        });
                    }
                }
            } catch (err) {
                console.error(`[RealtimeStore] Failed to parse message from ${url}:`, err);
            }
        };

        ws.onclose = () => {
            console.log(`[RealtimeStore] Disconnected from ${url}`);
            // Remove the dead connection from state
            set((state) => {
                const newConnections = { ...state.connections };
                delete newConnections[url];
                return { connections: newConnections };
            });
        };

        ws.onerror = (error) => {
            console.error(`[RealtimeStore] WebSocket error on ${url}:`, error);
        };

        // Save the new connection and set its ref count to 1
        set((state) => ({
            connections: { ...state.connections, [url]: ws },
            connectionCounts: { ...state.connectionCounts, [url]: currentCount + 1 },
            // Ensure subscriber registry exists for this URL
            subscribers: { ...state.subscribers, [url]: state.subscribers[url] || {} }
        }));
    },

    disconnect: (url: string) => {
        const state = get();
        const currentCount = state.connectionCounts[url] || 0;

        if (currentCount <= 1) {
            // No one is using this connection anymore, safe to close it!
            console.log(`[RealtimeStore] Closing WebSocket connection to ${url} (0 active widgets)`);
            const ws = state.connections[url];
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.close();
            }

            set((state) => {
                const newCounts = { ...state.connectionCounts };
                const newConnections = { ...state.connections };
                delete newCounts[url];
                delete newConnections[url];

                return {
                    connectionCounts: newCounts,
                    connections: newConnections
                };
            });
        } else {
            // Just decrement the ref count
            set((state) => ({
                connectionCounts: { ...state.connectionCounts, [url]: currentCount - 1 }
            }));
        }
    },

    subscribe: (url: string, params: ParameterValues, callback: SubscriberCallback) => {
        const paramKey = getSubscriptionKey(params);

        set((state) => {
            const urlSubscribers = state.subscribers[url] || {};
            const paramSubscribers = urlSubscribers[paramKey] || new Set();

            // Create a new Set to trigger reactivity (though we rely more on the callbacks)
            const newParamSubscribers = new Set(paramSubscribers);
            newParamSubscribers.add(callback);

            return {
                subscribers: {
                    ...state.subscribers,
                    [url]: {
                        ...urlSubscribers,
                        [paramKey]: newParamSubscribers
                    }
                }
            };
        });

        // Actually send the subscribe message over the wire if the socket is open
        const ws = get().connections[url];
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'subscribe', params }));
        } else if (ws && ws.readyState === WebSocket.CONNECTING) {
            // If still connecting, queue it or wait for onopen.
            // For simplicity, you can attach a temporary listener or trust the widget to retry.
            // Modern approach: Add queueing logic here.
        }
    },

    unsubscribe: (url: string, params: ParameterValues, callback: SubscriberCallback) => {
        const paramKey = getSubscriptionKey(params);

        set((state) => {
            const urlSubscribers = state.subscribers[url];
            if (!urlSubscribers || !urlSubscribers[paramKey]) return state;

            const newParamSubscribers = new Set(urlSubscribers[paramKey]);
            newParamSubscribers.delete(callback);

            return {
                subscribers: {
                    ...state.subscribers,
                    [url]: {
                        ...urlSubscribers,
                        [paramKey]: newParamSubscribers
                    }
                }
            };
        });

        // Tell the server we no longer care about these params (optional,
        // you only really want to do this if NO ONE ELSE is listening to these params).
        const remainingListeners = get().subscribers[url]?.[paramKey]?.size || 0;
        if (remainingListeners === 0) {
            const ws = get().connections[url];
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'unsubscribe', params }));
            }
        }
    }
}));
