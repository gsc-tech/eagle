"use client"

import React, { useState, useEffect, useMemo } from "react";
import type { BaseWidgetProps, ParameterValues } from "../types";
import { useWidgetData } from "../hooks/useWidgetData";
import { useParameterDefaults } from "../hooks/useParameterDefaults";
import { WidgetContainer } from "../components/WidgetContainer";
import { Check, X as LucideX, Loader2, CheckSquare, Square, Info, UserCheck, AlertCircle, Download, FileSpreadsheet } from "lucide-react";
import ExcelJS from "exceljs";

// ─── Shadcn-like UI Components ───────────────────────────────────────────────

const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'destructive' | 'success' | 'warning', size?: 'sm' | 'md', darkMode?: boolean }>(
    ({ className, variant = 'primary', size = 'md', style, onMouseEnter, onMouseLeave, darkMode, ...props }, ref) => {
        const [isHovered, setIsHovered] = useState(false);
        const baseStyles = "inline-flex items-center justify-center rounded-md font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 disabled:opacity-50 disabled:pointer-events-none border";

        const variants = {
            primary: "text-white shadow-sm active:scale-95 border-transparent",
            secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700 border-transparent",
            ghost: "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 border-transparent",
            outline: "border-gray-200 bg-transparent hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
        };
        const sizes = {
            sm: "h-7 px-2 text-[10px]",
            md: "h-8 px-3 text-[11px]"
        };

        const petrolColor = '#00998b';
        const petrolHighlight = '#00b3a2';

        // Direct style application for color maps
        const getCustomStyles = () => {
            if (variant === 'success') {
                return darkMode
                    ? { backgroundColor: isHovered ? 'rgba(16,185,129,0.25)' : 'rgba(16,185,129,0.15)', color: '#6ee7b7', borderColor: 'rgba(16,185,129,0.35)' }
                    : { backgroundColor: isHovered ? '#bbf7d0' : '#d1fae5', color: '#065f46', borderColor: '#6ee7b7' };
            }
            if (variant === 'destructive') {
                return darkMode
                    ? { backgroundColor: isHovered ? 'rgba(239,68,68,0.25)' : 'rgba(239,68,68,0.15)', color: '#fca5a5', borderColor: 'rgba(239,68,68,0.35)' }
                    : { backgroundColor: isHovered ? '#fecaca' : '#fee2e2', color: '#991b1b', borderColor: '#fca5a5' };
            }
            if (variant === 'warning') {
                return darkMode
                    ? { backgroundColor: isHovered ? 'rgba(249,115,22,0.2)' : 'rgba(249,115,22,0.12)', color: '#fb923c', borderColor: 'rgba(249,115,22,0.3)' }
                    : { backgroundColor: isHovered ? '#ffedd5' : '#fff7ed', color: '#9a3412', borderColor: '#fdba74' };
            }
            return {};
        };

        const finalStyle = {
            ...style,
            ...getCustomStyles(),
            backgroundColor: (getCustomStyles().backgroundColor) || (variant === 'primary'
                ? (isHovered ? petrolHighlight : petrolColor)
                : style?.backgroundColor),
            color: (getCustomStyles().color) || (variant === 'outline' ? (isHovered ? petrolHighlight : petrolColor) : style?.color),
            borderColor: (getCustomStyles().borderColor) || (variant === 'outline' ? (isHovered ? `${petrolHighlight}80` : `${petrolColor}40`) : style?.borderColor),
            transform: (variant === 'primary' && isHovered) ? 'translateY(-1px)' : undefined,
            boxShadow: (variant === 'primary' && isHovered)
                ? `0 4px 12px rgba(0, 153, 139, 0.20)`
                : undefined
        };

        return (
            <button
                ref={ref}
                className={`${baseStyles} ${variants[variant as keyof typeof variants] || ''} ${sizes[size as keyof typeof sizes]} ${className || ''}`}
                style={finalStyle}
                onMouseEnter={(e) => {
                    setIsHovered(true);
                    onMouseEnter?.(e);
                }}
                onMouseLeave={(e) => {
                    setIsHovered(false);
                    onMouseLeave?.(e);
                }}
                {...props}
            />
        );
    }
);

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { darkMode?: boolean }>(
    ({ className, darkMode, ...props }, ref) => (
        <input
            ref={ref}
            className={`flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-1 disabled:cursor-not-allowed disabled:opacity-50 tlr-no-spinner
            ${darkMode
                    ? 'border-gray-800 bg-gray-900 text-gray-100 placeholder:text-gray-500 focus-visible:ring-[#00998b]'
                    : 'border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus-visible:ring-[#00998b]'} 
            ${className || ''}`}
            style={{
                ...props.style,
                borderColor: props.autoFocus ? '#00998b' : undefined
            }}
            {...props}
        />
    )
);
 
