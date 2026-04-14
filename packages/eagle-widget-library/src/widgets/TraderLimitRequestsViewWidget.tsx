"use client"

import React, { useState, useEffect, useMemo } from "react";
import type { BaseWidgetProps, ParameterValues } from "../types";
import { useWidgetData } from "../hooks/useWidgetData";
import { useParameterDefaults } from "../hooks/useParameterDefaults";
import { WidgetContainer } from "../components/WidgetContainer";
import { Clock, ArrowRight, User, Loader2, Info } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MyLimitRequestsViewWidgetProps extends BaseWidgetProps {
    darkMode?: boolean;
    pollInterval?: number;
    limitHistoryApiUrl?: string;
}

type RequestStatus = "Pending" | "Approved" | "Rejected" | "Acknowledged";
type InstrumentType = "Future" | "Option";

// ─── Status Badge ─────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<RequestStatus, { bg: string; text: string; border: string; darkBg: string; darkText: string; darkBorder: string }> = {
    Pending: {
        bg: "#fffbeb", text: "#92400e", border: "#fcd34d",
        darkBg: "rgba(245,158,11,0.12)", darkText: "#fbbf24", darkBorder: "rgba(245,158,11,0.3)",
    },
    Approved: {
        bg: "#d1fae5", text: "#065f46", border: "#6ee7b7",
        darkBg: "rgba(16,185,129,0.15)", darkText: "#6ee7b7", darkBorder: "rgba(16,185,129,0.35)",
    },
    Rejected: {
        bg: "#fee2e2", text: "#991b1b", border: "#fca5a5",
        darkBg: "rgba(239,68,68,0.15)", darkText: "#fca5a5", darkBorder: "rgba(239,68,68,0.35)",
    },
    Acknowledged: {
        bg: "#fff7ed", text: "#9a3412", border: "#fdba74",
        darkBg: "rgba(249,115,22,0.12)", darkText: "#fb923c", darkBorder: "rgba(249,115,22,0.3)",
    },
};

const StatusBadge = ({ status, darkMode }: { status: RequestStatus; darkMode: boolean }) => {
    const s = STATUS_STYLES[status];
    return (
        <span
            className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border"
            style={{
                backgroundColor: darkMode ? s.darkBg : s.bg,
                color: darkMode ? s.darkText : s.text,
                borderColor: darkMode ? s.darkBorder : s.border,
            }}
        >
            {status}
        </span>
    );
};

// ─── Instrument Type Badge ────────────────────────────────────────────────────

const INSTRUMENT_STYLES: Record<InstrumentType, { bg: string; text: string; border: string; darkBg: string; darkText: string; darkBorder: string }> = {
    Future: {
        bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe",
        darkBg: "rgba(59,130,246,0.15)", darkText: "#93c5fd", darkBorder: "rgba(59,130,246,0.3)",
    },
    Option: {
        bg: "#f5f3ff", text: "#6d28d9", border: "#ddd6fe",
        darkBg: "rgba(139,92,246,0.15)", darkText: "#c4b5fd", darkBorder: "rgba(139,92,246,0.3)",
    },
};

const InstrumentTypeBadge = ({ type, darkMode }: { type?: InstrumentType; darkMode: boolean }) => {
    if (!type) return <span className={`text-[11px] italic ${darkMode ? "text-gray-600" : "text-gray-400"}`}>—</span>;
    const s = INSTRUMENT_STYLES[type];
    return (
        <span
            className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border shadow-sm"
            style={{
                backgroundColor: darkMode ? s.darkBg : s.bg,
                color: darkMode ? s.darkText : s.text,
                borderColor: darkMode ? s.darkBorder : s.border,
            }}
        >
            {type}
        </span>
    );
};

// ─── Table Row ────────────────────────────────────────────────────────────────

interface RowProps {
    item: any;
    dynamicKeys: string[];
    darkMode: boolean;
}

