import {
    ModuleRegistry,
    ClientSideRowModelModule,
    ColumnAutoSizeModule,
    themeQuartz,
    CellStyleModule,
    TooltipModule,
    TextFilterModule,
    NumberFilterModule,
    CustomFilterModule,
    RowStyleModule,
    type Module,
} from "ag-grid-community";

ModuleRegistry.registerModules([
    ClientSideRowModelModule as unknown as Module,
    ColumnAutoSizeModule as unknown as Module,
    CellStyleModule as unknown as Module,
    TooltipModule as unknown as Module,
    TextFilterModule as unknown as Module,
    NumberFilterModule as unknown as Module,
    CustomFilterModule as unknown as Module,
    RowStyleModule as unknown as Module,
]);

// ─── Themes ───────────────────────────────────────────────────────────────────

export const myLightTheme = themeQuartz.withParams({
    browserColorScheme: "light",
});

export const myDarkTheme = themeQuartz.withParams({
    backgroundColor: "#1a1a1a",
    browserColorScheme: "dark",
    chromeBackgroundColor: { ref: "foregroundColor", mix: 0.05, onto: "backgroundColor" },
    foregroundColor: "#f0f0f0",
    borderColor: "#2e2e2e",
    rowHoverColor: "#222222",
    oddRowBackgroundColor: "#1e1e1e",
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type TabData = Record<string, any[]>;

export function isTabData(value: unknown): value is TabData {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    return Object.values(value as object).some((v) => Array.isArray(v));
}

export function flattenLeaves(defs: import("ag-grid-community").ColDef[]): import("ag-grid-community").ColDef[] {
    const result: import("ag-grid-community").ColDef[] = [];
    function walk(d: any) {
        if ("children" in d && d.children) {
            (d.children as any[]).forEach(walk);
        } else {
            result.push(d);
        }
    }
    defs.forEach(walk);
    return result;
}

// ─── Badge variants ───────────────────────────────────────────────────────────

export const BADGE_VARIANTS = {
    success: {
        bg: "#d1fae5", text: "#065f46", border: "#6ee7b7",
        darkBg: "rgba(16,185,129,0.15)", darkText: "#6ee7b7", darkBorder: "rgba(16,185,129,0.35)",
    },
    danger: {
        bg: "#fee2e2", text: "#991b1b", border: "#fca5a5",
        darkBg: "rgba(239,68,68,0.15)", darkText: "#fca5a5", darkBorder: "rgba(239,68,68,0.35)",
    },
    warning: {
        bg: "#fff7ed", text: "#9a3412", border: "#fdba74",
        darkBg: "rgba(249,115,22,0.12)", darkText: "#fb923c", darkBorder: "rgba(249,115,22,0.3)",
    },
    info: {
        bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe",
        darkBg: "rgba(59,130,246,0.15)", darkText: "#93c5fd", darkBorder: "rgba(59,130,246,0.3)",
    },
    neutral: {
        bg: "#f3f4f6", text: "#374151", border: "#d1d5db",
        darkBg: "rgba(107,114,128,0.15)", darkText: "#9ca3af", darkBorder: "rgba(107,114,128,0.3)",
    },
    pending: {
        bg: "#fffbeb", text: "#92400e", border: "#fcd34d",
        darkBg: "rgba(245,158,11,0.12)", darkText: "#fbbf24", darkBorder: "rgba(245,158,11,0.3)",
    },
} as const;

export type BadgeVariant = keyof typeof BADGE_VARIANTS;
