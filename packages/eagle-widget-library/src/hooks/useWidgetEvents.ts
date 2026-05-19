import { useEffect, useRef, useCallback } from "react";
import { widgetEventBus } from "../store/widgetEventBus";
import type { WidgetEventType, WidgetEventMap } from "../store/widgetEventBus";
import type { WidgetEventSubscription } from "../types";

interface UseWidgetEventsOptions {
    subscriptions?: WidgetEventSubscription[];
    actions?: Record<string, () => void>;
}

export function useWidgetEvents({ subscriptions, actions }: UseWidgetEventsOptions = {}) {
    const actionsRef = useRef(actions);
    actionsRef.current = actions;

    useEffect(() => {
        if (!subscriptions || subscriptions.length === 0) return;

        const unsubscribers = subscriptions.map((sub) =>
            widgetEventBus.subscribe(sub.eventType as WidgetEventType, () => {
                actionsRef.current?.[sub.action]?.();
            })
        );

        return () => unsubscribers.forEach((u) => u());
    // subscriptions is config-time data; stringify is fine here to detect changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [JSON.stringify(subscriptions)]);

    const emit = useCallback(
        <T extends WidgetEventType>(eventType: T, payload: WidgetEventMap[T]) => {
            widgetEventBus.emit(eventType, payload);
        },
        []
    );

    return { emit };
}