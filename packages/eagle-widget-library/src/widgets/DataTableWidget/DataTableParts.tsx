import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { AgGridReact } from "ag-grid-react";
import { useGridFilter } from "ag-grid-react";
import type { ColDef, ColGroupDef, ITooltipParams, ValueFormatterParams, IDoesFilterPassParams } from "ag-grid-community";
import { myLightTheme, myDarkTheme, BADGE_VARIANTS, flattenLeaves } from "./dataTableConfig";
import type { BadgeVariant } from "./dataTableConfig";

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

export const CustomTooltip = (props: ITooltipParams & { darkMode?: boolean }) => {
    const field = (props.colDef as ColDef)?.field;
    const breakdown = field && props.data ? props.data[`${field}_breakdown`] : null;
    const bgClass = props.darkMode
        ? "bg-[#222222] border-[#333333] text-[#f0f0f0]"
        : "bg-white border-gray-300 text-gray-900";

    return (
        <div className={`p-4 rounded-lg shadow-lg border text-sm ${bgClass}`} style={{ minWidth: 150 }}>
            <h4 className="font-bold mb-2 pb-1 border-b opacity-80">
                Breakdown for {props.valueFormatted || props.value}
            </h4>
            {breakdown ? (
                Object.entries(breakdown).map(([key, val]) => {
                    const numVal = Number(val);
                    const isNum = !isNaN(numVal) && val !== "" && val !== null;
                    const textColor = isNum && numVal > 0 ? "#22c55e" : isNum && numVal < 0 ? "#ef4444" : "inherit";
                    return (
                        <div key={key} className="flex justify-between gap-4 my-1">
                            <span className="capitalize opacity-70">{key}:</span>
                            <span className="font-semibold tabular-nums" style={{ color: textColor }}>
                                {isNum ? numVal.toLocaleString() : String(val)}
                            </span>
                        </div>
                    );
                })
            ) : (
                <div className="opacity-70 italic text-xs">No breakdown available.</div>
            )}
        </div>
    );
};

// ─── Multi-Select Filter ──────────────────────────────────────────────────────

export const MultiSelectFilter = (props: any) => {
    const { model, onModelChange, getValue, darkMode, uniqueValues } = props;
    const [filterText, setFilterText] = useState("");

    const allValues = useMemo(() => uniqueValues || [], [uniqueValues]);
    const selectedValues = useMemo(() => new Set(model?.values || []), [model]);
    const filteredValues = useMemo(() => {
        if (!filterText) return allValues;
        const low = filterText.toLowerCase();
        return allValues.filter((v: any) => String(v).toLowerCase().includes(low));
    }, [allValues, filterText]);

    const doesFilterPass = useCallback(
        (params: IDoesFilterPassParams) => {
            const val = getValue(params.node);
            return selectedValues.size === 0 || selectedValues.has(val);
        },
        [selectedValues, getValue]
    );
    useGridFilter({ doesFilterPass });

    const toggleValue = (val: any) => {
        const next = new Set(selectedValues);
        next.has(val) ? next.delete(val) : next.add(val);
        onModelChange(next.size > 0 ? { values: Array.from(next) } : null);
    };
    const toggleAll = () => {
        selectedValues.size === allValues.length
            ? onModelChange(null)
            : onModelChange({ values: allValues });
    };

    const bg = darkMode ? "#141414" : "#fff";
    const text = darkMode ? "#f0f0f0" : "#374151";
    const border = darkMode ? "#2e2e2e" : "#e5e7eb";
    const hoverBg = darkMode ? "#222222" : "#f3f4f6";

    return (
        <div style={{ padding: 12, minWidth: 200, background: bg, color: text, border: `1px solid ${border}`, borderRadius: 8, boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)" }}>
            <div style={{ marginBottom: 10 }}>
                <input
                    type="text"
                    placeholder="Search..."
                    value={filterText}
                    onChange={(e) => setFilterText(e.target.value)}
                    style={{ width: "100%", padding: "6px 10px", fontSize: 12, background: darkMode ? "#1e1e1e" : "#f9fafb", border: `1px solid ${border}`, borderRadius: 6, color: text, outline: "none" }}
                />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0", marginBottom: 8, borderBottom: `1px solid ${border}`, cursor: "pointer", fontSize: 11, fontWeight: 600, opacity: 0.8 }} onClick={toggleAll}>
                <input type="checkbox" checked={selectedValues.size === allValues.length && allValues.length > 0} readOnly />
                <span>(Select All)</span>
            </div>
            <div style={{ maxHeight: 200, overflowY: "auto", display: "flex", flexDirection: "column" }}>
                {filteredValues.map((v: any) => (
                    <label
                        key={String(v)}
                        style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 6px", cursor: "pointer", borderRadius: 4, transition: "background 0.1s" }}
                        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = hoverBg)}
                        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
                    >
                        <input type="checkbox" checked={selectedValues.has(v)} onChange={() => toggleValue(v)} />
                        <span style={{ fontSize: 13 }}>{String(v)}</span>
                    </label>
                ))}
            </div>
        </div>
    );
};

