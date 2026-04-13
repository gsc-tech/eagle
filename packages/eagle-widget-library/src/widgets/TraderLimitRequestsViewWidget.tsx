"use client"

import React, { useState, useEffect, useMemo } from "react";
import type { BaseWidgetProps, ParameterValues } from "../types";
import { useWidgetData } from "../hooks/useWidgetData";
import { useParameterDefaults } from "../hooks/useParameterDefaults";
import { WidgetContainer } from "../components/WidgetContainer";
import { Clock, CheckCircle2, XCircle, ArrowRight, User } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MyLimitRequestsViewWidgetProps extends BaseWidgetProps {
    darkMode?: boolean;
    pollInterval?: number;
    limitHistoryApiUrl?: string; // Optional specific API for history
}

type RequestStatus = "Pending" | "Approved" | "Rejected" | "Acknowledged";

type InstrumentType = "Future" | "Option";

interface LimitRequestHistory {
    id: string;
    limitType: string;
    instrumentType?: InstrumentType;
    currentLimit: number;
    requestedLimit: number;
    status: RequestStatus;
    requestedAt: string;
    reviewedAt?: string;
    reviewerName?: string;
    comments?: string;
}

// ─── Sub-components ─────────────────────────────────────────────────────────

const StatusBadge = ({ status, darkMode }: { status: RequestStatus, darkMode: boolean }) => {
    const styles: Record<RequestStatus, string> = {
        Pending: darkMode
            ? "bg-amber-400/20 text-amber-300 border-amber-400/30"
            : "bg-yellow-400 text-yellow-900 border-yellow-500",
        Approved: darkMode
            ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
            : "bg-green-500 text-white border-green-600",
        Rejected: darkMode
            ? "bg-red-500/20 text-red-300 border-red-500/30"
            : "bg-red-500 text-white border-red-600",
        Acknowledged: darkMode
            ? "bg-orange-500/20 text-orange-300 border-orange-500/30"
            : "bg-orange-500 text-white border-orange-600",
    };

    return (
        <span className={`px-2.5 py-1 rounded-sm text-[10px] font-bold uppercase tracking-wider border shadow-sm ${styles[status]}`}>
            {status}
        </span>
    );
};

const InstrumentTypeBadge = ({ type, darkMode }: { type?: InstrumentType, darkMode: boolean }) => {
    if (!type) return <span className={`text-xs italic ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>—</span>;

    const styles: Record<InstrumentType, string> = {
        Future: darkMode
            ? "bg-blue-500/20 text-blue-300 border-blue-500/30"
            : "bg-blue-100 text-blue-700 border-blue-300",
        Option: darkMode
            ? "bg-violet-500/20 text-violet-300 border-violet-500/30"
            : "bg-violet-100 text-violet-700 border-violet-300",
    };

    return (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-sm text-[10px] font-bold uppercase tracking-wider border shadow-sm ${styles[type]}`}>
            {type}
        </span>
    );
};

const TableRow = ({ item, darkMode }: { item: LimitRequestHistory, darkMode: boolean }) => {
    const textColor = darkMode ? "text-gray-300" : "text-gray-700";
    const subTextColor = darkMode ? "text-gray-500" : "text-gray-400";
    const borderColor = darkMode ? "border-gray-800" : "border-gray-100";

    return (
        <tr className={`border-b ${borderColor} transition-colors ${darkMode ? 'hover:bg-gray-800/30' : 'hover:bg-gray-50/50'}`}>
            <td className={`px-6 py-4 text-sm font-semibold ${textColor}`}>
                {item.limitType}
            </td>
            <td className={`px-6 py-4 text-sm text-center tabular-nums ${textColor}`}>
                {item.currentLimit.toLocaleString()}
            </td>
            <td className="px-6 py-4 text-center">
                <div className="inline-flex items-center gap-2">
                    <span className={`px-3 py-1 rounded border text-sm font-medium tabular-nums shadow-sm
                        ${darkMode ? 'bg-gray-900 border-gray-800 text-gray-100' : 'bg-gray-50 border-gray-200 text-gray-900'}`}>
                        {item.requestedLimit.toLocaleString()}
                    </span>
                    {item.status === 'Approved' && <CheckCircle2 size={14} className="text-emerald-500" />}
                </div>
            </td>
            <td className="px-6 py-4 text-center">
                <InstrumentTypeBadge type={item.instrumentType} darkMode={darkMode} />
            </td>
            <td className="px-6 py-4 text-center">
                <StatusBadge status={item.status} darkMode={darkMode} />
            </td>
            <td className={`px-6 py-4 text-[11px] min-w-[180px] ${subTextColor}`}>
                <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1.5 leading-none">
                        <span>{item.requestedAt}</span>
                    </div>
                    {item.reviewedAt && (
                        <div className="flex items-center gap-1.5 leading-none mt-1">
                            <span>{item.reviewedAt}</span>
                            <ArrowRight size={10} className="mt-0.5" />
                        </div>
                    )}
                </div>
            </td>
            <td className={`px-6 py-4 text-xs ${textColor}`}>
                {item.reviewerName && (
                    <div className="flex flex-col gap-1">
                        <span className="font-bold flex items-center gap-1">
                            {item.reviewerName}
                        </span>
                        <span className={`italic ${subTextColor}`}>{item.comments || "No comments provided."}</span>
                    </div>
                )}
            </td>
        </tr>
    );
};

