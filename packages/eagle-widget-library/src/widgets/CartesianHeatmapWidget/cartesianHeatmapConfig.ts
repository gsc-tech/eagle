import type { BaseWidgetProps, ParameterValues } from "../../types";

// ─── API data field-mapping config ────────────────────────────────────────────

export interface HeatmapApiDataConfig {
    productField: string;
    contractField: string;
    valueField: string;
    groupField?: string;
    pollInterval?: number;
}

// ─── Public props ─────────────────────────────────────────────────────────────

export interface CartesianHeatmapWidgetProps extends BaseWidgetProps {
    xLabels?: string[];
    yLabels?: string[];
    /** Pre-fetched data array — bypasses apiUrl/sheetDependency when provided. */
    staticData?: unknown[];
    heatmapGroups?: { name: string; rows: number[]; min: number; max: number; colors: string[] }[];
    apiDataConfig?: HeatmapApiDataConfig;
    /**
     * Replace the auto-built visualMap entirely. Use when the auto piecewise
     * scale (product-group colored) doesn't fit — e.g. seasonality's
     * diverging red/white/green scale.
     */
    visualMapOverride?: unknown;
    /**
     * Transforms the raw cell value before it appears in tooltips / labels.
     * Auto-built tooltip applies this; the auto label uses the formatted
     * string too. Group-placeholder cells (value <= GROUP_ID_OFFSET) are
     * still rendered as "—" regardless of this formatter.
     */
    valueFormatter?: (v: number) => string;
    /** Rotate x-axis labels by this many degrees. Useful when labels overlap (e.g. seasonality dates). */
    xAxisLabelRotate?: number;
}

// ─── Product groups lookup ────────────────────────────────────────────────────

export const PRODUCT_GROUPS: Record<string, { fullName: string; groupName: string }> = {
    CL: { fullName: "CL", groupName: "Energy" },
    HO: { fullName: "HO", groupName: "Energy" },
    NG: { fullName: "NG", groupName: "Energy" },
    RB: { fullName: "RB", groupName: "Energy" },
    BRN: { fullName: "BRN", groupName: "Energy" },
    G: { fullName: "G", groupName: "Energy" },
    HTT: { fullName: "HTT", groupName: "Energy" },
    QG: { fullName: "QG", groupName: "Energy" },
    GC: { fullName: "GC", groupName: "Metals" },
    SI: { fullName: "SI", groupName: "Metals" },
    PL: { fullName: "PL", groupName: "Metals" },
    PA: { fullName: "PA", groupName: "Metals" },
    HG: { fullName: "HG", groupName: "Metals" },
    BCH: { fullName: "BCH", groupName: "Metals" },
    MGC: { fullName: "MGC", groupName: "Metals" },
    SIL: { fullName: "SIL", groupName: "Metals" },
    ZC: { fullName: "ZC", groupName: "Agriculture (Grains and OilSeeds)" },
    ZS: { fullName: "ZS", groupName: "Agriculture (Grains and OilSeeds)" },
    ZL: { fullName: "ZL", groupName: "Agriculture (Grains and OilSeeds)" },
    ZM: { fullName: "ZM", groupName: "Agriculture (Grains and OilSeeds)" },
    ZW: { fullName: "ZW", groupName: "Agriculture (Grains and OilSeeds)" },
    KE: { fullName: "KE", groupName: "Agriculture (Grains and OilSeeds)" },
    CWD: { fullName: "CWD", groupName: "Agriculture (Grains and OilSeeds)" },
    ECO: { fullName: "ECO", groupName: "Agriculture (Grains and OilSeeds)" },
    KWD: { fullName: "KWD", groupName: "Agriculture (Grains and OilSeeds)" },
    MWE: { fullName: "MWE", groupName: "Agriculture (Grains and OilSeeds)" },
    MZS: { fullName: "MZS", groupName: "Agriculture (Grains and OilSeeds)" },
    MZC: { fullName: "MZC", groupName: "Agriculture (Grains and OilSeeds)" },
    MZL: { fullName: "MZL", groupName: "Agriculture (Grains and OilSeeds)" },
    MZM: { fullName: "MZM", groupName: "Agriculture (Grains and OilSeeds)" },
    KC: { fullName: "KC", groupName: "Soft Commodities (ICE)" },
    RC: { fullName: "RC", groupName: "Soft Commodities (ICE)" },
    CC: { fullName: "CC", groupName: "Soft Commodities (ICE)" },
    C: { fullName: "C", groupName: "Soft Commodities (ICE)" },
    CT: { fullName: "CT", groupName: "Soft Commodities (ICE)" },
    LE: { fullName: "LE", groupName: "Livestock" },
    GF: { fullName: "GF", groupName: "Livestock" },
    HE: { fullName: "HE", groupName: "Livestock" },
    ZN: { fullName: "ZN", groupName: "Interest Rates/Fixed Income" },
    ZB: { fullName: "ZB", groupName: "Interest Rates/Fixed Income" },
    ZF: { fullName: "ZF", groupName: "Interest Rates/Fixed Income" },
    ZT: { fullName: "ZT", groupName: "Interest Rates/Fixed Income" },
    ZQ: { fullName: "ZQ", groupName: "Interest Rates/Fixed Income" },
    SR3: { fullName: "SR3", groupName: "Interest Rates/Fixed Income" },
    SR1: { fullName: "SR1", groupName: "Interest Rates/Fixed Income" },
    SO3: { fullName: "SO3", groupName: "Interest Rates/Fixed Income" },
    M2K: { fullName: "M2K", groupName: "Equities" },
    MYM: { fullName: "MYM", groupName: "Equities" },
    ES: { fullName: "ES", groupName: "Equities" },
    NQ: { fullName: "NQ", groupName: "Equities" },
    MNQ: { fullName: "MNQ", groupName: "Equities" },
    MES: { fullName: "MES", groupName: "Equities" },
    RTY: { fullName: "RTY", groupName: "Equities" },
    YM: { fullName: "YM", groupName: "Equities" },
    MMC: { fullName: "MMC", groupName: "Equities" },
    EWF: { fullName: "EWF", groupName: "Equities" },
    EMD: { fullName: "EMD", groupName: "Equities" },
    MSC: { fullName: "MSC", groupName: "Equities" },
    MNK: { fullName: "MNK", groupName: "Equities" },
    MNI: { fullName: "MNI", groupName: "Equities" },
    SMC: { fullName: "SMC", groupName: "Equities" },
};

