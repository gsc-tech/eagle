import { useState } from "react";
import { X, RotateCcw } from "lucide-react";
import type { LayoutItem } from "@/components/dashboard-renderer/types";
import { useDashboardStateStore } from "@/store/dashboardStateStore";

type Granularity = "daily" | "weekly" | "monthly";
type FooterMode = "sum" | "avg";

const GRANULARITY_OPTIONS: { value: Granularity; label: string; description: string }[] = [
    { value: "daily",   label: "Daily",   description: "Opens to the daily statement by default" },
    { value: "weekly",  label: "Weekly",  description: "Opens to the weekly statement by default" },
    { value: "monthly", label: "Monthly", description: "Opens to the monthly statement by default" },
];

interface ColumnOption {
    key: string;
    label: string;
    group: string;
}

const COLUMN_OPTIONS: ColumnOption[] = [
    { key: "charges",                    label: "Charges",           group: "Currency" },
    { key: "rebates",                    label: "Rebates",           group: "Currency" },
    { key: "grossPL",                    label: "Gross P&L",         group: "Currency" },
    { key: "transCost",                  label: "Trans Cost",        group: "Currency" },
    { key: "netPL",                      label: "Net P&L",           group: "Currency" },
    { key: "netPLExclRebatesAndCharges", label: "Net P&L (Ex. R&C)", group: "Currency" },
    { key: "traderOpeningBalance",       label: "Opening Bal.",      group: "Balance"  },
    { key: "traderClosingBalance",       label: "Closing Bal.",      group: "Balance"  },
    { key: "volume",                     label: "Volume",            group: "Number"   },
];

const ALL_KEYS = COLUMN_OPTIONS.map((c) => c.key);
const GROUPS = Array.from(new Set(COLUMN_OPTIONS.map((c) => c.group)));

interface Props {
    item: LayoutItem;
    dashboardId: string;
    onClose: () => void;
}

export default function StatementTabsEditor({ item, dashboardId, onClose }: Props) {
    const setWidgetPropsOverride = useDashboardStateStore((s) => s.setWidgetPropsOverride);
    const clearWidgetPropsOverride = useDashboardStateStore((s) => s.clearWidgetPropsOverride);
    const currentOverride = useDashboardStateStore(
        (s) => s.widgetPropsOverrides[dashboardId]?.[item.i]
    );

    const currentGranularity: Granularity =
        (currentOverride?.defaultGranularity as Granularity) ||
        (item.widget?.defaultProps?.defaultGranularity as Granularity) ||
        "daily";

    const currentVisibleColumns: string[] =
        (currentOverride?.visibleColumns as string[]) ||
        (item.widget?.defaultProps?.visibleColumns as string[]) ||
        ALL_KEYS;

    const currentFooterMode: FooterMode =
        (currentOverride?.footerMode as FooterMode) ||
        (item.widget?.defaultProps?.footerMode as FooterMode) ||
        "sum";

    const [granularity, setGranularity] = useState<Granularity>(currentGranularity);
    const [selected, setSelected] = useState<Set<string>>(() => new Set(currentVisibleColumns));
    const [footerMode, setFooterMode] = useState<FooterMode>(currentFooterMode);

    const hasOverride = !!currentOverride && Object.keys(currentOverride).length > 0;

    const toggleCol = (key: string) =>
        setSelected((prev) => {
            const next = new Set(prev);
            next.has(key) ? next.delete(key) : next.add(key);
            return next;
        });

    const toggleAll = () =>
        setSelected((prev) => prev.size === ALL_KEYS.length ? new Set() : new Set(ALL_KEYS));

    function handleSave() {
        setWidgetPropsOverride(dashboardId, item.i, {
            defaultGranularity: granularity,
            visibleColumns: Array.from(selected),
            footerMode,
        });
        onClose();
    }

    function handleReset() {
        clearWidgetPropsOverride(dashboardId, item.i);
        onClose();
    }

    const allSelected = selected.size === ALL_KEYS.length;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="relative w-full max-w-sm flex flex-col rounded-2xl border border-zinc-700 shadow-2xl bg-[#111113] max-h-[90vh]">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-800 shrink-0">
                    <div>
                        <h2 className="text-base font-bold text-white">Edit Statement Table</h2>
                        <p className="text-xs text-zinc-500 mt-0.5">{item.widget?.name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {hasOverride && (
                            <button
                                onClick={handleReset}
                                title="Reset to preset defaults"
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-amber-400 hover:bg-amber-500/10 border border-amber-500/20 transition-colors"
                            >
                                <RotateCcw size={12} />
                                Reset
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

                    {/* Default tab */}
                    <section className="space-y-3">
                        <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">
                            Default Tab
                        </p>
                        <div className="flex gap-2">
                            {GRANULARITY_OPTIONS.map((opt) => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => setGranularity(opt.value)}
                                    className={`flex-1 py-2 rounded-lg border text-xs font-semibold transition-colors ${
                                        granularity === opt.value
                                            ? "bg-blue-600/15 border-blue-500/40 text-blue-300"
                                            : "border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
                                    }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </section>

                    {/* Footer aggregation */}
                    <section className="space-y-3">
                        <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">
                            Footer Row
                        </p>
                        <div className="flex gap-2">
                            {(["sum", "avg"] as FooterMode[]).map((mode) => (
                                <button
                                    key={mode}
                                    type="button"
                                    onClick={() => setFooterMode(mode)}
                                    className={`flex-1 py-2 rounded-lg border text-xs font-semibold transition-colors ${
                                        footerMode === mode
                                            ? "bg-blue-600/15 border-blue-500/40 text-blue-300"
                                            : "border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
                                    }`}
                                >
                                    {mode === "sum" ? "Sum" : "Average"}
                                </button>
                            ))}
                        </div>
                    </section>

                    {/* Column selector */}
                    <section className="space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">
                                Columns
                            </p>
                            <button
                                onClick={toggleAll}
                                className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
                            >
                                {allSelected ? "Deselect all" : "Select all"}
                            </button>
                        </div>

                        {GROUPS.map((group) => (
                            <div key={group}>
                                <p className="text-[9px] uppercase tracking-widest text-zinc-600 mb-1.5">{group}</p>
                                <div className="space-y-1">
                                    {COLUMN_OPTIONS.filter((c) => c.group === group).map((col) => (
                                        <label
                                            key={col.key}
                                            className="flex items-center gap-3 px-3 py-2 rounded-lg border border-transparent hover:border-zinc-800 cursor-pointer transition-colors"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selected.has(col.key)}
                                                onChange={() => toggleCol(col.key)}
                                                className="w-3.5 h-3.5 accent-blue-500 cursor-pointer"
                                            />
                                            <span className={`text-xs font-mono ${selected.has(col.key) ? "text-zinc-200" : "text-zinc-500"}`}>
                                                {col.label}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </section>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800 shrink-0">
                    <button
                        onClick={onClose}
                        className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={selected.size === 0}
                        className={`text-sm px-5 py-2 rounded-lg font-semibold transition-all ${
                            selected.size > 0
                                ? "bg-blue-600 hover:bg-blue-500 text-white"
                                : "bg-zinc-700 text-zinc-500 cursor-not-allowed"
                        }`}
                    >
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
}
