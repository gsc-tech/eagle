import { useMemo, useState, useEffect, useCallback } from "react";
import type { LayoutItem } from "./types";
import { widgetLibrary } from "@gsc-tech/eagle-widget-library";
import { useGroupedParamsStore } from "@/store/groupedParamsStore";
import { useDashboardStateStore } from "@/store/dashboardStateStore";
import { getAuth } from "firebase/auth";

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
    const widgetState = useDashboardStateStore((s) => s.widgetStates[dashboardId]?.[layoutItem.i]);

    const handleWidgetStateChange = useCallback((state: any) => {
        setWidgetState(dashboardId, layoutItem.i, state);
    }, [dashboardId, layoutItem.i, setWidgetState]);

    // console.log("workbook inside widget renderer", initialWorkbookData);

    // ── Theme ──────────────────────────────────────────────────────────────────
    const [theme, setTheme] = useState<string>(
        () => localStorage.getItem("theme") || "dark"
    );

    useEffect(() => {
        const handleThemeChange = () => {
            const newTheme = localStorage.getItem("theme") || "dark";
            setTheme(newTheme);
        };

        window.addEventListener("storage", handleThemeChange);
        window.addEventListener("theme-change", handleThemeChange);

        return () => {
            window.removeEventListener("storage", handleThemeChange);
            window.removeEventListener("theme-change", handleThemeChange);
        };
    }, []);

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
    const WidgetComponent = useMemo(() => {
        const entry =
            widgetLibrary[widget?.componentName as keyof typeof widgetLibrary];
        return entry?.component;
    }, [widget?.componentName]);

    const getFirebaseToken = useCallback(async () => {
        try {
            const auth = getAuth();
            if (auth?.currentUser) {
                return await auth.currentUser.getIdToken(true);
            }
        } catch (err) {
            console.error("[WidgetRenderer] Failed to get robust firebase token", err);
        }
        return "";
    }, []);

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
        return rest;
    }, [widget?.defaultProps]);

    const initialParameterValues = useMemo(() => {
        if (widget?.componentName !== "SheetWidget") return EMPTY_OBJ;
        if (!initialWorkbookData?.parameters) return widget.defaultProps?.initialParameterValues || EMPTY_OBJ;
        return initialWorkbookData.parameters.reduce((acc: any, curr: any) => ({ ...acc, ...curr }), {});
    }, [widget?.componentName, initialWorkbookData?.parameters, widget?.defaultProps?.initialParameterValues]);

    const handleSave = useCallback((snapshot: Record<string, any>, parameters?: any[]) => {
        if (onSaveWorkbook) {
            onSaveWorkbook(layoutItem.i, snapshot, parameters);
        }
    }, [onSaveWorkbook, layoutItem.i]);

    return (
        <div className="h-full w-full overflow-hidden flex flex-col">
            <WidgetComponent
                {...otherDefaultProps}
                id={layoutItem.i}
                title={widget?.name}
                darkMode={theme === "dark"}
                groupedParametersValues={groupedParametersValues}
                onGroupedParametersChange={handleGroupedParametersChange}
                initialWidgetState={widgetState}
                onWidgetStateChange={handleWidgetStateChange}
                // SheetWidget-specific: load saved snapshot and persist on close
                {...(widget?.defaultProps?.isTokenRequired && {
                    getFirebaseToken,
                })}
                {...(widget?.componentName === "SheetWidget" && {
                    initialWorkbookData: initialWorkbookData?.snapshot || initialWorkbookData,
                    initialParameterValues,
                    getFirebaseToken,
                    onSave: handleSave
                })}
            />
        </div>
    );
}
