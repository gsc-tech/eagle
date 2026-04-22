"use client"

import React, { useState, useEffect, useMemo, useRef } from "react";
import { Reorder } from "framer-motion";
import type { BaseWidgetProps, ParameterValues } from "../types";
import { useWidgetData } from "../hooks/useWidgetData";
import { useParameterDefaults } from "../hooks/useParameterDefaults";
import { WidgetContainer } from "../components/WidgetContainer";
import { ChevronRight, Loader2, X, Plus, Check, Pencil, Search } from "lucide-react";

// ─── Shadcn-Style Compact Implementation ───────────────────────────────────────

const cn = (...classes: (string | boolean | undefined)[]) => classes.filter(Boolean).join(" ");

const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <div className="relative w-full overflow-auto tlr-custom-scrollbar">
      <table ref={ref} className={cn("w-full caption-bottom text-sm border-collapse", className)} {...props} />
    </div>
  )
);
const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement> & { darkMode?: boolean }>(
  ({ className, darkMode, ...props }, ref) => (
    <thead 
        ref={ref} 
        className={cn("sticky top-0 z-10 backdrop-blur-sm border-b", className)} 
        style={{ 
            backgroundColor: darkMode ? 'rgba(17, 24, 39, 0.6)' : 'rgba(249, 250, 251, 0.6)',
            borderColor: darkMode ? '#1f2937' : '#f1f5f9'
        }}
        {...props} 
    />
  )
);
const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => <tbody ref={ref} className={cn("[&_tr:last-child]:border-0", className)} {...props} />
);
const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement> & { darkMode?: boolean; isEditing?: boolean }>(
  ({ className, darkMode, isEditing, ...props }, ref) => {
    return (
        <tr 
            ref={ref} 
            className={cn("border-b transition-colors group", !isEditing && (darkMode ? "hover:bg-gray-800/40" : "hover:bg-gray-50/60"), className)} 
            style={{ 
                borderColor: darkMode ? '#1f2937' : '#f1f5f9',
                backgroundColor: isEditing ? (darkMode ? 'rgba(0, 153, 139, 0.08)' : 'rgba(0, 153, 139, 0.04)') : undefined,
                position: isEditing ? 'relative' : undefined,
                zIndex: isEditing ? 999999 : undefined
            }}
            {...props} 
        />
    );
  }
);
const TableHead = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement> & { darkMode?: boolean }>(
  ({ className, darkMode, ...props }, ref) => (
    <th ref={ref} className={cn("h-10 px-4 text-left align-middle font-semibold text-xs uppercase tracking-wider", className)} style={{ color: darkMode ? '#9ca3af' : '#6b7280' }} {...props} />
  )
);
const TableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <td ref={ref} className={cn("p-4 align-middle", className)} {...props} />
  )
);

const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'outline' | 'ghost' | 'secondary', size?: 'sm' | 'md' | 'icon', darkMode?: boolean }>(
  ({ className, variant = 'primary', size = 'md', darkMode, ...props }, ref) => {
    const [isHovered, setIsHovered] = useState(false);
    const base = "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";
    
    const petrolColor = '#00998b';
    const petrolHighlight = '#00b3a2';

    const customStyle: React.CSSProperties = {
        transition: 'background-color 0.2s, color 0.2s, border-color 0.2s'
    };

    if (variant === 'primary') {
        customStyle.backgroundColor = isHovered ? petrolHighlight : petrolColor;
        customStyle.color = 'white';
    } else if (variant === 'outline') {
        customStyle.color = petrolColor;
        customStyle.border = `1px solid ${isHovered ? `${petrolHighlight}80` : `${petrolColor}40`}`;
        customStyle.backgroundColor = isHovered ? `${petrolColor}05` : 'transparent';
    } else if (variant === 'secondary') {
        customStyle.backgroundColor = darkMode ? (isHovered ? '#374151' : '#1f2937') : (isHovered ? '#f3f4f6' : '#f9fafb');
        customStyle.color = darkMode ? '#f9fafb' : '#111827';
    } else if (variant === 'ghost') {
        customStyle.backgroundColor = isHovered ? (darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)') : 'transparent';
        customStyle.color = darkMode ? '#9ca3af' : '#6b7280';
    }

    const sizes = {
      sm: "h-8 rounded-md px-3 text-xs",
      md: "h-9 px-4 py-2",
      icon: "h-8 w-8 text-xs p-0"
    };

    return (
      <button 
        ref={ref} 
        className={cn(base, sizes[size], className)} 
        style={customStyle} 
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        {...props} 
      />
    );
  }
);