// ─── Column Visibility Toolbar ────────────────────────────────────────────────

interface ColVisibilityToolbarProps {
    colDefs: (ColDef | ColGroupDef)[];
    hiddenCols: Set<string>;
    onToggle: (field: string) => void;
    onToggleGroup: (fields: string[], targetVisible: boolean) => void;
    darkMode: boolean;
}

export function ColVisibilityToolbar({ colDefs, hiddenCols, onToggle, onToggleGroup, darkMode }: ColVisibilityToolbarProps) {
    const [open, setOpen] = useState(false);
    const btnRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const [pos, setPos] = useState({ top: 0, right: 0 });

    const reposition = useCallback(() => {
        if (!btnRef.current) return;
        const rect = btnRef.current.getBoundingClientRect();
        setPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
    }, []);

    useEffect(() => {
        if (!open) return;
        reposition();
        window.addEventListener("scroll", reposition, true);
        window.addEventListener("resize", reposition);
        return () => {
            window.removeEventListener("scroll", reposition, true);
            window.removeEventListener("resize", reposition);
        };
    }, [open, reposition]);

    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (
                panelRef.current && !panelRef.current.contains(e.target as Node) &&
                btnRef.current && !btnRef.current.contains(e.target as Node)
            ) setOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [open]);

    const hiddenCount = hiddenCols.size;
    const itemText = darkMode ? "#e0e0e0" : "#374151";
    const hoverRowBg = darkMode ? "#222222" : "#f3f4f6";

    const checkboxBase: React.CSSProperties = { flexShrink: 0, width: 14, height: 14, borderRadius: 3, border: "1.5px solid", display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "background 0.12s, border-color 0.12s" };
    const checkedBox: React.CSSProperties = { ...checkboxBase, background: "#3b82f6", borderColor: "#3b82f6" };
    const partialBox: React.CSSProperties = { ...checkboxBase, background: "rgba(59,130,246,0.45)", borderColor: "#3b82f6" };
    const uncheckedBox: React.CSSProperties = { ...checkboxBase, background: "transparent", borderColor: darkMode ? "#3a3a3a" : "#d1d5db" };
    const Tick = () => <svg width={8} height={8} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>;

    const renderItems = (defs: (ColDef | ColGroupDef)[], depth = 0): React.ReactNode =>
        defs.map((def, idx) => {
            const paddingLeft = depth * 16 + 12;
            if ("children" in def) {
                const groupDef = def as ColGroupDef;
                const childFields = flattenLeaves([groupDef] as any).map((c: ColDef) => c.field!);
                const visibleCount = childFields.filter((f: string) => !hiddenCols.has(f)).length;
                const isAllVisible = visibleCount === childFields.length;
                const isPartiallyVisible = visibleCount > 0 && visibleCount < childFields.length;
                return (
                    <div key={`group-${groupDef.headerName}-${idx}`}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 12px", paddingLeft, color: itemText }}>
                            <span onClick={() => onToggleGroup(childFields, !isAllVisible)} style={isAllVisible ? checkedBox : isPartiallyVisible ? partialBox : uncheckedBox}>
                                {isAllVisible && <Tick />}
                                {isPartiallyVisible && <span style={{ width: 6, height: 2, background: "#fff", borderRadius: 1 }} />}
                            </span>
                            <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.9 }}>{groupDef.headerName}</span>
                        </div>
                        {renderItems(groupDef.children as (ColDef | ColGroupDef)[], depth + 1)}
                    </div>
                );
            }
            const colDef = def as ColDef;
            const isVisible = !hiddenCols.has(colDef.field!);
            return (
                <div key={colDef.field} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 12px", paddingLeft, color: itemText, cursor: "default" }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = hoverRowBg)}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}>
                    <span onClick={() => onToggle(colDef.field!)} style={isVisible ? checkedBox : uncheckedBox}>{isVisible && <Tick />}</span>
                    <span style={{ fontSize: 12, opacity: 0.85 }}>{colDef.headerName}</span>
                </div>
            );
        });

    const panelBg = darkMode ? "#141414" : "#ffffff";
    const panelBorder = darkMode ? "#2e2e2e" : "#e5e7eb";

    return (
        <div className="flex-shrink-0">
            <button ref={btnRef} onClick={() => setOpen((o) => !o)}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-md border shadow-sm transition-all duration-200 ${darkMode ? "border-[#333333] bg-[#222222] text-[#e0e0e0] hover:bg-[#2a2a2a]" : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"}`}>
                <svg className="w-3.5 h-3.5 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                </svg>
                <span>Columns</span>
                {hiddenCount > 0 && (
                    <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold bg-blue-500 text-white">{hiddenCount}</span>
                )}
            </button>
            {open && createPortal(
                <div
                    ref={panelRef}
                    style={{ position: "fixed", top: pos.top, right: pos.right, background: panelBg, border: `1px solid ${panelBorder}`, boxShadow: darkMode ? "0 20px 60px rgba(0,0,0,0.7)" : "0 10px 40px rgba(0,0,0,0.15)" }}
                    className="z-[99999] min-w-[200px] rounded-xl overflow-hidden flex flex-col animate-column-panel-in"
                >
                    <div style={{ background: darkMode ? "#1e1e1e" : "#f3f4f6", borderBottom: `1px solid ${panelBorder}`, color: darkMode ? "#606060" : "#9ca3af" }} className="shrink-0 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest">
                        Column Settings
                    </div>
                    <div className="overflow-y-auto max-h-[400px] widget-scrollbar">{renderItems(colDefs)}</div>
                </div>,
                document.body
            )}
        </div>
    );
}

