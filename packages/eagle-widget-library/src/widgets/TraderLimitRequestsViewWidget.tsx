"use client"

import React, { useState, useEffect, useMemo } from "react";
import type { BaseWidgetProps, ParameterValues } from "../types";
import { useWidgetData } from "../hooks/useWidgetData";
import { useParameterDefaults } from "../hooks/useParameterDefaults";
import { WidgetContainer } from "../components/WidgetContainer";
import { Clock, Loader2, Info, CheckCircle, Play, FileText, X, User, ThumbsUp, Eye, AlertCircle } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MyLimitRequestsViewWidgetProps extends BaseWidgetProps {
    darkMode?: boolean;
    pollInterval?: number;
    limitHistoryApiUrl?: string;
    auditTrailApiUrl?: string;
}

type RequestStatus = "PENDING" | "APPROVED" | "REJECTED" | "ACKNOWLEDGED";
type InstrumentType = "FUTURE" | "OPTION";

// ─── Status Badge ─────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<RequestStatus, { bg: string; text: string; border: string; darkBg: string; darkText: string; darkBorder: string }> = {
    PENDING: {
        bg: "#fffbeb", text: "#92400e", border: "#fcd34d",
        darkBg: "rgba(245,158,11,0.12)", darkText: "#fbbf24", darkBorder: "rgba(245,158,11,0.3)",
    },
    APPROVED: {
        bg: "#d1fae5", text: "#065f46", border: "#6ee7b7",
        darkBg: "rgba(16,185,129,0.15)", darkText: "#6ee7b7", darkBorder: "rgba(16,185,129,0.35)",
    },
    REJECTED: {
        bg: "#fee2e2", text: "#991b1b", border: "#fca5a5",
        darkBg: "rgba(239,68,68,0.15)", darkText: "#fca5a5", darkBorder: "rgba(239,68,68,0.35)",
    },
    ACKNOWLEDGED: {
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
    FUTURE: {
        bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe",
        darkBg: "rgba(59,130,246,0.15)", darkText: "#93c5fd", darkBorder: "rgba(59,130,246,0.3)",
    },
    OPTION: {
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

// ─── Audit Trail Timeline ─────────────────────────────────────────────────────

type LucideIcon = React.ComponentType<{ size?: number; style?: React.CSSProperties }>;

interface ActionConfig {
    icon: LucideIcon;
    color: string;
    darkColor: string;
    bg: string;
    darkBg: string;
    label: string;
}

const ACTION_CONFIG: Record<string, ActionConfig> = {
    REQUEST_CREATED: {
        icon: FileText,
        color: "#1d4ed8", darkColor: "#93c5fd",
        bg: "#eff6ff", darkBg: "rgba(59,130,246,0.15)",
        label: "Request Created",
    },
    WORKFLOW_STARTED: {
        icon: Play,
        color: "#6d28d9", darkColor: "#c4b5fd",
        bg: "#f5f3ff", darkBg: "rgba(139,92,246,0.15)",
        label: "Workflow Started",
    },
    ACKNOWLEDGMENT_RECEIVED: {
        icon: Eye,
        color: "#92400e", darkColor: "#fbbf24",
        bg: "#fffbeb", darkBg: "rgba(245,158,11,0.12)",
        label: "Acknowledged",
    },
    APPROVAL_RECEIVED: {
        icon: ThumbsUp,
        color: "#065f46", darkColor: "#6ee7b7",
        bg: "#d1fae5", darkBg: "rgba(16,185,129,0.15)",
        label: "Approval Received",
    },
    REQUEST_APPROVED: {
        icon: CheckCircle,
        color: "#065f46", darkColor: "#6ee7b7",
        bg: "#d1fae5", darkBg: "rgba(16,185,129,0.15)",
        label: "Request Approved",
    },
    REQUEST_REJECTED: {
        icon: X,
        color: "#991b1b", darkColor: "#fca5a5",
        bg: "#fee2e2", darkBg: "rgba(239,68,68,0.15)",
        label: "Request Rejected",
    },
};

const FALLBACK_ACTION_CONFIG: ActionConfig = {
    icon: AlertCircle,
    color: "#374151", darkColor: "#9ca3af",
    bg: "#f3f4f6", darkBg: "rgba(107,114,128,0.15)",
    label: "",
};

const formatAuditDate = (iso: string) => {
    const d = new Date(iso);
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const month = months[d.getMonth()];
    const day = d.getDate();
    const year = d.getFullYear();
    let hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    const hStr = hours.toString().padStart(2, "0");
    return `${month} ${day} ${year} ${hStr}:${minutes} ${ampm}`;
};

const truncateId = (id: string) => {
    if (id === "system") return "system";
    if (id.length > 20) return `${id.slice(0, 8)}…${id.slice(-4)}`;
    return id;
};

const AuditTrailModal = ({ data, darkMode, onClose }: { data: any[]; darkMode: boolean; onClose: () => void }) => {
    const panelBg = darkMode ? "bg-gray-900" : "bg-white";
    const borderCol = darkMode ? "border-gray-800" : "border-gray-200";
    const textMain = darkMode ? "text-gray-100" : "text-gray-900";
    const textSub = darkMode ? "text-gray-400" : "text-gray-500";
    const textBody = darkMode ? "text-gray-200" : "text-gray-600";
    const lineBg = darkMode ? "bg-gray-800" : "bg-gray-200";
    const countBg = darkMode ? "bg-gray-800 text-gray-400" : "bg-gray-100 text-gray-500";

    return (
        <div
            className={`absolute right-0 top-0 bottom-0 w-80 flex flex-col border-l z-20 ${panelBg} ${borderCol}`}
            style={{ boxShadow: darkMode ? "-6px 0 24px rgba(0,0,0,0.5)" : "-6px 0 24px rgba(0,0,0,0.08)" }}
        >
            {/* Header */}
            <div className={`flex items-center justify-between px-4 py-3 border-b ${borderCol} flex-shrink-0`}>
                <div className="flex items-center gap-2">
                    <Clock size={15} style={{ color: "#00998b" }} />
                    <span className={`text-sm font-semibold ${textMain}`}>Audit Trail</span>
                    <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-medium ${countBg}`}>
                        {data.length}
                    </span>
                </div>
                <button
                    onClick={onClose}
                    className={`p-1 rounded transition-colors ${darkMode ? "hover:bg-gray-800 text-gray-500 hover:text-gray-300" : "hover:bg-gray-100 text-gray-400 hover:text-gray-600"}`}
                >
                    <X size={14} />
                </button>
            </div>

            {/* Timeline */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
                <div className="relative">
                    {/* Continuous vertical line — runs center-of-icon to center-of-last-icon */}
                    {data.length > 1 && (
                        <div
                            className={`absolute left-[15px] top-8 w-px ${lineBg}`}
                            style={{ bottom: "32px" }}
                        />
                    )}

                    {data.map((entry, i) => {
                        const config = ACTION_CONFIG[entry.action] ?? { ...FALLBACK_ACTION_CONFIG, label: entry.action };
                        const Icon = config.icon;
                        const iconColor = darkMode ? config.darkColor : config.color;
                        const iconBg = darkMode ? config.darkBg : config.bg;
                        const datetime = formatAuditDate(entry.created_at);
                        const isLast = i === data.length - 1;

                        return (
                            <div key={entry.id} className={`relative flex items-start gap-3 ${isLast ? "" : "mb-5"}`}>
                                {/* Icon — 32 px circle, center aligns with badge row */}
                                <div className="flex-shrink-0 z-10">
                                    <div
                                        className="w-8 h-8 rounded-full flex items-center justify-center"
                                        style={{
                                            backgroundColor: iconBg,
                                            border: `2px solid ${iconColor}`,
                                            boxShadow: `0 0 0 2px ${darkMode ? "#111827" : "#fff"}`,
                                        }}
                                    >
                                        <Icon size={13} style={{ color: iconColor }} />
                                    </div>
                                </div>

                                {/* Content — top-padded so badge text center ≈ icon center */}
                                <div className="flex-1 min-w-0 pt-1">
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <span
                                            className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
                                            style={{ backgroundColor: iconBg, color: iconColor }}
                                        >
                                            {config.label}
                                        </span>
                                    </div>
                                    <p className={`text-xs leading-relaxed ${textBody} mb-1.5`}>{entry.details}</p>
                                    <div className={`flex items-center gap-1.5 ${textSub}`}>
                                        <User size={10} />
                                        <span className={`text-[10px] font-mono truncate`}>{truncateId(entry.performed_by)}</span>
                                        <span className="mx-0.5">·</span>
                                        <span className={`text-[10px] tabular-nums`}>{datetime}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

// ─── Table Row ────────────────────────────────────────────────────────────────

interface RowProps {
    item: any;
    dynamicKeys: string[];
    darkMode: boolean;
    onInfoClick: (item: any) => void;
}

const TableRow = ({ item, dynamicKeys, darkMode, onInfoClick }: RowProps) => {
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


            {/* Requested Limit + delta */}
            <td className="px-4 py-3 text-center">
                <div className="flex flex-col items-center gap-0.5">
                    <span className={`tabular-nums text-sm font-medium ${textColor}`}>
                        {requestedLimit.toLocaleString()}
                    </span>
                </div>
            </td>

            {/* Instrument Type */}
            <td className="px-4 py-3 text-center">
                <InstrumentTypeBadge type={item.instrumentType} darkMode={darkMode} />
            </td>

            {/* Limit Type */}
            <td className="px-4 py-3 text-center">
                <span className={`tabular-nums text-sm font-medium ${textColor}`}>
                    {item.limitType}
                </span>
            </td>

            {/* Status */}
            <td className="px-4 py-3 text-center">
                <StatusBadge status={item.status} darkMode={darkMode} />
            </td>

            <td className="px-4 py-3 text-center">
                <button
                    onClick={() => onInfoClick(item)}
                    className={`p-2 rounded-md transition ${darkMode
                        ? "hover:bg-gray-800 text-gray-400 hover:text-gray-200"
                        : "hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                        }`}
                >
                    <Info size={16} />
                </button>
            </td>
        </tr>
    );
};

// ─── Main Widget ───────────────────────────────────────────────────────────────

export const TraderLimitRequestsViewWidget: React.FC<MyLimitRequestsViewWidgetProps> = ({
    initialWidgetState,
    onWidgetStateChange,
    apiUrl = "http://localhost:8080/api/limits/history",
    limitHistoryApiUrl,
    auditTrailApiUrl,
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

    const [auditTrailData, setAuditTrailData] = useState(null);

    const handleInfoClick = async (item: any) => {
        try {
            console.log(auditTrailApiUrl + "?id=" + item.id);
            let token = "";
            if (isTokenRequired && getFirebaseToken) {
                token = await getFirebaseToken();
            }
            const response = await fetch(auditTrailApiUrl + "?id=" + item.id + "&token=" + token, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                }
            });
            const data = await response.json();
            console.log(data);
            setAuditTrailData(data);
        } catch (error) {
            console.log(error);
        }
    };

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
    const totalCols = dynamicKeys.length + 5;

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
            <div className={`relative flex flex-col h-full w-full overflow-hidden ${darkMode ? "bg-gray-950 text-gray-100" : "bg-white text-gray-900"}`}>

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
                                <th className={thClass}>Requested</th>
                                <th className={thClass}>Instrument</th>
                                <th className={thClass}>Limit Type</th>
                                <th className={thClass}>Status</th>
                                <th className={thClass}>Info</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item) => (
                                <TableRow
                                    key={item.id}
                                    item={item}
                                    dynamicKeys={dynamicKeys}
                                    darkMode={darkMode}
                                    onInfoClick={handleInfoClick}
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

                {auditTrailData && (
                    <AuditTrailModal
                        data={Array.isArray(auditTrailData) ? auditTrailData : [auditTrailData]}
                        darkMode={darkMode}
                        onClose={() => setAuditTrailData(null)}
                    />
                )}
            </div>
        </WidgetContainer>
    );
};

export const TraderLimitRequestsViewWidgetDef = {
    component: TraderLimitRequestsViewWidget,
};
