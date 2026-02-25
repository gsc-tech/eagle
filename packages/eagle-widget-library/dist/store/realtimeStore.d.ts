import type { ParameterValues } from '../types';
import type { WebSocketMessage } from '../hooks/useRealtimeWidgetData';
export declare const getSubscriptionKey: (params: ParameterValues) => string;
type SubscriberCallback = (message: WebSocketMessage) => void;
interface RealtimeState {
    connections: Record<string, WebSocket>;
    connectionCounts: Record<string, number>;
    subscribers: Record<string, Record<string, Set<SubscriberCallback>>>;
    connect: (url: string) => void;
    disconnect: (url: string) => void;
    subscribe: (url: string, params: ParameterValues, callback: SubscriberCallback) => void;
    unsubscribe: (url: string, params: ParameterValues, callback: SubscriberCallback) => void;
}
export declare const useRealtimeStore: import("zustand").UseBoundStore<import("zustand").StoreApi<RealtimeState>>;
export {};
