"use client"

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import ExcelJS from "exceljs";
import type { BaseWidgetProps, ParameterValues } from "../types";
import { useWidgetData } from "../hooks/useWidgetData";
import { useParameterDefaults } from "../hooks/useParameterDefaults";
import { WidgetContainer } from "../components/WidgetContainer";
import { Check, X as LucideX, Loader2, Plus, Info, Trash2, ChevronDown, Download, Upload, AlertCircle, FileSpreadsheet } from "lucide-react";

// ─── Shadcn-like UI Components ───────────────────────────────────────────────

const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'destructive', size?: 'sm' | 'md' }>(
    ({ className, variant = 'primary', size = 'md', style, onMouseEnter, onMouseLeave, ...props }, ref) => {
        const [isHovered, setIsHovered] = useState(false);
        const baseStyles = "inline-flex items-center justify-center rounded-md font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 disabled:opacity-50 disabled:pointer-events-none";

        const variants = {
            primary: "text-white shadow-sm active:scale-95",
            secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700",
            ghost: "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400",
            outline: "border border-gray-200 bg-transparent hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800",
            destructive: "text-white shadow-sm active:scale-95 hover:brightness-110"
        };
        const sizes = {
            sm: "h-7 px-2 text-[10px]",
            md: "h-8 px-3 text-[11px]"
        };

        const petrolColor = '#00998b';
        const petrolHighlight = '#00b3a2';
        const redColor = '#ef4444';
        const redHighlight = '#ff5a5a';

        const finalStyle = {
            ...style,
            backgroundColor: variant === 'primary'
                ? (isHovered ? petrolHighlight : petrolColor)
                : variant === 'destructive'
                    ? (isHovered ? redHighlight : redColor)
                    : undefined,
            color: variant === 'outline' ? (isHovered ? petrolHighlight : petrolColor) : undefined,
            borderColor: variant === 'outline' ? (isHovered ? `${petrolHighlight}80` : `${petrolColor}40`) : undefined,
            transform: ((variant === 'primary' || variant === 'destructive') && isHovered) ? 'translateY(-1px)' : undefined,
            boxShadow: ((variant === 'primary' || variant === 'destructive') && isHovered)
                ? `0 4px 12px ${variant === 'primary' ? 'rgba(0, 153, 139, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`
                : undefined
        };

        return (
            <button
                ref={ref}
                className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
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
                    ? 'border-gray-800 bg-gray-900 text-gray-100 placeholder:text-gray-500'
                    : 'border-gray-200 bg-white text-gray-900 placeholder:text-gray-400'} 
            ${className}`}
            style={{
                ...props.style,
                borderColor: props.autoFocus ? '#00998b' : undefined
            }}
            {...props}
        />
    )
);

const Select = ({ options, value, onChange, placeholder, darkMode, className }: { options: string[], value: string, onChange: (val: string) => void, placeholder: string, darkMode: boolean, className?: string }) => {
    return (
        <div className={`relative w-full min-w-[120px] ${className}`}>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className={`flex h-9 w-full rounded-md border px-3 pr-8 py-1 text-[11px] shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 cursor-pointer
                ${darkMode
                        ? 'border-gray-800 bg-gray-900 text-gray-100'
                        : 'border-gray-200 bg-white text-gray-900'}`}
            >
                <option value="" disabled>{placeholder}</option>
                {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-2.5 pointer-events-none opacity-50">
                <ChevronDown size={14} />
            </div>
        </div>
    );
};

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TraderLimitsRequestWidgetProps extends BaseWidgetProps {
    darkMode?: boolean;
    pollInterval?: number;
    requestApiUrl?: string;
    limitField?: string;
    colorizeNumeric?: boolean;
    allowAddingRows?: boolean;
    productOptions?: string[];
    readOnly?: boolean;
}

type RowStatus = "idle" | "editing" | "submitting" | "success" | "error";

interface RowState {
    status: RowStatus;
    requestedOutrightLimit: string;
    requestedSpreadLimit: string;
    reason: string;
    message: string;
    draftData?: Record<string, string>;
}

// ─── Sub-component for each Row ──────────────────────────────────────────────

interface RowProps {
    data: any;
    columns: string[];
    darkMode: boolean;
    resolvedLimitField: string | null;
    colorizeNumeric: boolean;
    onSubmit: (row: any, state: RowState) => Promise<void>;
    isNew?: boolean;
    onRemove?: () => void;
    columnOptions?: Record<string, string[]>;
    showRequestCols: boolean;
    onStateChange?: (state: RowState) => void;
    readOnly?: boolean;
}

const TableRow: React.FC<RowProps> = ({
    data,
    columns,
    darkMode,
    resolvedLimitField,
    colorizeNumeric,
    onSubmit,
    isNew,
    onRemove,
    columnOptions = {},
    showRequestCols,
    onStateChange,
    readOnly = false
}) => {
    const [state, setState] = useState<RowState>(() => ({
        status: isNew ? "editing" : "idle",
        requestedOutrightLimit: "",
        requestedSpreadLimit: "",
        reason: "",
        message: "",
        draftData: isNew ? columns.reduce((acc, col) => ({ ...acc, [col]: "" }), {}) : undefined
    }));

    const onStateChangeRef = useRef(onStateChange);
    onStateChangeRef.current = onStateChange;

    useEffect(() => {
        onStateChangeRef.current?.(state);
    }, [state]);

    const isEditing = state.status === "editing" || state.status === "submitting" || state.status === "error";

    const handleRequest = () => {
        setState({
            status: "editing",
            requestedOutrightLimit: "",
            requestedSpreadLimit: "",
            reason: "",
            message: ""
        });
    };

    const handleCancel = () => {
        if (isNew && onRemove) {
            onRemove();
        } else {
            setState({ ...state, status: "idle" });
        }
    };

    const handleInternalSubmit = async () => {
        if (!state.requestedOutrightLimit && !state.requestedSpreadLimit) return;

        // Ensure reason is provided
        if (!state.reason || state.reason.trim().length < 2) {
            setState(prev => ({
                ...prev,
                status: "error",
                message: "Please provide a valid reason (min 2 chars)"
            }));
            return;
        }

        setState(prev => ({ ...prev, status: "submitting" }));
        try {
            const submissionData = isNew ? { ...state.draftData } : data;
            await onSubmit(submissionData, state);
            setState(prev => ({ ...prev, status: "success", message: "Submitted" }));
            setTimeout(() => {
                if (isNew && onRemove) {
                    onRemove();
                } else {
                    setState(prev => ({ ...prev, status: "idle" }));
                }
            }, 3000);
        } catch (err: any) {
            setState(prev => ({ ...prev, status: "error", message: err.message || "Failed" }));
        }
    };

    const renderValue = (key: string, val: any) => {
        if (isNew && isEditing) {
            if (key === resolvedLimitField || key.toLowerCase().includes("limit")) {
                return <span className={darkMode ? "text-gray-500 italic text-xs" : "text-gray-400 italic text-xs"}>0</span>;
            }

            if (columnOptions[key]) {
                return (
                    <Select
                        placeholder={`Select ${key}`}
                        options={columnOptions[key]}
                        value={state.draftData?.[key] || ""}
                        onChange={val => setState({ ...state, draftData: { ...state.draftData, [key]: val } })}
                        darkMode={darkMode}
                    />
                );
            }

            return (
                <Input
                    value={state.draftData?.[key] || ""}
                    onChange={e => setState({ ...state, draftData: { ...state.draftData, [key]: e.target.value } })}
                    disabled={state.status === "submitting"}
                    className="h-9 text-sm text-center min-w-[80px]"
                    darkMode={darkMode}
                    placeholder={key}
                />
            );
        }

        if (typeof val === "number") {
            return <span className="tabular-nums font-semibold">{val.toLocaleString()}</span>;
        }
        return <span>{val ?? "—"}</span>;
    };

    const borderColor = darkMode ? "border-gray-800" : "border-gray-100";
    const textColor = darkMode ? "text-gray-300" : "text-gray-700";

    return (
        <tr className={`group transition-colors ${darkMode ? 'hover:bg-gray-800/50' : 'hover:bg-gray-50/50'} border-b ${borderColor} ${isNew ? (darkMode ? 'bg-[#00998b]/10' : 'bg-[#00998b]/5') : ''}`}>
            {columns.map(col => (
                <td key={col} className={`px-4 py-3 text-sm text-center ${textColor}`}>
                    <div className="flex justify-center items-center">
                        {renderValue(col, data[col])}
                    </div>
                </td>
            ))}

            {showRequestCols && (
                <>
                    {/* Request Outright Limit */}
                    <td className="px-4 py-2 min-w-[150px] text-center whitespace-nowrap">
                        {isEditing ? (
                            <div className="flex items-center gap-2 justify-center h-full">
                                <Input
                                    type="number"
                                    value={state.requestedOutrightLimit}
                                    onChange={e => setState({ ...state, requestedOutrightLimit: e.target.value })}
                                    disabled={state.status === "submitting"}
                                    className="h-8 w-24 text-sm text-center"
                                    darkMode={darkMode}
                                    autoFocus={!isNew}
                                    placeholder="Outright"
                                />
                                {!isNew && state.requestedOutrightLimit && data.outrightLimit !== undefined && (
                                    <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded transition-all duration-200
                                        ${Number(state.requestedOutrightLimit) > Number(data.outrightLimit)
                                            ? 'text-green-500 bg-green-50 dark:bg-green-900/20'
                                            : Number(state.requestedOutrightLimit) < Number(data.outrightLimit)
                                                ? 'text-red-500 bg-red-50 dark:bg-red-900/20'
                                                : (darkMode ? 'text-gray-400 bg-gray-800 border border-gray-700' : 'text-gray-400 bg-gray-50')}`}>
                                        {Number(state.requestedOutrightLimit) > Number(data.outrightLimit) ? '+' : ''}
                                        {Number(state.requestedOutrightLimit) - Number(data.outrightLimit)}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <span className="text-gray-400 italic text-xs">—</span>
                        )}
                    </td>

                    {/* Request Spread Limit */}
                    <td className="px-4 py-2 min-w-[150px] text-center whitespace-nowrap">
                        {isEditing ? (
                            <div className="flex items-center gap-2 justify-center h-full">
                                <Input
                                    type="number"
                                    value={state.requestedSpreadLimit}
                                    onChange={e => setState({ ...state, requestedSpreadLimit: e.target.value })}
                                    disabled={state.status === "submitting"}
                                    className="h-8 w-24 text-sm text-center"
                                    darkMode={darkMode}
                                    placeholder="Spread"
                                />
                                {!isNew && state.requestedSpreadLimit && data.spreadLimit !== undefined && (
                                    <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded transition-all duration-200
                                        ${Number(state.requestedSpreadLimit) > Number(data.spreadLimit)
                                            ? 'text-green-500 bg-green-50 dark:bg-green-900/20'
                                            : Number(state.requestedSpreadLimit) < Number(data.spreadLimit)
                                                ? 'text-red-500 bg-red-50 dark:bg-red-900/20'
                                                : (darkMode ? 'text-gray-400 bg-gray-800 border border-gray-700' : 'text-gray-400 bg-gray-50')}`}>
                                        {Number(state.requestedSpreadLimit) > Number(data.spreadLimit) ? '+' : ''}
                                        {Number(state.requestedSpreadLimit) - Number(data.spreadLimit)}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <span className="text-gray-400 italic text-xs">—</span>
                        )}
                    </td>

                    {/* Reason */}
                    <td className="px-4 py-2 min-w-[180px] text-center whitespace-nowrap">
                        {isEditing ? (
                            <div className="flex items-center justify-center">
                                <Input
                                    placeholder="Reason..."
                                    value={state.reason}
                                    onChange={e => setState({ ...state, reason: e.target.value })}
                                    disabled={state.status === "submitting"}
                                    className="h-8 text-sm text-center"
                                    darkMode={darkMode}
                                />
                            </div>
                        ) : (
                            <span className="text-gray-400 italic text-xs">—</span>
                        )}
                    </td>
                </>
            )}

            {!readOnly && (
                <td className="px-4 py-2 min-w-[140px] text-center">
                    <div className="flex flex-col items-center justify-center gap-1">
                        <div className="flex justify-center gap-2 items-center">
                            {state.status === "idle" && (
                                <Button variant="outline" size="sm" onClick={handleRequest} className="gap-1">
                                    <Plus size={14} /> Request
                                </Button>
                            )}

                            {(state.status === "editing" || state.status === "error") && (
                                <>
                                    <Button
                                        variant="primary"
                                        size="sm"
                                        onClick={handleInternalSubmit}
                                        className="min-w-[70px] h-8"
                                        disabled={!state.reason || state.reason.trim().length < 5}
                                        style={{
                                            opacity: (!state.reason || state.reason.trim().length < 5) ? 0.5 : 1,
                                            cursor: (!state.reason || state.reason.trim().length < 5) ? 'not-allowed' : 'pointer'
                                        }}
                                        title={(!state.reason || state.reason.trim().length < 5) ? "Reason required (min 5 chars)" : "Submit request"}
                                    >
                                        Submit
                                    </Button>
                                    <Button variant="destructive" size="sm" onClick={handleCancel} className="w-8 h-8 px-0 flex items-center justify-center font-bold">
                                        X
                                    </Button>
                                </>
                            )}

                            {state.status === "submitting" && (
                                <div className="flex items-center gap-2 text-xs font-medium px-3 py-1" style={{ color: '#00998b' }}>
                                    <Loader2 size={14} className="animate-spin" /> Submitting...
                                </div>
                            )}

                            {state.status === "success" && (
                                <div className="flex items-center gap-1.5 text-green-500 text-xs font-bold bg-green-50 dark:bg-green-900/20 px-3 py-1.5 rounded-full border border-green-200 dark:border-green-900/30">
                                    <Check size={14} /> {state.message}
                                </div>
                            )}
                        </div>

                        {state.status === "error" && (
                            <span className="text-[10px] text-red-500 font-bold bg-red-50 dark:bg-red-900/10 px-2 py-0.5 rounded border border-red-100 dark:border-red-900/20">
                                {state.message}
                            </span>
                        )}

                        {(state.status === "editing") && (!state.reason || state.reason.trim().length < 5) && (
                            <span className="text-[9px] text-gray-400 italic">Reason required *</span>
                        )}
                    </div>
                </td>
            )}
        </tr>
    );
};

// ─── Import Preview Modal ───────────────────────────────────────────────────

interface ImportPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    data: any[];
    darkMode: boolean;
    isSubmitting: boolean;
}

const ImportPreviewModal: React.FC<ImportPreviewModalProps> = ({ isOpen, onClose, onConfirm, data, darkMode, isSubmitting }) => {
    if (!isOpen) return null;

    const borderColor = darkMode ? "border-gray-800" : "border-gray-100";
    const headerBg = darkMode ? "bg-gray-900" : "bg-gray-50";

    const missingReasonsCount = data.filter(r => !r.reason || r.reason.trim().length < 5).length;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className={`w-full max-w-5xl max-h-[85vh] flex flex-col rounded-xl shadow-2xl overflow-hidden border ${borderColor} ${darkMode ? 'bg-gray-950 text-white' : 'bg-white text-gray-900'}`}>
                {/* Header */}
                <div className={`flex items-center justify-between px-6 py-4 border-b ${borderColor} ${headerBg}`}>
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-[#00998b]/10 text-[#00998b]">
                            <FileSpreadsheet size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">Review Import Changes</h3>
                            <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                {data.length} rows identified with limit changes.
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full transition-colors">
                        <LucideX size={20} />
                    </button>
                </div>

                {/* Table */}
                <div className="flex-1 overflow-auto p-4">
                    <table className="w-full text-sm border-collapse">
                        <thead className={`sticky top-0 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'} z-10 shadow-sm`}>
                            <tr className={`border-b ${borderColor}`}>
                                <th className="px-4 py-3 text-left font-semibold">Account</th>
                                <th className="px-4 py-3 text-left font-semibold">Product</th>
                                <th className="px-4 py-3 text-center font-semibold">Outright (New)</th>
                                <th className="px-4 py-3 text-center font-semibold">Spread (New)</th>
                                <th className="px-4 py-3 text-left font-semibold">Reason</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {data.map((row, idx) => {
                                const isReasonValid = row.reason && row.reason.trim().length >= 5;
                                return (
                                    <tr key={idx} className={darkMode ? 'hover:bg-gray-900' : 'hover:bg-gray-50'}>
                                        <td className="px-4 py-2.5 font-mono text-xs">{row.account}</td>
                                        <td className="px-4 py-2.5">{row.product}</td>
                                        <td className="px-4 py-2.5 text-center">
                                            <div className="flex flex-col items-center gap-0.5">
                                                <div className="flex items-center gap-1">
                                                    <span className="text-gray-500 text-[10px] tabular-nums">{row.outrightLimit?.toLocaleString() || 0}</span>
                                                    <span className="text-gray-400">→</span>
                                                    <span className={`text-sm font-bold tabular-nums ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                                        {row.requestedOutrightLimit?.toLocaleString() || 0}
                                                    </span>
                                                </div>
                                                {row.requestedOutrightLimit !== row.outrightLimit && (
                                                    <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md flex items-center gap-0.5 ${Number(row.requestedOutrightLimit) > Number(row.outrightLimit)
                                                        ? 'text-green-400 bg-green-500/20'
                                                        : 'text-red-400 bg-red-500/20'
                                                        }`}>
                                                        {Number(row.requestedOutrightLimit) > Number(row.outrightLimit) ? <Plus size={8} strokeWidth={4} /> : <span className="mb-0.5 text-sm">↓</span>}
                                                        {Math.abs(Number(row.requestedOutrightLimit) - Number(row.outrightLimit)).toLocaleString()}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-2.5 text-center">
                                            <div className="flex flex-col items-center gap-0.5">
                                                <div className="flex items-center gap-1">
                                                    <span className="text-gray-500 text-[10px] tabular-nums">{row.spreadLimit?.toLocaleString() || 0}</span>
                                                    <span className="text-gray-400">→</span>
                                                    <span className={`text-sm font-bold tabular-nums ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                                        {row.requestedSpreadLimit?.toLocaleString() || 0}
                                                    </span>
                                                </div>
                                                {row.requestedSpreadLimit !== row.spreadLimit && (
                                                    <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md flex items-center gap-0.5 ${Number(row.requestedSpreadLimit) > Number(row.spreadLimit)
                                                        ? 'text-green-400 bg-green-500/20'
                                                        : 'text-red-400 bg-red-500/20'
                                                        }`}>
                                                        {Number(row.requestedSpreadLimit) > Number(row.spreadLimit) ? <Plus size={8} strokeWidth={4} /> : <span className="mb-0.5 text-sm">↓</span>}
                                                        {Math.abs(Number(row.requestedSpreadLimit) - Number(row.spreadLimit)).toLocaleString()}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-2.5">
                                            {isReasonValid ? (
                                                <span className={`${darkMode ? 'text-gray-300' : 'text-gray-600'} italic text-xs`}>{row.reason}</span>
                                            ) : (
                                                <div className="flex items-center gap-1.5 text-red-500 font-bold text-[10px] animate-pulse">
                                                    <AlertCircle size={12} /> Missing Reason
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                <div className={`px-6 py-4 border-t ${borderColor} flex items-center justify-between ${headerBg}`}>
                    <div className="flex items-center gap-2">
                        {missingReasonsCount > 0 ? (
                            <div className="text-red-500 flex items-center gap-2 text-xs font-bold bg-red-50 dark:bg-red-900/10 px-3 py-2 rounded-md border border-red-200 dark:border-red-900/30">
                                <AlertCircle size={14} />
                                <span>{missingReasonsCount} rows are missing a reason in Excel. Please fix and re-import.</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400 font-medium">
                                <Check size={14} />
                                <span>All justifications verified. Ready to submit.</span>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
                        <Button
                            variant="primary"
                            onClick={onConfirm}
                            disabled={isSubmitting || missingReasonsCount > 0}
                            style={{ opacity: (isSubmitting || missingReasonsCount > 0) ? 0.5 : 1 }}
                        >
                            {isSubmitting ? (
                                <><Loader2 size={16} className="animate-spin mr-2" /> Submitting...</>
                            ) : `Confirm & Submit (${data.length} rows)`}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─── Main Widget ───────────────────────────────────────────────────────────────

export const TraderLimitsRequestWidget: React.FC<TraderLimitsRequestWidgetProps> = ({
    initialWidgetState,
    onWidgetStateChange,
    apiUrl = "http://localhost:8080/api/limits",
    requestApiUrl,
    title = "My Limits",
    parameters,
    darkMode = false,
    pollInterval = 30000,
    limitField,
    colorizeNumeric = true,
    allowAddingRows = true,
    productOptions = [],
    readOnly = false,
    onGroupedParametersChange,
    groupedParametersValues,
    isTokenRequired,
    getFirebaseToken,
}) => {
    const defaultParams = useParameterDefaults(parameters);
    const [currentParams, setCurrentParams] = useState<ParameterValues>(
        () => initialWidgetState?.parameters || defaultParams
    );
    const [newRows, setNewRows] = useState<number[]>([]);
    const [activeTab, setActiveTab] = useState<'Futures' | 'Options'>('Futures');
    const [rowStates, setRowStates] = useState<Record<string, RowState>>({});

    // Import/Export States
    const [importData, setImportData] = useState<any[]>([]);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const onWidgetStateChangeRef = useRef(onWidgetStateChange);
    onWidgetStateChangeRef.current = onWidgetStateChange;

    useEffect(() => {
        onWidgetStateChangeRef.current?.({ parameters: currentParams });
    }, [currentParams]);

    const { data: rawData } = useWidgetData(apiUrl as string, {
        pollInterval,
        parameters: currentParams,
        isTokenRequired,
        getFirebaseToken,
    });

    const [limitsData, setLimitsData] = useState<any[]>([]);

    useEffect(() => {
        if (rawData && Array.isArray(rawData)) {
            const mapped = rawData.map((item: any) => ({
                account: item.accountId,
                product: item.product,
                productName: item.productName,
                outrightLimit: item.outrightLimit !== undefined ? item.outrightLimit : (item['Outright Limit'] ?? item['outright limit'] ?? 0),
                spreadLimit: item.spreadLimit !== undefined ? item.spreadLimit : (item['Spread Limit'] ?? item['spread limit'] ?? 0)
            }));
            setLimitsData(mapped);
        }
    }, [rawData]);

    const dataKeys = useMemo(() => {
        return ["account", "product", "productName", "outrightLimit", "spreadLimit"];
    }, []);

    const DISPLAY_NAMES: Record<string, string> = {
        account: "Account",
        product: "Product",
        productName: "Product Name",
        productClass: "Class",
        outrightLimit: "Outright Limit",
        spreadLimit: "Spread Limit",
        tradingPlatform: "Platform",
        instrumentType: "Type"
    };

    const resolvedLimitField = useMemo(() => {
        if (limitField) return limitField;
        if (limitsData.length === 0) return null;
        const first = limitsData[0];
        return Object.keys(first).find((k) => typeof first[k] === "number") ?? null;
    }, [limitField, limitsData]);

    // Check if any row is actively requesting/editing, filtering for currently visible rows
    const showRequestCols = useMemo(() => {
        if (newRows.length > 0) return true;

        return Object.entries(rowStates).some(([id, s]) => {
            // If it's a new row, only count it if it still exists in the newRows list
            if (id.startsWith('new-')) {
                const rid = Number(id.replace('new-', ''));
                return newRows.includes(rid) && s.status !== 'idle';
            }
            // For existing rows, only count if not idle
            return s.status !== 'idle';
        });
    }, [newRows, rowStates]);

    const columnOptions = useMemo(() => {
        const options: Record<string, string[]> = {};
        if (limitsData.length === 0 && productOptions.length === 0) return options;

        dataKeys.forEach(key => {
            const k = key.toLowerCase();
            if (k.includes("account") || k.includes("number")) {
                options[key] = Array.from(new Set(limitsData.map(row => String(row[key] || row['Account Number'] || '')).filter(Boolean))).sort();
            } else if (k.includes("product")) {
                options[key] = productOptions.length > 0 ? productOptions : Array.from(new Set(limitsData.map(row => String(row[key] || row['Product'] || '')).filter(Boolean))).sort();
            } else if (k.includes("category") || k.includes("type")) {
                options[key] = Array.from(new Set(limitsData.map(row => String(row[key] || row['instrumentType'] || row['category'] || '')).filter(Boolean))).sort();
            }
        });
        return options;
    }, [limitsData, dataKeys, productOptions]);

    const handleAddNewRow = () => {
        setNewRows(prev => [...prev, Date.now()]);
    };

    const handleRemoveNewRow = (id: number) => {
        setNewRows(prev => prev.filter(rid => rid !== id));
        setRowStates(prev => {
            const next = { ...prev };
            delete next[`new-${id}`];
            return next;
        });
    };

    const handleSubmit = async (row: any, state: RowState) => {
        const endpoint = requestApiUrl || apiUrl;
        console.log("row", row);
        const body = {
            ...row,
            reason: state.reason,
            instrumentType: activeTab.toUpperCase().replace(/S$/, ""),
            requestedOutrightLimit: state.requestedOutrightLimit !== "" ? Number(state.requestedOutrightLimit) : null,
            requestedSpreadLimit: state.requestedSpreadLimit !== "" ? Number(state.requestedSpreadLimit) : null
        };

        let token: string | undefined;
        if (isTokenRequired && getFirebaseToken) {
            token = await getFirebaseToken();
        }

        const headers: Record<string, string> = { "Content-Type": "application/json" };
        console.log("body", body);
        const res = await fetch(endpoint + `?token=${token}`, {
            method: "POST",
            headers,
            body: JSON.stringify(body),
        });

        if (!res.ok) {
            const text = await res.text().catch(() => "");
            throw new Error(text || `HTTP ${res.status}`);
        }
    };

    // ─── Export Logic ────────────────────────────────────────────────────────

    const handleExport = async () => {
        if (limitsData.length === 0) return;

        try {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet("Trader Limits");

            // Define columns
            worksheet.columns = [
                ...dataKeys.map(key => ({ header: key, key: key, width: 20 })),
                { header: "Requested outright Limit", key: "requestedOutrightLimit", width: 25 },
                { header: "Requested spread Limit", key: "requestedSpreadLimit", width: 25 },
                { header: "Reason", key: "reason", width: 30 }
            ];

            // Add rows
            const rows = limitsData.map(row => ({
                account: row.account,
                product: row.product,
                productName: row.productName,
                outrightLimit: row.outrightLimit || 0,
                spreadLimit: row.spreadLimit || 0,
                requestedOutrightLimit: row.outrightLimit || 0,
                requestedSpreadLimit: row.spreadLimit || 0,
                reason: ""
            }));

            worksheet.addRows(rows);

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
            link.download = `trader_limits_${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Export Error:", error);
            alert("Failed to generate Excel file.");
        }
    };

    // ─── Import Logic ────────────────────────────────────────────────────────

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const arrayBuffer = event.target?.result as ArrayBuffer;
                const workbook = new ExcelJS.Workbook();
                await workbook.xlsx.load(arrayBuffer);

                const worksheet = workbook.worksheets[0];
                const results: any[] = [];

                // Map headers to column index
                const headerRow = worksheet.getRow(1);
                const colMap: Record<string, number> = {};
                headerRow.eachCell((cell, colNumber) => {
                    if (cell.value) colMap[String(cell.value).trim().toLowerCase()] = colNumber;
                });

                const getCellVal = (row: ExcelJS.Row, ...keys: string[]) => {
                    for (const k of keys) {
                        const idx = colMap[k.toLowerCase()];
                        if (idx) {
                            const val = row.getCell(idx).value;
                            // ExcelJS can return objects for formulas/hyperlinks
                            if (val && typeof val === 'object' && 'result' in val) return val.result;
                            return val;
                        }
                    }
                    return null;
                };

                worksheet.eachRow((row, rowNumber) => {
                    if (rowNumber === 1) return; // Skip header

                    const acc = getCellVal(row, "Account Number", "Account", "Account ID");
                    const prod = getCellVal(row, "Product", "Symbol", "Instrument");
                    const reqOutrightLimit = getCellVal(row, "Requested Outright Limit", "New Outright Limit", "Outright Limit");
                    const reqSpreadLimit = getCellVal(row, "Requested Spread Limit", "New Spread Limit", "Spread Limit");
                    const reason = getCellVal(row, "Reason", "Comments", "Remark");

                    if (!acc || !prod || reqOutrightLimit === null || reqOutrightLimit === undefined || reqSpreadLimit === null || reqSpreadLimit === undefined) return;

                    const existing = limitsData.find(l =>
                        String(l["Account Number"]) === String(acc) &&
                        String(l["Product"]) === String(prod)
                    );

                    const currentOutrightLimit = existing ? Number(existing["Outright Limit"]) : 0;
                    const currentSpreadLimit = existing ? Number(existing["Spread Limit"]) : 0;

                    if (reqOutrightLimit !== currentOutrightLimit || reqSpreadLimit !== currentSpreadLimit) {
                        results.push({
                            account: String(acc),
                            product: String(prod),
                            outrightLimit: currentOutrightLimit,
                            spreadLimit: currentSpreadLimit,
                            requestedOutrightLimit: reqOutrightLimit,
                            requestedSpreadLimit: reqSpreadLimit,
                            reason: String(reason)
                        });
                    }
                });

                if (results.length > 0) {
                    setImportData(results);
                    setIsImportModalOpen(true);
                } else {
                    alert("No limit changes detected. All values match current database state.");
                }
            } catch (err: any) {
                console.error("ExcelJS Parse Error:", err);
                alert("Failed to parse Excel file. Please ensure it's a valid XLSX/CSV.");
            }

            if (fileInputRef.current) fileInputRef.current.value = "";
        };
        reader.readAsArrayBuffer(file);
    };

    const handleConfirmImport = async () => {
        setIsBulkSubmitting(true);
        try {
            // Using the bulk endpoint (simulated on backend)
            const endpoint = `${apiUrl.replace(/\/limits$/, '')}/limits/request/bulk`;

            let token: string | undefined;
            if (isTokenRequired && getFirebaseToken) {
                token = await getFirebaseToken();
            }

            console.log("import data", importData);

            const res = await fetch(endpoint + `?token=${token}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(importData),
            });

            if (!res.ok) throw new Error(`Import failed: ${res.statusText}`);

            const result = await res.json();
            alert(result.message || "Import successful!");
            setIsImportModalOpen(false);
            setImportData([]);
        } catch (error: any) {
            console.error("Bulk Import Error:", error);
            alert(`Error: ${error.message}`);
        } finally {
            setIsBulkSubmitting(false);
        }
    };

    const borderColor = darkMode ? "border-gray-800" : "border-gray-100";
    const headerBg = darkMode ? "bg-gray-900/50" : "bg-gray-50/50";
    const headerTextColor = darkMode ? "text-gray-400" : "text-gray-500";

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
                /* KILL ALL DEFAULT SELECT ARROWS */
                select {
                    -webkit-appearance: none !important;
                    -moz-appearance: none !important;
                    appearance: none !important;
                }
                
                select::-ms-expand {
                    display: none !important;
                }

                /* Hide number input spinners globally */
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

                <div className={`flex items-center justify-between gap-2 px-4 py-2 text-[11px] ${headerTextColor} border-b ${borderColor}`}>
                    <div className="flex items-center gap-2">
                        {!readOnly && (
                            <>
                                <Info size={14} style={{ color: '#00998b' }} />
                                <span>Click <span style={{ color: '#00998b', fontWeight: '600' }}>+ Request</span> to modify a limit, or use the <b>Add New Product</b> button to add a commodity.</span>
                            </>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {!readOnly && (
                            <>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    className="hidden"
                                    accept=".xlsx, .xls, .csv"
                                />
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="h-7 text-[11px] gap-1 px-3"
                                    title="Import limits from Excel/CSV"
                                >
                                    <Upload size={14} /> Import
                                </Button>
                            </>
                        )}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleExport}
                            className="h-7 text-[11px] gap-1 px-3"
                            title="Export current limits to Excel"
                        >
                            <Download size={14} /> Export
                        </Button>
                        {!readOnly && allowAddingRows && (
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={handleAddNewRow}
                                className="h-7 text-[11px] gap-1 px-3 font-bold"
                            >
                                <Plus size={14} /> Add New Product
                            </Button>
                        )}
                    </div>
                </div>

                <ImportPreviewModal
                    isOpen={isImportModalOpen}
                    onClose={() => setIsImportModalOpen(false)}
                    onConfirm={handleConfirmImport}
                    data={importData}
                    darkMode={darkMode}
                    isSubmitting={isBulkSubmitting}
                />

                <div className={`flex items-center gap-1 border-b ${borderColor} px-4`}>
                    <button
                        onClick={() => setActiveTab('Futures')}
                        className={`px-4 py-3 text-xs font-bold uppercase tracking-wider transition-all relative ${activeTab === 'Futures' ? 'text-[#00998b]' : 'text-gray-400 hover:text-gray-200'}`}
                    >
                        Futures
                        {activeTab === 'Futures' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#00998b]" />}
                    </button>
                    <button
                        onClick={() => setActiveTab('Options')}
                        className={`px-4 py-3 text-xs font-bold uppercase tracking-wider transition-all relative ${activeTab === 'Options' ? 'text-[#00998b]' : 'text-gray-400 hover:text-gray-200'}`}
                    >
                        Options
                        {activeTab === 'Options' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#00998b]" />}
                    </button>
                </div>

                <div className="flex-1 overflow-auto">
                    {activeTab === 'Futures' ? (
                        <table className="w-full border-collapse text-left">
                            <thead className={`sticky top-0 z-10 ${headerBg} backdrop-blur-sm border-b ${borderColor}`}>
                                <tr>
                                    {dataKeys.map(key => (
                                        <th key={key} className={`px-4 py-3 text-xs font-bold uppercase tracking-wider text-center ${headerTextColor}`}>
                                            {DISPLAY_NAMES[key] || key}
                                        </th>
                                    ))}
                                    {showRequestCols && (
                                        <>
                                            <th className={`px-4 py-3 text-xs font-bold uppercase tracking-wider text-center ${headerTextColor}`}>Request Outright</th>
                                            <th className={`px-4 py-3 text-xs font-bold uppercase tracking-wider text-center ${headerTextColor}`}>Request Spread</th>
                                            <th className={`px-4 py-3 text-xs font-bold uppercase tracking-wider text-center ${headerTextColor}`}>Reason</th>
                                        </>
                                    )}
                                    {!readOnly && <th className={`px-4 py-3 text-xs font-bold uppercase tracking-wider text-center ${headerTextColor}`}>Actions</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {/* Existing Rows */}
                                {limitsData.map((row, idx) => (
                                    <TableRow
                                        key={`existing-${idx}`}
                                        data={row}
                                        columns={dataKeys}
                                        darkMode={darkMode}
                                        resolvedLimitField={resolvedLimitField}
                                        colorizeNumeric={colorizeNumeric}
                                        onSubmit={handleSubmit}
                                        showRequestCols={showRequestCols}
                                        onStateChange={(s) => setRowStates(prev => ({ ...prev, [`existing-${idx}`]: s }))}
                                        readOnly={readOnly}
                                    />
                                ))}

                                {/* New Rows */}
                                {newRows.map((rid) => (
                                    <TableRow
                                        key={`new-${rid}`}
                                        data={{}}
                                        columns={dataKeys}
                                        darkMode={darkMode}
                                        resolvedLimitField={resolvedLimitField}
                                        colorizeNumeric={colorizeNumeric}
                                        onSubmit={handleSubmit}
                                        isNew={true}
                                        onRemove={() => handleRemoveNewRow(rid)}
                                        columnOptions={columnOptions}
                                        showRequestCols={showRequestCols}
                                        onStateChange={(s) => setRowStates(prev => ({ ...prev, [`new-${rid}`]: s }))}
                                        readOnly={readOnly}
                                    />
                                ))}

                                {limitsData.length === 0 && newRows.length === 0 && (
                                    <tr>
                                        <td colSpan={dataKeys.length + (showRequestCols ? 3 : 0) + (readOnly ? 0 : 1)} className="px-4 py-20 text-center">
                                            <div className="flex flex-col items-center gap-2 opacity-40">
                                                <Loader2 size={24} className="animate-spin" />
                                                <span className="text-sm font-medium italic">No data available. Add a new product to get started.</span>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full gap-4 opacity-40 py-20 text-center">
                            <div className="p-6 rounded-full bg-gray-500/10">
                                <Info size={48} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold uppercase tracking-widest mb-1">Options</h3>
                                <p className="text-sm italic">No data available for this layout yet.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </WidgetContainer>
    );
};

export const TraderLimitsRequestWidgetDef = {
    component: TraderLimitsRequestWidget,
};