const StatusDot = ({ color, label, darkMode }: { color: string, label: string, darkMode: boolean }) => (
    <div className="flex items-center gap-1.5">
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
        <span className={`text-[10px] font-bold uppercase tracking-wide ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{label}</span>
    </div>
);

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

    const items = useMemo<LimitRequestHistory[]>(() => {
        if (!rawData || !Array.isArray(rawData)) return [];
        return rawData as LimitRequestHistory[];
    }, [rawData]);

    const textColor = darkMode ? "text-gray-400" : "text-gray-500";
    const borderColor = darkMode ? "border-gray-800" : "border-gray-100";
    const headerBg = darkMode ? "bg-gray-900/40" : "bg-gray-50/50";

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
            <div className={`flex flex-col h-full w-full overflow-hidden ${darkMode ? 'bg-gray-950 text-gray-100' : 'bg-white text-gray-900'}`}>

                {/* Header Legend */}
                <div className={`flex items-center justify-end gap-5 px-6 py-3 border-b ${borderColor}`}>
                    <StatusDot color="#facc15" label="Pending" darkMode={darkMode} />
                    <StatusDot color="#22c55e" label="Approved" darkMode={darkMode} />
                    <StatusDot color="#ef4444" label="Rejected" darkMode={darkMode} />
                    <StatusDot color="#f97316" label="Acknowledged" darkMode={darkMode} />
                </div>

                {/* Table Area */}
                <div className="flex-1 overflow-auto">
                    <table className="w-full border-collapse text-left">
                        <thead className={`sticky top-0 z-10 ${headerBg} backdrop-blur-md border-b ${borderColor}`}>
                            <tr>
                                <th className={`px-6 py-4 text-xs font-bold uppercase tracking-wider ${textColor}`}>Limit Type</th>
                                <th className={`px-6 py-4 text-xs font-bold uppercase tracking-wider text-center ${textColor}`}>Current Limit</th>
                                <th className={`px-6 py-4 text-xs font-bold uppercase tracking-wider text-center ${textColor}`}>Requested Limit</th>
                                <th className={`px-6 py-4 text-xs font-bold uppercase tracking-wider text-center ${textColor}`}>Instrument Type</th>
                                <th className={`px-6 py-4 text-xs font-bold uppercase tracking-wider text-center ${textColor}`}>Status</th>
                                <th className={`px-6 py-4 text-xs font-bold uppercase tracking-wider ${textColor}`}>Requested At / Reviewed At</th>
                                <th className={`px-6 py-4 text-xs font-bold uppercase tracking-wider ${textColor}`}>Comments</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item) => (
                                <TableRow key={item.id} item={item} darkMode={darkMode} />
                            ))}

                            {items.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={7} className="px-6 py-24 text-center">
                                        <div className="flex flex-col items-center gap-3 opacity-30">
                                            <Clock size={32} />
                                            <span className="text-sm font-medium italic">No request history found.</span>
                                        </div>
                                    </td>
                                </tr>
                            )}

                            {loading && (
                                <tr>
                                    <td colSpan={7} className="px-6 py-32 text-center">
                                        <div className="flex flex-col items-center gap-3 opacity-50">
                                            <Loader2 size={32} className="animate-spin text-indigo-500" />
                                            <span className="text-sm font-medium animate-pulse">Fetching request history...</span>
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

const Loader2 = ({ size, className }: { size: number, className?: string }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
);
