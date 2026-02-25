import { useEffect, useRef } from 'react';
import { useRealtimeStore } from '../store/realtimeStore';
/**
 * Hook for managing real-time WebSocket data updates in widgets
 *
 * This refactored hook uses a global Zustand store to pool WebSocket connections.
 * It ensures that multiple widgets using the same wsUrl share a single connection.
 */
export function useRealtimeWidgetData({ wsUrl, currentParams, messageParser, onUpdate, onConnect, onDisconnect, onError, }) {
    const { connect, disconnect, subscribe, unsubscribe, connections } = useRealtimeStore();
    // We use refs to avoid re-triggering subscriptions when functions change
    const onUpdateRef = useRef(onUpdate);
    const messageParserRef = useRef(messageParser);
    const onConnectRef = useRef(onConnect);
    const onDisconnectRef = useRef(onDisconnect);
    const onErrorRef = useRef(onError);
    useEffect(() => {
        onUpdateRef.current = onUpdate;
        messageParserRef.current = messageParser;
        onConnectRef.current = onConnect;
        onDisconnectRef.current = onDisconnect;
        onErrorRef.current = onError;
    });
    // Check if the connection is active right now
    const ws = wsUrl ? connections[wsUrl] : null;
    const isConnected = !!(ws && ws.readyState === WebSocket.OPEN);
    // 1. Manage the global connection lifecycle for this URL
    useEffect(() => {
        if (!wsUrl)
            return;
        connect(wsUrl);
        // Optional: Could add listeners to dispatch onConnect / onDisconnect
        // directly from the store if you want to perfectly mimic Native WebSocket events.
        return () => {
            disconnect(wsUrl);
        };
    }, [wsUrl, connect, disconnect]);
    // 2. Manage the parameter subscription lifecycle
    useEffect(() => {
        if (!wsUrl)
            return;
        // Callback handler wrapped safely in refs
        const handleMessage = (message) => {
            const parsedData = messageParserRef.current(message);
            if (parsedData !== null) {
                onUpdateRef.current(parsedData);
            }
        };
        // Subscribe to these exact parameters
        subscribe(wsUrl, currentParams, handleMessage);
        return () => {
            // Cleanup the subscription when the widget unmounts or parameters change
            unsubscribe(wsUrl, currentParams, handleMessage);
        };
    }, [wsUrl, JSON.stringify(currentParams), subscribe, unsubscribe]);
    // Error is tricky since errors are global to the connection. 
    // You could expose `errors` in the Zustand store analogous to `connections`.
    return {
        isConnected,
        error: null,
    };
}
