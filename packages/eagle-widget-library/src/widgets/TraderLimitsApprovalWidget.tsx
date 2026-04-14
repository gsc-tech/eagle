"use client"

import React, { useState, useEffect, useMemo } from "react";
import type { BaseWidgetProps, ParameterValues } from "../types";
import { useWidgetData } from "../hooks/useWidgetData";
import { useParameterDefaults } from "../hooks/useParameterDefaults";
import { WidgetContainer } from "../components/WidgetContainer";
import { Check, X as LucideX, Loader2, CheckSquare, Square, Info, UserCheck, AlertCircle } from "lucide-react";

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
            sm: "h-8 px-3 text-xs",
            md: "h-9 px-4 text-sm"
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

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TraderLimitsApprovalWidgetProps extends BaseWidgetProps {
    darkMode?: boolean;
    pollInterval?: number;
    actionApiUrl?: string;
}

type RequestStatus = "Pending" | "Approved" | "Rejected" | "Acknowledged";

interface LimitApprovalRequest {
    id: string;
    traderName: string;
    traderEmail?: string;
    accountNumber: string;
    product: string;
    category: string;
    currentLimit: number;
    requestedLimit: number;
    status: RequestStatus;
    requestedAt?: string;
}

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
        return rawData as LimitApprovalRequest[];
    }, [rawData]);

    const dataKeys = useMemo(() => {
        if (requests.length === 0) return [];
        return Object.keys(requests[0]).filter(k => 
            !['id', 'status', 'requestedLimit', 'requestedAt', 'reason', 'remark', 'traderEmail'].includes(k)
        );
    }, [requests]);

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

    const selectableRequests = requests.filter(r => r.status === "Pending" || r.status === "Acknowledged");
    const isAllSelected = selectedIds.size > 0 && selectedIds.size === selectableRequests.length;

    const borderColor = darkMode ? "border-gray-800" : "border-gray-100";
    const headerBg = darkMode ? "bg-gray-900/50" : "bg-gray-50/50";
    const textColor = darkMode ? "text-gray-300" : "text-gray-700";
    const subTextColor = darkMode ? "text-gray-400" : "text-gray-500";
    const headerTextColor = darkMode ? "text-gray-400" : "text-gray-500";

    const renderValue = (key: string, val: any) => {
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
                    <table className="w-full text-left border-collapse">
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
                                {dataKeys.map(key => {
                                    let displayKey = key;
                                    if (key === 'traderName') displayKey = 'trader';
                                    if (key === 'accountNumber') displayKey = 'account';
                                    return (
                                        <th key={key} className={`px-4 py-3 text-xs font-bold uppercase tracking-wider text-center ${headerTextColor}`}>
                                            {displayKey}
                                        </th>
                                    );
                                })}
                                <th className={`px-4 py-3 text-xs font-bold uppercase tracking-wider text-center ${headerTextColor}`}>Requested Limit</th>
                                <th className={`px-4 py-3 text-xs font-bold uppercase tracking-wider text-center ${headerTextColor}`}>Remarks</th>
                                <th className={`px-4 py-3 text-xs font-bold uppercase tracking-wider text-right ${headerTextColor}`}></th>
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
                                                onClick={() => { if(isSelectable) toggleSelect(req.id, req.status); }} 
                                                disabled={!isSelectable}
                                                className={`transition-colors ${isSelectable ? `hover:text-[#00998b] ${subTextColor}` : 'opacity-30 cursor-not-allowed text-gray-400'}`}
                                            >
                                                {isSelected ? <CheckSquare size={16} className="text-[#00998b]" /> : <Square size={16} />}
                                            </button>
                                        </td>
                                        
                                        {dataKeys.map(col => (
                                            <td key={col} className={`px-4 py-3 text-sm text-center ${textColor}`}>
                                                <div className="flex justify-center items-center">
                                                    {renderValue(col, (req as any)[col])}
                                                </div>
                                            </td>
                                        ))}

                                        <td className="px-4 py-3 min-w-[140px] text-center whitespace-nowrap">
                                            {isSelectable ? (
                                                <div className="flex items-center gap-1.5 justify-center h-full">
                                                    <span className={`font-semibold tabular-nums ${textColor}`}>
                                                        {req.requestedLimit.toLocaleString()}
                                                    </span>
                                                    <span className={`text-[11px] font-semibold tabular-nums`}
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
                                        
                                        <td className="px-4 py-3 min-w-[180px] text-center whitespace-nowrap">
                                            {isSelectable ? (
                                                <div className="flex items-center justify-center">
                                                    <Input 
                                                        darkMode={darkMode}
                                                        placeholder="Reason / Remarks..."
                                                        value={remarks[req.id] || ""}
                                                        onChange={e => handleRemarkChange(req.id, e.target.value)}
                                                        className="h-9 text-xs"
                                                    />
                                                </div>
                                            ) : (
                                                <span className={`text-xs italic ${subTextColor}`}>Reviewed</span>
                                            )}
                                        </td>
                                        
                                        <td className="px-4 py-3 min-w-[140px] text-right">
                                            {isSelectable ? (
                                                <div className="flex justify-end gap-2 items-center">
                                                    <Button variant="success" size="sm" darkMode={darkMode} onClick={() => handleAction("Approve", req.id)} className="h-8 px-2 font-bold">Approve</Button>
                                                    <Button variant="destructive" size="sm" darkMode={darkMode} onClick={() => handleAction("Reject", req.id)} className="h-8 px-2 font-bold">Reject</Button>
                                                    {req.status !== "Acknowledged" && (
                                                        <Button variant="warning" size="sm" darkMode={darkMode} onClick={() => handleAction("Acknowledge", req.id)} className="h-8 px-2 font-bold">Ack</Button>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="flex justify-end">
                                                    <span className={`text-[11px] font-bold uppercase tracking-wider block`}
                                                        style={req.status === 'Approved' ? { color: '#065f46' } : { color: '#991b1b' }}
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
                                    <td colSpan={dataKeys.length + 4} className="px-4 py-20 text-center">
                                        <div className="flex flex-col items-center gap-2 opacity-40">
                                            <Info size={24} />
                                            <span className="text-sm font-medium italic">No approval requests pending.</span>
                                        </div>
                                    </td>
                                </tr>
                            )}
                            
                            {loading && requests.length === 0 && (
                                <tr>
                                    <td colSpan={dataKeys.length + 4} className="px-4 py-20 text-center">
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

