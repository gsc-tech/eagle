import { create } from "zustand";
import { devtools } from "zustand/middleware";

interface FilterModificationStatusStore {
  isModified: boolean;
  setModified: (modified: boolean) => void;
  debounceStartedAt: number | null;
  debounceDuration: number;
  setDebounceStart: (startedAt: number, duration: number) => void;
}

export const useFilterModificationStatusStore = create<FilterModificationStatusStore>()(
  devtools(
    (set) => ({
      isModified: false,
      setModified: (modified) => set({ isModified: modified }),
      debounceStartedAt: null,
      debounceDuration: 0,
      setDebounceStart: (startedAt, duration) =>
        set({ debounceStartedAt: startedAt, debounceDuration: duration }),
    }),
    { name: "useFilterModificationStatusStore" },
  ),
);
