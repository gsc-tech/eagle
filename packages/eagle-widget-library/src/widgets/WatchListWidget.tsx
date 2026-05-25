import type { BaseWidgetProps, ParameterValues } from "../types";
import { useEffect, useState } from "react";
import { TrendingUp, Plus, X } from "lucide-react";
import { SparkLineChart } from "@mui/x-charts/SparkLineChart";
import { WidgetContainer } from "../components/WidgetContainer";
import { useParameterDefaults } from "../hooks/useParameterDefaults";

// ─── Public types ─────────────────────────────────────────────────────────────

/** Default item shape — used when no `rowRenderer` is supplied. */
export interface WatchListItem {
    symbol: string;
    name: string;
    price: number;
    changePercent: number;
    data: number[];
}

export interface WatchListWidgetProps extends BaseWidgetProps {
    /** Items to render. Shape is opaque to the widget when `rowRenderer` is set. */
    items?: unknown[];
    /**
     * Custom row renderer. Replaces the default Symbol/Sparkline/Price row.
     * Click/menu handlers inside the returned node should call
     * `e.stopPropagation()` if they don't want to bubble to `onItemClick`.
     */
    rowRenderer?: (item: unknown, index: number) => React.ReactNode;
    /** Fires when a row is clicked. Used by the default renderer too. */
    onItemClick?: (item: unknown, index: number) => void;
    /** Fires when a user removes an item via the default renderer's × button. */
    onRemoveItem?: (item: unknown, index: number) => void;
    /** Fires when the user submits a new entry from the built-in add form. */
    onAddItem?: (value: string) => void;
    /** Header title. Pass `null` to hide. Defaults to "Watchlist". */
    headerTitle?: string | null;
    /** Hide the built-in add (+) button. */
    hideAddButton?: boolean;
    /** Placeholder for the built-in add input. */
    addPlaceholder?: string;
    /** Empty-state message. */
    emptyMessage?: string;
    /**
     * When true, skips the outer WidgetContainer so a parent shell can own it.
     * Used by SeasonalityWatchlistWidget which wraps the whole card itself.
     */
    bare?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

const WatchListWidget: React.FC<WatchListWidgetProps> = ({
    parameters,
    darkMode = false,
    onGroupedParametersChange,
    groupedParametersValues,
    initialWidgetState,
    onWidgetStateChange,
    items = [],
    rowRenderer,
    onItemClick,
    onRemoveItem,
    onAddItem,
    headerTitle = "Watchlist",
    hideAddButton = false,
    addPlaceholder = "Add entry…",
    emptyMessage = "No items yet.",
    bare = false,
}) => {
    const [showAddForm, setShowAddForm] = useState(false);
    const [newEntry, setNewEntry] = useState("");

    const defaultParams = useParameterDefaults(parameters);
    const [currentParams, setCurrentParams] = useState<ParameterValues>(
        () => initialWidgetState?.parameters || defaultParams,
    );

    useEffect(() => {
        onWidgetStateChange?.({ parameters: currentParams });
    }, [currentParams, onWidgetStateChange]);

    const handleParametersChange = (values: ParameterValues) => setCurrentParams(values);

    const submitAdd = () => {
        const trimmed = newEntry.trim();
        if (!trimmed) return;
        onAddItem?.(trimmed);
        setNewEntry("");
        setShowAddForm(false);
    };

    // Default row renderer — interprets items as `WatchListItem`.
    const defaultRenderer = (raw: unknown, index: number) => {
        const item = raw as WatchListItem;
        const isPositive = (item.changePercent ?? 0) >= 0;
        return (
            <div
                key={item.symbol ?? index}
                onClick={() => onItemClick?.(item, index)}
                className="p-3 rounded-xl shadow-sm border transition-all cursor-pointer group flex items-center justify-between bg-white/80 dark:bg-[#1a1a1a] backdrop-blur-sm border-white/50 dark:border-[#2e2e2e] hover:shadow-md dark:hover:bg-[#2e2e2e]/80"
            >
                <div className="flex flex-col min-w-[100px]">
                    <span className="font-bold text-base text-slate-800 dark:text-[#f5f5f5]">{item.symbol}</span>
                    <span className="text-xs truncate max-w-[120px] text-slate-500 dark:text-[#909090]">{item.name}</span>
                </div>
                <div className="flex-1 flex justify-end px-2">
                    <SparkLineChart
                        data={(item.data ?? []).slice(-30)}
                        color={isPositive ? (darkMode ? "#4ade80" : "green") : (darkMode ? "#f87171" : "red")}
                        width={100}
                        height={50}
                        showTooltip={true}
                        showHighlight={true}
                    />
                </div>
                <div className="flex flex-col items-end min-w-[80px]">
                    <span className={`text-sm font-semibold ${isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                        {isPositive ? "+" : ""}{Number(item.changePercent ?? 0).toFixed(2)}%
                    </span>
                    <span className="font-medium text-slate-700 dark:text-[#f0f0f0]">{item.price}</span>
                </div>
                {onRemoveItem && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onRemoveItem(item, index);
                        }}
                        className="opacity-0 group-hover:opacity-100 ml-2 p-1.5 rounded-lg transition-all text-slate-400 dark:text-[#606060] hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-500 dark:hover:text-red-400"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>
        );
    };

    const render = rowRenderer ?? defaultRenderer;

    const inner = (
            <div className="flex flex-col h-full p-4 font-sans relative">
                {(headerTitle !== null || !hideAddButton) && (
                    <div className="drag-handle flex justify-between items-center mb-4 px-1">
                        {headerTitle !== null ? (
                            <div className="flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                                <h2 className="font-semibold text-lg text-slate-800 dark:text-[#f5f5f5]">{headerTitle}</h2>
                            </div>
                        ) : <span />}
                        {!hideAddButton && onAddItem && (
                            <button
                                onClick={() => setShowAddForm((s) => !s)}
                                className={`p-1.5 rounded-lg transition-colors ${
                                    showAddForm
                                        ? "bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400"
                                        : "text-slate-600 dark:text-[#909090] hover:bg-white/50 dark:hover:bg-[#222222] hover:text-slate-900 dark:hover:text-[#f0f0f0]"
                                }`}
                            >
                                <Plus className={`w-5 h-5 transition-transform duration-200 ${showAddForm ? "rotate-45" : ""}`} />
                            </button>
                        )}
                    </div>
                )}

                {showAddForm && onAddItem && (
                    <div className="mb-3">
                        <div className="flex gap-2 p-1.5 rounded-xl border transition-all bg-white/60 dark:bg-[#1a1a1a] border-white/50 dark:border-[#2e2e2e] focus-within:bg-white dark:focus-within:bg-[#1a1a1a] focus-within:shadow-sm focus-within:border-blue-200 dark:focus-within:border-blue-500">
                            <input
                                autoFocus
                                type="text"
                                value={newEntry}
                                onChange={(e) => setNewEntry(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") submitAdd();
                                    if (e.key === "Escape") setShowAddForm(false);
                                }}
                                placeholder={addPlaceholder}
                                className="flex-1 px-2 py-1 bg-transparent text-sm focus:outline-none font-medium text-slate-700 dark:text-[#f0f0f0] placeholder:text-slate-400 dark:placeholder:text-[#606060]"
                            />
                            <button
                                onClick={submitAdd}
                                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm"
                            >
                                Add
                            </button>
                        </div>
                    </div>
                )}

                <div className="flex flex-col gap-3 overflow-y-auto pr-1 flex-1">
                    {items.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-sm text-slate-400 dark:text-[#606060]">
                            {emptyMessage}
                        </div>
                    ) : (
                        items.map((item, i) => render(item, i))
                    )}
                </div>
            </div>
    );

    if (bare) return inner;

    return (
        <WidgetContainer
            parameters={parameters}
            onParametersChange={handleParametersChange}
            darkMode={darkMode}
            initialParameterValues={currentParams}
            onGroupedParametersChange={onGroupedParametersChange}
            groupedParametersValues={groupedParametersValues}
        >
            {inner}
        </WidgetContainer>
    );
};

export default WatchListWidget;

export const WatchListWidgetDef = {
    component: WatchListWidget,
};