const TableRow = ({ item, dynamicKeys, darkMode }: RowProps) => {
    const borderColor = darkMode ? "border-gray-800" : "border-gray-100";
    const textColor = darkMode ? "text-gray-300" : "text-gray-700";
    const subText = darkMode ? "text-gray-500" : "text-gray-400";

    const currentLimit = Number(item.currentLimit || 0);
    const requestedLimit = Number(item.requestedLimit || 0);
    const delta = requestedLimit - currentLimit;
    const deltaColor = delta > 0 ? "text-green-500" : delta < 0 ? "text-red-500" : (darkMode ? "text-gray-500" : "text-gray-400");

    return (
        <tr className={`group transition-colors ${darkMode ? "hover:bg-gray-800/50" : "hover:bg-gray-50/50"} border-b ${borderColor}`}>
            {/* Dynamic Backend Columns */}
            {dynamicKeys.map(key => (
                <td key={key} className={`px-4 py-3 text-sm text-center ${textColor}`}>
                    {item[key] ?? <span className={`italic text-sm ${subText}`}>—</span>}
                </td>
            ))}

            {/* Current Limit */}
            <td className={`px-4 py-3 text-sm text-center tabular-nums ${textColor}`}>
                {currentLimit.toLocaleString()}
            </td>

            {/* Requested Limit + delta */}
            <td className="px-4 py-3 text-center">
                <div className="flex flex-col items-center gap-0.5">
                    <span className={`tabular-nums text-sm font-medium ${textColor}`}>
                        {requestedLimit.toLocaleString()}
                    </span>
                    {delta !== 0 && (
                        <span className={`text-[10px] font-bold tabular-nums ${deltaColor}`}>
                            {delta > 0 ? "+" : ""}{delta.toLocaleString()}
                        </span>
                    )}
                </div>
            </td>

            {/* Instrument Type */}
            <td className="px-4 py-3 text-center">
                <InstrumentTypeBadge type={item.instrumentType} darkMode={darkMode} />
            </td>

            {/* Status */}
            <td className="px-4 py-3 text-center">
                <StatusBadge status={item.status} darkMode={darkMode} />
            </td>

            {/* Timeline */}
            <td className={`px-4 py-3 text-sm text-center min-w-[160px] ${subText}`}>
                <div className="flex flex-col items-center justify-center gap-0.5">
                    <span>{item.requestedAt || "—"}</span>
                    {item.reviewedAt && (
                        <div className="flex items-center gap-1 mt-0.5">
                            <ArrowRight size={9} className="opacity-40" />
                            <span>{item.reviewedAt}</span>
                        </div>
                    )}
                </div>
            </td>

            {/* Reviewer / Comments */}
            <td className={`px-4 py-3 text-sm text-center ${textColor}`}>
                {item.reviewerName ? (
                    <div className="flex flex-col items-center justify-center gap-1">
                        <div className="flex items-center gap-1.5">
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border ${darkMode ? "bg-gray-800 border-gray-700" : "bg-gray-100 border-gray-200"}`}>
                                <User size={10} className="opacity-50" />
                            </div>
                            <span className={`font-semibold text-sm ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                                {item.reviewerName}
                            </span>
                        </div>
                        {item.comments && (
                            <span className={`italic text-sm leading-relaxed ${subText}`}>
                                "{item.comments}"
                            </span>
                        )}
                    </div>
                ) : (
                    <span className={`italic text-sm ${subText}`}>—</span>
                )}
            </td>
        </tr>
    );
};

// ─── Main Widget ───────────────────────────────────────────────────────────────

