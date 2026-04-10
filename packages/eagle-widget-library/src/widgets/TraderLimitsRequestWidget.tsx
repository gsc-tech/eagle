"use client"

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type { BaseWidgetProps, ParameterValues } from "../types";
import { useWidgetData } from "../hooks/useWidgetData";
import { useParameterDefaults } from "../hooks/useParameterDefaults";
import { WidgetContainer } from "../components/WidgetContainer";
import { Check, X as LucideX, Loader2, Plus, Info, Trash2, ChevronDown } from "lucide-react";

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
            sm: "h-8 px-3 text-xs",
            md: "h-9 px-4 text-sm"
        };
        
        const petrolColor = '#00998b';
        const petrolHighlight = '#00b3a2';
        const redColor = '#ef4444'; // Standard Shadcn Red
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
        <div className={`relative h-9 w-full min-w-[100px] ${className}`}>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className={`flex h-full w-full appearance-none rounded-md border px-3 pr-8 py-1 text-[11px] shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 cursor-pointer
                ${darkMode 
                    ? 'border-gray-800 bg-gray-900 text-gray-100' 
                    : 'border-gray-200 bg-white text-gray-900'}`}
            >
                <option value="" disabled>{placeholder}</option>
                {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" size={14} />
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
    /** Whether to show the 'New Limit' button in the header. Default: true */
    allowAddingRows?: boolean;
    /** Explicit list of product symbols for the New Limit dropdown, provided by backend */
    productOptions?: string[];
}

type RowStatus = "idle" | "editing" | "submitting" | "success" | "error";

interface RowState {
    status: RowStatus;
    requestedValue: string;
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
}