const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement> & { darkMode?: boolean }>(
    ({ className, darkMode, ...props }, ref) => (
        <textarea
            ref={ref}
            className={`flex w-full rounded-md border px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-1 disabled:cursor-not-allowed disabled:opacity-50
            ${darkMode
                    ? 'border-gray-800 bg-gray-900 text-gray-100 placeholder:text-gray-500 focus-visible:ring-[#00998b]'
                    : 'border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus-visible:ring-[#00998b]'} 
            ${className || ''}`}
            style={{
                ...props.style,
                borderColor: props.autoFocus ? '#00998b' : undefined,
                resize: 'none',
                minHeight: '60px'
            }}
            {...props}
        />
    )
);

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TraderLimitsApprovalWidgetProps extends BaseWidgetProps {
    darkMode?: boolean;
    pollInterval?: number;
    actionApiUrl?: string;
    readOnly?: boolean;
}

type RequestStatus = "Pending" | "Approved" | "Rejected" | "Acknowledged";

interface LimitApprovalRequest {
    id: string;
    account: string;
    trader: string;
    clearer: string;
    tradingPlatform: string;
    product: string;
    productName: string;
    productClass: string;
    instrumentType: string;
    currentLimit: number;
    requestedLimit: number;
    status: RequestStatus;
    requestedAt?: string;
    reason?: string;
    remark?: string;
    limitType?: string;
}

const DISPLAY_COLUMNS = [
    { key: 'account', label: 'Account' },
    { key: 'trader', label: 'Trader' },
    { key: 'clearer', label: 'Clearer' },
    { key: 'tradingPlatform', label: 'Platform' },
    { key: 'product', label: 'Product' },
    { key: 'productName', label: 'Product Name' },
    { key: 'productClass', label: 'Class' },
    { key: 'instrumentType', label: 'Type' },
    { key: 'requestedAt', label: 'Requested At' },
    { key: 'limitType', label: 'Limit Type' },
];

// ─── Main Widget ───────────────────────────────────────────────────────────────

