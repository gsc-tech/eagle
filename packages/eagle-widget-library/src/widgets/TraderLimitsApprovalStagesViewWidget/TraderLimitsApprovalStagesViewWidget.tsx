"use client"

import React, { useState, useEffect, useMemo } from "react";
import { Reorder } from "framer-motion";
import type { ParameterValues } from "../../types";
import { useWidgetData } from "../../hooks/useWidgetData";
import { useParameterDefaults } from "../../hooks/useParameterDefaults";
import { WidgetContainer } from "../../components/WidgetContainer";
import { Loader2, X, Plus, Check, Pencil } from "lucide-react";
import type { TraderLimitsApprovalStagesViewWidgetProps, Approver, TraderApprovalStage } from "./types";
import {
    cn, Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
    Button, ApproverAvatar, FlowArrow, StageBadge, EditStageBadge, ApproverSelectorModal,
} from "./components";

export { type TraderLimitsApprovalStagesViewWidgetProps };

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
    updateApiUrl,
    approversApiUrl,
    usersApiUrl,
}) => {
    const defaultParams = useParameterDefaults(parameters);
    const [currentParams, setCurrentParams] = useState<ParameterValues>(
        () => initialWidgetState?.parameters || defaultParams
    );

    const [editingRowId, setEditingRowId] = useState<string | null>(null);
    const [draftStages, setDraftStages] = useState<Approver[]>([]);
    const [isSelectorOpen, setIsSelectorOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [localData, setLocalData] = useState<TraderApprovalStage[] | null>(null);

    useEffect(() => {
        onWidgetStateChange?.({ parameters: currentParams });
    }, [currentParams]);

    const { data: rawData, loading } = useWidgetData(apiUrl as string, {
        pollInterval,
        parameters: currentParams,
        isTokenRequired,
        getFirebaseToken,
    });

    const resolvedApproversUrl = approversApiUrl || (apiUrl as string).replace('approval-stages', 'approvers');

    const activeData = useMemo(() => {
        const source = localData ?? rawData;
        return (source && Array.isArray(source)) ? (source as TraderApprovalStage[]) : [];
    }, [rawData, localData]);

    const hasChanged = useMemo(() => {
        if (!editingRowId) return false;
        const originalRow = activeData.find(r => r.id === editingRowId);
        if (!originalRow) return false;
        const orig = originalRow.stages;
        if (orig.length !== draftStages.length) return true;
        return draftStages.some((s, i) => s.id !== orig[i].id || s.role !== orig[i].role);
    }, [draftStages, editingRowId, activeData]);

    const startEditing = (row: TraderApprovalStage) => {
        setEditingRowId(row.id);
        setDraftStages([...row.stages]);
    };

    const cancelEditing = () => {
        setEditingRowId(null);
        setDraftStages([]);
        setIsSelectorOpen(false);
    };

    const saveEditing = async (id: string) => {
        if (!updateApiUrl) { setEditingRowId(null); setIsSelectorOpen(false); return; }
        setIsSaving(true);
        try {
            let token: string | undefined;
            if (isTokenRequired && getFirebaseToken) token = await getFirebaseToken();
            const url = token ? `${updateApiUrl}?token=${encodeURIComponent(token)}` : updateApiUrl;
            const payload = { id, stages: draftStages.map((stage, idx) => ({ ...stage, level: idx + 1 })) };
            const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
            const result = await res.json();
            if (result.success && Array.isArray(result.data)) setLocalData(result.data);
        } catch (err) {
            console.error("[ApprovalStages] save failed:", err);
        } finally {
            setIsSaving(false);
            setEditingRowId(null);
            setIsSelectorOpen(false);
        }
    };

    const removeDraftStage = (idx: number) => setDraftStages(prev => prev.filter((_, i) => i !== idx));
    const updateDraftStageRole = (idx: number, role: string) => setDraftStages(prev => prev.map((s, i) => i === idx ? { ...s, role } : s));
    const addDraftStage = (approver: Approver) => { setDraftStages(prev => [...prev, approver]); setIsSelectorOpen(false); };

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
                .tlr-custom-scrollbar::-webkit-scrollbar,
                .tlr-modal-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
                .tlr-custom-scrollbar::-webkit-scrollbar-track,
                .tlr-modal-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .tlr-custom-scrollbar::-webkit-scrollbar-thumb {
                    background: ${darkMode ? '#2e2e2e' : '#e2e8f0'}; border-radius: 10px;
                }
                .tlr-modal-scrollbar::-webkit-scrollbar-thumb {
                    background: ${darkMode ? '#1a1a1a' : '#e2e8f0'}; border-radius: 10px;
                }
                .tlr-custom-scrollbar::-webkit-scrollbar-thumb:hover,
                .tlr-modal-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: ${darkMode ? '#3a3a3a' : '#cbd5e1'};
                }
            `}</style>

            {isSelectorOpen && (
                <ApproverSelectorModal
                    darkMode={darkMode}
                    fetchUrl={usersApiUrl || resolvedApproversUrl}
                    isTokenRequired={isTokenRequired}
                    getFirebaseToken={getFirebaseToken}
                    alreadySelectedIds={draftStages.map(s => s.id)}
                    onSelect={addDraftStage}
                    onClose={() => setIsSelectorOpen(false)}
                />
            )}

            <div className="flex flex-col h-full w-full p-0 overflow-hidden" style={{ backgroundColor: darkMode ? 'transparent' : '#ffffff', color: darkMode ? '#f5f5f5' : '#111827' }}>
                <div className="flex-1 overflow-auto tlr-custom-scrollbar">
                    <Table>
                        <TableHeader darkMode={darkMode}>
                            <TableRow darkMode={darkMode}>
                                <TableHead darkMode={darkMode} className="w-[220px]">Trader</TableHead>
                                <TableHead darkMode={darkMode}>Approval Chain</TableHead>
                                <TableHead darkMode={darkMode} className="text-right w-[100px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {activeData.map((row) => (
                                <TableRow key={row.id} darkMode={darkMode} isEditing={editingRowId === row.id}>
                                    {/* Trader cell */}
                                    <TableCell>
                                        <div className="flex items-center gap-4">
                                            <ApproverAvatar approver={row.trader} size={36} darkMode={darkMode} />
                                            <div className="flex flex-col min-w-0">
                                                <span className="font-semibold text-sm leading-tight truncate">{row.trader?.name}</span>
                                                {row.trader?.email && (
                                                    <span className="text-[10px] truncate mt-0.5" style={{ color: darkMode ? '#606060' : '#9ca3af' }}>
                                                        {row.trader.email}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </TableCell>

                                    {/* Approval chain cell */}
                                    <TableCell>
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            {editingRowId === row.id ? (
                                                <>
                                                    <Reorder.Group axis="x" values={draftStages} onReorder={setDraftStages} className="flex flex-wrap items-center gap-1.5">
                                                        {draftStages.map((stage, idx) => (
                                                            <Reorder.Item key={stage.id} value={stage} className="flex items-center gap-1.5 cursor-grab active:cursor-grabbing">
                                                                <EditStageBadge
                                                                    stage={stage} idx={idx} darkMode={darkMode}
                                                                    onRemove={() => removeDraftStage(idx)}
                                                                    onRoleChange={(role) => updateDraftStageRole(idx, role)}
                                                                />
                                                                {idx < draftStages.length - 1 && <FlowArrow darkMode={darkMode} />}
                                                            </Reorder.Item>
                                                        ))}
                                                    </Reorder.Group>
                                                    <button
                                                        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold border-2 border-dashed transition-all hover:scale-105 active:scale-95"
                                                        style={{ borderColor: darkMode ? '#334155' : '#cbd5e1', color: darkMode ? '#64748b' : '#94a3b8', backgroundColor: 'transparent' }}
                                                        onClick={() => setIsSelectorOpen(true)}
                                                    >
                                                        <Plus size={12} strokeWidth={2.5} />
                                                        Add
                                                    </button>
                                                </>
                                            ) : (
                                                row.stages.length > 0 ? (
                                                    row.stages.map((stage, idx, arr) => (
                                                        <React.Fragment key={stage.id + idx}>
                                                            <StageBadge stage={stage} idx={idx} darkMode={darkMode} />
                                                            {idx < arr.length - 1 && <FlowArrow darkMode={darkMode} />}
                                                        </React.Fragment>
                                                    ))
                                                ) : (
                                                    <span className="text-xs italic px-2 py-1 rounded-full border" style={{ color: darkMode ? '#3a3a3a' : '#9ca3af', borderColor: darkMode ? '#1a1a1a' : '#f1f5f9', backgroundColor: darkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}>
                                                        No approvers assigned
                                                    </span>
                                                )
                                            )}
                                        </div>
                                    </TableCell>

                                    {/* Actions cell */}
                                    <TableCell className="text-right">
                                        {editingRowId === row.id ? (
                                            <div className="flex items-center justify-end gap-1.5">
                                                <Button variant="ghost" size="icon" onClick={cancelEditing} darkMode={darkMode} title="Cancel">
                                                    <X size={16} />
                                                </Button>
                                                <Button variant="primary" size="icon" onClick={() => saveEditing(row.id)} darkMode={darkMode} disabled={isSaving || !hasChanged} title="Save">
                                                    {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} strokeWidth={2.5} />}
                                                </Button>
                                            </div>
                                        ) : (
                                            <Button variant="outline" size="sm" onClick={() => startEditing(row)} className={cn("gap-1.5")} darkMode={darkMode}>
                                                <Pencil size={11} strokeWidth={3} /> Edit
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}

                            {loading && activeData.length === 0 && (
                                <TableRow darkMode={darkMode}>
                                    <TableCell colSpan={3} className="h-40 text-center">
                                        <div className="flex items-center justify-center gap-2.5">
                                            <Loader2 className="h-4 w-4 animate-spin" style={{ color: petrolColor }} />
                                            <span className="text-sm font-medium opacity-50">Loading traders...</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}

                            {!loading && activeData.length === 0 && (
                                <TableRow darkMode={darkMode}>
                                    <TableCell colSpan={3} className="h-40 text-center">
                                        <span className="text-sm font-medium opacity-40">No data available</span>
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