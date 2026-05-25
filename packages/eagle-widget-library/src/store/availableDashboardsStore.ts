import { create } from "zustand";

export interface AvailableDashboard {
    id: string;
    name: string;
    tabs: { id: string; title: string }[];
}

interface AvailableDashboardsState {
    dashboards: AvailableDashboard[];
    setDashboards: (dashboards: AvailableDashboard[]) => void;
}

export const useAvailableDashboardsStore = create<AvailableDashboardsState>((set) => ({
    dashboards: [],
    setDashboards: (dashboards) => set({ dashboards }),
}));