// ─── Tab Bar ──────────────────────────────────────────────────────────────────

interface TabBarProps {
    tabs: string[];
    activeTab: string;
    onTabChange: (tab: string) => void;
    darkMode: boolean;
    toolbar?: React.ReactNode;
}

export function TabBar({ tabs, activeTab, onTabChange, darkMode, toolbar }: TabBarProps) {
    const showTabs = tabs.length > 1;
    const scrollRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    const checkScroll = useCallback(() => {
        if (!scrollRef.current) return;
        const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
        setCanScrollLeft(scrollLeft > 1);
        setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
    }, []);

    useEffect(() => {
        checkScroll();
        const el = scrollRef.current;
        if (!el) return;
        const ro = new ResizeObserver(checkScroll);
        ro.observe(el);
        return () => ro.disconnect();
    }, [checkScroll, tabs]);

    useEffect(() => {
        if (!scrollRef.current || !activeTab) return;
        scrollRef.current.querySelector('[data-active="true"]')?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    }, [activeTab]);

    const scroll = (dir: "left" | "right") => {
        if (!scrollRef.current) return;
        scrollRef.current.scrollBy({ left: dir === "left" ? -scrollRef.current.clientWidth * 0.75 : scrollRef.current.clientWidth * 0.75, behavior: "smooth" });
    };

    if (!showTabs && !toolbar) return null;

    const arrowColor = darkMode ? "text-[#b0b0b0] hover:text-[#f0f0f0]" : "text-gray-600 hover:text-gray-900";
    const arrowBg = darkMode ? "bg-[#141414]/90" : "bg-gray-50/90";
    const arrowBorder = darkMode ? "border-[#2a2a2a]" : "border-gray-200";

    return (
        <div className={`flex items-center gap-2 border-b px-2 py-1 shrink-0 overflow-hidden relative z-20 ${darkMode ? "bg-[#141414] border-[#2a2a2a]" : "bg-gray-50 border-gray-200"}`}>
            <div className="flex-1 flex items-center min-w-0 overflow-hidden h-full">
                {canScrollLeft && (
                    <button onClick={(e) => { e.preventDefault(); scroll("left"); }} className={`flex-shrink-0 z-[30] p-1.5 mr-1 ${arrowBg} ${arrowColor} border ${arrowBorder} rounded-full shadow-sm transition-all hover:scale-110`} title="Scroll left">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                    </button>
                )}
                <div className="flex-1 overflow-hidden h-full">
                    <div ref={scrollRef} onScroll={checkScroll} className="flex items-end gap-1 overflow-x-auto overflow-y-hidden scroll-smooth w-full h-full widget-scrollbar">
                        {showTabs && tabs.map((tab) => {
                            const isActive = tab === activeTab;
                            return (
                                <button key={tab} data-active={isActive} onClick={() => onTabChange(tab)}
                                    className={`flex-shrink-0 px-4 py-2 text-xs font-semibold rounded-t-md transition-all duration-200 whitespace-nowrap border-x border-t mt-1.5 ${isActive
                                        ? darkMode ? "bg-[#1e1e1e] border-[#333333] text-blue-400 z-[1]" : "bg-white border-gray-200 text-blue-600 shadow-sm z-[1]"
                                        : darkMode ? "text-[#606060] border-transparent hover:text-[#c0c0c0] hover:bg-[#222222]/50" : "text-gray-400 border-transparent hover:text-gray-600 hover:bg-gray-200/50"}`}>
                                    {tab}
                                </button>
                            );
                        })}
                    </div>
                </div>
                {canScrollRight && (
                    <button onClick={(e) => { e.preventDefault(); scroll("right"); }} className={`flex-shrink-0 z-[30] p-1.5 ml-1 ${arrowBg} ${arrowColor} border ${arrowBorder} rounded-full shadow-sm transition-all hover:scale-110`} title="Scroll right">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                    </button>
                )}
            </div>
            {toolbar && <div className="flex-shrink-0 ml-1">{toolbar}</div>}
        </div>
    );
}

