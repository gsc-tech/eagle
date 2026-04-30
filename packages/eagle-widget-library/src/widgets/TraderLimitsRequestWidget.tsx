"use client"

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import ExcelJS from "exceljs";
import type { BaseWidgetProps, ParameterValues } from "../types";
import { useWidgetData } from "../hooks/useWidgetData";
import { useParameterDefaults } from "../hooks/useParameterDefaults";
import { useWidgetEvents } from "../hooks/useWidgetEvents";
import { WIDGET_EVENTS } from "../store/widgetEventBus";
import { WidgetContainer } from "../components/WidgetContainer";
import { TablePagination } from "../components/TablePagination";
import { Check, X as LucideX, Loader2, Plus, Info, Trash2, ChevronDown, Download, Upload, AlertCircle, FileSpreadsheet, Search } from "lucide-react";
import { toast } from "react-toastify";

// ─── Visual Components ────────────────────────────────────────────────────────

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
                    : variant === 'outline' && isHovered
                        ? petrolColor
                        : undefined,
            color: variant === 'outline' ? (isHovered ? 'white' : petrolColor) : undefined,
            borderColor: variant === 'outline' ? (isHovered ? petrolColor : `${petrolColor}40`) : undefined,
            transform: ((variant === 'primary' || variant === 'destructive' || variant === 'outline') && isHovered) ? 'translateY(-1px)' : undefined,
            boxShadow: isHovered && (variant === 'primary' || variant === 'outline')
                ? `0 4px 12px rgba(0, 153, 139, 0.3)`
                : isHovered && variant === 'destructive'
                    ? '0 4px 12px rgba(239, 68, 68, 0.25)'
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
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const filteredOptions = useMemo(() => {
        if (!search) return options;
        const lowSearch = search.toLowerCase();
        return options.filter(opt => opt.toLowerCase().includes(lowSearch));
    }, [options, search]);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            // Using preventScroll to stop the browser from jumping when focusing
            inputRef.current.focus({ preventScroll: true });
        }
    }, [isOpen]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const petrolColor = '#00998b';

    return (
        <div className={`relative w-full min-w-[140px] ${className}`} ref={containerRef}>
            <div
                onClick={() => {
                    setIsOpen(!isOpen);
                    setSearch("");
                }}
                className={`flex h-9 items-center justify-between rounded-md border px-3 py-1 text-[11px] shadow-sm cursor-pointer transition-all
                ${darkMode
                        ? 'border-gray-800 bg-gray-900 text-gray-100 hover:bg-gray-800'
                        : 'border-gray-200 bg-white text-gray-900 hover:bg-gray-50'}`}
                style={{ borderColor: isOpen ? petrolColor : undefined }}
            >
                <span className={!value ? 'opacity-50 truncate pr-2' : 'truncate pr-2'}>{value || placeholder}</span>
                <ChevronDown size={14} className={`shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {isOpen && (
                <div className={`absolute z-[110] mt-1 w-full rounded-md border shadow-xl overflow-hidden animate-in fade-in zoom-in duration-150
                    ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>

                    <div className={`flex items-center gap-2 px-2 py-1.5 border-b ${darkMode ? 'border-gray-800' : 'border-gray-100'}`}>
                        <Search size={12} className="opacity-40" />
                        <input
                            ref={inputRef}
                            className={`w-full bg-transparent border-none focus:outline-none text-[11px] ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}
                            placeholder="Search..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>

                    <div
                        className="overflow-y-auto py-1 custom-scrollbar"
                        style={{ maxHeight: '240px' }}
                    >
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map(opt => (
                                <div
                                    key={opt}
                                    onClick={() => {
                                        onChange(opt);
                                        setIsOpen(false);
                                    }}
                                    className={`px-3 py-2 text-[11px] cursor-pointer flex items-center justify-between
                                        ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'}
                                        ${value === opt ? (darkMode ? 'bg-gray-800 text-[#00998b]' : 'bg-gray-50 text-[#00998b]') : ''}`}
                                >
                                    <span className="truncate pr-2">{opt}</span>
                                    {value === opt && <Check size={12} className="shrink-0" />}
                                </div>
                            ))
                        ) : (
                            <div className="px-3 py-4 text-center text-[10px] opacity-40 italic">
                                No results found
                            </div>
                        )}
                    </div>
                </div>
            )}
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
    productOptionsFutures?: any[];
    productOptionsOptions?: any[];
    readOnly?: boolean;
    showRefreshButton?: boolean;
    // eventSubscriptions inherited from BaseWidgetProps
}

type RowStatus = "idle" | "editing" | "submitting" | "success" | "error";

interface RowState {
    status: RowStatus;
    requestedOutrightLimit: string;
    requestedSpreadLimit: string;
    reason: string;
    message: string;
    draftData?: Record<string, string>;
    activeTab?: 'Futures' | 'Options';
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
    productOptions?: any[];
    activeTab: 'Future' | 'Option';
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
    readOnly = false,
    productOptions = [],
    activeTab
}) => {
    const [state, setState] = useState<RowState>(() => ({
        status: isNew ? "editing" : "idle",
        requestedOutrightLimit: "",
        requestedSpreadLimit: "",
        reason: "",
        message: "",
        draftData: isNew ? columns.reduce((acc, col) => ({ ...acc, [col]: "" }), {}) : undefined
    }));

    const [isHovered, setIsHovered] = useState(false);

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
        if (!state.requestedOutrightLimit && !state.requestedSpreadLimit && !isNew) return;

        // Validate non-negative limits
        if ((state.requestedOutrightLimit && Number(state.requestedOutrightLimit) < 0) ||
            (state.requestedSpreadLimit && Number(state.requestedSpreadLimit) < 0)) {
            setState(prev => ({
                ...prev,
                status: "error",
                message: "Limits cannot be negative"
            }));
            toast.error("Limits cannot be negative");
            return;
        }

        // Ensure reason is provided
        if (!state.reason || state.reason.trim().length < 5) {
            setState(prev => ({
                ...prev,
                status: "error",
                message: "Reason required (min 5 chars)"
            }));
            return;
        }

        setState(prev => ({ ...prev, status: "submitting" }));
        try {
            const submissionData = isNew ? { ...state.draftData } : data;
            await onSubmit(submissionData, state);
            setState(prev => ({ ...prev, status: "success", message: "Submitted" }));
            toast.success("Limit request submitted successfully");
            
            setTimeout(() => {
                if (isNew && onRemove) {
                    onRemove();
                } else {
                    setState(prev => ({ ...prev, status: "idle" }));
                }
            }, 3000);
        } catch (err: any) {
            setState(prev => ({ ...prev, status: "error", message: err.message || "Failed" }));
            toast.error(err.message || "Failed to submit limit request");
        }
    };

    const renderValue = (key: string, val: any) => {
        if (isNew && isEditing) {
            if (key.toLowerCase().includes("limit")) {
                return <span className={darkMode ? "text-gray-500 italic text-xs" : "text-gray-400 italic text-xs"}>0</span>;
            }

            if (columnOptions[key]) {
                const handleDraftChange = (newVal: string) => {
                    let newDraft = { ...state.draftData, [key]: newVal };

                    if (productOptions && productOptions.length > 0 && typeof productOptions[0] === 'object') {
                        const lowKey = key.toLowerCase();

                        if (lowKey === "product") {
                            const currentProductName = newDraft["productName"] || "";
                            const isCompatible = currentProductName && productOptions.some(
                                p => (p.metadata_sym || p.product) === newVal && (p.instrument || p.productName) === currentProductName
                            );
                            if (!isCompatible) {
                                const validNames = Array.from(new Set(
                                    productOptions
                                        .filter(p => (p.metadata_sym || p.product) === newVal)
                                        .map(p => p.instrument || p.productName || "")
                                        .filter(Boolean)
                                ));
                                newDraft["productName"] = validNames.length === 1 ? validNames[0] : "";
                            }
                        } else if (lowKey === "productname") {
                            const currentProduct = newDraft["product"] || "";
                            const isCompatible = currentProduct && productOptions.some(
                                p => (p.instrument || p.productName) === newVal && (p.metadata_sym || p.product) === currentProduct
                            );
                            if (!isCompatible) {
                                const validProducts = Array.from(new Set(
                                    productOptions
                                        .filter(p => (p.instrument || p.productName) === newVal)
                                        .map(p => p.metadata_sym || p.product || "")
                                        .filter(Boolean)
                                ));
                                newDraft["product"] = validProducts.length === 1 ? validProducts[0] : "";
                            }
                        }

                        // Exchange: validate/auto-fill based on resolved product + productName
                        if (key.toLowerCase() !== "exchange") {
                            const resolvedProduct = newDraft["product"] || "";
                            const resolvedProductName = newDraft["productName"] || "";
                            if (resolvedProduct || resolvedProductName) {
                                let filtered = productOptions;
                                if (resolvedProduct) filtered = filtered.filter(p => (p.metadata_sym || p.product) === resolvedProduct);
                                if (resolvedProductName) filtered = filtered.filter(p => (p.instrument || p.productName) === resolvedProductName);
                                const validExchanges = Array.from(new Set(filtered.map(p => p.exchange).filter(Boolean)));
                                const currentExchange = newDraft["exchange"] || "";
                                if (!currentExchange || !validExchanges.includes(currentExchange)) {
                                    newDraft["exchange"] = validExchanges.length === 1 ? validExchanges[0] : "";
                                }
                            }
                        }
                    }

                    setState({ ...state, draftData: newDraft });
                };

                // Compute filtered options based on current draft selections
                let resolvedOptions = columnOptions[key];
                if (productOptions && productOptions.length > 0 && typeof productOptions[0] === 'object') {
                    const lowKey = key.toLowerCase();
                    const selectedProduct = state.draftData?.["product"] || "";
                    const selectedProductName = state.draftData?.["productName"] || "";

                    if (lowKey === "productname" && selectedProduct) {
                        resolvedOptions = Array.from(new Set(
                            productOptions
                                .filter(p => (p.metadata_sym || p.product) === selectedProduct)
                                .map(p => p.instrument || p.productName || "")
                                .filter(Boolean)
                        )).sort();
                    } else if (lowKey === "product" && selectedProductName) {
                        resolvedOptions = Array.from(new Set(
                            productOptions
                                .filter(p => (p.instrument || p.productName) === selectedProductName)
                                .map(p => p.metadata_sym || p.product || "")
                                .filter(Boolean)
                        )).sort();
                    } else if (lowKey === "exchange" && (selectedProduct || selectedProductName)) {
                        let filtered = productOptions;
                        if (selectedProduct) filtered = filtered.filter(p => (p.metadata_sym || p.product) === selectedProduct);
                        if (selectedProductName) filtered = filtered.filter(p => (p.instrument || p.productName) === selectedProductName);
                        resolvedOptions = Array.from(new Set(filtered.map(p => p.exchange || "").filter(Boolean))).sort();
                    }
                }

                return (
                    <Select
                        placeholder={`Select ${key}`}
                        options={resolvedOptions}
                        value={state.draftData?.[key] || ""}
                        onChange={handleDraftChange}
                        darkMode={darkMode}
                    />
                );
            }

            return (
                <Input
                    value={state.draftData?.[key] || ""}
                    onChange={e => setState({ ...state, draftData: { ...state.draftData, [key]: e.target.value } })}
                    disabled={state.status === "submitting"}
                    className="h-8 text-sm text-center min-w-[80px]"
                    darkMode={darkMode}
                    placeholder={key}
                />
            );
        }

        if (typeof val === "number") {
            return <span className={`tabular-nums font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{val.toLocaleString()}</span>;
        }

        if (key === "product") {
            return <span style={{ color: '#00998b' }} className="font-bold uppercase">{val ?? "—"}</span>;
        }
        if (key === "exchange") {
            return (
                <span className="inline-flex items-center rounded-md px-3 py-1 text-[11px] font-black tracking-widest"
                    style={{ 
                        backgroundColor: darkMode ? '#00998b20' : '#00998b10', 
                        color: '#00998b', 
                        border: `1px solid #00998b40` 
                    }}>
                    {val ?? "—"}
                </span>
            );
        }
        return <span className="font-medium">{val ?? "—"}</span>;
    };

    const borderColor = darkMode ? "border-gray-800" : "border-gray-100";
    const textColor = darkMode ? "text-gray-300" : "text-gray-700";

    return (
        <>
            <tr 
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className={`tlr-row group transition-all duration-200 border-b ${borderColor} relative
                    ${darkMode ? 'hover:bg-gray-800/40' : 'hover:bg-gray-50/40'} 
                    ${isNew ? (darkMode ? 'bg-[#00998b]/10' : 'bg-[#00998b]/5') : ''}
                    ${isHovered ? 'z-10 -translate-y-0.5' : ''}
                `}
                style={{
                    boxShadow: isHovered ? '0 8px 24px -6px rgba(0,0,0,0.4)' : 'none',
                }}
            >
                {columns.map(col => {
                    const isLeftAligned = col.toLowerCase() === 'productname';
                    return (
                        <td key={col} className={`px-4 py-3 text-sm ${isLeftAligned ? 'text-left' : 'text-center'} ${textColor}`}>
                            <div className={`flex ${isLeftAligned ? 'justify-start' : 'justify-center'} items-center`}>
                                {renderValue(col, data[col])}
                            </div>
                        </td>
                    );
                })}

                {showRequestCols && (
                    <>
                        <td className="px-4 py-2 min-w-[150px] text-center whitespace-nowrap">
                            {isEditing ? (
                                <div className="flex flex-col items-center gap-1">
                                    <Input
                                        type="number"
                                        value={state.requestedOutrightLimit}
                                        onChange={e => setState({ ...state, requestedOutrightLimit: e.target.value })}
                                        disabled={state.status === "submitting"}
                                        className="h-8 w-24 text-sm text-center font-bold"
                                        darkMode={darkMode}
                                        placeholder="Outright"
                                        autoFocus={!isNew}
                                    />
                                    {!isNew && state.requestedOutrightLimit && data.outrightLimit !== undefined && (
                                        <div className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded
                                            ${Number(state.requestedOutrightLimit) > Number(data.outrightLimit)
                                                ? 'text-green-500 bg-green-500/10'
                                                : 'text-red-500 bg-red-500/10'}`}>
                                            {Number(state.requestedOutrightLimit) > Number(data.outrightLimit) ? '+' : ''}
                                            {Number(state.requestedOutrightLimit) - Number(data.outrightLimit)}
                                        </div>
                                    )}
                                </div>
                            ) : <span className="text-gray-600 italic text-[10px]">—</span>}
                        </td>
                        {activeTab === 'Future' && (
                            <td className="px-4 py-2 min-w-[150px] text-center whitespace-nowrap">
                                {isEditing ? (
                                    <div className="flex flex-col items-center gap-1">
                                        <Input
                                            type="number"
                                            value={state.requestedSpreadLimit}
                                            onChange={e => setState({ ...state, requestedSpreadLimit: e.target.value })}
                                            disabled={state.status === "submitting"}
                                            className="h-8 w-24 text-sm text-center font-bold"
                                            darkMode={darkMode}
                                            placeholder="Spread"
                                        />
                                        {!isNew && state.requestedSpreadLimit && data.spreadLimit !== undefined && (
                                            <div className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded
                                                ${Number(state.requestedSpreadLimit) > Number(data.spreadLimit)
                                                    ? 'text-green-500 bg-green-500/10'
                                                    : 'text-red-500 bg-red-500/10'}`}>
                                                {Number(state.requestedSpreadLimit) > Number(data.spreadLimit) ? '+' : ''}
                                                {Number(state.requestedSpreadLimit) - Number(data.spreadLimit)}
                                            </div>
                                        )}
                                    </div>
                                ) : <span className="text-gray-600 italic text-[10px]">—</span>}
                            </td>
                        )}
                        <td className="px-4 py-2 min-w-[180px] text-center whitespace-nowrap">
                            {isEditing ? (
                                <Input
                                    placeholder="Reason..."
                                    value={state.reason}
                                    onChange={e => setState({ ...state, reason: e.target.value })}
                                    disabled={state.status === "submitting"}
                                    className="h-8 text-xs text-center"
                                    darkMode={darkMode}
                                />
                            ) : <span className="text-gray-600 italic text-[10px]">—</span>}
                        </td>
                    </>
                )}

                {!readOnly && (
                    <td className="px-4 py-2 min-w-[140px] text-center">
                        <div className="flex flex-col items-center justify-center gap-1">
                            <div className="flex justify-center gap-2 items-center">
                                {state.status === "idle" && (
                                    <Button 
                                        variant="primary" 
                                        size="sm" 
                                        onClick={handleRequest} 
                                        className="h-8 text-[11px] px-4 font-black uppercase tracking-widest gap-2 shadow-lg shadow-[#00998b]/20 hover:shadow-[#00998b]/40 transition-all active:scale-95"
                                        style={{ backgroundColor: '#00998b', border: 'none' }}
                                    >
                                        <Plus size={14} strokeWidth={3} /> Request
                                    </Button>
                                )}

                                {(state.status === "editing" || state.status === "error" || state.status === "submitting") && (
                                    <>
                                        <Button
                                            variant="primary"
                                            size="sm"
                                            onClick={handleInternalSubmit}
                                            className="min-w-[80px] h-8 text-[11px] px-4 font-black uppercase tracking-widest shadow-lg shadow-[#00998b]/20 hover:shadow-[#00998b]/40 transition-all active:scale-95 flex items-center justify-center gap-2"
                                            disabled={state.status === "submitting" || (state.reason?.length || 0) < 5}
                                            style={{ backgroundColor: '#00998b', border: 'none' }}
                                        >
                                            {state.status === "submitting" ? (
                                                <Loader2 size={14} className="animate-spin" />
                                            ) : null}
                                            {state.status === "submitting" ? "Submitting..." : "Submit"}
                                        </Button>
                                        {state.status !== "submitting" && (
                                            <Button variant="destructive" size="sm" onClick={handleCancel} className="w-8 h-8 px-0 flex items-center justify-center font-bold">
                                                X
                                            </Button>
                                        )}
                                    </>
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
                                <span className="text-[9px] text-gray-500 italic">Reason required *</span>
                            )}
                        </div>
                    </td>
                )}
            </tr>
        </>
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
    activeTab: 'Future' | 'Option';
}

