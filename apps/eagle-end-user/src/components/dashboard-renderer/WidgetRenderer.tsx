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
    onGroupedParametersValuesChange
}: WidgetRendererProps) {
    const { widget } = layoutItem;

    // Use state to track theme changes reactively
    const [theme, setTheme] = useState<string>(() => localStorage.getItem("theme") || "light");

    // Listen for theme changes
    useEffect(() => {
        const handleThemeChange = () => {
            const newTheme = localStorage.getItem("theme") || "light";
            setTheme(newTheme);
        };

        // Listen for storage events (when localStorage changes in other tabs/windows)
        window.addEventListener("storage", handleThemeChange);

        // Listen for custom theme-change event (for same-window changes)
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
            <div className="h-full w-full bg-destructive/10 border-2 border-destructive/20 rounded-xl flex items-center justify-center p-4 backdrop-blur-sm relative group">
                <div className="text-center">
                    <p className="text-destructive font-semibold">Widget not found</p>
                    <p className="text-xs text-destructive/70 mt-1">{widget.componentName}</p>
                </div>

            </div>
        );
    }

    return (
        <div className="h-full w-full bg-card/80 backdrop-blur-sm border border-border/50 shadow-lg hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 overflow-hidden flex flex-col group relative">

            {/* Widget Content */}
            <div className="flex-1 overflow-auto bg-gradient-to-br from-background/50 to-accent/5">
                {WidgetComponent && (
                    <WidgetComponent
                        {...(widget.defaultProps || {})}
                        title={widget.name}
                        darkMode={theme === "dark"}
                        groupedParametersValues={groupedParametersValues}
                        onGroupedParametersChange={onGroupedParametersValuesChange}
                    />
                )}
            </div>
        </div>
    );
}
