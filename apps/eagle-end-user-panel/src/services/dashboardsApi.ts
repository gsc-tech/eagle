import { api } from "@/lib/apiClient";
import { getToken } from "@/firebase/authService";

export interface DashboardRecord {
    dashboardID: string;
    name: string;
    publishedLayout: any;
}

export interface WorkbookSnapshot {
    snapshot: Record<string, any>;
    parameters: any[];
}

export const dashboardsApi = {
    list(): Promise<DashboardRecord[]> {
        return api.get("/dashboards/end-user").then((r) => r.data);
    },

    getSnapshots(dashboardId: string): Promise<Record<string, WorkbookSnapshot>> {
        return api
            .get(`/dashboards/snapshots/${dashboardId}`)
            .then((r) => r.data ?? {});
    },

    async saveSnapshot(
        dashboardId: string,
        itemId: string,
        snapshot: Record<string, any>,
        parameters: any[] = []
    ): Promise<void> {
        let token = "";
        try {
            token = await getToken();
        } catch {
            // proceed unauthenticated; server enforces auth
        }

        const baseURL =
            import.meta.env.VITE_API_BASE_URL || "http://localhost:9002/api";

        const res = await fetch(`${baseURL}/dashboards/snapshots/save`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ dashboardId, itemId, snapshot, parameters }),
        });

        if (!res.ok) {
            throw new Error(`saveSnapshot failed: ${res.status}`);
        }
    },
};