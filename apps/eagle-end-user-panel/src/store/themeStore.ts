import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface ThemeState {
    isDark: boolean;
    setDark: (dark: boolean) => void;
    toggle: () => void;
}

export const useThemeStore = create<ThemeState>()(
    persist(
        (set, get) => ({
            isDark: true,

            setDark: (dark) => {
                applyTheme(dark);
                set({ isDark: dark });
            },

            toggle: () => {
                const next = !get().isDark;
                applyTheme(next);
                set({ isDark: next });
            },
        }),
        {
            name: "eagle-theme",
            storage: createJSONStorage(() => localStorage),
            onRehydrateStorage: () => (state) => {
                // Apply the persisted theme to the DOM as soon as the store rehydrates
                if (state) applyTheme(state.isDark);
            },
        }
    )
);

function applyTheme(dark: boolean) {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(dark ? "dark" : "light");
    window.dispatchEvent(new Event("theme-change"));
}
