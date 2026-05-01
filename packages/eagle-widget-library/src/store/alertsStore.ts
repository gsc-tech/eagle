import { create } from "zustand";
import type { EventDateType, ExpiryEvent } from "../widgets/ExpiryCalendarWidget";
import { parseSymbol } from "../utils/symbolParser";

type GetPositionFn = (symbol: string, label: string) => { marex: number; excel: number; active: number };

export interface ExpiryAlert {
    id: string;
    symbol: string;
    contractCode: string;
    productName: string;
    expiryDate: string;       // YYYY-MM-DD
    daysUntilExpiry: number;
    marexPosition: number;
    excelPosition: number;
    /** Active position: Marex if non-zero, else Excel. Never a sum. */
    activePosition: number;
    dateType: EventDateType;
    /** critical: ≤2 days, warning: ≤5 days */
    severity: "critical" | "warning";
    addressed: boolean;
}

export interface AlertsState {
    alerts: ExpiryAlert[];
    /** Calendar events cached here so alerts can be recomputed even when the widget is unmounted. */
    calendarEvents: ExpiryEvent[];
    /**
     * Merge incoming active alerts with existing store state.
     * - Incoming alerts whose ID already exists: update position/severity data,
     *   but preserve the existing `addressed` flag.
     * - Incoming alerts that are new: added with addressed=false.
     * - Existing alerts no longer in incoming set: kept if addressed (user
     *   dismissed them), dropped if unaddressed (position closed / left window).
     */
    mergeAlerts: (alerts: ExpiryAlert[]) => void;
    /** Called by ExpiryCalendarWidget whenever its filtered events change. */
    setCalendarEvents: (events: ExpiryEvent[]) => void;
    /**
     * Recompute alerts from the stored calendarEvents.
     * Call this from the app whenever positions change, regardless of which
     * dashboard is currently active.
     */
    refreshAlerts: (getPosition: GetPositionFn) => void;
    markAllAddressed: () => void;
    dismissAlert: (id: string) => void;
}

export const useAlertsStore = create<AlertsState>((set, get) => ({
    alerts: [],
    calendarEvents: [],

    setCalendarEvents: (events) => set({ calendarEvents: events }),

    refreshAlerts: (getPosition) => {
        const { calendarEvents } = get();
        const now = new Date();
        now.setHours(12, 0, 0, 0);
        const newAlerts: ExpiryAlert[] = [];

        calendarEvents.forEach((event) => {
            const eventDate = new Date(event.date + "T12:00:00Z");
            const daysAway = Math.ceil((eventDate.getTime() - now.getTime()) / 86_400_000);
            if (daysAway < 0 || daysAway > 150) return;

            const parsed = parseSymbol(`${event.symbol}${event.contractCode}`);
            if (!parsed) return;
            const pos = getPosition(parsed.product, parsed.label);
            if (pos.active === 0) return;

            newAlerts.push({
                id: `${event.id}_alert`,
                symbol: event.symbol,
                contractCode: event.contractCode,
                productName: event.productName,
                expiryDate: event.date,
                daysUntilExpiry: daysAway,
                marexPosition: pos.marex,
                excelPosition: pos.excel,
                activePosition: pos.active,
                dateType: event.dateType,
                severity: daysAway <= 2 ? "critical" : "warning",
                addressed: false,
            });
        });

        get().mergeAlerts(newAlerts);
    },

    mergeAlerts: (incoming) =>
        set((s) => {
            const incomingMap = new Map(incoming.map((a) => [a.id, a]));
            const existingMap = new Map(s.alerts.map((a) => [a.id, a]));

            // Start with all incoming alerts, preserving addressed flag if known
            const merged: ExpiryAlert[] = incoming.map((a) => ({
                ...a,
                addressed: existingMap.get(a.id)?.addressed ?? false,
            }));

            // Re-append addressed alerts that are no longer active (so dismissed
            // history isn't lost until the user explicitly clears it)
            s.alerts.forEach((existing) => {
                if (existing.addressed && !incomingMap.has(existing.id)) {
                    merged.push(existing);
                }
            });

            return { alerts: merged };
        }),

    markAllAddressed: () =>
        set((s) => ({
            alerts: s.alerts.map((a) => ({ ...a, addressed: true })),
        })),

    dismissAlert: (id) =>
        set((s) => ({
            alerts: s.alerts.map((a) =>
                a.id === id ? { ...a, addressed: true } : a
            ),
        })),
}));