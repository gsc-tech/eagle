import { useMemo, useState, useEffect, useCallback } from "react";
import type { LayoutItem } from "./types";
import { widgetLibrary } from "@gsc-tech/eagle-widget-library";
import { useGroupedParamsStore } from "@/store/groupedParamsStore";

interface WidgetRendererProps {
    layoutItem: LayoutItem;
    /** Pre-loaded Univer workbook snapshot for SheetWidget (from your database). */
    initialWorkbookData?: Record<string, any>;
    /** Called when a SheetWidget unmounts so you can persist the snapshot to your database. */
    onSaveWorkbook?: (widgetId: string, snapshot: Record<string, any>) => void;
}

export default function WidgetRenderer({
    layoutItem,
    initialWorkbookData,
    onSaveWorkbook,
}: WidgetRendererProps) {
    const { widget } = layoutItem;

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
        (s) => s.groupedParametersValues
    );
    const mergeGroupValues = useGroupedParamsStore((s) => s.mergeGroupValues);

    /**
     * Called by ParameterForm when the user changes a grouped-param value.
     * We merge the update into the shared Zustand store so all other widgets
     * that share the same groupId automatically re-render with the new value.
     */
    const handleGroupedParametersChange = useCallback(
        (values: Record<string, any>) => {
            mergeGroupValues(values);
        },
        [mergeGroupValues]
    );

    // ── Widget component lookup ────────────────────────────────────────────────
    const WidgetComponent = useMemo(() => {
        const entry =
            widgetLibrary[widget.componentName as keyof typeof widgetLibrary];
        return entry?.component;
    }, [widget.componentName]);

    if (!WidgetComponent) {
        return (
            <div className="h-full w-full bg-destructive/10 border-2 border-destructive/20 rounded-xl flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="text-center">
                    <p className="text-destructive font-semibold text-sm">
                        Widget not found
                    </p>
                    <p className="text-xs text-destructive/70 mt-1">
                        {widget.componentName}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full w-full overflow-hidden flex flex-col">
            <WidgetComponent
                {...(widget.defaultProps || {})}
                title={widget.name}
                darkMode={theme === "dark"}
                groupedParametersValues={groupedParametersValues}
                onGroupedParametersChange={handleGroupedParametersChange}
                // SheetWidget-specific: load saved snapshot and persist on close
                {...(widget.componentName === "SheetWidget" && {
                    initialWorkbookData,
                    onSave: onSaveWorkbook
                        ? (snapshot: Record<string, any>) =>
                            onSaveWorkbook(layoutItem.i, snapshot)
                        : undefined,
                })}
            />
        </div>
    );
}
