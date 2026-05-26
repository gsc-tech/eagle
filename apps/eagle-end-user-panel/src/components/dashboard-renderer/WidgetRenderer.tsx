import { useMemo, useCallback } from "react";
import type { LayoutItem } from "./types";
import { widgetLibrary } from "@gsc-tech/eagle-widget-library";
import { WidgetErrorBoundary } from "./WidgetErrorBoundary";
import { useGroupedParamsStore } from "@/store/groupedParamsStore";
import { useDashboardStateStore } from "@/store/dashboardStateStore";
import { useCsvDataStore } from "@/store/csvDataStore";
import { useThemeStore } from "@/store/themeStore";
import { useFirebaseToken } from "@/hooks/useFirebaseToken";
import { applyFormulas } from "@/lib/formulaEngine";

interface WidgetRendererProps {
    dashboardId: string;
    layoutItem: LayoutItem;
    /** Pre-loaded Univer workbook snapshot for SheetWidget (from your database). */
    initialWorkbookData?: Record<string, any>;
    /** Called when a SheetWidget unmounts so you can persist the snapshot to your database. */
    onSaveWorkbook?: (widgetId: string, snapshot: Record<string, any>, parameters?: any[]) => void;
}

const EMPTY_OBJ = {};
const EMPTY_MAP = {};