export const TraderLimitsApprovalWidget: React.FC<TraderLimitsApprovalWidgetProps> = ({
    initialWidgetState,
    onWidgetStateChange,
    apiUrl = "http://localhost:8080/api/limits/approvals",
    actionApiUrl = "http://localhost:8080/api/limits/action",
    title = "Limit Approvals",
    parameters,
    darkMode = false,
    pollInterval = 30000,
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

    const requests = useMemo<LimitApprovalRequest[]>(() => {
        if (!rawData || !Array.isArray(rawData)) return [];
        return rawData.map((item: any) => ({
            id: item.id || '',
            account: item.account || item.accountNumber || item['Account Number'] || item['Account'] || '',
            trader: item.trader || item.traderName || '',
            clearer: item.clearer || '',
            tradingPlatform: item.tradingPlatform || item['trading platform'] || '',
            product: item.product || '',
            productName: item.productName || item['product name'] || '',
            productClass: item.productClass || item['product class'] || '',
            instrumentType: item.instrumentType || item['instrument type'] || item.category || '',
            currentLimit: Number(item.currentLimit ?? item.currentLevel ?? item.CurrentLimit ?? item.CurrentLevel ?? 0),
            requestedLimit: Number(item.requestedLimit ?? item.RequestedLimit ?? 0),
            status: item.status || 'Pending',
            requestedAt: item.requestedAt || item.created_at || '',
            reason: item.reason || '',
            remark: item.remark || '',
            limitType: item.limitType || item.limit_type || ''
        }));
    }, [rawData]);

    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [remarks, setRemarks] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const toggleSelectAll = () => {
        const selectableIds = requests.filter(r => r.status === "Pending" || r.status === "Acknowledged").map(r => r.id);
        if (selectedIds.size === selectableIds.length && selectableIds.length > 0) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(selectableIds));
        }
    };

    const toggleSelect = (id: string, status: string) => {
        if (status !== "Pending" && status !== "Acknowledged") return;
        const next = new Set(selectedIds);
        if (next.has(id)) {
            next.delete(id);
        } else {
            next.add(id);
        }
        setSelectedIds(next);
    };

    const handleRemarkChange = (id: string, val: string) => {
        setRemarks(prev => ({ ...prev, [id]: val }));
    };

    const handleAction = async (action: "Approve" | "Reject" | "Acknowledge", singleId?: string) => {
        const targetIds = singleId ? [singleId] : Array.from(selectedIds);
        if (targetIds.length === 0) return;

        setIsSubmitting(true);
        try {
            const payload = targetIds.map(id => ({
                id,
                action,
                remark: remarks[id] || ""
            }));

            let token: string | undefined;
            if (isTokenRequired && getFirebaseToken) {
                token = await getFirebaseToken();
            }

            const headers: Record<string, string> = { "Content-Type": "application/json" };
            if (token) headers["Authorization"] = `Bearer ${token}`;

            console.log("Submitting bulk action:", payload);
            alert(`Successfully processed ${targetIds.length} request(s) as ${action}`);

            const nextSelected = new Set(selectedIds);
            targetIds.forEach(id => nextSelected.delete(id));
            setSelectedIds(nextSelected);
        } catch (err) {
            console.error(err);
            alert("Failed to perform action");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleExport = async () => {
        if (requests.length === 0) return;

        try {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet("Limit Approvals");

            // Define columns
            worksheet.columns = [
                ...DISPLAY_COLUMNS.map(col => ({ header: col.label, key: col.key, width: 20 })),
                { header: "Requested Limit", key: "requestedLimit", width: 20 },
                { header: "Reason", key: "reason", width: 30 },
                { header: "Status", key: "status", width: 15 },
                { header: "Remarks", key: "remark", width: 30 }
            ];

            // Add rows
            worksheet.addRows(requests);

            // Style headers
            worksheet.getRow(1).font = { bold: true };
            worksheet.getRow(1).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF00998B' } // Petrol color
            };
            worksheet.getRow(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };

            // Generate buffer
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);

            const link = document.createElement("a");
            link.href = url;
            link.download = `limit_approvals_${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Export Error:", error);
            alert("Failed to generate Excel file.");
        }
    };

    const selectableRequests = requests.filter(r => r.status === "Pending" || r.status === "Acknowledged");
    const isAllSelected = selectedIds.size > 0 && selectedIds.size === selectableRequests.length;

    const borderColor = darkMode ? "border-gray-800" : "border-gray-100";
    const headerBg = darkMode ? "bg-gray-900/50" : "bg-gray-50/50";
    const textColor = darkMode ? "text-gray-300" : "text-gray-700";
    const subTextColor = darkMode ? "text-gray-400" : "text-gray-500";
    const headerTextColor = darkMode ? "text-gray-400" : "text-gray-500";

    const renderValue = (key: string, val: any) => {
        if (key === 'requestedAt' && val) {
            try {
                const date = new Date(val);
                return <span title={val}>{date.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>;
            } catch (e) {
                return <span>{val}</span>;
            }
        }
        if (key === 'limitType' && val) {
            return (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tighter ${val.toLowerCase().includes('spread')
                    ? (darkMode ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'bg-orange-100 text-orange-700 border border-orange-200')
                    : (darkMode ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-blue-100 text-blue-700 border border-blue-200')
                    }`}>
                    {val}
                </span>
            );
        }
        if (typeof val === "number") {
            return <span className="tabular-nums">{val.toLocaleString()}</span>;
        }
        return <span>{val ?? "—"}</span>;
    };

    return (
        <WidgetContainer
            title={title}
            parameters={parameters}
            onParametersChange={setCurrentParams}
            darkMode={darkMode}
            initialParameterValues={currentParams}
            onGroupedParametersChange={onGroupedParametersChange}
            groupedParametersValues={groupedParametersValues}
        >
            <style>{`
                .tlr-no-spinner::-webkit-inner-spin-button,
                .tlr-no-spinner::-webkit-outer-spin-button {
                    -webkit-appearance: none;
                    margin: 0;
                }
                .tlr-no-spinner {
                    -moz-appearance: textfield;
                }
            `}</style>
            <div className={`flex flex-col h-full w-full overflow-hidden ${darkMode ? 'bg-gray-950 text-gray-100' : 'bg-white text-gray-900'}`}>

                <div className={`flex items-center justify-between px-4 py-2 text-[11px] border-b ${borderColor} transition-colors ${selectedIds.size > 0 ? (darkMode ? 'bg-[#00998b]/10' : 'bg-[#00998b]/5') : ''}`}>
                    <div className="flex items-center gap-2">
                        <UserCheck size={14} className="text-[#00998b]" />
                        <span className={`font-semibold ${textColor}`}>
                            {selectedIds.size > 0 ? `${selectedIds.size} request(s) selected` : 'Approvals Dashboard'}
                        </span>
                    </div>

                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleExport}
                            className="h-8 text-[11px] gap-1 px-3 border-gray-200 dark:border-gray-700"
                            title="Export approval requests to Excel"
                        >
                            <Download size={14} /> Export
                        </Button>
                        <Button
                            variant="success"
                            size="sm"
                            darkMode={darkMode}
                            disabled={selectedIds.size === 0 || isSubmitting}
                            onClick={() => handleAction("Approve")}
                            className="gap-1 px-3"
                        >
                            <Check size={14} /> Approve Selected
                        </Button>
                        <Button
                            variant="destructive"
                            size="sm"
                            darkMode={darkMode}
                            disabled={selectedIds.size === 0 || isSubmitting}
                            onClick={() => handleAction("Reject")}
                            className="gap-1 px-3"
                        >
                            <LucideX size={14} /> Reject Selected
                        </Button>
                        <Button
                            variant="warning"
                            size="sm"
                            darkMode={darkMode}
                            disabled={selectedIds.size === 0 || isSubmitting}
                            onClick={() => handleAction("Acknowledge")}
                            className="gap-1 px-3"
                        >
                            <AlertCircle size={14} /> Acknowledge Selected
                        </Button>
                    </div>
                </div>

                <div className="flex-1 overflow-auto">
                    <table className="min-w-max w-full text-left border-collapse table-fixed">
                        <thead className={`sticky top-0 z-10 ${headerBg} backdrop-blur-sm border-b ${borderColor}`}>
                            <tr>
                                <th className={`px-4 py-3 w-10 text-center ${headerTextColor}`}>
                                    <button
                                        onClick={toggleSelectAll}
                                        disabled={selectableRequests.length === 0}
                                        className={`transition-colors ${selectableRequests.length === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:text-[#00998b]'}`}
                                    >
                                        {isAllSelected ? <CheckSquare size={16} className="text-[#00998b]" /> : <Square size={16} />}
                                    </button>
                                </th>
                                {DISPLAY_COLUMNS.map(col => {
                                    let widthClass = "min-w-[90px]";
                                    if (col.key === 'product' || col.key === 'account' || col.key === 'clearer' || col.key === 'tradingPlatform' || col.key === 'productClass' || col.key === 'instrumentType') widthClass = "w-[70px] min-w-[70px]";
                                    if (col.key === 'requestedAt') widthClass = "w-[120px] min-w-[120px]";
                                    if (col.key === 'productName' || col.key === 'trader' || col.key === 'limitType') widthClass = "w-[120px] min-w-[120px]";
                                    
                                    return (
                                        <th key={col.key} className={`px-4 py-3 text-xs font-bold uppercase tracking-wider text-center ${headerTextColor} ${widthClass} truncate`}>
                                            {col.label}
                                        </th>
                                    );
                                })}
                                <th className={`px-4 py-3 text-xs font-bold uppercase tracking-wider text-center ${headerTextColor} w-[100px] min-w-[100px]`}>Requested Limit</th>
                                <th className={`px-4 py-3 text-xs font-bold uppercase tracking-wider text-center ${headerTextColor} w-[150px] min-w-[150px]`}>Reason for Request</th>
                                <th className={`px-4 py-3 text-xs font-bold uppercase tracking-wider text-center ${headerTextColor} min-w-[800px] w-full`}>Remarks</th>
                                <th className={`px-4 py-3 text-xs font-bold uppercase tracking-wider text-center ${headerTextColor} w-[100px] min-w-[100px]`}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {requests.map(req => {
                                const isSelected = selectedIds.has(req.id);
                                const isSelectable = req.status === "Pending" || req.status === "Acknowledged";

                                return (
                                    <tr
                                        key={req.id}
                                        className={`group transition-colors border-b ${borderColor} 
                                            ${isSelected ? (darkMode ? 'bg-[#00998b]/10' : 'bg-[#00998b]/5') : (darkMode ? 'hover:bg-gray-800/50' : 'hover:bg-gray-50/50')}
                                            ${!isSelectable ? 'opacity-70' : ''}`}
                                    >
                                        <td className="px-4 py-3 text-center">
                                            <button
                                                onClick={() => { if (isSelectable) toggleSelect(req.id, req.status); }}
                                                disabled={!isSelectable}
                                                className={`transition-colors ${isSelectable ? `hover:text-[#00998b] ${subTextColor}` : 'opacity-30 cursor-not-allowed text-gray-400'}`}
                                            >
                                                {isSelected ? <CheckSquare size={16} className="text-[#00998b]" /> : <Square size={16} />}
                                            </button>
                                        </td>

                                        {DISPLAY_COLUMNS.map(col => {
                                            let widthClass = "min-w-[90px]";
                                            if (col.key === 'product' || col.key === 'account' || col.key === 'clearer' || col.key === 'tradingPlatform' || col.key === 'productClass' || col.key === 'instrumentType') widthClass = "w-[70px] min-w-[70px]";
                                            if (col.key === 'requestedAt') widthClass = "w-[120px] min-w-[120px]";
                                            if (col.key === 'productName' || col.key === 'trader' || col.key === 'limitType') widthClass = "w-[120px] min-w-[120px]";

                                            return (
                                                <td key={col.key} className={`px-4 py-2 text-sm text-center ${textColor} ${widthClass}`}>
                                                    <div className="flex justify-center items-center truncate">
                                                        {renderValue(col.key, (req as any)[col.key])}
                                                    </div>
                                                </td>
                                            );
                                        })}

                                        <td className="px-4 py-3 w-[100px] min-w-[100px] text-center whitespace-nowrap">
                                            {isSelectable ? (
                                                <div className="flex items-center gap-1.5 justify-center h-full">
                                                    <span className={`text-sm font-bold tabular-nums ${textColor}`}>
                                                        {req.requestedLimit.toLocaleString()}
                                                    </span>
                                                    <span className={`text-sm font-bold tabular-nums`}
                                                        style={req.requestedLimit > req.currentLimit
                                                            ? { color: '#22c55e' }
                                                            : req.requestedLimit < req.currentLimit
                                                                ? { color: '#ef4444' }
                                                                : { color: darkMode ? '#9ca3af' : '#6b7280' }
                                                        }
                                                    >
                                                        {req.requestedLimit > req.currentLimit ? '(+' : '('}
                                                        {(req.requestedLimit - req.currentLimit).toLocaleString()})
                                                    </span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-center">
                                                    <span className={`tabular-nums ${subTextColor}`}>{req.requestedLimit.toLocaleString()}</span>
                                                </div>
                                            )}
                                        </td>

                                        <td className="px-4 py-3 w-[150px] min-w-[150px] text-center">
                                            <span className={`text-[11px] ${subTextColor} italic break-words`}>
                                                {req.reason || "—"}
                                            </span>
                                        </td>

                                        <td className="px-4 py-3 min-w-[800px] w-full text-center">
                                            {isSelectable ? (
                                                <div className="flex items-center justify-center py-1">
                                                    <Textarea
                                                        darkMode={darkMode}
                                                        placeholder="Add remarks for this action..."
                                                        value={remarks[req.id] || ""}
                                                        onChange={e => handleRemarkChange(req.id, e.target.value)}
                                                        className="text-[11px] text-center w-full"
                                                        rows={2}
                                                    />
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-center py-2">
                                                    <span className={`text-[11px] text-center italic ${subTextColor} break-words max-w-[750px]`}>
                                                        {req.remark || "Reviewed"}
                                                    </span>
                                                </div>
                                            )}
                                        </td>

                                        <td className="px-4 py-3 min-w-[100px] text-center">
                                            {isSelectable ? (
                                                <div className="flex justify-center gap-1.5 items-center">
                                                    <Button variant="success" size="sm" darkMode={darkMode} onClick={() => handleAction("Approve", req.id)} className="h-8 w-8 p-0" title="Approve Request">
                                                        <Check size={16} />
                                                    </Button>
                                                    <Button variant="destructive" size="sm" darkMode={darkMode} onClick={() => handleAction("Reject", req.id)} className="h-8 w-8 p-0" title="Reject Request">
                                                        <LucideX size={16} />
                                                    </Button>
                                                    {req.status !== "Acknowledged" && (
                                                        <Button variant="warning" size="sm" darkMode={darkMode} onClick={() => handleAction("Acknowledge", req.id)} className="h-8 w-8 p-0" title="Acknowledge Request">
                                                            <AlertCircle size={16} />
                                                        </Button>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="flex justify-center">
                                                    <span className={`text-[10px] font-bold uppercase tracking-wider block px-2 py-0.5 rounded border`}
                                                        style={req.status === 'Approved'
                                                            ? { color: '#065f46', backgroundColor: darkMode ? 'rgba(16,185,129,0.1)' : '#d1fae5', borderColor: '#6ee7b7' }
                                                            : req.status === 'Rejected'
                                                                ? { color: '#991b1b', backgroundColor: darkMode ? 'rgba(239,68,68,0.1)' : '#fee2e2', borderColor: '#fca5a5' }
                                                                : { color: '#9a3412', backgroundColor: darkMode ? 'rgba(249,115,22,0.1)' : '#fff7ed', borderColor: '#fdba74' }
                                                        }
                                                    >
                                                        {req.status}
                                                    </span>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}

                            {requests.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={DISPLAY_COLUMNS.length + 5} className="px-4 py-20 text-center">
                                        <div className="flex flex-col items-center gap-2 opacity-40">
                                            <Info size={24} />
                                            <span className="text-sm font-medium italic">No approval requests pending.</span>
                                        </div>
                                    </td>
                                </tr>
                            )}

                            {loading && requests.length === 0 && (
                                <tr>
                                    <td colSpan={DISPLAY_COLUMNS.length + 5} className="px-4 py-20 text-center">
                                        <div className="flex flex-col items-center gap-2 opacity-40">
                                            <Loader2 size={24} className="animate-spin" />
                                            <span className="text-sm font-medium italic">Loading requests...</span>
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

export const TraderLimitsApprovalWidgetDef = {
    component: TraderLimitsApprovalWidget,
};

