"use client"

import React, { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import ExcelJS from "exceljs";
import { AgGridReact } from "ag-grid-react";
import type {
    ColDef,
    ColGroupDef,
    ValueFormatterParams,
    ITooltipParams
} from "ag-grid-community";
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
    type Module
} from "ag-grid-community";

import type { BaseWidgetProps, ParameterValues } from "../types";
import { useWidgetData } from "../hooks/useWidgetData";
import { useParameterDefaults } from "../hooks/useParameterDefaults";
import { WidgetContainer } from "../components/WidgetContainer";

// Register AG Grid modules
ModuleRegistry.registerModules([
    ClientSideRowModelModule as unknown as Module,
    ColumnAutoSizeModule as unknown as Module,
    CellStyleModule as unknown as Module,
    TooltipModule as unknown as Module,
    TextFilterModule as unknown as Module,
    NumberFilterModule as unknown as Module,
    CustomFilterModule as unknown as Module,
]);

// ─── Themes ────────────────────────────────────────────────────────────────────

export const myLightTheme = themeQuartz.withParams({
    browserColorScheme: "light",
});

export const myDarkTheme = themeQuartz.withParams({
    backgroundColor: "#1f2836",
    browserColorScheme: "dark",
    chromeBackgroundColor: {
        ref: "foregroundColor",
        mix: 0.07,
        onto: "backgroundColor"
    },
    foregroundColor: "#FFF"
});

// ─── Types ─────────────────────────────────────────────────────────────────────

type TabData = Record<string, any[]>;

function isTabData(value: unknown): value is TabData {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    // Check if it has any array properties (a dictionary of tabs)
    return Object.values(value as object).some(v => Array.isArray(v));
}

function flattenLeaves(defs: (ColDef | ColGroupDef)[]): ColDef[] {
    const result: ColDef[] = [];
    function walk(d: ColDef | ColGroupDef) {
        if ("children" in d && d.children) {
            (d.children as (ColDef | ColGroupDef)[]).forEach(c => walk(c));
        } else {
            result.push(d as ColDef);
        }
    }
    defs.forEach(walk);
    return result;
}

// ─── Column Visibility Toolbar ─────────────────────────────────────────────────

interface ColVisibilityToolbarProps {
    colDefs: (ColDef | ColGroupDef)[];
    hiddenCols: Set<string>;
    onToggle: (field: string) => void;
    onToggleGroup: (fields: string[], targetVisible: boolean) => void;
    darkMode: boolean;
}