const Badge = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { variant?: 'default' | 'secondary' | 'outline', darkMode?: boolean }>(
  ({ className, variant = 'default', darkMode, ...props }, ref) => {
    const base = "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold transition-colors shadow-sm";
    
    const customStyle: React.CSSProperties = {
        borderColor: darkMode ? '#374151' : '#e5e7eb',
    };

    if (variant === 'secondary') {
        customStyle.backgroundColor = darkMode ? '#1f2937' : '#f9fafb';
        customStyle.color = darkMode ? '#9ca3af' : '#4b5563';
    } else if (variant === 'default') {
        customStyle.backgroundColor = darkMode ? '#f9fafb' : '#111827';
        customStyle.color = darkMode ? '#111827' : '#f9fafb';
    }

    return (
        <div ref={ref} className={cn(base, className)} style={customStyle} {...props} />
    );
  }
);

// ─── Approver Multiselect Dropdown ──────────────────────────────────────────

// ─── Approver Multiselect Dropdown ──────────────────────────────────────────

const ApproverSelector = ({ 
    approvers, 
    onSelect, 
    onClose, 
    darkMode 
}: { 
    approvers: Approver[], 
    onSelect: (a: Approver) => void, 
    onClose: () => void, 
    darkMode: boolean 
}) => {
    const [search, setSearch] = useState("");
    const filtered = approvers.filter(a => a.name.toLowerCase().includes(search.toLowerCase()));
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [onClose]);

    return (
        <div 
            ref={ref}
            className="absolute z-[9999] mt-2 rounded-lg border shadow-2xl animate-in fade-in zoom-in-95 duration-100 overflow-hidden"
            style={{ 
                left: 0, 
                top: '100%',
                width: 500,
                backgroundColor: darkMode ? '#111827' : '#ffffff',
                borderColor: darkMode ? '#1f2937' : '#e5e7eb',
                color: darkMode ? '#f9fafb' : '#111827'
            }}
        >
            <div 
                className="p-2.5 border-b flex items-center gap-2"
                style={{ borderColor: darkMode ? '#1f2937' : '#f3f4f6' }}
            >
                <Search size={14} className={darkMode ? "text-gray-500" : "text-gray-400"} />
                <input 
                    autoFocus
                    className="w-full text-xs bg-transparent focus:outline-none placeholder:text-gray-500 font-medium"
                    placeholder="Search approvers..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{ color: darkMode ? '#f9fafb' : '#111827' }}
                />
            </div>
            <div className="max-h-56 overflow-auto p-1.5 flex flex-col gap-1">
                {filtered.map(a => (
                    <button
                        key={a.id}
                        className={cn(
                            "flex items-center gap-3 w-full p-2.5 text-left rounded-md transition-all group",
                            darkMode ? "hover:bg-gray-800" : "hover:bg-gray-50"
                        )}
                        onClick={() => onSelect(a)}
                    >
                        <span className={cn(
                            "text-xs font-bold transition-colors",
                            darkMode ? "text-gray-300 group-hover:text-white" : "text-gray-600 group-hover:text-gray-900"
                        )}>
                            {a.name}
                        </span>
                    </button>
                ))}
                {filtered.length === 0 && (
                    <div className="p-6 text-center text-xs text-gray-500 italic font-medium">No approvers found</div>
                )}
            </div>
        </div>
    );
};

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TraderLimitsApprovalStagesViewWidgetProps extends BaseWidgetProps {
    darkMode?: boolean;
    pollInterval?: number;
    title?: string;
}

