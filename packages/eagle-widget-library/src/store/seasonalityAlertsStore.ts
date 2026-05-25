import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { falconApiClient } from "../utils/falconApiClient";

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Mirrors Falcon's alert condition shape.
 * `inRange` uses `value.low` and `value.high`; `>` and `<` use `value.threshold`.
 */
export interface AlertCondition {
    type: ">" | "<" | "inRange";
    value: { lhs: string; rhs?: number; low?: number; high?: number };
}

export type AlertOccurrence = "Only Once" | "Every Time";
export type AlertAfterExpiration = "Roll Over" | "Delete";
export type AlertStatus = "active" | "stopped" | "triggered";
export type AlertNotificationType = "app" | "email" | "sms" | "whatsapp" | "telegram" | "teams";

export interface SeasonalityAlert {
    id: string;
    name: string;
    expression: string[];
    altName: string;
    condition: AlertCondition;
    occurrence: AlertOccurrence;
    afterExpiration: AlertAfterExpiration;
    status: AlertStatus;
    notificationType: AlertNotificationType[];
    position: string;
    market?: import("../utils/seasonality").Market;
    createdAt: string;
    lastTriggeredAt?: string;
}

// ─── Store interface ──────────────────────────────────────────────────────────

type CreateAlertParams = Omit<SeasonalityAlert, "id" | "createdAt">;

interface SeasonalityAlertsState {
    alerts: SeasonalityAlert[];

    /**
     * Create a new alert.
     * T1.7: replace stub with POST /api/alert/createAlert
     */
    createAlert: (params: CreateAlertParams) => Promise<SeasonalityAlert>;

    /**
     * Permanently delete an alert.
     * T1.7: replace stub with DELETE /api/alert/deleteAlert
     */
    deleteAlert: (alertId: string) => Promise<void>;

    /**
     * Mark an alert as triggered and record the timestamp.
     * T1.7: replace stub with PUT /api/alert/updateAlertCondition (status → triggered)
     */
    markTriggered: (alertId: string) => Promise<void>;

    /**
     * Toggle an alert between active and stopped without deleting it.
     * T1.7: replace stub with PUT /api/alert/updateAlertCondition
     */
    setStatus: (alertId: string, status: "active" | "stopped") => Promise<void>;

    /**
     * Update an alert's condition (e.g., from dragging a threshold on the chart).
     */
    updateAlertCondition: (alertId: string, condition: AlertCondition) => Promise<void>;

    /**
     * Fetch all active alerts for the current user and hydrate the store.
     * T1.7: replace stub with GET /api/alert/getUserAlerts
     */
    fetchAlerts: () => Promise<void>;

    /**
     * Wipe local persisted state. Call on sign-out to prevent a subsequent
     * user from seeing the previous user's alerts before the first fetch.
     */
    clearPersistedState: () => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useSeasonalityAlertsStore = create<SeasonalityAlertsState>()(
    persist(
        (set, get) => ({
            alerts: [],

            createAlert: async (params) => {
                const alert = await falconApiClient.post<SeasonalityAlert>("/api/alert/createAlert", params);
                set((s) => ({ alerts: [...s.alerts, alert] }));
                return alert;
            },

            deleteAlert: async (alertId) => {
                const alert = get().alerts.find((a) => a.id === alertId);
                if (alert) {
                    const { id, ...rest } = alert;
                    await falconApiClient.delete("/api/alert/deleteAlert", {
                        body: { alert: { ...rest, _id: id } },
                    });
                }
                set((s) => ({ alerts: s.alerts.filter((a) => a.id !== alertId) }));
            },

            markTriggered: async (alertId) => {
                const now = new Date().toISOString();
                await falconApiClient.put("/api/alert/updateAlertCondition", {
                    alertId,
                    status: "triggered",
                    lastTriggeredAt: now,
                });
                set((s) => ({
                    alerts: s.alerts.map((a) =>
                        a.id === alertId
                            ? { ...a, status: "triggered" as AlertStatus, lastTriggeredAt: now }
                            : a
                    ),
                }));
            },

            setStatus: async (alertId, status) => {
                await falconApiClient.put("/api/alert/updateAlertCondition", { alertId, status });
                set((s) => ({
                    alerts: s.alerts.map((a) =>
                        a.id === alertId ? { ...a, status } : a
                    ),
                }));
            },

            updateAlertCondition: async (alertId, condition) => {
                const alert = get().alerts.find((a) => a.id === alertId);
                if (!alert) return;

                const updatedAlert: SeasonalityAlert = { ...alert, condition };

                // API expects _id (not id) and rhs/low/high as 4dp strings
                const { id, ...rest } = updatedAlert;
                const conditionForApi = {
                    ...condition,
                    value: {
                        ...condition.value,
                        ...(condition.value.rhs !== undefined && { rhs: Number(condition.value.rhs).toFixed(4) }),
                        ...(condition.value.low !== undefined && { low: Number(condition.value.low).toFixed(4) }),
                        ...(condition.value.high !== undefined && { high: Number(condition.value.high).toFixed(4) }),
                    },
                };
                await falconApiClient.put("/api/alert/updateAlertCondition", {
                    alert: { ...rest, _id: id, condition: conditionForApi },
                });

                set((s) => ({
                    alerts: s.alerts.map((a) => a.id === alertId ? updatedAlert : a),
                }));
            },

            fetchAlerts: async () => {
                const res = await falconApiClient.get<any>("/api/alert/getUserAlerts");
                const raw: any[] = Array.isArray(res) ? res : (res?.alerts ?? res?.data ?? []);
                const alerts: SeasonalityAlert[] = raw.map((r) => {
                    const c = r.condition ?? {};
                    const cv = c.value ?? {};
                    const condition: AlertCondition = {
                        type: c.type,
                        value: {
                            lhs: cv.lhs,
                            rhs: cv.rhs !== undefined ? Number(cv.rhs) : undefined,
                            low: cv.low !== undefined ? Number(cv.low) : undefined,
                            high: cv.high !== undefined ? Number(cv.high) : undefined,
                        },
                    };
                    return {
                        id: r._id ?? r.id,
                        name: r.name,
                        expression: r.expression,
                        altName: r.altName,
                        condition,
                        occurrence: r.occurrence,
                        afterExpiration: r.afterExpiration,
                        status: r.status,
                        notificationType: r.notificationType,
                        position: r.position,
                        market: r.market,
                        createdAt: r.createdAt,
                        lastTriggeredAt: r.lastTriggeredAt,
                    };
                });
                set({ alerts });
            },

            clearPersistedState: () => set({ alerts: [] }),
        }),
        {
            name: "eagle-seasonality-alerts",
            storage: createJSONStorage(() => localStorage),
        }
    )
);