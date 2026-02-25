import type { ParameterValues } from '../types';
export interface WebSocketMessage<T = any> {
    type: 'subscribe' | 'unsubscribe' | 'update';
    params?: ParameterValues;
    data?: T;
}
export interface UseRealtimeWidgetDataOptions<T> {
    wsUrl?: string;
    currentParams: ParameterValues;
    messageParser: (message: WebSocketMessage) => T | null;
    onUpdate: (data: T) => void;
    onConnect?: () => void;
    onDisconnect?: () => void;
    onError?: (error: Event) => void;
}
/**
 * Hook for managing real-time WebSocket data updates in widgets
 *
 * This refactored hook uses a global Zustand store to pool WebSocket connections.
 * It ensures that multiple widgets using the same wsUrl share a single connection.
 */
export declare function useRealtimeWidgetData<T>({ wsUrl, currentParams, messageParser, onUpdate, onConnect, onDisconnect, onError, }: UseRealtimeWidgetDataOptions<T>): {
    isConnected: boolean;
    error: null;
};