const ImportPreviewModal: React.FC<ImportPreviewModalProps> = ({ isOpen, onClose, onConfirm, data, darkMode, isSubmitting, activeTab }) => {
    if (!isOpen) return null;

    const borderColor = darkMode ? "border-gray-800" : "border-gray-100";
    const headerBg = darkMode ? "bg-gray-900" : "bg-gray-50";

    const missingReasonsCount = data.filter(r => !r.reason || r.reason.trim().length < 5).length;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}>
            <div className={`flex flex-col rounded-lg shadow-2xl border ${borderColor} ${darkMode ? 'bg-gray-950 text-white' : 'bg-white text-gray-900'}`}
                style={{ width: '900px', maxWidth: '100%', height: '75vh', display: 'flex', flexDirection: 'column' }}>

                {/* Header */}
                <div className={`flex items-center justify-between px-6 py-4 border-b ${borderColor} ${headerBg} shrink-0`}>
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
                    <button onClick={onClose} className={`p-1 rounded-full transition-colors ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}>
                        <LucideX size={20} />
                    </button>
                </div>

                {/* Scrollable Table */}
                <div className="overflow-y-auto custom-scrollbar flex-1" style={{ minHeight: 0 }}>
                    <table className="w-full text-sm border-collapse">
                        <thead className={`sticky top-0 z-10 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
                            <tr className={`border-b ${borderColor}`}>
                                <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-widest opacity-60">Account</th>
                                <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-widest opacity-60">Product</th>
                                <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-widest opacity-60">Product Name</th>
                                <th className="px-4 py-3 text-center font-semibold text-xs uppercase tracking-widest opacity-60">Outright (New)</th>
                                {activeTab === 'Future' && <th className="px-4 py-3 text-center font-semibold text-xs uppercase tracking-widest opacity-60">Spread (New)</th>}
                                <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-widest opacity-60">Reason</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${borderColor}`}>
                            {data.map((row, idx) => {
                                const isReasonValid = row.reason && row.reason.trim().length >= 5;
                                return (
                                    <tr key={idx} className={`${darkMode ? 'hover:bg-gray-900/50' : 'hover:bg-gray-50'}`}>
                                        <td className="px-4 py-3 font-mono text-xs">{row.account}</td>
                                        <td className="px-4 py-3 font-bold" style={{ color: '#00998b' }}>{row.product}</td>
                                        <td className="px-4 py-3 text-xs opacity-70">{row.productName}</td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="flex flex-col items-center gap-1">
                                                <div className="flex items-center gap-1.5 text-sm">
                                                    <span className="opacity-50 tabular-nums">{row.outrightLimit?.toLocaleString() || 0}</span>
                                                    <span className="opacity-40">→</span>
                                                    <span className="font-bold tabular-nums">{row.requestedOutrightLimit?.toLocaleString() || 0}</span>
                                                </div>
                                                {row.requestedOutrightLimit !== row.outrightLimit && (
                                                    <span className={`text-[10px] font-extrabold px-2 py-1 rounded ${Number(row.requestedOutrightLimit) > Number(row.outrightLimit) ? 'text-green-400 bg-green-500/20' : 'text-red-400 bg-red-500/20'}`}>
                                                        {Number(row.requestedOutrightLimit) > Number(row.outrightLimit) ? '+' : ''}
                                                        {Number(row.requestedOutrightLimit) - Number(row.outrightLimit)}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        {activeTab === 'Future' && (
                                            <td className="px-4 py-3 text-center">
                                                <div className="flex flex-col items-center gap-1">
                                                    <div className="flex items-center gap-1.5 text-sm">
                                                        <span className="opacity-50 tabular-nums">{row.spreadLimit?.toLocaleString() || 0}</span>
                                                        <span className="opacity-40">→</span>
                                                        <span className="font-bold tabular-nums">{row.requestedSpreadLimit?.toLocaleString() || 0}</span>
                                                    </div>
                                                    {row.requestedSpreadLimit !== row.spreadLimit && (
                                                        <span className={`text-[10px] font-extrabold px-2 py-1 rounded ${Number(row.requestedSpreadLimit) > Number(row.spreadLimit) ? 'text-green-400 bg-green-500/20' : 'text-red-400 bg-red-500/20'}`}>
                                                            {Number(row.requestedSpreadLimit) > Number(row.spreadLimit) ? '+' : ''}
                                                            {Number(row.requestedSpreadLimit) - Number(row.spreadLimit)}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                        )}
                                        <td className="px-4 py-3">
                                            {isReasonValid ? (
                                                <span className="text-xs opacity-70 italic">{row.reason}</span>
                                            ) : (
                                                <div className="flex items-center gap-1.5 text-red-500 font-bold text-[11px]">
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
                <div className={`px-6 py-4 border-t ${borderColor} flex items-center justify-between ${headerBg} shrink-0`}>
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
    , document.body);
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
    productOptionsFutures = [],
    productOptionsOptions = [],
    readOnly = false,
    onGroupedParametersChange,
    groupedParametersValues,
    isTokenRequired,
    getFirebaseToken,
    eventSubscriptions,
    showRefreshButton = false,
}) => {
    const defaultParams = useParameterDefaults(parameters);
    const [currentParams, setCurrentParams] = useState<ParameterValues>(
        () => initialWidgetState?.parameters || defaultParams
    );
    // Fetch account options from parameters if available
    const [accountNumbersOptions, setAccountNumbersOptions] = useState<string[]>([]);

    useEffect(() => {
        const fetchAccountOptions = async () => {
            const accParam = parameters?.find(p => p.name === "account_numbers" || p.name.toLowerCase().includes("account"));
            if (accParam?.optionsApiUrl) {
                try {
                    let url = accParam.optionsApiUrl;
                    if (getFirebaseToken) {
                        const token = await getFirebaseToken();
                        if (token) {
                            url += (url.includes('?') ? '&' : '?') + `token=${token}`;
                        }
                    }
                    const resp = await fetch(url);
                    if (resp.ok) {
                        const data = await resp.json();
                        setAccountNumbersOptions(data.map((o: any) => String(o.value || o)));
                    }
                } catch (err) {
                    console.warn("Failed to fetch account options for widget dropdown:", err);
                }
            }
        };
        fetchAccountOptions();
    }, [parameters, getFirebaseToken]);

    const [newRows, setNewRows] = useState<number[]>([]);
    const [activeTab, setActiveTab] = useState<'Future' | 'Option'>('Future');
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

    const { data: rawData, refetch } = useWidgetData(apiUrl as string, {
        pollInterval,
        parameters: {
            ...currentParams,
            instrumentType: activeTab.toLowerCase().replace(/s$/, '')
        },
        isTokenRequired,
        getFirebaseToken,
    });

    const { emit } = useWidgetEvents({
        subscriptions: eventSubscriptions,
        actions: { refetch },
    });

    const [limitsData, setLimitsData] = useState<any[]>([]);

    useEffect(() => {
        if (rawData && Array.isArray(rawData)) {
            const mapped = rawData.map((item: any, idx: number) => ({
                account: item.accountId || item.account || item.Account || "—",
                product: item.product || item.Symbol || "—",
                productName: item.productName || item.product_name || item.Instrument || "",
                exchange: item.exchange || "—",
                outrightLimit: item.outrightLimit !== undefined ? item.outrightLimit : (item['Outright Limit'] ?? item['outright limit'] ?? 0),
                spreadLimit: item.spreadLimit !== undefined ? item.spreadLimit : (item['Spread Limit'] ?? item['spread limit'] ?? 0),
            }));
            setLimitsData(mapped);
        }
    }, [rawData]);

    const dataKeys = useMemo(() => {
        const base = ["account", "product", "productName", "exchange", "outrightLimit"];
        if (activeTab === 'Future') {
            base.push("spreadLimit");
        }
        return base;
    }, [activeTab]);

    const DISPLAY_NAMES: Record<string, string> = {
        account: "Account",
        product: "Product",
        productName: "Product Name",
        exchange: "Exchange",
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

    const enrichedParameters = useMemo(() => {
        if (!parameters || parameters.length === 0) return parameters;
        return parameters.map(param => {
            const nameLower = param.name.toLowerCase();
            if (nameLower === 'products') {
                const opts = Array.from(new Set(limitsData.map(r => String(r.product || '')).filter(Boolean))).sort();
                return { ...param, options: opts.map(v => ({ label: v, value: v })), optionsApiUrl: undefined };
            }
            if (nameLower === 'product_names') {
                const opts = Array.from(new Set(limitsData.map(r => String(r.productName || '')).filter(Boolean))).sort();
                return { ...param, options: opts.map(v => ({ label: v, value: v })), optionsApiUrl: undefined };
            }
            return param;
        });
    }, [parameters, limitsData]);

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

        // Check if we have account options in parameters or our fetched state
        const accountParam = parameters?.find(p => p.name.toLowerCase() === "account_numbers" || p.name.toLowerCase().includes("account"));
        const hasAccountOptions = (accountParam?.options && accountParam.options.length > 0) || accountNumbersOptions.length > 0;

        const productOptions = activeTab === "Future" ? productOptionsFutures : productOptionsOptions;
        const hasProductOptions = productOptions.length > 0;

        if (limitsData.length === 0 && !hasAccountOptions && !hasProductOptions) return options;

        dataKeys.forEach(key => {
            const k = key.toLowerCase();
            if (k.includes("account") || k.includes("number")) {
                const dataAccountOptions = limitsData.map(row => String(row[key] || row['Account Number'] || '')).filter(Boolean);
                const parameterAccountOptions = accountParam?.options?.map(o => String(o.value)) || [];
                // Merge options from: 1. Existing data, 2. Parameter options prop, 3. Our independently fetched options
                options[key] = Array.from(new Set([...dataAccountOptions, ...parameterAccountOptions, ...accountNumbersOptions])).sort();
            } else if (k === "product") {
                if (productOptions.length > 0) {
                    options[key] = Array.from(new Set(productOptions.map(p => (typeof p === 'object' ? (p.metadata_sym || p.product || '') : p)).filter(Boolean))).sort();
                } else {
                    options[key] = Array.from(new Set(limitsData.map(row => String(row[key] || row['Product'] || '')).filter(Boolean))).sort();
                }
            } else if (k === "productname") {
                if (productOptions.length > 0) {
                    options[key] = Array.from(new Set(productOptions.map(p => (typeof p === 'object' ? (p.instrument || p.productName || '') : p)).filter(Boolean))).sort();
                } else {
                    options[key] = Array.from(new Set(limitsData.map(row => String(row[key] || row['productName'] || row['product_name'] || '')).filter(Boolean))).sort();
                }
            } else if (k === "exchange") {
                if (productOptions.length > 0) {
                    options[key] = Array.from(new Set(productOptions.map(p => (typeof p === 'object' ? (p.exchange || '') : p)).filter(Boolean))).sort();
                } else {
                    options[key] = Array.from(new Set(limitsData.map(row => String(row[key] || '')).filter(Boolean))).sort();
                }
            } else if (k.includes("category") || k.includes("type")) {
                options[key] = Array.from(new Set(limitsData.map(row => String(row[key] || row['instrumentType'] || row['category'] || '')).filter(Boolean))).sort();
            }
        });
        return options;
    }, [limitsData, dataKeys, productOptionsFutures, productOptionsOptions, accountNumbersOptions]);

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
            outrightLimit: Number(row.outrightLimit || 0),
            spreadLimit: Number(row.spreadLimit || 0),
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

        emit(WIDGET_EVENTS.LIMIT_REQUEST_SUBMITTED, { row });
    };

    // ─── Export Logic ────────────────────────────────────────────────────────

    const handleExport = async () => {
        try {
            let exportRows: any[] = [];
            const isInteractive = !readOnly;
            const productOptions = activeTab === "Future" ? productOptionsFutures : productOptionsOptions;
            if (isInteractive && productOptions && productOptions.length > 0) {
                // Determine which accounts to include in the template
                let accounts: string[] = [];
                const paramAccounts = currentParams['account_numbers'] || currentParams['account'] || currentParams['Account'];

                if (Array.isArray(paramAccounts)) {
                    accounts = paramAccounts.map(String);
                } else if (paramAccounts) {
                    accounts = [String(paramAccounts)];
                }

                // Fallback to accounts already present in the data if no parameters are selected
                if (accounts.length === 0) {
                    accounts = Array.from(new Set(limitsData.map(r => String(r.account)))).filter(Boolean);
                }

                // Fallback to fetched/parameter account options (same source as "Add New Product" dropdown)
                if (accounts.length === 0) {
                    const accountParam = parameters?.find(p => p.name.toLowerCase() === "account_numbers" || p.name.toLowerCase().includes("account"));
                    const paramOptionAccounts = accountParam?.options?.map(o => String(o.value)) || [];
                    accounts = Array.from(new Set([...accountNumbersOptions, ...paramOptionAccounts])).filter(Boolean).sort();
                }

                if (accounts.length > 0) {
                    // Deduplicate by product+productName so futures dedup on product alone
                    // and options (multiple productNames per product) each get their own row.
                    const allProductsList = Array.from(
                        new Map(
                            productOptions
                                .map(p => ({
                                    product: typeof p === 'object' ? (p.metadata_sym || p.product || '') : String(p),
                                    productName: typeof p === 'object' ? (p.instrument || p.productName || '') : '',
                                    exchange: typeof p === 'object' ? (p.exchange || '') : ''
                                }))
                                .filter(p => p.product)
                                .map(p => [`${p.product}|${p.productName}`, p] as const)
                        ).values()
                    );

                    // Generate a cross-product of accounts and products
                    accounts.forEach(acc => {
                        allProductsList.forEach(prod => {
                            const existing = limitsData.find(r =>
                                String(r.account) === acc &&
                                String(r.product) === prod.product &&
                                (!prod.productName || String(r.productName) === prod.productName)
                            );
                            if (existing) {
                                exportRows.push({
                                    account: existing.account,
                                    product: existing.product,
                                    productName: existing.productName,
                                    exchange: existing.exchange || prod.exchange || "",
                                    outrightLimit: existing.outrightLimit || 0,
                                    spreadLimit: existing.spreadLimit || 0,
                                    requestedOutrightLimit: existing.outrightLimit || 0,
                                    requestedSpreadLimit: existing.spreadLimit || 0,
                                    reason: ""
                                });
                            } else {
                                // Add products that don't have limits yet with 0 values
                                exportRows.push({
                                    account: acc,
                                    product: prod.product,
                                    productName: prod.productName,
                                    exchange: prod.exchange || "",
                                    outrightLimit: 0,
                                    spreadLimit: 0,
                                    requestedOutrightLimit: 0,
                                    requestedSpreadLimit: 0,
                                    reason: ""
                                });
                            }
                        });
                    });
                } else {
                    // If no accounts found, just export what we have
                    exportRows = limitsData.map(row => ({
                        ...row,
                        requestedOutrightLimit: row.outrightLimit || 0,
                        requestedSpreadLimit: row.spreadLimit || 0,
                        reason: ""
                    }));
                }
            } else {
                // Non-interactive mode or no product options: export only existing data
                if (limitsData.length === 0) return;
                exportRows = limitsData.map(row => ({
                    account: row.account,
                    product: row.product,
                    productName: row.productName,
                    exchange: row.exchange || "",
                    outrightLimit: row.outrightLimit || 0,
                    spreadLimit: row.spreadLimit || 0,
                    ...(isInteractive ? {
                        requestedOutrightLimit: row.outrightLimit || 0,
                        requestedSpreadLimit: row.spreadLimit || 0,
                        reason: ""
                    } : {})
                }));
            }

            if (exportRows.length === 0) {
                toast.info("No data available to export.");
                return;
            }

            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet("Trader Limits");

            // Define columns
            const columns = [
                ...dataKeys.map(key => ({ header: DISPLAY_NAMES[key] || key, key: key, width: 20 })),
            ];

            if (isInteractive) {
                columns.push(
                    { header: "Requested Outright Limit", key: "requestedOutrightLimit", width: 25 }
                );
                // Only show spread limit if in Futures tab
                if (activeTab === 'Future') {
                    columns.push({ header: "Requested Spread Limit", key: "requestedSpreadLimit", width: 25 });
                }
                columns.push({ header: "Reason", key: "reason", width: 30 });
            }

            worksheet.columns = columns;
            worksheet.addRows(exportRows);

            // Style headers
            worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
            worksheet.getRow(1).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF00998B' }
            };

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);

            const link = document.createElement("a");
            link.href = url;
            link.download = `trader_limits_${activeTab}_${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Export Error:", error);
            toast.error("Failed to generate Excel file.");
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
                    const prodName = getCellVal(row, "Product Name", "ProductName");
                    const exch = getCellVal(row, "Exchange");
                    const reqOutrightLimit = getCellVal(row, "Requested Outright Limit", "New Outright Limit", "Outright Limit");
                    const reqSpreadLimit = activeTab === 'Future' ? getCellVal(row, "Requested Spread Limit", "New Spread Limit", "Spread Limit") : null;
                    const reason = getCellVal(row, "Reason", "Comments", "Remark");

                    if (!acc || !prod || reqOutrightLimit === null || reqOutrightLimit === undefined) return;
                    if (activeTab === 'Future' && (reqSpreadLimit === null || reqSpreadLimit === undefined)) return;

                    const existing = limitsData.find(l =>
                        String(l.account) === String(acc) &&
                        String(l.product) === String(prod)
                    );

                    const currentOutrightLimit = existing ? Number(existing.outrightLimit) : 0;
                    const currentSpreadLimit = existing ? Number(existing.spreadLimit) : 0;

                    const hasOutrightChange = Number(reqOutrightLimit) !== currentOutrightLimit;
                    const hasSpreadChange = activeTab === 'Future' && Number(reqSpreadLimit) !== currentSpreadLimit;

                    if (hasOutrightChange || hasSpreadChange) {
                        results.push({
                            account: String(acc),
                            product: String(prod),
                            productName: String(prodName || (existing?.productName) || ""),
                            exchange: String(exch || (existing?.exchange) || ""),
                            outrightLimit: currentOutrightLimit,
                            spreadLimit: currentSpreadLimit,
                            requestedOutrightLimit: Number(reqOutrightLimit),
                            requestedSpreadLimit: activeTab === 'Future' ? Number(reqSpreadLimit) : null,
                            reason: String(reason || ""),
                            instrumentType: activeTab.toUpperCase()
                        });
                    }
                });

                if (results.length > 0) {
                    setImportData(results);
                    setIsImportModalOpen(true);
                } else {
                    toast.warning("No limit changes detected. All values match current database state.");
                }
            } catch (err: any) {
                console.error("ExcelJS Parse Error:", err);
                toast.error("Failed to parse Excel file. Please ensure it's a valid XLSX/CSV.");
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
            if (result.success) {
                toast.success(result.message || "Import successful!");
            } else if (result.errors && result.errors.length > 0) {
                toast.warning(`${result.message}. Some items failed.`);
            } else {
                toast.error(result.message || "Import failed");
            }

            setIsImportModalOpen(false);
            setImportData([]);
        } catch (error: any) {
            console.error("Bulk Import Error:", error);
            toast.error(`Import Error: ${error.message}`);
        } finally {
            setIsBulkSubmitting(false);
        }
    };

    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(50);

    const totalPages = Math.max(1, Math.ceil(limitsData.length / pageSize));

    const paginatedLimitsData = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return limitsData.slice(start, start + pageSize).map((row, i) => ({ row, originalIdx: start + i }));
    }, [limitsData, currentPage, pageSize]);

    useEffect(() => { setCurrentPage(1); }, [activeTab, currentParams]);

    const borderColor = darkMode ? "border-gray-800" : "border-gray-100";
    const headerBg = darkMode ? "bg-gray-900/50" : "bg-gray-50/50";
    const headerTextColor = darkMode ? "text-gray-400" : "text-gray-500";

    return (
        <WidgetContainer
            title={title}
            parameters={enrichedParameters}
            onParametersChange={setCurrentParams}
            darkMode={darkMode}
            initialParameterValues={currentParams}
            onGroupedParametersChange={onGroupedParametersChange}
            groupedParametersValues={groupedParametersValues}
            isTokenRequired={isTokenRequired}
            getFirebaseToken={getFirebaseToken}
            showRefreshButton={showRefreshButton}
            onRefresh={refetch}
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

                .custom-scrollbar::-webkit-scrollbar {
                    width: 5px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #00998b50;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #00998b;
                }

                /* Row hover effect */
                tbody .tlr-row {
                    transition: background-color 0.15s ease-in-out;
                }

                tbody .tlr-row:hover {
                    background-color: rgba(0, 153, 139, 0.18) !important;
                    box-shadow: inset 3px 0 0 #00998b !important;
                }
            `}</style>

            <div className={`flex flex-col h-full w-full overflow-hidden ${darkMode ? 'bg-gray-950 text-gray-100' : 'bg-white text-gray-900'}`}>
                {/* Blurrable Content Wrapper */}
                <div className={`flex-1 flex flex-col transition-all duration-500 ease-in-out ${isImportModalOpen ? 'blur-[12px] pointer-events-none opacity-40 scale-[0.98]' : 'blur-0 opacity-100 scale-100'}`}>

                {/* Brand Header Custom Integration */}
                <div className={`flex items-center justify-end px-4 py-2 border-b ${darkMode ? 'bg-gray-950 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
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
                                    className={`h-8 text-[11px] gap-2 px-4 font-black uppercase tracking-widest transition-all active:scale-95
                                        ${darkMode 
                                            ? 'border-[#00998b]/40 bg-[#00998b]/5 text-[#00998b] hover:bg-[#00998b]/10' 
                                            : 'border-[#00998b]/30 bg-white text-[#00998b] hover:bg-[#00998b]/5'}`}
                                    title="Import limits from Excel/CSV"
                                >
                                    <Upload size={14} strokeWidth={2.5} /> Import
                                </Button>
                            </>
                        )}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleExport}
                            className={`h-8 text-[11px] gap-2 px-4 font-black uppercase tracking-widest transition-all active:scale-95
                                ${darkMode 
                                    ? 'border-[#00998b]/40 bg-[#00998b]/5 text-[#00998b] hover:bg-[#00998b]/10' 
                                    : 'border-[#00998b]/30 bg-white text-[#00998b] hover:bg-[#00998b]/5'}`}
                            title="Export current limits to Excel"
                        >
                            <Download size={14} strokeWidth={2.5} /> Export
                        </Button>
                        {!readOnly && allowAddingRows && (
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={handleAddNewRow}
                                className="h-8 text-[11px] gap-2 px-4 font-black uppercase tracking-widest shadow-lg shadow-[#00998b]/20 hover:shadow-[#00998b]/40 transition-all active:scale-95"
                                style={{ backgroundColor: '#00998b', border: 'none' }}
                            >
                                <Plus size={14} strokeWidth={3} /> Add New Product
                            </Button>
                        )}
                    </div>
                </div>



                {/* Tab Bar with Counts */}
                <div className={`flex border-b px-4 ${darkMode ? 'bg-gray-950 border-gray-800' : 'bg-gray-50/50 border-gray-200'}`}>
                    {['Future', 'Option'].map(tab => {
                        const count = tab === 'Future' 
                            ? (rawData?.filter((i:any) => (i.category||i.instrumentType||'').toLowerCase().includes('future')).length || 0) 
                            : (rawData?.filter((i:any) => (i.category||i.instrumentType||'').toLowerCase().includes('option')).length || 0);
                        
                        const isActive = activeTab.toLowerCase().replace(/s$/, '') === tab.toLowerCase().replace(/s$/, '');
                        return (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab as any)}
                                className={`px-4 py-3 text-[11px] font-black uppercase tracking-widest transition-all relative
                                    ${isActive ? '' : (darkMode ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600')}`}
                                style={{ 
                                    color: isActive ? '#00998b' : undefined,
                                    boxShadow: isActive ? 'inset 0 -4px 0 #00998b' : 'none'
                                }}
                            >
                                <div className="flex items-center gap-2">
                                    {tab}S
                                    <span 
                                        className={`px-1.5 py-0.5 rounded-sm text-[9px] font-black ${darkMode ? 'bg-gray-800' : 'bg-gray-200'}`}
                                        style={{ 
                                            backgroundColor: isActive ? '#00998b20' : undefined,
                                            color: isActive ? '#00998b' : (darkMode ? '#4b5563' : '#6b7280')
                                        }}
                                    >
                                        {count}
                                    </span>
                                </div>
                            </button>
                        );
                    })}
                </div>

                <div className="flex-1 overflow-auto">
                    <table className="w-full border-collapse text-left">
                        <thead 
                            className={`${isImportModalOpen ? 'opacity-40' : 'sticky top-0 z-10 backdrop-blur-sm'} ${headerBg} border-b ${borderColor}`}
                            style={isImportModalOpen ? { filter: 'blur(12px)', pointerEvents: 'none' } : {}}
                        >
                            <tr>
                                {dataKeys.map(key => {
                                    const isLeftAligned = key.toLowerCase() === 'productname';
                                    return (
                                        <th key={key} className={`px-4 py-3 text-[10px] font-bold uppercase tracking-widest ${isLeftAligned ? 'text-left' : 'text-center'} ${headerTextColor}`}>
                                            {key === 'outrightLimit' ? 'OUTRIGHT LIMIT' : 
                                             key === 'spreadLimit' ? 'SPREAD LIMIT' : 
                                             DISPLAY_NAMES[key] || key.toUpperCase()}
                                        </th>
                                    );
                                })}
                                {showRequestCols && (
                                    <>
                                        <th className={`px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-center ${headerTextColor}`}>Req. Outright</th>
                                        {activeTab === 'Future' && <th className={`px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-center ${headerTextColor}`}>Req. Spread</th>}
                                        <th className={`px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-center ${headerTextColor}`}>Reason</th>
                                    </>
                                )}
                                {!readOnly && <th className={`px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-center ${headerTextColor}`}>Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {/* Existing Rows */}
                            {paginatedLimitsData.map(({ row, originalIdx }) => (
                                <TableRow
                                    key={`existing-${originalIdx}`}
                                    data={row}
                                    columns={dataKeys}
                                    darkMode={darkMode}
                                    resolvedLimitField={resolvedLimitField}
                                    colorizeNumeric={colorizeNumeric}
                                    onSubmit={handleSubmit}
                                    showRequestCols={showRequestCols}
                                    onStateChange={(s) => setRowStates(prev => ({ ...prev, [`existing-${originalIdx}`]: s }))}
                                    readOnly={readOnly}
                                    activeTab={activeTab}
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
                                    productOptions={activeTab == 'Future' ? productOptionsFutures : productOptionsOptions}
                                    activeTab={activeTab}
                                />
                            ))}

                            {limitsData.length === 0 && newRows.length === 0 && (
                                <tr>
                                    <td colSpan={dataKeys.length + (showRequestCols ? (activeTab === 'Future' ? 3 : 2) : 0) + (readOnly ? 0 : 1)} className="px-4 py-20 text-center">
                                        <div className="flex flex-col items-center gap-2 opacity-40">
                                            <Loader2 size={24} className="animate-spin" />
                                            <span className="text-sm font-medium italic">No data available. Add a new product to get started.</span>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <TablePagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={limitsData.length}
                    pageSize={pageSize}
                    onPageChange={setCurrentPage}
                    onPageSizeChange={setPageSize}
                    darkMode={darkMode}
                />

                </div>

                <ImportPreviewModal
                    isOpen={isImportModalOpen}
                    onClose={() => setIsImportModalOpen(false)}
                    onConfirm={handleConfirmImport}
                    data={importData}
                    darkMode={darkMode}
                    isSubmitting={isBulkSubmitting}
                    activeTab={activeTab}
                />
            </div>
        </WidgetContainer>
    );
};

export const TraderLimitsRequestWidgetDef = {
    component: TraderLimitsRequestWidget,
};