function ColVisibilityToolbar({ colDefs, hiddenCols, onToggle, onToggleGroup, darkMode }: ColVisibilityToolbarProps) {
    const [open, setOpen] = useState(false);
    const btnRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const [pos, setPos] = useState<{ top: number; right: number }>({ top: 0, right: 0 });

    const reposition = useCallback(() => {
        if (!btnRef.current) return;
        const rect = btnRef.current.getBoundingClientRect();
        setPos({
            top: rect.bottom + 6,
            right: window.innerWidth - rect.right,
        });
    }, []);

    useEffect(() => {
        if (!open) return;
        reposition();
        window.addEventListener('scroll', reposition, true);
        window.addEventListener('resize', reposition);
        return () => {
            window.removeEventListener('scroll', reposition, true);
            window.removeEventListener('resize', reposition);
        };
    }, [open, reposition]);

    useEffect(() => {
        if (!open) return;
        function handler(e: MouseEvent) {
            if (
                panelRef.current && !panelRef.current.contains(e.target as Node) &&
                btnRef.current && !btnRef.current.contains(e.target as Node)
            ) setOpen(false);
        }
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    const hiddenCount = hiddenCols.size;
    const itemText = darkMode ? '#d1d5db' : '#374151';
    const hoverRowBg = darkMode ? '#1f2937' : '#f3f4f6';

    const renderItems = (defs: (ColDef | ColGroupDef)[], depth = 0): React.ReactNode => {
        return defs.map((def, idx) => {
            const isGroup = 'children' in def;
            const paddingLeft = depth * 16 + 12;

            const checkboxBase: React.CSSProperties = {
                flexShrink: 0,
                width: 14,
                height: 14,
                borderRadius: 3,
                border: '1.5px solid',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'background 0.12s, border-color 0.12s',
            };

            const checkedBox: React.CSSProperties = { ...checkboxBase, background: '#3b82f6', borderColor: '#3b82f6' };
            const partialBox: React.CSSProperties = { ...checkboxBase, background: 'rgba(59,130,246,0.45)', borderColor: '#3b82f6' };
            const uncheckedBox: React.CSSProperties = { ...checkboxBase, background: 'transparent', borderColor: darkMode ? '#4b5563' : '#d1d5db' };

            const Tick = () => (
                <svg width={8} height={8} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 13l4 4L19 7" />
                </svg>
            );

            if (isGroup) {
                const groupDef = def as ColGroupDef;
                const childFields = flattenLeaves([groupDef]).map(c => c.field!);
                const visibleCount = childFields.filter(f => !hiddenCols.has(f)).length;
                const isAllVisible = visibleCount === childFields.length;
                const isPartiallyVisible = visibleCount > 0 && visibleCount < childFields.length;

                return (
                    <div key={`group-${groupDef.headerName}-${idx}`}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 12px', paddingLeft, color: itemText }}>
                            <span
                                onClick={() => onToggleGroup(childFields, !isAllVisible)}
                                style={isAllVisible ? checkedBox : isPartiallyVisible ? partialBox : uncheckedBox}
                            >
                                {isAllVisible && <Tick />}
                                {isPartiallyVisible && <span style={{ width: 6, height: 2, background: '#fff', borderRadius: 1 }} />}
                            </span>
                            <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.9 }}>
                                {groupDef.headerName}
                            </span>
                        </div>
                        {renderItems(groupDef.children as (ColDef | ColGroupDef)[], depth + 1)}
                    </div>
                );
            }

            const colDef = def as ColDef;
            const isVisible = !hiddenCols.has(colDef.field!);
            return (
                <div
                    key={colDef.field}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 12px', paddingLeft, color: itemText, cursor: 'default' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = hoverRowBg}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                >
                    <span onClick={() => onToggle(colDef.field!)} style={isVisible ? checkedBox : uncheckedBox}>
                        {isVisible && <Tick />}
                    </span>
                    <span style={{ fontSize: 12, opacity: 0.85 }}>{colDef.headerName}</span>
                </div>
            );
        });
    };

    const panelBg = darkMode ? '#111827' : '#ffffff';
    const panelBorder = darkMode ? '#374151' : '#e5e7eb';
    const panelHeader = darkMode ? '#374151' : '#f3f4f6';
    const headerText = darkMode ? '#6b7280' : '#9ca3af';

    return (
        <div className="flex-shrink-0">
            <button
                ref={btnRef}
                onClick={() => setOpen(o => !o)}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-md border shadow-sm transition-all duration-200 ${darkMode
                    ? 'border-gray-600 bg-gray-800 text-gray-200 hover:bg-gray-700 hover:border-gray-500'
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400'
                    }`}
            >
                <svg className="w-3.5 h-3.5 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                </svg>
                <span>Columns</span>
                {hiddenCount > 0 && (
                    <span className={`flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold ${darkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'}`}>
                        {hiddenCount}
                    </span>
                )}
            </button>

            {open && createPortal(
                <div
                    ref={panelRef}
                    style={{
                        position: 'fixed',
                        top: pos.top,
                        right: pos.right,
                        zIndex: 99999,
                        minWidth: 200,
                        background: panelBg,
                        border: `1px solid ${panelBorder}`,
                        borderRadius: 10,
                        boxShadow: darkMode ? '0 20px 60px rgba(0,0,0,0.6)' : '0 12px 40px rgba(0,0,0,0.12)',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        animation: 'columnPanelIn 0.13s cubic-bezier(.16,1,.3,1)',
                    }}
                >
                    <div style={{
                        flexShrink: 0,
                        padding: '7px 12px',
                        fontSize: 10,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        background: panelHeader,
                        borderBottom: `1px solid ${panelBorder}`,
                        color: headerText,
                    }}>
                        Column Settings
                    </div>
                    <div style={{ overflowY: 'auto', maxHeight: 400, scrollbarWidth: 'thin' }}>
                        {renderItems(colDefs)}
                    </div>
                    <style>{`
                        @keyframes columnPanelIn {
                            from { opacity: 0; transform: translateY(-6px) scale(0.98); }
                            to   { opacity: 1; transform: translateY(0)   scale(1);    }
                        }
                    `}</style>
                </div>,
                document.body
            )}
        </div>
    );
}

// ─── Tab Bar ───────────────────────────────────────────────────────────────────

