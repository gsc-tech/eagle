// Widget-to-widget event bus — a lightweight pub/sub for cross-widget communication.
// Mirrors the sheet dependency pattern: widgets produce events; other widgets subscribe to them.

type EventCallback = (payload?: any) => void;

const subscribers = new Map<string, Set<EventCallback>>();

export const widgetEventBus = {
    emit(eventType: string, payload?: any) {
        subscribers.get(eventType)?.forEach(cb => {
            try {
                cb(payload);
                console.log(`[widgetEventBus] emitted "${eventType}" with payload`, payload);
            } catch (e) { console.error(`[widgetEventBus] handler error for "${eventType}"`, e); }
        });
    },
    subscribe(eventType: string, callback: EventCallback): () => void {
        if (!subscribers.has(eventType)) {
            subscribers.set(eventType, new Set());
        }
        subscribers.get(eventType)!.add(callback);
        return () => subscribers.get(eventType)?.delete(callback);
    },
};

// ─── Standard event types ─────────────────────────────────────────────────────
// Widgets should emit these after successful actions so that subscribers
// can react (e.g. trigger a refetch) without tight coupling.

export const WIDGET_EVENTS = {
    LIMIT_REQUEST_SUBMITTED: 'trader-limits:request-submitted',
    LIMIT_REQUEST_APPROVED: 'trader-limits:request-approved',
    LIMIT_REQUEST_REJECTED: 'trader-limits:request-rejected',
    LIMIT_REQUEST_ACKNOWLEDGED: 'trader-limits:request-acknowledged',
} as const;

export type WidgetEventType = typeof WIDGET_EVENTS[keyof typeof WIDGET_EVENTS];
