/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo } from "react";
import { X, RotateCcw, Check, TrendingUp, AreaChart, BarChart2, BarChart3, PieChart, CircleDot, Hash, Table2, Trophy, ArrowUpDown, LayoutGrid } from "lucide-react";
import type { LayoutItem } from "@/components/dashboard-renderer/types";
import {
    useMeasureRegistryStore,
    getAllDatasets,
    DATASET_REGISTRY,
    type VizTypeV2,
    type WidgetConfig,
    type MeasureRef,
} from "@gsc-tech/backoffice-core";
import { useDashboardStateStore } from "@/store/dashboardStateStore";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// ─── Viz type catalogue ───────────────────────────────────────────────────────

interface VizDef { id: VizTypeV2; label: string; group: string; icon: React.ElementType }

const VIZ_CATALOGUE: VizDef[] = [
    { id: "line",         label: "Line",        group: "Time Series",  icon: TrendingUp   },
    { id: "area",         label: "Area",        group: "Time Series",  icon: AreaChart    },
    { id: "bar",          label: "Bar",         group: "Time Series",  icon: BarChart2    },
    { id: "signed-bar",   label: "Signed Bar",  group: "Time Series",  icon: BarChart3    },
    { id: "kpi-card",     label: "KPI Card",    group: "Summary",      icon: Hash         },
    { id: "donut",        label: "Gauge",       group: "Summary",      icon: CircleDot    },
    { id: "bar-h",        label: "Horiz. Bar",  group: "Distribution", icon: BarChart3    },
    { id: "pie",          label: "Pie",         group: "Distribution", icon: PieChart     },
    { id: "heatmap",      label: "Heatmap",     group: "Tabular",      icon: LayoutGrid   },
    { id: "data-table",   label: "Data Table",  group: "Tabular",      icon: Table2       },
    { id: "leaderboard",  label: "Leaderboard", group: "Ranked",       icon: Trophy       },
    { id: "winner-loser", label: "Winner/Loser",group: "Ranked",       icon: ArrowUpDown  },
    { id: "pie-table",    label: "Pie+Table",   group: "Ranked",       icon: PieChart     },
];

const VIZ_GROUPS = ["Time Series", "Summary", "Distribution", "Tabular", "Ranked"];

// ─── Measure-mode helpers ─────────────────────────────────────────────────────

type MeasureMode = "columns" | "scalars-formulas" | "single-scalar" | "single-column";

function getMeasureMode(vizType: VizTypeV2): MeasureMode {
    switch (vizType) {
        case "line":
        case "area":
        case "bar":
        case "signed-bar": return "columns";
        case "kpi-card":
        case "leaderboard":
        case "winner-loser":
        case "pie-table": return "scalars-formulas";
        case "donut": return "single-scalar";
        case "heatmap": return "single-column";
        case "bar-h":
        case "pie": return "scalars-formulas";
        case "data-table": return "columns";
        default: return "columns";
    }
}

function needsDataset(vizType: VizTypeV2) {
    return !["kpi-card", "leaderboard", "winner-loser"].includes(vizType);
}

function needsGroupBy(vizType: VizTypeV2) {
    return vizType === "bar-h" || vizType === "pie";
}

function needsRowDimension(vizType: VizTypeV2) {
    return vizType === "data-table";
}

function needsViewMode(vizType: VizTypeV2) {
    return ["line", "area", "bar", "signed-bar", "bar-h", "pie"].includes(vizType);
}

function needsTopN(vizType: VizTypeV2) {
    return ["bar-h", "pie", "leaderboard", "winner-loser"].includes(vizType);
}

// ─── Dataset helpers ──────────────────────────────────────────────────────────

function getBaseDatasetId(datasetId: string, registry: ReturnType<typeof useMeasureRegistryStore.getState>) {
    const derived = registry.derivedDatasets.find((d) => d.id === datasetId);
    return derived ? derived.sourceDatasetId : datasetId;
}

