"use client"

import React, { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { AgGridReact } from "ag-grid-react";
import type {
    ColDef,
    ColGroupDef,
    ValueFormatterParams
} from "ag-grid-community";
import {
    ModuleRegistry,
    ClientSideRowModelModule,
    ColumnAutoSizeModule,
    themeQuartz,
    type Module
} from "ag-grid-community";

import type { BaseWidgetProps, ParameterValues } from "../types";
import { useWidgetData } from "../hooks/useWidgetData";
import { useParameterDefaults } from "../hooks/useParameterDefaults";
import { WidgetContainer } from "../components/WidgetContainer";

// Register AG Grid modules (community)
ModuleRegistry.registerModules([
    ClientSideRowModelModule as unknown as Module,
    ColumnAutoSizeModule as unknown as Module,
]);

// ─── Themes ────────────────────────────────────────────────────────────────────

export const myLightTheme = themeQuartz
    .withParams({
        browserColorScheme: "light"
    });

export const myDarkTheme = themeQuartz
    .withParams({
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

// Flatten ColGroupDef tree to leaf ColDefs
function flattenLeaves(defs: (ColDef | ColGroupDef)[]): ColDef[] {
    const result: ColDef[] = [];
    function walk(d: ColDef | ColGroupDef) {
        if ("children" in d && d.children) {
            d.children.forEach(c => walk(c as ColDef | ColGroupDef));
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
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handler(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const hiddenCount = hiddenCols.size;

    const renderItems = (defs: (ColDef | ColGroupDef)[], depth = 0) => {
        return defs.map((def, idx) => {
            const isGroup = 'children' in def;
            const indent = depth * 16;
            
            if (isGroup) {
                const groupDef = def as ColGroupDef;
                
                const childFields = flattenLeaves([groupDef]).map(c => c.field!);
                const visibleCount = childFields.filter(f => !hiddenCols.has(f)).length;
                const isAllVisible = visibleCount === childFields.length;
                const isPartiallyVisible = visibleCount > 0 && visibleCount < childFields.length;

                return (
                    <div key={`group-${groupDef.headerName}-${idx}`}>
                        <div className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-left transition-colors ${darkMode ? 'text-gray-300' : 'text-gray-700'}`} style={{ paddingLeft: `${indent + 12}px` }}>
                            <span 
                                onMouseEnter={() => onToggleGroup(childFields, !isAllVisible)}
                                onClick={() => onToggleGroup(childFields, !isAllVisible)}
                                className={`flex-shrink-0 w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors cursor-pointer ${isAllVisible
                                ? "bg-blue-500 border-blue-500"
                                : isPartiallyVisible 
                                ? "bg-blue-500/50 border-blue-500"
                                : darkMode ? "border-gray-600 bg-transparent" : "border-gray-300 bg-transparent"
                                } hover:ring-2 hover:ring-blue-400/50`}
                            >
                                {isAllVisible && (
                                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                )}
                                {isPartiallyVisible && (
                                    <div className="w-1.5 h-1.5 bg-white rounded-sm" />
                                )}
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-wider opacity-90">{groupDef.headerName}</span>
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
                    className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-left text-xs transition-colors ${darkMode
                        ? "text-gray-300"
                        : "text-gray-700"
                        }`}
                    style={{ paddingLeft: `${indent + 12}px` }}
                >
                    {/* Checkbox visual - Toggle ONLY on hover/click here */}
                    <span 
                        onMouseEnter={() => onToggle(colDef.field!)}
                        onClick={() => onToggle(colDef.field!)}
                        className={`flex-shrink-0 w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors cursor-pointer ${isVisible
                        ? "bg-blue-500 border-blue-500"
                        : darkMode ? "border-gray-600 bg-transparent" : "border-gray-300 bg-transparent"
                        } hover:ring-2 hover:ring-blue-400/50`}
                    >
                        {isVisible && (
                            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                        )}
                    </span>
                    <span className="capitalize opacity-80">{colDef.headerName}</span>
                </div>
            );
        });
    };

    return (
        <div
            ref={ref}
            className="relative flex-shrink-0"
            onMouseEnter={() => setOpen(true)}
            onMouseLeave={() => setOpen(false)}
        >
            <button
                className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-md border shadow-sm transition-all duration-200 ${darkMode
                    ? "border-gray-600 bg-gray-800 text-gray-200 hover:bg-gray-700 hover:border-gray-500"
                    : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400"
                    }`}
            >
                <svg className="w-3.5 h-3.5 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                </svg>
                <span>Columns</span>
                {hiddenCount > 0 && (
                    <span className={`flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold ${darkMode ? "bg-blue-600 text-white" : "bg-blue-500 text-white"}`}>
                        {hiddenCount}
                    </span>
                )}
            </button>

            {open && (
                <div className={`absolute right-0 top-full pt-1 z-50 min-w-[200px] flex flex-col`}>
                    <div className={`rounded-lg border shadow-xl overflow-hidden flex flex-col ${darkMode
                        ? "bg-gray-900 border-gray-700 shadow-black/50"
                        : "bg-white border-gray-200 shadow-gray-200"
                        }`}>
                        <div className={`shrink-0 px-3 py-2 text-[10px] font-bold uppercase tracking-wider border-b ${darkMode ? "border-gray-700 text-gray-500" : "border-gray-100 text-gray-400"}`}>
                            Column Settings
                        </div>
                        <div className="py-2 max-h-[400px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                            {renderItems(colDefs)}
                        </div>
                    </div>
                </div>
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
    if (!showTabs && !toolbar) return null;

    return (
        <div className={`flex items-center justify-between border-b px-2 py-1 shrink-0 ${darkMode ? "bg-gray-900 border-gray-700" : "bg-gray-50 border-gray-200"}`} style={{ scrollbarWidth: "none" }}>
            {/* Tab buttons */}
            <div className="flex items-end gap-0.5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                {showTabs ? tabs.map(tab => {
                    const isActive = tab === activeTab;
                    return (
                        <button
                            key={tab}
                            onClick={() => onTabChange(tab)}
                            className={`px-4 py-2.5 text-xs font-semibold rounded-t-md transition-all duration-200 whitespace-nowrap border-x border-t mt-1 ${isActive
                                ? darkMode
                                    ? "bg-gray-800 border-gray-600 text-blue-400 -mb-px"
                                    : "bg-white border-gray-200 text-blue-600 shadow-sm -mb-px"
                                : darkMode
                                    ? "text-gray-500 border-transparent hover:text-gray-300 hover:bg-gray-800/50"
                                    : "text-gray-400 border-transparent hover:text-gray-600 hover:bg-gray-200/50"
                                }`}
                        >
                            {tab}
                        </button>
                    );
                }) : <div />}
            </div>

            {/* Toolbar (column visibility toggle etc.) */}
            {toolbar && (
                <div className="flex-shrink-0 flex items-center">
                    {toolbar}
                </div>
            )}
        </div>
    );
}

// ─── Column builder ─────────────────────────────────────────────────────────────

function buildColDefs(data: any[], hiddenCols: Set<string>, darkMode: boolean): (ColDef | ColGroupDef)[] {
    if (!data || data.length === 0) return [];
    const keys = Object.keys(data[0]);    
    const groups = new Map<string, string[]>();
    const orderedGroups: string[] = [];

    // Identify numeric columns quickly from the first row
    const isNumType = new Map<string, boolean>();
    keys.forEach(k => {
        isNumType.set(k, typeof data[0][k] === "number");
    });

    keys.forEach(key => {
        const parts = key.split("_");
        if (parts.length > 1 && parts[0].length > 0) {
            const group = parts[0];
            if (!groups.has(group)) {
                groups.set(group, []);
                orderedGroups.push(group);
            }
            groups.get(group)!.push(key);
        } else {
            groups.set(key, [key]);
            orderedGroups.push(key);
        }
    });

    function makeLeaf(field: string, headerName: string, isNumeric: boolean): ColDef {
        return {
            field,
            headerName,
            hide: hiddenCols.has(field),
            sortable: true,
            resizable: true,
            flex: 1,
            minWidth: 80,
            type: undefined,
            valueFormatter: (params: ValueFormatterParams) => {
                const val = params.value;
                if (typeof val === "number") return val.toLocaleString();
                return val ?? "—";
            },
            cellRenderer: (params: any) => {
                const val = Number(params.value);
                const isNum = !isNaN(val) && params.value !== "" && params.value !== null;
                
                let textColor = "inherit";
                let weight = "inherit";
                if (isNum && val > 0) {
                    textColor = "#22c55e"; // Positive
                    weight = "600";
                } else if (isNum && val < 0) {
                    textColor = "#ef4444"; // Negative
                    weight = "600";
                }
                
                return (
                    <span 
                        className={isNum ? "tabular-nums" : ""}
                        style={{ color: textColor, fontWeight: weight, display: "inline-block", width: "100%", textAlign: "center" }}
                    >
                        {params.valueFormatted ?? params.value ?? "—"}
                    </span>
                );
            }
        };
    }

    return orderedGroups.map(groupName => {
        const groupKeys = groups.get(groupName)!;
        if (groupKeys.length === 1 && groupKeys[0] === groupName) {
            const def = makeLeaf(groupName, groupName, isNumType.get(groupName) ?? false);
            return def;
        }
        
        return {
            headerName: groupName,
            headerClass: 'centered-header',
            children: groupKeys.map(gk => {
                const subKey = gk.substring(groupName.length + 1);
                return makeLeaf(gk, subKey, isNumType.get(gk) ?? false);
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
    // Only rebuild column definitions when data keys change or hidden columns change
    const keysStr = data && data.length > 0 ? Object.keys(data[0]).sort().join(",") : "";

    const colDefs = useMemo(() => {
        return buildColDefs(data, hiddenCols, darkMode);
    }, [keysStr, hiddenCols, darkMode]);

    const defaultColDef = useMemo(() => ({
        cellStyle: { textAlign: 'center' },
        headerClass: 'centered-header',
    }), []);

    return (
        <div className="w-full h-full">
            <AgGridReact
                theme={darkMode ? myDarkTheme : myLightTheme}
                rowData={data}
                columnDefs={colDefs}
                defaultColDef={defaultColDef}
                suppressCellFocus={true}
                suppressMovableColumns={false}
                animateRows={true}
                domLayout="autoHeight"
            />
        </div>
    );
}

// ─── Main Widget ───────────────────────────────────────────────────────────────

export interface DataTableWidgetProps extends BaseWidgetProps {
    darkMode?: boolean;
}

export const DataTableWidget: React.FC<DataTableWidgetProps> = ({
    apiUrl = "http://localhost:8080/api/data",
    title,
    parameters,
    darkMode = false,
    onGroupedParametersChange,
    groupedParametersValues
}) => {
    const defaultParams = useParameterDefaults(parameters);
    const [currentParams, setCurrentParams] = useState<ParameterValues>(defaultParams);
    const [activeTab, setActiveTab] = useState<string | null>(null);
    const [hiddenCols, setHiddenCols] = useState<Set<string>>(new Set());

    const { data: rawData } = useWidgetData(apiUrl as string, {
        pollInterval: 30000,
        parameters: currentParams,
    });

    // Detect if response is tab-structured or plain array
    const tabData = useMemo<TabData | null>(() => {
        if (!rawData || rawData.length === 0) return null;
        if (rawData.length === 1 && isTabData(rawData[0])) return rawData[0] as TabData;
        return { "Data": rawData };
    }, [rawData]);

    const tabs = useMemo(() => Object.keys(tabData ?? {}).sort(), [tabData]);

    useEffect(() => {
        if (tabs.length === 0) return;
        setActiveTab(prev => {
            if (prev && tabs.includes(prev)) return prev;
            return tabs[0];
        });
    }, [tabs]);

    const handleParametersChange = useCallback((values: ParameterValues) => {
        setCurrentParams(values);
    }, []);

    const activeData = useMemo(
        () => (activeTab && tabData ? (tabData[activeTab] ?? []) : []),
        [activeTab, tabData]
    );

    // Reset hidden cols when tab data structure changes
    useEffect(() => {
        setHiddenCols(new Set());
    }, [activeTab]);

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
            fields.forEach(f => {
                if (targetVisible) next.delete(f);
                else next.add(f);
            });
            return next;
        });
    }, []);

    const hierarchicalDefs = useMemo(() => {
        return buildColDefs(activeData, new Set(), darkMode);
    }, [activeData, darkMode]);

    const toolbar = hierarchicalDefs.length > 0
        ? <ColVisibilityToolbar colDefs={hierarchicalDefs} hiddenCols={hiddenCols} onToggle={handleToggleCol} onToggleGroup={handleToggleGroup} darkMode={darkMode} />
        : null;

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
                    .centered-header .ag-header-cell-label {
                        justify-content: center !important;
                    }
                    .centered-header .ag-header-group-cell-label {
                        justify-content: center !important;
                    }
                    /* Tabular nums for cells with 'tabular-nums' class */
                    .tabular-nums {
                        font-variant-numeric: tabular-nums;
                    }
                `}</style>
                {/* Tab navigation + toolbar */}
                <TabBar
                    tabs={tabs}
                    activeTab={activeTab ?? ""}
                    onTabChange={setActiveTab}
                    darkMode={darkMode}
                    toolbar={toolbar}
                />

                {/* Table area */}
                <div className={`overflow-auto flex-1 ${darkMode ? "bg-transparent" : "bg-white"}`}>
                    {tabs.length === 0 ? (
                        <div className={`flex items-center justify-center h-full text-xs ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
                            No data available
                        </div>
                    ) : (
                        <AgTable
                            data={activeData}
                            darkMode={darkMode}
                            hiddenCols={hiddenCols}
                        />
                    )}
                </div>
            </div>
        </WidgetContainer>
    );
};

export const DataTableWidgetDef = {
    component: DataTableWidget,
}
