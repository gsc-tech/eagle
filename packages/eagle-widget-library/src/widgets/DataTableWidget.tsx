"use client"

import React, { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
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
]);

// ─── Themes ────────────────────────────────────────────────────────────────────

export const myLightTheme = themeQuartz.withParams({
    browserColorScheme: "light"
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
    return Object.values(value as object).every(v => Array.isArray(v));
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

// ─── Column builder ─────────────────────────────────────────────────────────────

function buildColDefs(data: any[], hiddenCols: Set<string>, darkMode: boolean): (ColDef | ColGroupDef)[] {
    if (!data || data.length === 0) return [];

    const keys = Object.keys(data[0]).filter(key => !key.endsWith("_breakdown"));
    const groups = new Map<string, string[]>();
    const orderedGroups: string[] = [];

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

    const makeLeaf = (field: string, headerName: string): ColDef => ({
        field,
        headerName,
        hide: hiddenCols.has(field),
        sortable: true,
        resizable: true,
        flex: 1,
        minWidth: 100,
        tooltipComponent: CustomTooltip,
        tooltipComponentParams: { darkMode },
        tooltipValueGetter: (params) => {
            const f = (params.colDef as ColDef)?.field;
            return (f && params.data && params.data[`${f}_breakdown`]) ? (String(params.value) || " ") : null;
        },
        valueFormatter: (params: ValueFormatterParams) => {
            return typeof params.value === "number" ? params.value.toLocaleString() : (params.value ?? "—");
        },
        cellRenderer: (params: any) => {
            const val = Number(params.value);
            const isNum = !isNaN(val) && params.value !== "" && params.value !== null;
            let textColor = "inherit";
            let weight = "inherit";
            if (isNum && val > 0) { textColor = "#22c55e"; weight = "600"; }
            else if (isNum && val < 0) { textColor = "#ef4444"; weight = "600"; }

            return (
                <span className={isNum ? "tabular-nums" : ""} style={{ color: textColor, fontWeight: weight, display: "inline-block", width: "100%", textAlign: "center" }}>
                    {params.valueFormatted ?? params.value ?? "—"}
                </span>
            );
        }
    });

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

function AgTable({ data, darkMode, hiddenCols }: AgTableProps) {
    const keysStr = data && data.length > 0 ? Object.keys(data[0]).sort().join(",") : "";
    const colDefs = useMemo(() => buildColDefs(data, hiddenCols, darkMode), [keysStr, hiddenCols, darkMode]);
    const defaultColDef = useMemo(() => ({ cellStyle: { textAlign: 'center' }, headerClass: 'centered-header', tooltipComponent: CustomTooltip }), []);

    return (
        <div className="w-full h-full" style={{ minHeight: 0 }}>
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
            />
        </div>
    );
}

// ─── Main Widget ───────────────────────────────────────────────────────────────

export interface DataTableWidgetProps extends BaseWidgetProps {
    darkMode?: boolean;
    pollInterval?: number;
}

export const DataTableWidget: React.FC<DataTableWidgetProps> = ({
    initialParameterValues,
    id,
    apiUrl = "http://localhost:8080/api/data",
    title,
    parameters,
    darkMode = false,
    pollInterval = 30000,
    onGroupedParametersChange,
    groupedParametersValues,
    isTokenRequired,
    getFirebaseToken
}) => {
    const defaultParams = useParameterDefaults(parameters);
    const [currentParams, setCurrentParams] = useState<ParameterValues>(defaultParams);
    const [activeTab, setActiveTab] = useState<string | null>(null);
    const [hiddenCols, setHiddenCols] = useState<Set<string>>(new Set());

    const handleParametersChange = (values: ParameterValues) => setCurrentParams(values);

    const { data: rawData } = useWidgetData(apiUrl as string, {
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

    const tabData = useMemo<TabData | null>(() => {
        if (!stableData || stableData.length === 0) return null;
        if (stableData.length === 1 && isTabData(stableData[0])) return stableData[0] as TabData;
        return { "Data": stableData };
    }, [stableData]);

    const tabs = useMemo(() => Object.keys(tabData ?? {}).sort(), [tabData]);

    useEffect(() => {
        if (tabs.length === 0) return;
        setActiveTab(prev => (prev && tabs.includes(prev) ? prev : tabs[0]));
    }, [tabs]);

    const activeData = useMemo(() => (activeTab && tabData ? (tabData[activeTab] ?? []) : []), [activeTab, tabData]);

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

    const hierarchicalDefsForToolbar = useMemo(() => buildColDefs(activeData, new Set(), darkMode), [activeData, darkMode]);

    const toolbar = hierarchicalDefsForToolbar.length > 0 ? (
        <ColVisibilityToolbar
            colDefs={hierarchicalDefsForToolbar}
            hiddenCols={hiddenCols}
            onToggle={handleToggleCol}
            onToggleGroup={handleToggleGroup}
            darkMode={darkMode}
        />
    ) : null;

    return (
        <WidgetContainer
            title={title}
            parameters={parameters}
            onParametersChange={handleParametersChange}
            darkMode={darkMode}
            onGroupedParametersChange={onGroupedParametersChange}
            groupedParametersValues={groupedParametersValues}
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
                `}</style>
                <TabBar
                    tabs={tabs}
                    activeTab={activeTab ?? ""}
                    onTabChange={setActiveTab}
                    darkMode={darkMode}
                    toolbar={toolbar}
                />
                <div className={`overflow-auto flex-1 ${darkMode ? "bg-transparent" : "bg-white"}`}>
                    {tabs.length === 0 ? (
                        <div className={`flex items-center justify-center h-full text-xs ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
                            No data available
                        </div>
                    ) : (
                        <AgTable data={activeData} darkMode={darkMode} hiddenCols={hiddenCols} />
                    )}
                </div>
            </div>
        </WidgetContainer>
    );
};

export const DataTableWidgetDef = {
    component: DataTableWidget,
};