interface NameLabel { name: string; label: string }

function getColumnsForDataset(datasetId: string, registry: ReturnType<typeof useMeasureRegistryStore.getState>): NameLabel[] {
    const baseId = getBaseDatasetId(datasetId, registry);
    const regFields = Object.values(DATASET_REGISTRY[baseId]?.fields ?? {})
        .filter((f) => f.kind !== "dimension")
        .map((f) => ({ name: f.key, label: f.label }));
    const extFields = registry.extendedColumns
        .filter((c) => c.datasetId === baseId || c.datasetId === datasetId)
        .map((c) => ({ name: c.name, label: c.label ?? c.name }));
    return [...regFields, ...extFields];
}

function getDimensionFields(datasetId: string, registry: ReturnType<typeof useMeasureRegistryStore.getState>): NameLabel[] {
    const baseId = getBaseDatasetId(datasetId, registry);
    return Object.values(DATASET_REGISTRY[baseId]?.fields ?? {})
        .filter((f) => f.kind === "dimension")
        .map((f) => ({ name: f.key, label: f.label }));
}

// ─── UI primitives ────────────────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
    return (
        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/90 mb-1">
            {children}
        </p>
    );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/90 mb-1.5">
            {children}
        </p>
    );
}

function StyledSelect({ value, onChange, children }: {
    value: string;
    onChange: (v: string) => void;
    children: React.ReactNode;
}) {
    return (
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="h-8 w-full rounded border border-border/40 bg-background px-2 text-xs text-foreground focus:outline-none focus:border-primary"
        >
            {children}
        </select>
    );
}

// Checklist matching BackOffice's bordered-container style
interface CheckItem { kind: MeasureRef["kind"]; name: string; label: string; sublabel?: string }

