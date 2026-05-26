import { create } from "zustand";
import { devtools } from "zustand/middleware";

interface LoadingStatusStore {
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
}

export const useLoadingStatusStore = create<LoadingStatusStore>()(
  devtools((set) => ({
    isLoading: false,
    setLoading: (loading) => set({ isLoading: loading }),
  }))
);
