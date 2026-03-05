import { useMemo, useState, useEffect } from "react";
import type { LayoutItem } from "./types";
import { widgetLibrary } from "@gsc-tech/eagle-widget-library";

interface WidgetRendererProps {
    layoutItem: LayoutItem;
    groupedParametersValues: Record<string, string>;
    onGroupedParametersValuesChange: (values: Record<string, string>) => void;
}

export default function WidgetRenderer({
    layoutItem,
    groupedParametersValues,
    onGroupedParametersValuesChange,
}: WidgetRendererProps) {
    const { widget } = layoutItem;

    // Track theme reactively
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

    // Get the actual widget component from the library
    const WidgetComponent = useMemo(() => {
        const entry = widgetLibrary[widget.componentName as keyof typeof widgetLibrary];
        return entry?.component;
    }, [widget.componentName]);

    if (!WidgetComponent) {
        return (
            <div className="h-full w-full bg-destructive/10 border-2 border-destructive/20 rounded-xl flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="text-center">
                    <p className="text-destructive font-semibold text-sm">Widget not found</p>
                    <p className="text-xs text-destructive/70 mt-1">{widget.componentName}</p>
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
                onGroupedParametersChange={onGroupedParametersValuesChange}
            />
        </div>
    );
}