export const GROUP_ORDER = [
    "Energy",
    "Metals",
    "Agriculture (Grains and OilSeeds)",
    "Soft Commodities (ICE)",
    "Livestock",
    "Interest Rates/Fixed Income",
    "Equities",
    "Other",
];

export const POSITIVE_COLORS = ["#bbf7d0", "#86efac", "#4ade80", "#22c55e", "#16a34a", "#15803d", "#166534", "#14532d"];
export const ZERO_COLOR = "#f8fafc";
export const NEGATIVE_COLORS = ["#fecaca", "#fca5a5", "#f87171", "#ef4444", "#dc2626", "#b91c1c", "#991b1b", "#7f1d1d"];

export const GROUP_EMPTY_COLORS: Record<string, string> = {
    Energy: "#e0f2fe",
    Metals: "#fef3c7",
    "Agriculture (Grains and OilSeeds)": "#C1E59F",
    "Soft Commodities (ICE)": "#fae8ff",
    Livestock: "#ddd6fe",
    "Interest Rates/Fixed Income": "#f1f5f9",
    Equities: "#f8dbb5",
    Other: "#faf8deff",
};

export const GROUP_ID_OFFSET = -1000;
export const GROUP_IDS: Record<string, number> = {
    Energy: 1,
    Metals: 2,
    "Agriculture (Grains and OilSeeds)": 3,
    "Soft Commodities (ICE)": 4,
    Livestock: 5,
    "Interest Rates/Fixed Income": 6,
    Equities: 7,
    Other: 8,
};

export const fallbackXLabels = ["12a", "1a", "2a", "3a", "4a", "5a", "6a", "7a", "8a", "9a", "10a"];
export const fallbackYLabels = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export interface ParsedHeatmapData {
    xLabels: string[];
    yLabels: string[];
    series: any[];
    visualMaps: any[];
}