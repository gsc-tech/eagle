import { create } from "zustand";
import type { EventDateType } from "../widgets/ExpiryCalendarWidget";

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
    /**
     * Merge incoming active alerts with existing store state.
     * - Incoming alerts whose ID already exists: update position/severity data,
     *   but preserve the existing `addressed` flag.
     * - Incoming alerts that are new: added with addressed=false.
     * - Existing alerts no longer in incoming set: kept if addressed (user
     *   dismissed them), dropped if unaddressed (position closed / left window).
     */
    mergeAlerts: (alerts: ExpiryAlert[]) => void;
    markAllAddressed: () => void;
    dismissAlert: (id: string) => void;
}

export const useAlertsStore = create<AlertsState>((set) => ({
    alerts: [],

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