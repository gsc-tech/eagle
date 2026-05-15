// Widget-to-widget event bus — typed pub/sub for cross-widget communication.

// ─── Event payload map ────────────────────────────────────────────────────────
// Add a new entry here when introducing a new cross-widget event.
// The key is the event type string; the value is the payload shape.

export interface WidgetEventMap {
    'trader-limits:request-submitted': { row: unknown };
    'trader-limits:request-approved': { ids: string[]; action: string };
    'trader-limits:request-rejected': { ids: string[]; action: string };
    'trader-limits:request-acknowledged': { ids: string[]; action: string };
}

export type WidgetEventType = 
keyof WidgetEventMap;

// ─── WIDGET_EVENTS constant (maps readable names → typed keys) ────────────────

export const WIDGET_EVENTS = {
    LIMIT_REQUEST_SUBMITTED:    'trader-limits:request-submitted',
    LIMIT_REQUEST_APPROVED:     'trader-limits:request-approved',
    LIMIT_REQUEST_REJECTED:     'trader-limits:request-rejected',
    LIMIT_REQUEST_ACKNOWLEDGED: 'trader-limits:request-acknowledged',
} as const satisfies Record<string, WidgetEventType>;

// ─── Bus implementation ───────────────────────────────────────────────────────

type Callback<T extends WidgetEventType> = (payload: WidgetEventMap[T]) => void;

const subscribers = new Map<WidgetEventType, Set<Callback<any>>>();

export const widgetEventBus = {
    emit<T extends WidgetEventType>(eventType: T, payload: WidgetEventMap[T]): void {
        subscribers.get(eventType)?.forEach((cb) => {
            try {
                cb(payload);
            } catch (e) {
                console.error(`[widgetEventBus] handler error for "${eventType}"`, e);
            }
        });
    },

    subscribe<T extends WidgetEventType>(
        eventType: T,
        callback: Callback<T>
    ): () => void {
        if (!subscribers.has(eventType)) {
            subscribers.set(eventType, new Set());
        }
        subscribers.get(eventType)!.add(callback);
        return () => subscribers.get(eventType)?.delete(callback);
    },
};