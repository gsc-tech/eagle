import { useEffect, useRef, useCallback } from "react";
import { widgetEventBus } from "../store/widgetEventBus";
import type { WidgetEventSubscription } from "../types";

interface UseWidgetEventsOptions {
    // Subscriptions configured at the dashboard/widget-config level.
    subscriptions?: WidgetEventSubscription[];
    // Handlers keyed by action name. Widgets pass their own callbacks here
    // (e.g. { refetch: refetchFn }). The hook routes subscription actions to them.
    actions?: Record<string, () => void>;
}

export function useWidgetEvents({ subscriptions, actions }: UseWidgetEventsOptions = {}) {
    const actionsRef = useRef(actions);
    actionsRef.current = actions;

    useEffect(() => {
        if (!subscriptions || subscriptions.length === 0) return;

        const unsubscribers = subscriptions.map(sub =>
            widgetEventBus.subscribe(sub.eventType, () => {
                const handler = actionsRef.current?.[sub.action];
                handler?.();
            })
        );

        return () => unsubscribers.forEach(u => u());
    }, [JSON.stringify(subscriptions)]);

    const emit = useCallback((eventType: string, payload?: any) => {
        widgetEventBus.emit(eventType, payload);
    }, []);

    return { emit };
}
