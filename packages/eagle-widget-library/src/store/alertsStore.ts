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
    /** Full replacement — called by ExpiryCalendarWidget on each recalc. */
    setAlerts: (alerts: ExpiryAlert[]) => void;
    markAllAddressed: () => void;
    dismissAlert: (id: string) => void;
}

export const useAlertsStore = create<AlertsState>((set) => ({
    alerts: [],

    setAlerts: (alerts) =>
        set((s) => {
            // Preserve addressed state for alerts that already exist
            const addressedIds = new Set(
                s.alerts.filter((a) => a.addressed).map((a) => a.id)
            );
            return {
                alerts: alerts.map((a) => ({
                    ...a,
                    addressed: addressedIds.has(a.id) ? true : a.addressed,
                })),
            };
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