export default function WidgetRenderer({
    dashboardId,
    layoutItem,
    initialWorkbookData,
    onSaveWorkbook,
}: WidgetRendererProps) {
    const { widget } = layoutItem;

    const setWidgetState = useDashboardStateStore((s) => s.setWidgetState);
    const setWidgetConfigOverride = useDashboardStateStore((s) => s.setWidgetConfigOverride);
    const widgetState = useDashboardStateStore((s) => s.widgetStates[dashboardId]?.[layoutItem.i]);
    const widgetConfigOverride = useDashboardStateStore(
        (s) => s.widgetConfigOverrides[dashboardId]?.[layoutItem.i]
    );
    const widgetPropsOverride = useDashboardStateStore(
        (s) => s.widgetPropsOverrides[dashboardId]?.[layoutItem.i]
    );

    const handleWidgetStateChange = useCallback((state: any) => {
        setWidgetState(dashboardId, layoutItem.i, state);
    }, [dashboardId, layoutItem.i, setWidgetState]);

    const handleUpdateWidgetConfig = useCallback((patch: Record<string, any>) => {
        const existing = useDashboardStateStore.getState().widgetConfigOverrides[dashboardId]?.[layoutItem.i] ?? {};
        setWidgetConfigOverride(dashboardId, layoutItem.i, { ...existing, ...patch });
    }, [dashboardId, layoutItem.i, setWidgetConfigOverride]);

    // console.log("workbook inside widget renderer", initialWorkbookData);

    // ── Theme ──────────────────────────────────────────────────────────────────
    const isDark = useThemeStore((s) => s.isDark);

    // ── Grouped params (Zustand) ───────────────────────────────────────────────
    // Read the whole map so every widget re-renders when any group changes.
    const groupedParametersValues = useGroupedParamsStore(
        (s) => s.groupedParametersValues[dashboardId] || EMPTY_MAP
    );
    const mergeGroupValues = useGroupedParamsStore((s) => s.mergeGroupValues);

    /**
     * Called by ParameterForm when the user changes a grouped-param value.
     * We merge the update into the shared Zustand store so all other widgets
     * that share the same groupId automatically re-render with the new value.
     */
    const handleGroupedParametersChange = useCallback(
        (values: Record<string, any>) => {
            mergeGroupValues(dashboardId, values);
        },
        [dashboardId, mergeGroupValues]
    );

    // ── Widget component lookup ────────────────────────────────────────────────
    const widgetEntry = useMemo(
        () => widgetLibrary[widget?.componentName as keyof typeof widgetLibrary],
        [widget?.componentName]
    );
    const WidgetComponent = widgetEntry?.component;
    const hostBindings = widgetEntry?.hostBindings;

    const getFirebaseToken = useFirebaseToken();

    // ── Local CSV data injection ───────────────────────────────────────────────
    const getDataset = useCsvDataStore((s) => s.getDataset);
    const localDataConfig = widget?.defaultProps?.localDataConfig;
    const resolvedStaticData = useMemo(() => {
        if (!localDataConfig) return undefined;
        const dataset = getDataset(localDataConfig.datasetId);
        if (!dataset) return undefined;
        return applyFormulas(dataset.rows, localDataConfig.formulaSteps || []);
    }, [localDataConfig, getDataset]);

    if (!WidgetComponent) {
        return (
            <div className="h-full w-full bg-destructive/10 border-2 border-destructive/20 rounded-xl flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="text-center">
                    <p className="text-destructive font-semibold text-sm">
                        Widget not found
                    </p>
                    <p className="text-xs text-destructive/70 mt-1">
                        {widget?.componentName}
                    </p>
                </div>
            </div>
        );
    }

    const otherDefaultProps = useMemo(() => {
        const { initialParameterValues: _, ...rest } = widget?.defaultProps || EMPTY_OBJ;
        let result = rest;
        // Merge v2 WidgetConfig override for FinancialAnalysisWidget and similar
        if (widgetConfigOverride && result.widgetConfig) {
            result = { ...result, widgetConfig: { ...result.widgetConfig, ...widgetConfigOverride } };
        }
        // Merge plain props override for StatementTabsWidget and similar
        if (widgetPropsOverride) {
            result = { ...result, ...widgetPropsOverride };
        }
        return result;
    }, [widget?.defaultProps, widgetConfigOverride, widgetPropsOverride]);

    const initialParameterValues = useMemo(() => {
        if (!hostBindings?.needsWorkbookSnapshot) return EMPTY_OBJ;
        if (!initialWorkbookData?.parameters) return widget?.defaultProps?.initialParameterValues || EMPTY_OBJ;
        return initialWorkbookData.parameters.reduce((acc: any, curr: any) => ({ ...acc, ...curr }), {});
    }, [hostBindings?.needsWorkbookSnapshot, initialWorkbookData?.parameters, widget?.defaultProps?.initialParameterValues]);

    const handleSave = useCallback((snapshot: Record<string, any>, parameters?: any[]) => {
        if (onSaveWorkbook) {
            onSaveWorkbook(layoutItem.i, snapshot, parameters);
        }
    }, [onSaveWorkbook, layoutItem.i]);

    return (
        <div className="h-full w-full overflow-hidden flex flex-col">
            <WidgetErrorBoundary widgetName={widget?.componentName}>
                <WidgetComponent
                    {...otherDefaultProps}
                    id={layoutItem.i}
                    title={widget?.name}
                    darkMode={isDark}
                    groupedParametersValues={groupedParametersValues}
                    onGroupedParametersChange={handleGroupedParametersChange}
                    initialWidgetState={widgetState}
                    onWidgetStateChange={handleWidgetStateChange}
                    {...(resolvedStaticData !== undefined && { staticData: resolvedStaticData })}
                    // Per-instance token injection: set via defaultProps.isTokenRequired in dev console
                    {...(widget?.defaultProps?.isTokenRequired && { getFirebaseToken })}
                    // Host-binding: workbook snapshot injection (declared in widget definition)
                    {...(hostBindings?.needsWorkbookSnapshot && {
                        initialWorkbookData: initialWorkbookData?.snapshot || initialWorkbookData,
                        initialParameterValues,
                        onSave: handleSave,
                    })}
                    // Inject config update callback for v2 BackOffice widgets (FinancialAnalysisWidget, etc.)
                    {...(otherDefaultProps.widgetConfig && { onUpdateWidgetConfig: handleUpdateWidgetConfig })}
                />
            </WidgetErrorBoundary>
        </div>
    );
}