interface TabBarProps {
    tabs: string[];
    activeTab: string;
    onTabChange: (tab: string) => void;
    darkMode: boolean;
    toolbar?: React.ReactNode;
}

function TabBar({ tabs, activeTab, onTabChange, darkMode, toolbar }: TabBarProps) {
    const showTabs = tabs.length > 1;
    const scrollRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    const checkScroll = useCallback(() => {
        if (scrollRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
            // Use a 1px buffer for rounding issues
            setCanScrollLeft(scrollLeft > 1);
            setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
        }
    }, []);

    useEffect(() => {
        checkScroll();
        const el = scrollRef.current;
        if (el) {
            const resizeObserver = new ResizeObserver(() => checkScroll());
            resizeObserver.observe(el);
            return () => resizeObserver.disconnect();
        }
    }, [checkScroll, tabs]);

    // Ensure active tab is visible when it changes
    useEffect(() => {
        if (scrollRef.current && activeTab) {
            const activeBtn = scrollRef.current.querySelector('[data-active="true"]');
            if (activeBtn) {
                activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
            }
        }
    }, [activeTab]);

    const scroll = (direction: 'left' | 'right') => {
        if (scrollRef.current) {
            const amount = scrollRef.current.clientWidth * 0.75;
            scrollRef.current.scrollBy({
                left: direction === 'left' ? -amount : amount,
                behavior: 'smooth'
            });
        }
    };

    if (!showTabs && !toolbar) return null;

    const arrowColor = darkMode ? "text-gray-300 hover:text-white" : "text-gray-600 hover:text-gray-900";
    const arrowBg = darkMode ? "bg-gray-900/90" : "bg-gray-50/90";
    const arrowBorder = darkMode ? "border-gray-700" : "border-gray-200";

    return (
        <div className={`flex items-center gap-2 border-b px-2 py-1 shrink-0 ${darkMode ? "bg-gray-900 border-gray-700" : "bg-gray-50 border-gray-200"}`} style={{ position: 'relative', zIndex: 20, overflow: 'hidden' }}>
            <div className="flex-1 flex items-center min-w-0 overflow-hidden h-full">
                {canScrollLeft && (
                    <button
                        onClick={(e) => { e.preventDefault(); scroll('left'); }}
                        className={`flex-shrink-0 z-[30] p-1.5 mr-1 ${arrowBg} ${arrowColor} border ${arrowBorder} rounded-full shadow-sm transition-all hover:scale-110 active:scale-95`}
                        title="Scroll left"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                    </button>
                )}

                <div className="flex-1 overflow-hidden h-full">
                    <div
                        ref={scrollRef}
                        onScroll={checkScroll}
                        className="flex items-end gap-1 overflow-x-auto overflow-y-hidden custom-tab-scrollbar scroll-smooth w-full h-full"
                    >
                        {showTabs && tabs.map(tab => {
                            const isActive = tab === activeTab;
                            return (
                                <button
                                    key={tab}
                                    data-active={isActive}
                                    onClick={() => onTabChange(tab)}
                                    className={`flex-shrink-0 px-4 py-2 text-xs font-semibold rounded-t-md transition-all duration-200 whitespace-nowrap border-x border-t mt-1.5 ${isActive
                                        ? darkMode ? "bg-gray-800 border-gray-600 text-blue-400 z-[1]" : "bg-white border-gray-200 text-blue-600 shadow-sm z-[1]"
                                        : darkMode ? "text-gray-500 border-transparent hover:text-gray-300 hover:bg-gray-800/50" : "text-gray-400 border-transparent hover:text-gray-600 hover:bg-gray-200/50"
                                        }`}
                                >
                                    {tab}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {canScrollRight && (
                    <button
                        onClick={(e) => { e.preventDefault(); scroll('right'); }}
                        className={`flex-shrink-0 z-[30] p-1.5 ml-1 ${arrowBg} ${arrowColor} border ${arrowBorder} rounded-full shadow-sm transition-all hover:scale-110 active:scale-95`}
                        title="Scroll right"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                    </button>
                )}
            </div>

            {toolbar && <div className="flex-shrink-0 ml-1">{toolbar}</div>}

            <style>{`
                .custom-tab-scrollbar::-webkit-scrollbar { height: 3px; }
                .custom-tab-scrollbar::-webkit-scrollbar:vertical { width: 0 !important; height: 0 !important; display: none !important; opacity: 0 !important; visibility: hidden !important; }
                .custom-tab-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-tab-scrollbar::-webkit-scrollbar-thumb { background: ${darkMode ? '#4b5563' : '#d1d5db'}; border-radius: 10px; }
                .custom-tab-scrollbar::-webkit-scrollbar-thumb:hover { background: ${darkMode ? '#6b7280' : '#9ca3af'}; }
                .custom-tab-scrollbar { 
                    scrollbar-width: thin; 
                    scrollbar-color: ${darkMode ? '#4b5563 transparent' : '#d1d5db transparent'};
                    -ms-overflow-style: none;
                }
                .scroll-smooth { scroll-behavior: smooth; }
            `}</style>
        </div>
    );
}

// ─── Custom Tooltip ────────────────────────────────────────────────────────────

const CustomTooltip = (props: ITooltipParams & { darkMode?: boolean }) => {
    const rowData = props.data;
    const field = (props.colDef as ColDef)?.field;
    const breakdown = field && rowData ? rowData[`${field}_breakdown`] : null;
    const bgClass = props.darkMode ? "bg-gray-800 border-gray-600 text-white" : "bg-white border-gray-300 text-gray-900";

    return (
        <div className={`p-4 rounded-lg shadow-lg border text-sm ${bgClass}`} style={{ minWidth: '150px' }}>
            <h4 className="font-bold mb-2 pb-1 border-b opacity-80">
                Breakdown for {props.valueFormatted || props.value}
            </h4>
            {breakdown ? (
                Object.entries(breakdown).map(([key, val]) => {
                    const numVal = Number(val);
                    const isNum = !isNaN(numVal) && val !== "" && val !== null;
                    let textColor = "inherit";
                    if (isNum) {
                        if (numVal > 0) textColor = "#22c55e";
                        else if (numVal < 0) textColor = "#ef4444";
                    }
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

// ─── Multi-Select Filter component ──────────────────────────────────────────────
import type { IDoesFilterPassParams } from "ag-grid-community";
import { useGridFilter } from "ag-grid-react";

interface MultiSelectFilterProps {
    model: { values: any[] } | null;
    onModelChange: (model: { values: any[] } | null) => void;
    getValue: (node: any) => any;
    api: any;
    darkMode?: boolean;
}

const MultiSelectFilter = (props: any) => {
    const { model, onModelChange, getValue, darkMode, uniqueValues } = props;
    const [filterText, setFilterText] = useState("");

    const allValues = useMemo(() => {
        return uniqueValues || [];
    }, [uniqueValues]);

    const selectedValues = useMemo(() => new Set(model?.values || []), [model]);

    const filteredValues = useMemo(() => {
        if (!filterText) return allValues;
        const low = filterText.toLowerCase();
        return allValues.filter((v: any) => String(v).toLowerCase().includes(low));
    }, [allValues, filterText]);

    const doesFilterPass = useCallback((params: IDoesFilterPassParams) => {
        const val = getValue(params.node);
        return selectedValues.size === 0 || selectedValues.has(val);
    }, [selectedValues, getValue]);

    // Register filter logic with the grid
    useGridFilter({ doesFilterPass });

    const toggleValue = (val: any) => {
        const next = new Set(selectedValues);
        if (next.has(val)) next.delete(val);
        else next.add(val);
        onModelChange(next.size > 0 ? { values: Array.from(next) } : null);
    };

    const toggleAll = () => {
        if (selectedValues.size === allValues.length) onModelChange(null);
        else onModelChange({ values: allValues });
    };

    const bg = darkMode ? "#111827" : "#fff";
    const text = darkMode ? "#e5e7eb" : "#374151";
    const borderColor = darkMode ? "#374151" : "#e5e7eb";
    const hoverBg = darkMode ? "#1f2937" : "#f3f4f6";

    return (
        <div style={{ padding: 12, minWidth: 200, background: bg, color: text, border: `1px solid ${borderColor}`, borderRadius: 8, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
            <div style={{ marginBottom: 10 }}>
                <input
                    type="text"
                    placeholder="Search..."
                    value={filterText}
                    onChange={e => setFilterText(e.target.value)}
                    style={{
                        width: '100%',
                        padding: '6px 10px',
                        fontSize: 12,
                        background: darkMode ? '#1f2937' : '#f9fafb',
                        border: `1px solid ${borderColor}`,
                        borderRadius: 6,
                        color: text,
                        outline: 'none'
                    }}
                />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0', marginBottom: 8, borderBottom: `1px solid ${borderColor}`, cursor: 'pointer', fontSize: 11, fontWeight: 600, opacity: 0.8 }} onClick={toggleAll}>
                <input type="checkbox" checked={selectedValues.size === allValues.length && allValues.length > 0} readOnly />
                <span>(Select All)</span>
            </div>

            <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                {filteredValues.map((v: any) => (
                    <label key={String(v)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 6px', cursor: 'pointer', borderRadius: 4, transition: 'background 0.1s' }}
                        onMouseEnter={e => (e.currentTarget as any).style.background = hoverBg}
                        onMouseLeave={e => (e.currentTarget as any).style.background = 'transparent'}>
                        <input type="checkbox" checked={selectedValues.has(v)} onChange={() => toggleValue(v)} />
                        <span style={{ fontSize: 13 }}>{String(v)}</span>
                    </label>
                ))}
            </div>
        </div>
    );
};

// ─── Column builder ─────────────────────────────────────────────────────────────

const BADGE_VARIANTS = {
    success: {
        bg: '#d1fae5', text: '#065f46', border: '#6ee7b7',
        darkBg: 'rgba(16,185,129,0.15)', darkText: '#6ee7b7', darkBorder: 'rgba(16,185,129,0.35)',
    },
    danger: {
        bg: '#fee2e2', text: '#991b1b', border: '#fca5a5',
        darkBg: 'rgba(239,68,68,0.15)', darkText: '#fca5a5', darkBorder: 'rgba(239,68,68,0.35)',
    },
    warning: {
        bg: '#fff7ed', text: '#9a3412', border: '#fdba74',
        darkBg: 'rgba(249,115,22,0.12)', darkText: '#fb923c', darkBorder: 'rgba(249,115,22,0.3)',
    },
    info: {
        bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe',
        darkBg: 'rgba(59,130,246,0.15)', darkText: '#93c5fd', darkBorder: 'rgba(59,130,246,0.3)',
    },
    neutral: {
        bg: '#f3f4f6', text: '#374151', border: '#d1d5db',
        darkBg: 'rgba(107,114,128,0.15)', darkText: '#9ca3af', darkBorder: 'rgba(107,114,128,0.3)',
    },
    pending: {
        bg: '#fffbeb', text: '#92400e', border: '#fcd34d',
        darkBg: 'rgba(245,158,11,0.12)', darkText: '#fbbf24', darkBorder: 'rgba(245,158,11,0.3)',
    },
} as const;

type BadgeVariant = keyof typeof BADGE_VARIANTS;

function buildColDefs(data: any[], hiddenCols: Set<string>, darkMode: boolean, colConfigs?: Record<string, any>, colorPositiveNegative = true): (ColDef | ColGroupDef)[] {
    if (!data || data.length === 0) return [];

    const keys = Object.keys(data[0]).filter(key => !key.endsWith("_breakdown"));
    const groups = new Map<string, string[]>();
    const orderedGroups: string[] = [];
    const colConfigsMap = colConfigs || {};

    keys.forEach(key => {
        const parts = key.split("_");
        if (parts.length > 1 && parts[0].length > 0) {
            const groupName = parts[0];
            if (!groups.has(groupName)) {
                groups.set(groupName, []);
                orderedGroups.push(groupName);
            }
            groups.get(groupName)!.push(key);
        } else {
            groups.set(key, [key]);
            orderedGroups.push(key);
        }
    });

    const makeLeaf = (field: string, headerName: string): ColDef => {
        const config = colConfigsMap[field] || {};

        // Pre-calculate unique values for this column to pass to the filter
        const uniqueValues = Array.from(new Set(data.map(d => d[field])))
            .filter(v => v !== null && v !== undefined && v !== "")
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
            pinned: (config.pinned === true || config.freeze === true) ? 'left' : (config.pinned || config.freeze || null),
            filter: config.filter === 'multi' ? MultiSelectFilter : (config.filter ? true : false),
            filterParams: { darkMode, uniqueValues },
            tooltipValueGetter: (params) => {
                const f = (params.colDef as ColDef)?.field;
                return (f && params.data && params.data[`${f}_breakdown`]) ? (String(params.value) || " ") : null;
            },
            valueFormatter: (params: ValueFormatterParams) => {
                return typeof params.value === "number" ? params.value.toLocaleString() : (params.value ?? "—");
            },
            cellRenderer: (params: any) => {
                const rawVal = params.value;
                const displayVal = params.valueFormatted ?? rawVal ?? "—";

                if (config.badge) {
                    const variant = (config.badge[String(rawVal)] ?? 'neutral') as BadgeVariant;
                    const s = BADGE_VARIANTS[variant] ?? BADGE_VARIANTS.neutral;
                    return (
                        <span style={{
                            display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap',
                            padding: '2px 10px', borderRadius: 999, fontSize: 10,
                            fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
                            border: `1px solid ${darkMode ? s.darkBorder : s.border}`,
                            backgroundColor: darkMode ? s.darkBg : s.bg,
                            color: darkMode ? s.darkText : s.text,
                            lineHeight: '16px',
                        }}>
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

                return (
                    <span className={isNum ? "tabular-nums" : ""} style={{ color: textColor, fontWeight: weight }}>
                        {displayVal}
                    </span>
                );
            }
        };

        if (config.conditionalBackground) {
            colDef.cellStyle = (params: any) => {
                const val = Number(params.value);
                const style: any = { textAlign: 'center' };

                // Determine if this specific cell should be highlighted
                const cbConfig = config.conditionalBackground as any;
                const isTargeted = typeof cbConfig === 'object';
                let isMatch = !isTargeted;

                if (isTargeted) {
                    if (cbConfig.rowIndex !== undefined) {
                        isMatch = params.node.rowIndex === cbConfig.rowIndex;
                    } else if (cbConfig.rowField !== undefined) {
                        isMatch = params.data[cbConfig.rowField] === cbConfig.rowValue;
                    }
                }

                if (isMatch && !isNaN(val) && params.value !== "" && params.value !== null) {
                    if (val > 0) style.backgroundColor = darkMode ? 'rgba(34, 197, 94, 0.15)' : 'rgba(34, 197, 94, 0.1)';
                    else if (val < 0) style.backgroundColor = darkMode ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)';
                }
                return style;
            };
        }

        return colDef;
    };

    return orderedGroups.map(groupName => {
        const groupKeys = groups.get(groupName)!;
        if (groupKeys.length === 1 && groupKeys[0] === groupName) {
            return makeLeaf(groupName, groupName);
        }
        return {
            headerName: groupName,
            headerClass: 'centered-header',
            children: groupKeys.map(gk => {
                const subKey = gk.includes('_') ? gk.substring(groupName.length + 1) : gk;
                return makeLeaf(gk, subKey);
            }),
        } as ColGroupDef;
    });
}

// ─── AG Grid Table ─────────────────────────────────────────────────────────────

interface AgTableProps {
    data: any[];
    darkMode: boolean;
    hiddenCols: Set<string>;
}

function AgTable({ data, darkMode, hiddenCols, widgetConfig, colorPositiveNegative }: AgTableProps & { widgetConfig?: any; colorPositiveNegative?: boolean }) {
    const keysStr = data && data.length > 0 ? Object.keys(data[0]).sort().join(",") : "";
    const colDefs = useMemo(() => buildColDefs(data, hiddenCols, darkMode, widgetConfig, colorPositiveNegative), [keysStr, hiddenCols, darkMode, widgetConfig, colorPositiveNegative]);
    const defaultColDef = useMemo(() => ({ cellStyle: { textAlign: 'center' }, headerClass: 'centered-header', tooltipComponent: CustomTooltip, resizable: true }), []);
    const autoSizeStrategy = useMemo(() => ({ type: 'fitCellContents' as const, includeHeader: true }), []);

    const onGridReady = useCallback((params: any) => {
        params.api.autoSizeAllColumns();
    }, []);

    const onRowDataUpdated = useCallback((params: any) => {
        params.api.autoSizeAllColumns();
    }, []);

    return (
        <div className="w-full h-full chunky-grid" style={{ minHeight: 0 }}>
            <AgGridReact
                theme={darkMode ? myDarkTheme : myLightTheme}
                rowData={data}
                columnDefs={colDefs}
                defaultColDef={defaultColDef}
                suppressCellFocus={true}
                animateRows={true}
                domLayout="normal"
                tooltipShowDelay={100}
                tooltipInteraction={true}
                reactiveCustomComponents={true}
                autoSizeStrategy={autoSizeStrategy}
                onGridReady={onGridReady}
                onRowDataUpdated={onRowDataUpdated}
                suppressColumnVirtualisation={true}
            />
        </div>
    );
}

// ─── Main Widget ───────────────────────────────────────────────────────────────

export interface DataTableWidgetProps extends BaseWidgetProps {
    darkMode?: boolean;
    pollInterval?: number;
    colorPositiveNegative?: boolean;
    showColumnVisibilityToggle?: boolean;
    showExportButton?: boolean;
    showRefreshButton?: boolean;
    columnConfig?: Record<string, {
        filter?: boolean | string;
        freeze?: boolean;
        pinned?: 'left' | 'right';
        conditionalBackground?: boolean | {
            rowField?: string;
            rowValue?: any;
            rowIndex?: number;
        };
        badge?: Record<string, BadgeVariant>;
        [key: string]: any;
    }>;
}

export const DataTableWidget: React.FC<DataTableWidgetProps> = ({
    initialWidgetState,
    onWidgetStateChange,
    apiUrl = "http://localhost:8080/api/data",
    title,
    parameters,
    darkMode = false,
    pollInterval = 30000,
    colorPositiveNegative = true,
    showColumnVisibilityToggle = true,
    showExportButton = false,
    showRefreshButton = false,
    onGroupedParametersChange,
    groupedParametersValues,
    isTokenRequired,
    getFirebaseToken,
    columnConfig: propColumnConfig
}) => {
    const defaultParams = useParameterDefaults(parameters);
    const [currentParams, setCurrentParams] = useState<ParameterValues>(() => {
        return initialWidgetState?.parameters || defaultParams;
    });
    const [activeTab, setActiveTab] = useState<string | null>(() => initialWidgetState?.activeTab || null);
    const [hiddenCols, setHiddenCols] = useState<Set<string>>(() => new Set(initialWidgetState?.hiddenCols || []));

    console.log("propColumnConfig", propColumnConfig);

    useEffect(() => {
        if (onWidgetStateChange) {
            onWidgetStateChange({
                parameters: currentParams,
                activeTab,
                hiddenCols: Array.from(hiddenCols)
            });
        }
    }, [currentParams, activeTab, hiddenCols, onWidgetStateChange]);

    const handleParametersChange = (values: ParameterValues) => setCurrentParams(values);

    const { data: rawData, refetch } = useWidgetData(apiUrl as string, {
        pollInterval: pollInterval,
        parameters: currentParams,
        isTokenRequired,
        getFirebaseToken
    });

    const [stableData, setStableData] = useState<any[] | null>(null);
    const dataRef = useRef<string>("");

    useEffect(() => {
        if (!rawData) return;
        const dataStr = JSON.stringify(rawData);
        if (dataStr !== dataRef.current) {
            setStableData(rawData);
            dataRef.current = dataStr;
        }
    }, [rawData]);

    const finalTabData = useMemo<TabData | null>(() => {
        if (!stableData || stableData.length === 0) return null;
        if (stableData.length === 1 && isTabData(stableData[0])) return stableData[0] as TabData;
        return { "Data": stableData };
    }, [stableData]);

    const tabs = useMemo(() => Object.keys(finalTabData ?? {}).sort(), [finalTabData]);

    useEffect(() => {
        if (tabs.length === 0) return;
        setActiveTab(prev => (prev && tabs.includes(prev) ? prev : tabs[0]));
    }, [tabs]);

    const activeData = useMemo(() => (activeTab && finalTabData ? (finalTabData[activeTab] ?? []) : []), [activeTab, finalTabData]);

    const handleToggleCol = useCallback((field: string) => {
        setHiddenCols(prev => {
            const next = new Set(prev);
            if (next.has(field)) next.delete(field);
            else next.add(field);
            return next;
        });
    }, []);

    const handleToggleGroup = useCallback((fields: string[], targetVisible: boolean) => {
        setHiddenCols(prev => {
            const next = new Set(prev);
            fields.forEach(f => targetVisible ? next.delete(f) : next.add(f));
            return next;
        });
    }, []);

    const hierarchicalDefsForToolbar = useMemo(() => buildColDefs(activeData, new Set(), darkMode, propColumnConfig, colorPositiveNegative), [activeData, darkMode, propColumnConfig, colorPositiveNegative]);

    const handleExport = useCallback(async () => {
        if (!activeData || activeData.length === 0) return;
        try {
            const workbook = new ExcelJS.Workbook();
            const sheetName = activeTab ?? "Data";
            const worksheet = workbook.addWorksheet(sheetName);

            const visibleLeaves = flattenLeaves(hierarchicalDefsForToolbar).filter(c => c.field && !hiddenCols.has(c.field!));
            worksheet.columns = visibleLeaves.map(c => ({
                header: c.headerName ?? c.field ?? "",
                key: c.field!,
                width: 20,
            }));

            activeData.forEach(row => {
                const exportRow: Record<string, any> = {};
                visibleLeaves.forEach(c => { exportRow[c.field!] = row[c.field!] ?? ""; });
                worksheet.addRow(exportRow);
            });

            worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
            worksheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1f2836" } };

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `${sheetName}_${new Date().toISOString().split("T")[0]}.xlsx`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Export error:", err);
        }
    }, [activeData, activeTab, hierarchicalDefsForToolbar, hiddenCols]);

    const toolbar = (
        <div className="flex items-center gap-2">
            {showExportButton && activeData.length > 0 && (
                <button
                    onClick={handleExport}
                    className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-md border shadow-sm transition-all duration-200 ${darkMode
                        ? 'border-gray-600 bg-gray-800 text-gray-200 hover:bg-gray-700 hover:border-gray-500'
                        : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400'
                    }`}
                    title="Export to Excel"
                >
                    <svg className="w-3.5 h-3.5 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <span>Export</span>
                </button>
            )}
            {showColumnVisibilityToggle && hierarchicalDefsForToolbar.length > 0 && (
                <ColVisibilityToolbar
                    colDefs={hierarchicalDefsForToolbar}
                    hiddenCols={hiddenCols}
                    onToggle={handleToggleCol}
                    onToggleGroup={handleToggleGroup}
                    darkMode={darkMode}
                />
            )}
        </div>
    );

    return (
        <WidgetContainer
            title={title}
            parameters={parameters}
            onParametersChange={handleParametersChange}
            darkMode={darkMode}
            initialParameterValues={currentParams}
            onGroupedParametersChange={onGroupedParametersChange}
            groupedParametersValues={groupedParametersValues}
            isTokenRequired={isTokenRequired}
            getFirebaseToken={getFirebaseToken}
            showRefreshButton={showRefreshButton}
            onRefresh={refetch}
        >
            <div className="flex flex-col h-full overflow-hidden">
                <style>{`
                    .centered-header .ag-header-cell-label,
                    .centered-header .ag-header-group-cell-label {
                        justify-content: center !important;
                    }
                    .tabular-nums {
                        font-variant-numeric: tabular-nums;
                    }
                    /* Chunky Grid Overrides (20px) */
                    .chunky-grid .ag-body-horizontal-scroll,
                    .chunky-grid .ag-body-horizontal-scroll-viewport,
                    .chunky-grid .ag-body-horizontal-scroll-container,
                    .chunky-grid .ag-horizontal-left-spacer,
                    .chunky-grid .ag-horizontal-right-spacer {
                        height: 15px !important;
                        min-height: 15px !important;
                        max-height: 15px !important;
                    }
                    .chunky-grid ::-webkit-scrollbar {
                        width: 15px !important;
                        height: 15px !important;
                        display: block !important;
                    }
                    .chunky-grid ::-webkit-scrollbar-track {
                        background: ${darkMode ? 'rgba(0,0,0,0.3)' : '#f1f5f9'} !important;
                    }
                    .chunky-grid ::-webkit-scrollbar-thumb {
                        background: ${darkMode ? '#6b7280' : '#a1a1aa'} !important;
                        border-radius: 6px !important;
                        border: 3px solid ${darkMode ? '#1f2937' : '#f1f5f9'} !important;
                        background-clip: padding-box;
                    }
                    .chunky-grid ::-webkit-scrollbar-thumb:hover {
                        background: ${darkMode ? '#9ca3af' : '#71717a'} !important;
                    }
                `}</style>
                <TabBar
                    tabs={tabs}
                    activeTab={activeTab ?? ""}
                    onTabChange={setActiveTab}
                    darkMode={darkMode}
                    toolbar={tabs.length > 0 ? toolbar : null}
                />
                <div className={`overflow-auto flex-1 ${darkMode ? "bg-transparent" : "bg-white"}`}>
                    {tabs.length === 0 ? (
                        <div className={`flex items-center justify-center h-full text-xs ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
                            No data available
                        </div>
                    ) : (
                        <AgTable data={activeData} darkMode={darkMode} hiddenCols={hiddenCols} widgetConfig={propColumnConfig} colorPositiveNegative={colorPositiveNegative} />
                    )}
                </div>
            </div>
        </WidgetContainer>
    );
};

export const DataTableWidgetDef = {
    component: DataTableWidget,
};
