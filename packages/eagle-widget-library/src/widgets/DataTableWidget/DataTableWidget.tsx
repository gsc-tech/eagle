"use client";

import React, { useMemo, useState, useEffect, useCallback, useRef } from "react";
import ExcelJS from "exceljs";
import type { BaseWidgetProps, ParameterValues } from "../../types";
import { useWidgetData } from "../../hooks/useWidgetData";
import { useParameterDefaults } from "../../hooks/useParameterDefaults";
import { WidgetContainer } from "../../components/WidgetContainer";
import { isTabData, flattenLeaves, type TabData, type BadgeVariant } from "./dataTableConfig";
import { TabBar, ColVisibilityToolbar, AgTable, buildColDefs } from "./DataTableParts";

// ─── Props ────────────────────────────────────────────────────────────────────

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
        pinned?: "left" | "right";
        conditionalBackground?: boolean | {
            rowField?: string;
            rowValue?: any;
            rowIndex?: number;
        };
        badge?: Record<string, BadgeVariant>;
        [key: string]: any;
    }>;
    tabFilterField?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const DataTableWidget: React.FC<DataTableWidgetProps> = ({
    initialWidgetState,
    onWidgetStateChange,
    id,
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
    columnConfig: propColumnConfig,
    tabFilterField,
    staticData,
}) => {
    const defaultParams = useParameterDefaults(parameters);
    const [currentParams, setCurrentParams] = useState<ParameterValues>(
        () => initialWidgetState?.parameters || defaultParams
    );
    const [activeTab, setActiveTab] = useState<string | null>(() => initialWidgetState?.activeTab || null);
    const [hiddenCols, setHiddenCols] = useState<Set<string>>(() => new Set(initialWidgetState?.hiddenCols || []));

    useEffect(() => {
        if (onWidgetStateChange) {
            onWidgetStateChange({ parameters: currentParams, activeTab, hiddenCols: Array.from(hiddenCols) });
        }
    }, [currentParams, activeTab, hiddenCols, onWidgetStateChange]);

    const { data: rawData, refetch } = useWidgetData(apiUrl as string, {
        pollInterval,
        parameters: currentParams,
        isTokenRequired,
        getFirebaseToken,
        staticData,
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

        if (tabFilterField) {
            const grouped: TabData = { All: stableData };
            stableData.forEach((row) => {
                const tabVal = String(row[tabFilterField] ?? "Unknown");
                if (!grouped[tabVal]) grouped[tabVal] = [];
                grouped[tabVal].push(row);
            });
            return grouped;
        }

        return { Data: stableData };
    }, [stableData, tabFilterField]);

    const tabs = useMemo(() => {
        const sorted = Object.keys(finalTabData ?? {}).sort();
        return sorted.includes("All") ? ["All", ...sorted.filter((t) => t !== "All")] : sorted;
    }, [finalTabData]);

    useEffect(() => {
        if (tabs.length === 0) return;
        setActiveTab((prev) => (prev && tabs.includes(prev) ? prev : tabs[0]));
    }, [tabs]);

    const activeData = useMemo(
        () => (activeTab && finalTabData ? (finalTabData[activeTab] ?? []) : []),
        [activeTab, finalTabData]
    );

    const handleToggleCol = useCallback((field: string) => {
        setHiddenCols((prev) => {
            const next = new Set(prev);
            next.has(field) ? next.delete(field) : next.add(field);
            return next;
        });
    }, []);

    const handleToggleGroup = useCallback((fields: string[], targetVisible: boolean) => {
        setHiddenCols((prev) => {
            const next = new Set(prev);
            fields.forEach((f) => (targetVisible ? next.delete(f) : next.add(f)));
            return next;
        });
    }, []);

    const hierarchicalDefsForToolbar = useMemo(
        () => buildColDefs(activeData, new Set(), darkMode, propColumnConfig, colorPositiveNegative),
        [activeData, darkMode, propColumnConfig, colorPositiveNegative]
    );

    const handleExport = useCallback(async () => {
        if (!activeData || activeData.length === 0) return;
        try {
            const workbook = new ExcelJS.Workbook();
            const sheetName = activeTab ?? "Data";
            const worksheet = workbook.addWorksheet(sheetName);

            const visibleLeaves = flattenLeaves(hierarchicalDefsForToolbar as any[]).filter(
                (c) => c.field && !hiddenCols.has(c.field!)
            );
            worksheet.columns = visibleLeaves.map((c) => ({
                header: c.headerName ?? c.field ?? "",
                key: c.field!,
                width: 20,
            }));
            activeData.forEach((row) => {
                const exportRow: Record<string, any> = {};
                visibleLeaves.forEach((c) => { exportRow[c.field!] = row[c.field!] ?? ""; });
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
                    className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-md border shadow-sm transition-all duration-200 ${
                        darkMode
                            ? "border-[#333333] bg-[#222222] text-[#e0e0e0] hover:bg-[#2a2a2a] hover:border-[#3a3a3a]"
                            : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400"
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
            onParametersChange={(values: ParameterValues) => setCurrentParams(values)}
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
                <TabBar
                    tabs={tabs}
                    activeTab={activeTab ?? ""}
                    onTabChange={setActiveTab}
                    darkMode={darkMode}
                    toolbar={tabs.length > 0 ? toolbar : null}
                />
                <div className={`overflow-auto flex-1 chunky-scrollbar chunky-grid ${darkMode ? "bg-transparent" : "bg-white"}`}>
                    {tabs.length === 0 ? (
                        <div className={`flex items-center justify-center h-full text-xs ${darkMode ? "text-[#606060]" : "text-gray-400"}`}>
                            No data available
                        </div>
                    ) : (
                        <AgTable
                            data={activeData}
                            darkMode={darkMode}
                            hiddenCols={hiddenCols}
                            widgetConfig={propColumnConfig}
                            colorPositiveNegative={colorPositiveNegative}
                        />
                    )}
                </div>
            </div>
        </WidgetContainer>
    );
};

export const DataTableWidgetDef = {
    component: DataTableWidget,
};
