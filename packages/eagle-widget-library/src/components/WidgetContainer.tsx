import React, { useState, useCallback } from "react";
import type { DataBinding, DataSlotDefinition, ParameterDefinition, ParameterValues } from "../types";
import { ParameterForm } from "./ParameterForm";
import { useConnectors } from "../context/ConnectorsContext";

interface WidgetContainerProps {
    children: React.ReactNode;
    title?: string;
    parameters?: ParameterDefinition[];
    onParametersChange?: (values: ParameterValues) => void;
    groupedParametersValues?: Record<string, string>;
    onGroupedParametersChange?: (values: Record<string, any>) => void;
    initialParameterValues?: Record<string, string>;
    headerRight?: React.ReactNode;
    dataSlots?: DataSlotDefinition[];
    dataBindings?: DataBinding[];
    onDataBindingsChange?: (bindings: DataBinding[]) => void;
    isTokenRequired?: boolean;
    getFirebaseToken?: () => Promise<string>;
    showRefreshButton?: boolean;
    onRefresh?: () => void;
}

export const WidgetContainer: React.FC<WidgetContainerProps & { darkMode?: boolean }> = ({
    children,
    title,
    parameters,
    onParametersChange,
    darkMode = false,
    groupedParametersValues,
    onGroupedParametersChange,
    initialParameterValues,
    headerRight,
    dataSlots,
    dataBindings,
    onDataBindingsChange,
    isTokenRequired,
    getFirebaseToken,
    showRefreshButton = false,
    onRefresh,
}) => {
    const connectors = useConnectors();
    const [isSpinning, setIsSpinning] = useState(false);

    const handleSlotChange = (slotId: string, sourceId: string | null) => {
        if (!onDataBindingsChange) return;
        const current = dataBindings ?? [];
        const updated = current.some((b) => b.slotId === slotId)
            ? current.map((b) => (b.slotId === slotId ? { slotId, sourceId } : b))
            : [...current, { slotId, sourceId }];
        onDataBindingsChange(updated);
    };

    const handleRefresh = useCallback(() => {
        if (!onRefresh || isSpinning) return;
        setIsSpinning(true);
        onRefresh();
        setTimeout(() => setIsSpinning(false), 600);
    }, [onRefresh, isSpinning]);

    const hasDataSlots = dataSlots && dataSlots.length > 0 && onDataBindingsChange;
    const hasTitleOrParams = title || (parameters && parameters.length > 0 && onParametersChange) || headerRight || hasDataSlots || showRefreshButton;
    return (
        <div
            className={`w-full h-full border overflow-hidden flex flex-col shadow-premium transition-all duration-300 hover:shadow-premium-hover ${darkMode
                ? 'dark bg-[#1f2937] border-gray-700 text-gray-100'
                : 'bg-white border-border-light text-text-primary'
                }`}
        >
            {hasTitleOrParams && (
                <div className={`${darkMode ? 'bg-[#1f2937]' : 'bg-white'} shrink-0`}>
                    <div className="drag-handle flex items-center gap-3 px-3 py-2">
                        {title && (
                            <h3 className={`text-sm font-semibold whitespace-nowrap shrink-0 ${darkMode ? 'text-gray-100' : 'text-text-primary'}`}>
                                {title}
                            </h3>
                        )}
                        {parameters && parameters.length > 0 && onParametersChange && (
                            <ParameterForm
                                parameters={parameters}
                                onParametersChange={onParametersChange}
                                darkMode={darkMode}
                                groupedParametersValues={groupedParametersValues}
                                onGroupedParametersChange={onGroupedParametersChange}
                                initialParameterValues={initialParameterValues}
                                isTokenRequired={isTokenRequired}
                                getFirebaseToken={getFirebaseToken}
                            />
                        )}
                        {hasDataSlots && (
                            <div className="flex items-center gap-1.5 shrink-0">
                                {dataSlots!.map((slot) => {
                                    const options: { label: string; value: string }[] = slot.options
                                        ?? (slot.sourceType
                                            ? connectors.filter((c) => c.type === slot.sourceType).map((c) => ({
                                                label: c.name || `${c.type} ${c.accountId}`,
                                                value: c.id,
                                            }))
                                            : connectors.map((c) => ({
                                                label: c.name || `${c.type} ${c.accountId}`,
                                                value: c.id,
                                            })));
                                    const currentSourceId = dataBindings?.find((b) => b.slotId === slot.id)?.sourceId ?? '';
                                    return (
                                        <label key={slot.id} className="flex items-center gap-1 pointer-events-auto">
                                            <span className={`text-xs font-medium whitespace-nowrap ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                                {slot.label}:
                                            </span>
                                            <select
                                                value={currentSourceId}
                                                onChange={(e) => handleSlotChange(slot.id, e.target.value || null)}
                                                className={`text-xs border rounded px-1.5 py-0.5 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-400 ${
                                                    darkMode
                                                        ? 'bg-gray-700 border-gray-600 text-gray-100'
                                                        : 'bg-white border-gray-300 text-gray-700'
                                                }`}
                                            >
                                                <option value="">All</option>
                                                <option value="__none__">None</option>
                                                {options.map((opt) => (
                                                    <option key={opt.value} value={opt.value}>
                                                        {opt.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </label>
                                    );
                                })}
                            </div>
                        )}
                        {(headerRight || showRefreshButton) && (
                            <div className="shrink-0 pointer-events-auto flex items-center gap-2">
                                {headerRight}
                                {showRefreshButton && (
                                    <button
                                        onClick={handleRefresh}
                                        title="Refresh data"
                                        className={`p-1.5 rounded-md transition-colors ${darkMode
                                            ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
                                            : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                                        }`}
                                    >
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            width={14}
                                            height={14}
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth={2.5}
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            style={isSpinning ? { animation: 'widget-spin 0.6s linear' } : undefined}
                                        >
                                            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                                            <path d="M21 3v5h-5" />
                                            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                                            <path d="M8 16H3v5" />
                                        </svg>
                                        <style>{`
                                            @keyframes widget-spin {
                                                from { transform: rotate(0deg); }
                                                to   { transform: rotate(360deg); }
                                            }
                                        `}</style>
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
            <div className="flex-1 overflow-hidden relative">
                {children}
            </div>
        </div>
    );
};