// ─── Column definition builder ────────────────────────────────────────────────

export function buildColDefs(data: any[], hiddenCols: Set<string>, darkMode: boolean, colConfigs?: Record<string, any>, colorPositiveNegative = true): (ColDef | ColGroupDef)[] {
    if (!data || data.length === 0) return [];

    const keys = Object.keys(data[0]).filter((k) => !k.endsWith("_breakdown"));
    const groups = new Map<string, string[]>();
    const orderedGroups: string[] = [];

    keys.forEach((key) => {
        const parts = key.split("_");
        if (parts.length > 1 && parts[0].length > 0) {
            const g = parts[0];
            if (!groups.has(g)) { groups.set(g, []); orderedGroups.push(g); }
            groups.get(g)!.push(key);
        } else {
            groups.set(key, [key]);
            orderedGroups.push(key);
        }
    });

    const colConfigsMap = colConfigs || {};

    const makeLeaf = (field: string, headerName: string): ColDef => {
        const config = colConfigsMap[field] || {};
        const uniqueValues = Array.from(new Set(data.map((d) => d[field])))
            .filter((v) => v !== null && v !== undefined && v !== "")
            .sort((a, b) => String(a).localeCompare(String(b)));

        const colDef: ColDef = {
            field,
            headerName,
            hide: hiddenCols.has(field),
            sortable: true,
            resizable: true,
            minWidth: 30,
            tooltipComponent: CustomTooltip,
            tooltipComponentParams: { darkMode },
            pinned: config.pinned === true || config.freeze === true ? "left" : config.pinned || config.freeze || null,
            filter: config.filter === "multi" ? MultiSelectFilter : config.filter ? true : false,
            filterParams: { darkMode, uniqueValues },
            tooltipValueGetter: (params) => {
                const f = (params.colDef as ColDef)?.field;
                return f && params.data && params.data[`${f}_breakdown`] ? String(params.value) || " " : null;
            },
            valueFormatter: (params: ValueFormatterParams) =>
                typeof params.value === "number" ? params.value.toLocaleString() : (params.value ?? "—"),
            cellRenderer: (params: any) => {
                const rawVal = params.value;
                const displayVal = params.valueFormatted ?? rawVal ?? "—";

                if (config.badge) {
                    const variant = (config.badge[String(rawVal)] ?? "neutral") as BadgeVariant;
                    const s = BADGE_VARIANTS[variant] ?? BADGE_VARIANTS.neutral;
                    return (
                        <span style={{ display: "inline-flex", alignItems: "center", whiteSpace: "nowrap", padding: "2px 10px", borderRadius: 999, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", border: `1px solid ${darkMode ? s.darkBorder : s.border}`, backgroundColor: darkMode ? s.darkBg : s.bg, color: darkMode ? s.darkText : s.text, lineHeight: "16px" }}>
                            {displayVal}
                        </span>
                    );
                }

                const val = Number(rawVal);
                const isNum = !isNaN(val) && rawVal !== "" && rawVal !== null;
                let textColor = "inherit";
                let weight = "inherit";
                if (colorPositiveNegative && isNum && val > 0) { textColor = "#22c55e"; weight = "600"; }
                else if (colorPositiveNegative && isNum && val < 0) { textColor = "#ef4444"; weight = "600"; }

                return <span className={isNum ? "tabular-nums" : ""} style={{ color: textColor, fontWeight: weight }}>{displayVal}</span>;
            },
        };

        if (config.conditionalBackground) {
            colDef.cellStyle = (params: any) => {
                const val = Number(params.value);
                const style: any = { textAlign: "center" };
                const cb = config.conditionalBackground as any;
                let isMatch = typeof cb !== "object";
                if (typeof cb === "object") {
                    if (cb.rowIndex !== undefined) isMatch = params.node.rowIndex === cb.rowIndex;
                    else if (cb.rowField !== undefined) isMatch = params.data[cb.rowField] === cb.rowValue;
                }
                if (isMatch && !isNaN(val) && params.value !== "" && params.value !== null) {
                    if (val > 0) style.backgroundColor = darkMode ? "rgba(34,197,94,0.15)" : "rgba(34,197,94,0.1)";
                    else if (val < 0) style.backgroundColor = darkMode ? "rgba(239,68,68,0.15)" : "rgba(239,68,68,0.1)";
                }
                return style;
            };
        }
        return colDef;
    };

    return orderedGroups.map((groupName) => {
        const groupKeys = groups.get(groupName)!;
        if (groupKeys.length === 1 && groupKeys[0] === groupName) return makeLeaf(groupName, groupName);
        return {
            headerName: groupName,
            headerClass: "centered-header",
            children: groupKeys.map((gk) => makeLeaf(gk, gk.includes("_") ? gk.substring(groupName.length + 1) : gk)),
        } as ColGroupDef;
    });
}

// ─── AG Grid Table ────────────────────────────────────────────────────────────

interface AgTableProps {
    data: any[];
    darkMode: boolean;
    hiddenCols: Set<string>;
    widgetConfig?: any;
    colorPositiveNegative?: boolean;
}

export function AgTable({ data, darkMode, hiddenCols, widgetConfig, colorPositiveNegative }: AgTableProps) {
    const keysStr = data && data.length > 0 ? Object.keys(data[0]).sort().join(",") : "";
    const colDefs = useMemo(() => buildColDefs(data, hiddenCols, darkMode, widgetConfig, colorPositiveNegative), [keysStr, hiddenCols, darkMode, widgetConfig, colorPositiveNegative]);
    const defaultColDef = useMemo(() => ({ cellStyle: { textAlign: "center" }, headerClass: "centered-header", tooltipComponent: CustomTooltip, resizable: true }), []);
    const autoSizeStrategy = useMemo(() => ({ type: "fitCellContents" as const, includeHeader: true }), []);
    const onGridReady = useCallback((params: any) => params.api.autoSizeAllColumns(), []);
    const onRowDataUpdated = useCallback((params: any) => params.api.autoSizeAllColumns(), []);

    return (
        <div className="w-full h-full chunky-grid" style={{ minHeight: 0 }}>
            <AgGridReact
                theme={darkMode ? myDarkTheme : myLightTheme}
                rowData={data}
                columnDefs={colDefs}
                defaultColDef={defaultColDef}
                suppressCellFocus
                animateRows
                domLayout="normal"
                tooltipShowDelay={100}
                tooltipInteraction
                reactiveCustomComponents
                autoSizeStrategy={autoSizeStrategy}
                onGridReady={onGridReady}
                onRowDataUpdated={onRowDataUpdated}
                suppressColumnVirtualisation
            />
        </div>
    );
}