interface Approver {
    id: string;
    name: string;
    initials: string;
    avatarColor: string;
}

interface TraderApprovalStage {
    id: string;
    trader: Approver;
    stages: Approver[];
}

// ─── Main Widget ───────────────────────────────────────────────────────────────

export const TraderLimitsApprovalStagesViewWidget: React.FC<TraderLimitsApprovalStagesViewWidgetProps> = ({
    initialWidgetState,
    onWidgetStateChange,
    apiUrl = "http://localhost:8080/api/admin/approval-stages",
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
    
    const [editingRowId, setEditingRowId] = useState<string | null>(null);
    const [draftStages, setDraftStages] = useState<Approver[]>([]);
    const [isSelectorOpen, setIsSelectorOpen] = useState(false);

    useEffect(() => {
        onWidgetStateChange?.({ parameters: currentParams });
    }, [currentParams]);

    const { data: rawData, loading } = useWidgetData(apiUrl as string, {
        pollInterval,
        parameters: currentParams,
        isTokenRequired,
        getFirebaseToken,
    });

    // Fetch all available approvers
    const approversUrl = (apiUrl as string).replace('approval-stages', 'approvers');
    const { data: allApproversData } = useWidgetData(approversUrl, {
        isTokenRequired,
        getFirebaseToken,
    });

    const activeData = useMemo(() => {
        return (rawData && Array.isArray(rawData)) ? (rawData as TraderApprovalStage[]) : [];
    }, [rawData]);

    const allApprovers = useMemo(() => {
        return (allApproversData && Array.isArray(allApproversData)) ? (allApproversData as Approver[]) : [];
    }, [allApproversData]);

    const startEditing = (row: TraderApprovalStage) => {
        setEditingRowId(row.id);
        setDraftStages([...row.stages]);
    };

    const cancelEditing = () => {
        setEditingRowId(null);
        setDraftStages([]);
        setIsSelectorOpen(false);
    };

    const saveEditing = (id: string) => {
        console.log(`Saving stages for trader ${id}:`, draftStages);
        setEditingRowId(null);
        setIsSelectorOpen(false);
    };

    const removeDraftStage = (idx: number) => {
        setDraftStages(prev => prev.filter((_, i) => i !== idx));
    };

    const addDraftStage = (approver: Approver) => {
        setDraftStages(prev => [...prev, approver]);
        setIsSelectorOpen(false);
    };

    const petrolColor = '#00998b';

    return (
        <WidgetContainer
            title="Approval Stages"
            parameters={parameters}
            onParametersChange={setCurrentParams}
            darkMode={darkMode}
            initialParameterValues={currentParams}
            onGroupedParametersChange={onGroupedParametersChange}
            groupedParametersValues={groupedParametersValues}
        >
            <style>{`
                .tlr-custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                    height: 6px;
                }
                .tlr-custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .tlr-custom-scrollbar::-webkit-scrollbar-thumb {
                    background: ${darkMode ? '#374151' : '#e5e7eb'};
                    border-radius: 10px;
                }
                .tlr-custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: ${darkMode ? '#4b5563' : '#d1d5db'};
                }
            `}</style>
            <div 
                className={cn("flex flex-col h-full w-full p-0 overflow-hidden transition-colors")} 
                style={{ 
                    backgroundColor: darkMode ? 'transparent' : '#ffffff', 
                    color: darkMode ? '#f3f4f6' : '#111827' 
                }}
            >
                <div className="flex-1 overflow-auto tlr-custom-scrollbar">
                    <Table>
                        <TableHeader darkMode={darkMode}>
                            <TableRow darkMode={darkMode}>
                                <TableHead darkMode={darkMode} className="w-[180px]">Trader</TableHead>
                                <TableHead darkMode={darkMode}>Approval Chain</TableHead>
                                <TableHead darkMode={darkMode} className="text-right"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {activeData.map((row) => (
                                <TableRow key={row.id} darkMode={darkMode} isEditing={editingRowId === row.id}>
                                    <TableCell>
                                        <span className="font-semibold tracking-tight text-sm">{row.trader?.name}</span>
                                    </TableCell>
                                    <TableCell className={cn(editingRowId === row.id && "relative z-[999999] overflow-visible")}>
                                        <div className="flex flex-wrap items-center gap-2 overflow-visible">
                                            {editingRowId === row.id ? (
                                                <Reorder.Group 
                                                    axis="x" 
                                                    values={draftStages} 
                                                    onReorder={setDraftStages}
                                                    className="flex flex-wrap items-center gap-2"
                                                >
                                                    {draftStages.map((stage, idx) => {
                                                        const levelColors = [
                                                            { light: { bg: '#e0f2fe', text: '#0369a1', border: '#bae6fd' }, dark: { bg: 'rgba(56, 189, 248, 0.15)', text: '#7dd3fc', border: 'rgba(56, 189, 248, 0.3)' } }, // Level 1: Blue
                                                            { light: { bg: '#eef2ff', text: '#4338ca', border: '#c7d2fe' }, dark: { bg: 'rgba(99, 102, 241, 0.15)', text: '#a5b4fc', border: 'rgba(99, 102, 241, 0.3)' } }, // Level 2: Indigo
                                                            { light: { bg: '#fef3c7', text: '#b45309', border: '#fde68a' }, dark: { bg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24', border: 'rgba(245, 158, 11, 0.3)' } }, // Level 3: Amber
                                                            { light: { bg: '#ecfdf5', text: '#047857', border: '#a7f3d0' }, dark: { bg: 'rgba(16, 185, 129, 0.15)', text: '#6ee7b7', border: 'rgba(16, 185, 129, 0.3)' } }, // Level 4: Emerald
                                                            { light: { bg: '#fff1f2', text: '#be123c', border: '#fecdd3' }, dark: { bg: 'rgba(244, 63, 94, 0.15)', text: '#fda4af', border: 'rgba(244, 63, 94, 0.3)' } }, // Level 5: Rose
                                                        ];
                                                        const colors = levelColors[idx % levelColors.length];
                                                        const currentColors = darkMode ? colors.dark : colors.light;

                                                        return (
                                                            <Reorder.Item 
                                                                key={stage.id} 
                                                                value={stage}
                                                                className="flex items-center gap-2 cursor-grab active:cursor-grabbing"
                                                            >
                                                                <Badge 
                                                                    variant="secondary" 
                                                                    darkMode={darkMode}
                                                                    className={cn("gap-1.5 h-7 transition-all shadow-md active:scale-105", editingRowId === row.id && "ring-2 ring-offset-1 ring-blue-400 dark:ring-offset-gray-950")}
                                                                    style={{ 
                                                                        backgroundColor: currentColors.bg,
                                                                        color: currentColors.text,
                                                                        borderColor: currentColors.border
                                                                    }}
                                                                >
                                                                    <span className="opacity-50 mr-1 text-[9px] font-black uppercase">L{idx + 1}</span>
                                                                    {stage.name}
                                                                    <button 
                                                                        onClick={(e) => { e.stopPropagation(); removeDraftStage(idx); }}
                                                                        className={cn("ml-1 rounded-full p-0.5 transition-colors", darkMode ? "hover:bg-white/10" : "hover:bg-black/5")}
                                                                    >
                                                                        <X size={10} strokeWidth={3} />
                                                                    </button>
                                                                </Badge>
                                                                {idx < draftStages.length - 1 && <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />}
                                                            </Reorder.Item>
                                                        );
                                                    })}
                                                </Reorder.Group>
                                            ) : (
                                                row.stages.map((stage, idx, arr) => {
                                                    const levelColors = [
                                                        { light: { bg: '#e0f2fe', text: '#0369a1', border: '#bae6fd' }, dark: { bg: 'rgba(56, 189, 248, 0.15)', text: '#7dd3fc', border: 'rgba(56, 189, 248, 0.3)' } },
                                                        { light: { bg: '#eef2ff', text: '#4338ca', border: '#c7d2fe' }, dark: { bg: 'rgba(99, 102, 241, 0.15)', text: '#a5b4fc', border: 'rgba(99, 102, 241, 0.3)' } },
                                                        { light: { bg: '#fef3c7', text: '#b45309', border: '#fde68a' }, dark: { bg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24', border: 'rgba(245, 158, 11, 0.3)' } },
                                                        { light: { bg: '#ecfdf5', text: '#047857', border: '#a7f3d0' }, dark: { bg: 'rgba(16, 185, 129, 0.15)', text: '#6ee7b7', border: 'rgba(16, 185, 129, 0.3)' } },
                                                        { light: { bg: '#fff1f2', text: '#be123c', border: '#fecdd3' }, dark: { bg: 'rgba(244, 63, 94, 0.15)', text: '#fda4af', border: 'rgba(244, 63, 94, 0.3)' } },
                                                    ];
                                                    const colors = levelColors[idx % levelColors.length];
                                                    const currentColors = darkMode ? colors.dark : colors.light;

                                                    return (
                                                        <React.Fragment key={stage.id + idx}>
                                                            <Badge 
                                                                variant="secondary" 
                                                                darkMode={darkMode}
                                                                className="gap-1.5 h-7"
                                                                style={{ 
                                                                    backgroundColor: currentColors.bg,
                                                                    color: currentColors.text,
                                                                    borderColor: currentColors.border
                                                                }}
                                                            >
                                                                <span className="opacity-50 mr-1 text-[9px] font-black uppercase">L{idx + 1}</span>
                                                                {stage.name}
                                                            </Badge>
                                                            {idx < arr.length - 1 && <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />}
                                                        </React.Fragment>
                                                    );
                                                })
                                            )}

                                            {editingRowId === row.id && (
                                                <div className="relative z-[999999]">
                                                    <Button 
                                                        variant="outline" 
                                                        size="icon" 
                                                        className="h-7 w-7 rounded-sm border-dashed"
                                                        onClick={() => setIsSelectorOpen(!isSelectorOpen)}
                                                        darkMode={darkMode}
                                                    >
                                                        <Plus size={14} />
                                                    </Button>
                                                    {isSelectorOpen && (
                                                        <ApproverSelector 
                                                            darkMode={darkMode}
                                                            approvers={allApprovers}
                                                            onSelect={addDraftStage}
                                                            onClose={() => setIsSelectorOpen(false)}
                                                        />
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {editingRowId === row.id ? (
                                            <div className="flex items-center justify-end gap-2 text-right">
                                                <Button variant="ghost" size="icon" onClick={cancelEditing} darkMode={darkMode}>
                                                    <X size={18} />
                                                </Button>
                                                <Button variant="primary" size="icon" onClick={() => saveEditing(row.id)} darkMode={darkMode}>
                                                    <Check size={18} />
                                                </Button>
                                            </div>
                                        ) : (
                                            <Button variant="outline" size="sm" onClick={() => startEditing(row)} className="gap-1.5 font-bold" darkMode={darkMode}>
                                                <Pencil size={12} strokeWidth={3.5} /> Edit
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}

                            {loading && activeData.length === 0 && (
                                <TableRow darkMode={darkMode}>
                                    <TableCell colSpan={3} className="h-40 text-center">
                                        <div className="flex items-center justify-center gap-3">
                                            <Loader2 className="h-5 w-5 animate-spin" style={{ color: petrolColor }} />
                                            <span className="text-sm font-medium italic opacity-60">Loading traders...</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}

                            {!loading && activeData.length === 0 && (
                                <TableRow darkMode={darkMode}>
                                    <TableCell colSpan={3} className="h-40 text-center opacity-60 italic text-sm">
                                        No data available
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </WidgetContainer>
    );
};

export const TraderLimitsApprovalStagesViewWidgetDef = {
    component: TraderLimitsApprovalStagesViewWidget,
};