function Checklist({
    items,
    selected,
    onToggle,
    sectionLabel,
    emptyMessage,
}: {
    items: CheckItem[];
    selected: MeasureRef[];
    onToggle: (ref: MeasureRef) => void;
    sectionLabel?: string;
    emptyMessage?: string;
}) {
    const isChecked = (item: CheckItem) =>
        selected.some((m) => m.kind === item.kind && m.name === item.name);

    if (items.length === 0) {
        return (
            <p className="text-[10px] text-muted-foreground/90 border border-dashed border-border/40 rounded px-3 py-2.5 text-center">
                {emptyMessage ?? "No measures available."}
            </p>
        );
    }

    return (
        <div className="space-y-0.5">
            {sectionLabel && (
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/90 mb-1">
                    {sectionLabel}
                </p>
            )}
            <div className="rounded border border-border/40 bg-background overflow-hidden">
                {items.map((item) => {
                    const checked = isChecked(item);
                    return (
                        <button
                            key={`${item.kind}::${item.name}`}
                            type="button"
                            onClick={() => onToggle({ kind: item.kind, name: item.name })}
                            className={cn(
                                "w-full flex items-center gap-2.5 px-2.5 py-1.5 text-left transition-colors",
                                "border-b border-border/30 last:border-b-0",
                                checked ? "bg-primary/10" : "hover:bg-muted/30",
                            )}
                        >
                            <div className={cn(
                                "flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border transition-colors",
                                checked ? "border-primary bg-primary text-primary-foreground" : "border-border",
                            )}>
                                {checked && <Check size={8} strokeWidth={3} />}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className={cn("text-xs font-medium leading-none truncate", checked ? "text-primary" : "text-foreground")}>
                                    {item.label}
                                </p>
                                {item.sublabel && (
                                    <p className="text-[10px] text-muted-foreground/70 mt-0.5 font-mono truncate">{item.sublabel}</p>
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

// Toggle row matching BackOffice's overflow-hidden border style
function ToggleRow<T extends string>({ options, value, onChange, label }: {
    options: { value: T; label: string }[];
    value: T;
    onChange: (v: T) => void;
    label: string;
}) {
    return (
        <div className="space-y-1.5">
            <FieldLabel>{label}</FieldLabel>
            <div className="flex h-8 rounded border border-border/40 overflow-hidden">
                {options.map((opt) => (
                    <button
                        key={opt.value}
                        type="button"
                        onClick={() => onChange(opt.value)}
                        className={cn(
                            "flex-1 px-3 text-[10px] font-bold uppercase tracking-widest transition-colors",
                            value === opt.value
                                ? "bg-primary text-primary-foreground"
                                : "text-muted-foreground hover:bg-muted/40",
                        )}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>
        </div>
    );
}

// VizCard with icon matching BackOffice
function VizCard({ viz, selected, onClick }: { viz: VizDef; selected: boolean; onClick: () => void }) {
    const Icon = viz.icon;
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                "flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded transition-all text-left",
                selected
                    ? "bg-primary/15 text-primary border border-primary/30"
                    : "text-muted-foreground hover:bg-muted/40 border border-transparent",
            )}
        >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            <span className="text-xs font-semibold">{viz.label}</span>
        </button>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
    item: LayoutItem;
    dashboardId: string;
    onClose: () => void;
}

export default function BackOfficeWidgetConfigEditor({ item, dashboardId, onClose }: Props) {
    const registry = useMeasureRegistryStore();
    const setWidgetConfigOverride = useDashboardStateStore((s) => s.setWidgetConfigOverride);
    const clearWidgetConfigOverride = useDashboardStateStore((s) => s.clearWidgetConfigOverride);
    const setWidgetPropsOverride = useDashboardStateStore((s) => s.setWidgetPropsOverride);
    const clearWidgetPropsOverride = useDashboardStateStore((s) => s.clearWidgetPropsOverride);
    const currentOverride = useDashboardStateStore(
        (s) => s.widgetConfigOverrides[dashboardId]?.[item.i]
    );
    const currentPropsOverride = useDashboardStateStore(
        (s) => s.widgetPropsOverrides[dashboardId]?.[item.i]
    );

    const presetConfig = item.widget?.defaultProps?.widgetConfig as WidgetConfig | undefined;
    const initialConfig = useMemo(
        () => ({ ...(presetConfig ?? {}), ...(currentOverride ?? {}) } as WidgetConfig),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        []
    );

    const [title, setTitle] = useState(initialConfig.title ?? item.widget?.name ?? "");
    const [vizType, setVizType] = useState<VizTypeV2>(initialConfig.vizType ?? "line");
    const [datasetId, setDatasetId] = useState(initialConfig.datasetId ?? "financial");
    const [measures, setMeasures] = useState<MeasureRef[]>(initialConfig.measures ?? []);
    const [heatmapMeasure, setHeatmapMeasure] = useState<MeasureRef | undefined>(initialConfig.heatmapMeasure);
    const [groupByDimension, setGroupByDimension] = useState(initialConfig.groupByDimension ?? "");
    const [rowDimension, setRowDimension] = useState(initialConfig.rowDimension ?? "time");
    const [viewMode, setViewMode] = useState<"merged" | "juxtaposed">(initialConfig.viewMode ?? "merged");
    const [topN, setTopN] = useState<number | "">(initialConfig.topN ?? "");
    const [sortDir, setSortDir] = useState<"asc" | "desc">(initialConfig.sortDir ?? "desc");
    const [maxValue, setMaxValue] = useState<number | "">(initialConfig.maxValue ?? "");

    const isStatementWidget = item.widget?.componentName === "StatementTabsWidget";

    const datasets = useMemo(() => getAllDatasets(registry), [registry]);
    const columns = useMemo(() => getColumnsForDataset(datasetId, registry), [datasetId, registry]);
    const dimensionFields = useMemo(() => getDimensionFields(datasetId, registry), [datasetId, registry]);
    const scalars = registry.scalars;
    const formulas = registry.formulas;

    const measureMode = getMeasureMode(vizType);

    // ── Statement widget config ─────────────────────────────────────────────────
    const STATEMENT_COLS = [
        { key: "charges",                    label: "Charges" },
        { key: "rebates",                    label: "Rebates" },
        { key: "volume",                     label: "Volume" },
        { key: "grossPL",                    label: "Gross P&L" },
        { key: "transCost",                  label: "Trans Cost" },
        { key: "netPL",                      label: "Net P&L" },
        { key: "netPLExclRebatesAndCharges", label: "Net P&L (Ex. R&C)" },
        { key: "traderOpeningBalance",       label: "Opening Bal." },
        { key: "traderClosingBalance",       label: "Closing Bal." },
    ];

    const [stmtVisibleCols, setStmtVisibleCols] = useState<Set<string>>(
        () => new Set((currentPropsOverride?.visibleColumns as string[] | undefined) ?? STATEMENT_COLS.map((c) => c.key))
    );
    const [stmtHorizontalScroll, setStmtHorizontalScroll] = useState<boolean>(
        (currentPropsOverride?.horizontalScroll as boolean | undefined) ?? false
    );

    // ── Measure toggle helpers ──────────────────────────────────────────────────
    function toggleMeasure(ref: MeasureRef, singleSelect = false) {
        if (singleSelect) {
            setMeasures((prev) => {
                const exists = prev.some((m) => m.name === ref.name && m.kind === ref.kind);
                return exists ? [] : [ref];
            });
        } else {
            setMeasures((prev) => {
                const exists = prev.some((m) => m.name === ref.name && m.kind === ref.kind);
                return exists ? prev.filter((m) => !(m.name === ref.name && m.kind === ref.kind)) : [...prev, ref];
            });
        }
    }

    function isMeasureChecked(ref: MeasureRef) {
        return measures.some((m) => m.name === ref.name && m.kind === ref.kind);
    }

    // ── Save ────────────────────────────────────────────────────────────────────
    function handleSave() {
        if (isStatementWidget) {
            setWidgetPropsOverride(dashboardId, item.i, {
                visibleColumns: [...stmtVisibleCols],
                horizontalScroll: stmtHorizontalScroll,
            });
            onClose();
            return;
        }

        const patch: Partial<WidgetConfig> = { title, vizType, measures };

        if (needsDataset(vizType)) patch.datasetId = datasetId;
        if (needsGroupBy(vizType)) patch.groupByDimension = groupByDimension || undefined;
        if (needsRowDimension(vizType)) patch.rowDimension = rowDimension;
        if (needsViewMode(vizType)) patch.viewMode = viewMode;
        if (needsTopN(vizType) && topN !== "") patch.topN = Number(topN);
        if (needsTopN(vizType)) patch.sortDir = sortDir;
        if (vizType === "donut" && maxValue !== "") patch.maxValue = Number(maxValue);
        if (vizType === "heatmap") { patch.heatmapMeasure = heatmapMeasure; patch.measures = []; }

        setWidgetConfigOverride(dashboardId, item.i, patch);
        onClose();
    }

    // ── Reset to preset ─────────────────────────────────────────────────────────
    function handleReset() {
        if (isStatementWidget) {
            clearWidgetPropsOverride(dashboardId, item.i);
        } else {
            clearWidgetConfigOverride(dashboardId, item.i);
        }
        onClose();
    }

    const hasOverride = isStatementWidget
        ? !!currentPropsOverride && Object.keys(currentPropsOverride).length > 0
        : !!currentOverride && Object.keys(currentOverride).length > 0;

    // Derived helpers for measure items
    const columnItems = useMemo((): CheckItem[] =>
        columns.map((c) => ({ kind: "column" as const, name: c.name, label: c.label })),
        [columns]
    );
    const scalarItems = useMemo((): CheckItem[] =>
        scalars.map((s) => ({ kind: "scalar" as const, name: s.name, label: s.label ?? s.name, sublabel: s.datasetId })),
        [scalars]
    );
    const formulaItems = useMemo((): CheckItem[] =>
        formulas.map((f) => ({ kind: "formula" as const, name: f.name, label: f.label ?? f.name, sublabel: "formula" })),
        [formulas]
    );

    const vizGroups = VIZ_GROUPS.map((g) => ({
        group: g,
        items: VIZ_CATALOGUE.filter((v) => v.group === g),
    }));

    const handleVizTypeChange = (v: VizTypeV2) => {
        setVizType(v);
        setMeasures([]);
        setHeatmapMeasure(undefined);
        setGroupByDimension("");
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div
                className="relative w-full max-w-3xl flex flex-col rounded border border-border/40 shadow-2xl bg-background"
                style={{ height: "80vh" }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/40 shrink-0">
                    <p className="text-sm font-bold text-foreground">Edit Widget</p>
                    <div className="flex items-center gap-2">
                        {hasOverride && (
                            <button
                                onClick={handleReset}
                                title="Reset to preset defaults"
                                className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-semibold text-amber-500 hover:bg-amber-500/10 border border-amber-500/20 transition-colors"
                            >
                                <RotateCcw size={10} />
                                Reset
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
                        >
                            <X size={14} />
                        </button>
                    </div>
                </div>

                {/* Body: two-panel layout */}
                <div className="flex flex-1 min-h-0 overflow-hidden">

                    {/* Left panel: viz type (hidden for StatementTabsWidget) */}
                    {!isStatementWidget && (
                        <div className="w-[190px] shrink-0 border-r border-border/40 bg-muted/10 flex flex-col overflow-y-auto">
                            <div className="px-2 pt-3 pb-2 space-y-3">
                                {vizGroups.map(({ group, items }) => (
                                    <div key={group}>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/90 px-1 mb-1">
                                            {group}
                                        </p>
                                        <div className="space-y-0.5">
                                            {items.map((v) => (
                                                <VizCard
                                                    key={v.id}
                                                    viz={v}
                                                    selected={vizType === v.id}
                                                    onClick={() => handleVizTypeChange(v.id)}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Right panel: config */}
                    <div className="flex-1 overflow-y-auto px-5 pt-4 pb-4 space-y-4">

                        {/* ── StatementTabsWidget dedicated config ── */}
                        {isStatementWidget && (
                            <>
                                <div>
                                    <SectionLabel>Visible Columns</SectionLabel>
                                    <div className="rounded border border-border/40 bg-background overflow-hidden">
                                        {STATEMENT_COLS.map((col) => {
                                            const checked = stmtVisibleCols.has(col.key);
                                            return (
                                                <button
                                                    key={col.key}
                                                    type="button"
                                                    onClick={() => setStmtVisibleCols((prev) => {
                                                        const next = new Set(prev);
                                                        next.has(col.key) ? next.delete(col.key) : next.add(col.key);
                                                        return next;
                                                    })}
                                                    className={cn(
                                                        "w-full flex items-center gap-2.5 px-2.5 py-1.5 text-left transition-colors",
                                                        "border-b border-border/30 last:border-b-0",
                                                        checked ? "bg-primary/10" : "hover:bg-muted/30",
                                                    )}
                                                >
                                                    <div className={cn(
                                                        "flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border transition-colors",
                                                        checked ? "border-primary bg-primary text-primary-foreground" : "border-border",
                                                    )}>
                                                        {checked && <Check size={8} strokeWidth={3} />}
                                                    </div>
                                                    <span className={cn("text-xs font-medium", checked ? "text-primary" : "text-foreground")}>
                                                        {col.label}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                                <ToggleRow
                                    label="Horizontal Scroll"
                                    options={[{ value: "false", label: "Off" }, { value: "true", label: "On" }]}
                                    value={String(stmtHorizontalScroll)}
                                    onChange={(v) => setStmtHorizontalScroll(v === "true")}
                                />
                            </>
                        )}

                        {/* ── Generic viz-type config ── */}
                        {!isStatementWidget && (
                            <>
                                {/* Title */}
                                <div className="space-y-1.5">
                                    <FieldLabel>Widget Title</FieldLabel>
                                    <Input
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="e.g. Daily Net P&L"
                                        className="h-8 text-xs"
                                    />
                                </div>

                                {/* Dataset */}
                                {needsDataset(vizType) && (
                                    <div className="space-y-1.5">
                                        <FieldLabel>Dataset</FieldLabel>
                                        <StyledSelect value={datasetId} onChange={(v) => { setDatasetId(v); setMeasures([]); setHeatmapMeasure(undefined); }}>
                                            {datasets.map((d) => (
                                                <option key={d.id} value={d.id}>{d.label}</option>
                                            ))}
                                        </StyledSelect>
                                    </div>
                                )}

                                {/* Row dimension — data-table */}
                                {needsRowDimension(vizType) && (
                                    <div className="space-y-1.5">
                                        <FieldLabel>Row Dimension</FieldLabel>
                                        <p className="text-[10px] text-muted-foreground/90">
                                            How each row is identified — by date, by entity, or both.
                                        </p>
                                        <StyledSelect value={rowDimension} onChange={setRowDimension}>
                                            <option value="time">Date (time series)</option>
                                            {dimensionFields.map((d) => (
                                                <option key={d.name} value={`entity:${d.name}`}>{d.label}</option>
                                            ))}
                                            {dimensionFields.map((d) => (
                                                <option key={`te-${d.name}`} value={`time+entity:${d.name}`}>Date × {d.label}</option>
                                            ))}
                                        </StyledSelect>
                                    </div>
                                )}

                                {/* Measures section */}
                                <div className="space-y-2">
                                    <FieldLabel>Measures</FieldLabel>

                                    {/* Time-series / data-table: columns */}
                                    {(measureMode === "columns" || measureMode === "single-column") && (
                                        <Checklist
                                            items={columnItems}
                                            selected={measureMode === "single-column"
                                                ? (heatmapMeasure ? [heatmapMeasure] : [])
                                                : measures}
                                            onToggle={(ref) => {
                                                if (measureMode === "single-column") {
                                                    setHeatmapMeasure(
                                                        heatmapMeasure?.name === ref.name ? undefined : ref
                                                    );
                                                } else {
                                                    toggleMeasure(ref, false);
                                                }
                                            }}
                                            emptyMessage="No columns for this dataset."
                                        />
                                    )}

                                    {/* KPI / distribution / pie-table: scalars + formulas (multi) */}
                                    {measureMode === "scalars-formulas" && (
                                        <div className="space-y-3">
                                            <Checklist
                                                items={scalarItems}
                                                selected={measures}
                                                onToggle={(ref) => toggleMeasure(ref, false)}
                                                sectionLabel="Scalars"
                                                emptyMessage="No scalars defined. Open the Measures panel."
                                            />
                                            {formulaItems.length > 0 && (
                                                <Checklist
                                                    items={formulaItems}
                                                    selected={measures}
                                                    onToggle={(ref) => toggleMeasure(ref, false)}
                                                    sectionLabel="Formulas"
                                                />
                                            )}
                                        </div>
                                    )}

                                    {/* Gauge: exactly one scalar or formula */}
                                    {measureMode === "single-scalar" && (
                                        <div className="space-y-3">
                                            {scalarItems.length > 0 && (
                                                <Checklist
                                                    items={scalarItems}
                                                    selected={measures}
                                                    onToggle={(ref) => toggleMeasure(ref, true)}
                                                    sectionLabel="Scalars"
                                                    emptyMessage="No scalars defined. Open the Measures panel."
                                                />
                                            )}
                                            {formulaItems.length > 0 && (
                                                <Checklist
                                                    items={formulaItems}
                                                    selected={measures}
                                                    onToggle={(ref) => toggleMeasure(ref, true)}
                                                    sectionLabel="Formulas"
                                                />
                                            )}
                                            {scalarItems.length === 0 && formulaItems.length === 0 && (
                                                <p className="text-[10px] text-muted-foreground/90 border border-dashed border-border/40 rounded px-3 py-2.5 text-center">
                                                    No scalars or formulas defined. Open the Measures panel.
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Max value (gauge) */}
                                {vizType === "donut" && (
                                    <div className="space-y-1.5">
                                        <FieldLabel>Target / Max Value</FieldLabel>
                                        <Input
                                            type="number"
                                            min={1}
                                            value={maxValue}
                                            onChange={(e) => setMaxValue(e.target.value === "" ? "" : Number(e.target.value))}
                                            placeholder="100"
                                            className="h-8 text-xs"
                                        />
                                        <p className="text-[10px] text-muted-foreground/90">
                                            The gauge fills to this value. Overflow shows when exceeded.
                                        </p>
                                    </div>
                                )}

                                {/* Group By (distribution charts) */}
                                {needsGroupBy(vizType) && dimensionFields.length > 0 && (
                                    <div className="space-y-1.5">
                                        <FieldLabel>Group By Dimension</FieldLabel>
                                        <StyledSelect value={groupByDimension} onChange={setGroupByDimension}>
                                            <option value="">— None —</option>
                                            {dimensionFields.map((d) => (
                                                <option key={d.name} value={d.name}>{d.label}</option>
                                            ))}
                                        </StyledSelect>
                                    </div>
                                )}

                                {/* View mode (multi-group layout) */}
                                {needsViewMode(vizType) && (
                                    <ToggleRow
                                        label="Multi-Group Layout"
                                        options={[
                                            { value: "merged", label: "Overlay" },
                                            { value: "juxtaposed", label: "Side by Side" },
                                        ]}
                                        value={viewMode}
                                        onChange={setViewMode}
                                    />
                                )}

                                {/* Top N + sort direction */}
                                {needsTopN(vizType) && (
                                    <div className="flex gap-3">
                                        <div className="flex-1 space-y-1.5">
                                            <FieldLabel>Top N</FieldLabel>
                                            <Input
                                                type="number"
                                                min={1}
                                                value={topN}
                                                onChange={(e) => setTopN(e.target.value === "" ? "" : Number(e.target.value))}
                                                placeholder="All"
                                                className="h-8 text-xs"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <FieldLabel>Sort</FieldLabel>
                                            <div className="flex h-8 rounded border border-border/40 overflow-hidden">
                                                {(["desc", "asc"] as const).map((dir) => (
                                                    <button
                                                        key={dir}
                                                        type="button"
                                                        onClick={() => setSortDir(dir)}
                                                        className={cn(
                                                            "px-3 text-[10px] font-bold uppercase tracking-widest transition-colors",
                                                            sortDir === dir
                                                                ? "bg-primary text-primary-foreground"
                                                                : "text-muted-foreground hover:bg-muted/40",
                                                        )}
                                                    >
                                                        {dir === "desc" ? "High → Low" : "Low → High"}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-5 py-3 border-t border-border/40 shrink-0">
                    <p className="text-[10px] text-muted-foreground/90">
                        {isStatementWidget
                            ? `${stmtVisibleCols.size} column${stmtVisibleCols.size !== 1 ? "s" : ""} visible`
                            : measureMode === "single-column"
                                ? heatmapMeasure ? "1 measure selected" : "Select a measure"
                                : measures.length === 0
                                    ? "Select at least one measure"
                                    : `${measures.length} measure${measures.length !== 1 ? "s" : ""} selected`
                        }
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={onClose}
                            className="px-3 py-1.5 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-4 py-1.5 rounded text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                        >
                            Save Changes
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