const TableRow: React.FC<RowProps> = ({ data, columns, darkMode, resolvedLimitField, colorizeNumeric, onSubmit, isNew, onRemove, columnOptions = {} }) => {
    const [state, setState] = useState<RowState>(() => ({
        status: isNew ? "editing" : "idle",
        requestedValue: "",
        reason: "",
        message: "",
        draftData: isNew ? columns.reduce((acc, col) => ({ ...acc, [col]: "" }), {}) : undefined
    }));

    const isEditing = state.status === "editing" || state.status === "submitting";

    const handleRequest = () => {
        setState({
            status: "editing",
            requestedValue: resolvedLimitField ? String(data[resolvedLimitField] || "") : "",
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
        if (!state.requestedValue) return;
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
            // "Current Limit" should not be editable for new rows
            if (key === resolvedLimitField || key.toLowerCase().includes("limit")) {
                return <span className={darkMode ? "text-gray-500 italic text-xs" : "text-gray-400 italic text-xs"}>0</span>;
            }

            // Dropdown for columns that have options
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
                    className="h-8 text-[11px] text-center min-w-[80px]"
                    darkMode={darkMode}
                    placeholder={key}
                />
            );
        }

        if (typeof val === "number") {
            return <span className="tabular-nums">{val.toLocaleString()}</span>;
        }
        return <span>{val ?? "—"}</span>;
    };

    const borderColor = darkMode ? "border-gray-800" : "border-gray-100";
    const textColor = darkMode ? "text-gray-300" : "text-gray-700";

    return (
        <tr className={`group transition-colors ${darkMode ? 'hover:bg-gray-800/50' : 'hover:bg-gray-50/50'} border-b ${borderColor} ${isNew ? (darkMode ? 'bg-[#00998b]/10' : 'bg-[#00998b]/5') : ''}`}>
            {columns.map(col => (
                <td key={col} className={`px-4 py-3 text-sm text-center ${textColor}`}>
                    {renderValue(col, data[col])}
                </td>
            ))}
            
            {/* Requested Limit Column */}
            <td className="px-4 py-2 min-w-[200px] text-center whitespace-nowrap">
                {isEditing ? (
                    <div className="flex items-center gap-2 justify-center">
                        <Input
                            type="number"
                            value={state.requestedValue}
                            onChange={e => setState({ ...state, requestedValue: e.target.value })}
                            disabled={state.status === "submitting"}
                            className="h-8 w-24 text-xs text-center"
                            darkMode={darkMode}
                            autoFocus={!isNew}
                            placeholder="Amount"
                        />
                        {state.requestedValue && resolvedLimitField && !isNew && (
                            <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded transition-all duration-200
                                ${Number(state.requestedValue) > Number(data[resolvedLimitField]) 
                                    ? 'text-green-500 bg-green-50 dark:bg-green-900/20' 
                                    : Number(state.requestedValue) < Number(data[resolvedLimitField])
                                        ? 'text-red-500 bg-red-50 dark:bg-red-900/20'
                                        : (darkMode ? 'text-gray-400 bg-gray-800 border border-gray-700' : 'text-gray-400 bg-gray-50')}`}>
                                {Number(state.requestedValue) > Number(data[resolvedLimitField]) ? '+' : ''}
                                {Number(state.requestedValue) - Number(data[resolvedLimitField])}
                            </div>
                        )}
                        {isNew && state.requestedValue && (
                             <div 
                                className="text-[10px] font-bold px-1.5 py-0.5 rounded border border-[#00998b20]"
                                style={{ color: '#00998b', backgroundColor: '#00998b10' }}
                             >
                                New
                             </div>
                        )}
                    </div>
                ) : (
                    <span className="text-gray-400 italic text-xs">—</span>
                )}
            </td>

            {/* Reason Column */}
            <td className="px-4 py-2 min-w-[200px] text-center whitespace-nowrap">
                {isEditing ? (
                    <Input
                        placeholder="Reason..."
                        value={state.reason}
                        onChange={e => setState({ ...state, reason: e.target.value })}
                        disabled={state.status === "submitting"}
                        className="h-8 text-xs"
                        darkMode={darkMode}
                    />
                ) : (
                    <span className="text-gray-400 italic text-xs">—</span>
                )}
            </td>

            {/* Action Column */}
            <td className="px-4 py-2 min-w-[140px] text-right">
                <div className="flex justify-end gap-2 items-center">
                    {state.status === "idle" && (
                        <Button variant="outline" size="sm" onClick={handleRequest} className="gap-1">
                            <Plus size={14} /> Request
                        </Button>
                    )}

                    {(state.status === "editing" || state.status === "error") && (
                        <>
                            <Button variant="primary" size="sm" onClick={handleInternalSubmit} className="min-w-[70px]">Submit</Button>
                            <Button variant="destructive" size="sm" onClick={handleCancel} className="w-8 h-8 px-0 flex items-center justify-center">
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
            </td>
        </tr>
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

    useEffect(() => {
        onWidgetStateChange?.({ parameters: currentParams });
    }, [currentParams, onWidgetStateChange]);

    const { data: rawData } = useWidgetData(apiUrl as string, {
        pollInterval,
        parameters: currentParams,
        isTokenRequired,
        getFirebaseToken,
    });

    const [limitsData, setLimitsData] = useState<any[]>([]);
    
    useEffect(() => {
        if (rawData && Array.isArray(rawData)) {
            setLimitsData(rawData);
        }
    }, [rawData]);

    const dataKeys = useMemo(() => {
        if (limitsData.length === 0) return [];
        return Object.keys(limitsData[0]).filter(k => k !== 'RequestedLimit' && k !== 'reason');
    }, [limitsData]);

    const resolvedLimitField = useMemo(() => {
        if (limitField) return limitField;
        if (limitsData.length === 0) return null;
        const first = limitsData[0];
        return Object.keys(first).find((k) => typeof first[k] === "number") ?? null;
    }, [limitField, limitsData]);

    // Derive options for dropdowns based on existing data
    const columnOptions = useMemo(() => {
        const options: Record<string, string[]> = {};
        if (limitsData.length === 0 && productOptions.length === 0) return options;

        dataKeys.forEach(key => {
            // If backend explicitly provided options for Product
            if (key.toLowerCase() === "product" && productOptions && productOptions.length > 0) {
                options[key] = productOptions;
                return;
            }
            
            // Otherwise, derive options for other string columns from existing data
            if (limitsData.length > 0 && typeof limitsData[0][key] === "string" && !key.toLowerCase().includes("limit")) {
                options[key] = Array.from(new Set(limitsData.map(row => String(row[key])).filter(Boolean))).sort();
            }
        });
        return options;
    }, [limitsData, dataKeys, productOptions]);

    const handleAddNewRow = () => {
        setNewRows(prev => [...prev, Date.now()]);
    };

    const handleRemoveNewRow = (id: number) => {
        setNewRows(prev => prev.filter(rid => rid !== id));
    };

    const handleSubmit = async (row: any, state: RowState) => {
        const endpoint = requestApiUrl || apiUrl;
        const body = {
            ...row,
            reason: state.reason,
            RequestedLimit: state.requestedValue !== "" ? Number(state.requestedValue) : null
        };

        let token: string | undefined;
        if (isTokenRequired && getFirebaseToken) {
            token = await getFirebaseToken();
        }

        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch(endpoint as string, {
            method: "POST",
            headers,
            body: JSON.stringify(body),
        });

        if (!res.ok) {
            const text = await res.text().catch(() => "");
            throw new Error(text || `HTTP ${res.status}`);
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
                /* Hide number input spinners globally for this widget */
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
                
                {/* Header Actions Area */}
                <div className={`flex items-center justify-between gap-2 px-4 py-2 text-[11px] ${headerTextColor} border-b ${borderColor}`}>
                    <div className="flex items-center gap-2">
                        <Info size={14} style={{ color: '#00998b' }} />
                        <span>Click <span style={{ color: '#00998b', fontWeight: '600' }}>+ Request</span> to modify a limit, or use the <b>New Limit</b> button to add a commodity.</span>
                    </div>
                    
                    {allowAddingRows && (
                        <Button 
                            variant="primary" 
                            size="sm" 
                            onClick={handleAddNewRow}
                            className="h-7 text-[11px] gap-1 px-3"
                        >
                            <Plus size={14} /> Add New Product
                        </Button>
                    )}
                </div>

                {/* Main Table Container */}
                <div className="flex-1 overflow-auto">
                    <table className="w-full border-collapse text-left">
                        <thead className={`sticky top-0 z-10 ${headerBg} backdrop-blur-sm border-b ${borderColor}`}>
                            <tr>
                                {dataKeys.map(key => (
                                    <th key={key} className={`px-4 py-3 text-xs font-bold uppercase tracking-wider text-center ${headerTextColor}`}>
                                        {key}
                                    </th>
                                ))}
                                <th className={`px-4 py-3 text-xs font-bold uppercase tracking-wider text-center ${headerTextColor}`}>Requested Limit</th>
                                <th className={`px-4 py-3 text-xs font-bold uppercase tracking-wider text-center ${headerTextColor}`}>Reason</th>
                                <th className={`px-4 py-3 text-xs font-bold uppercase tracking-wider text-right ${headerTextColor}`}></th>
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
                                />
                            ))}

                            {/* New Rows (Local Only until submitted) */}
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
                                />
                            ))}

                            {limitsData.length === 0 && newRows.length === 0 && (
                                <tr>
                                    <td colSpan={dataKeys.length + 3} className="px-4 py-20 text-center">
                                        <div className="flex flex-col items-center gap-2 opacity-40">
                                            <Loader2 size={24} className="animate-spin" />
                                            <span className="text-sm font-medium italic">No data available. Add a new limit to get started.</span>
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

export const TraderLimitsRequestWidgetDef = {
    component: TraderLimitsRequestWidget,
};