export const TraderLimitRequestsViewWidget: React.FC<MyLimitRequestsViewWidgetProps> = ({
    initialWidgetState,
    onWidgetStateChange,
    apiUrl = "http://localhost:8080/api/limits/history",
    parameters,
    darkMode = false,
    pollInterval = 60000,
    onGroupedParametersChange,
    groupedParametersValues,
    isTokenRequired,
    getFirebaseToken,
}) => {
    const defaultParams = useParameterDefaults(parameters);
    const [currentParams, setCurrentParams] = useState<ParameterValues>(
        () => initialWidgetState?.parameters || defaultParams
    );

    useEffect(() => {
        onWidgetStateChange?.({ parameters: currentParams });
    }, [currentParams, onWidgetStateChange]);

    const { data: rawData, loading } = useWidgetData(apiUrl as string, {
        pollInterval,
        parameters: currentParams,
        isTokenRequired,
        getFirebaseToken,
    });

    const items = useMemo<any[]>(() => {
        if (!rawData || !Array.isArray(rawData)) return [];
        return rawData.map(item => ({
            ...item,
            instrumentType: item.instrumentType || item['instrument type'] || item.category || '',
            currentLimit: Number(item.currentLimit ?? item.currentLevel ?? item.CurrentLimit ?? item.CurrentLevel ?? 0),
            requestedLimit: Number(item.requestedLimit ?? item.RequestedLimit ?? 0)
        }));
    }, [rawData]);

    // Fields that have special rendering logic and shouldn't be in the dynamic columns
    const specialFields = useMemo(() => new Set([
        "id", "currentLimit", "requestedLimit", "instrumentType", "status",
        "requestedAt", "reviewedAt", "reviewerName", "comments",
        "currentLevel", "requestedLimit", "instrument type", "category",
        "CurrentLimit", "RequestedLimit", "CurrentLevel", "status"
    ]), []);

    const dynamicKeys = useMemo(() => {
        if (items.length === 0) return [];
        // Extract keys from first item that aren't special
        return Object.keys(items[0]).filter(k => !specialFields.has(k));
    }, [items, specialFields]);

    const borderColor = darkMode ? "border-gray-800" : "border-gray-100";
    const headerBg = darkMode ? "bg-gray-900/50" : "bg-gray-50/50";
    const headerTextColor = darkMode ? "text-gray-400" : "text-gray-500";

    const thClass = `px-4 py-3 text-xs font-bold uppercase tracking-wider text-center ${headerTextColor}`;

    // Total columns = dynamic keys + fixed specials (Current, Requested, Instrument, Status, Timeline, Comments)
    const totalCols = dynamicKeys.length + 6;

    return (
        <WidgetContainer
            title="My Limit Requests"
            parameters={parameters}
            onParametersChange={setCurrentParams}
            darkMode={darkMode}
            initialParameterValues={currentParams}
            onGroupedParametersChange={onGroupedParametersChange}
            groupedParametersValues={groupedParametersValues}
        >
            <div className={`flex flex-col h-full w-full overflow-hidden ${darkMode ? "bg-gray-950 text-gray-100" : "bg-white text-gray-900"}`}>

                {/* Info bar */}
                <div className={`flex items-center gap-2 px-4 py-2 text-[11px] ${headerTextColor} border-b ${borderColor}`}>
                    <Info size={14} style={{ color: "#00998b" }} />
                    <span>View the status of your submitted limit requests.</span>
                </div>

                {/* Table */}
                <div className="flex-1 overflow-auto">
                    <table className="w-full border-collapse text-left">
                        <thead className={`sticky top-0 z-10 ${headerBg} backdrop-blur-sm border-b ${borderColor}`}>
                            <tr>
                                {dynamicKeys.map(key => {
                                    const label = key === 'productName' ? 'Product Name' :
                                        key === 'productClass' ? 'Class' :
                                            key === 'tradingPlatform' ? 'Platform' :
                                                key.replace(/([A-Z])/g, ' $1').trim();
                                    return <th key={key} className={thClass}>{label}</th>;
                                })}
                                <th className={thClass}>Current</th>
                                <th className={thClass}>Requested</th>
                                <th className={thClass}>Instrument</th>
                                <th className={thClass}>Status</th>
                                <th className={thClass}>Timeline</th>
                                <th className={thClass}>Reviewer / Comments</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item) => (
                                <TableRow
                                    key={item.id}
                                    item={item}
                                    dynamicKeys={dynamicKeys}
                                    darkMode={darkMode}
                                />
                            ))}

                            {/* Empty / loading state */}
                            {(items.length === 0) && (
                                <tr>
                                    <td colSpan={totalCols} className="px-4 py-20 text-center">
                                        <div className="flex flex-col items-center gap-2 opacity-40">
                                            {loading
                                                ? <Loader2 size={24} className="animate-spin" />
                                                : <Clock size={24} />
                                            }
                                            <span className="text-sm font-medium italic">
                                                {loading ? "Fetching request history..." : "No request history found."}
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </WidgetContainer>
    );
};

export const TraderLimitRequestsViewWidgetDef = {
    component: TraderLimitRequestsViewWidget,
};
