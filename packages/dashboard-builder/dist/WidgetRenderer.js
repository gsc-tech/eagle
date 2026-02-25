import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState, useEffect } from "react";
import { widgetLibrary } from "@gsc-tech/eagle-widget-library";
import { X } from "lucide-react";
export default function WidgetRenderer({ layoutItem, onRemove, isReadOnly = false }) {
    const { widget } = layoutItem;
    // Use state to track theme changes reactively
    const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "light");
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
        const entry = widgetLibrary[widget.componentName];
        return entry?.component;
    }, [widget.componentName]);
    if (!WidgetComponent) {
        return (_jsxs("div", { className: "h-full w-full bg-destructive/10 border-2 border-destructive/30 flex items-center justify-center p-4 backdrop-blur-sm relative group", children: [_jsxs("div", { className: "text-center", children: [_jsx("p", { className: "text-destructive font-semibold", children: "Widget not found" }), _jsx("p", { className: "text-xs text-destructive/70 mt-1", children: widget.componentName })] }), !isReadOnly && (_jsx("button", { onClick: (e) => {
                        e.stopPropagation();
                        onRemove(layoutItem.i);
                    }, className: "absolute top-2 right-2 text-destructive/80 hover:text-destructive hover:bg-destructive/20 transition-all p-1.5 rounded-md", title: "Remove widget", children: _jsx(X, { className: "w-4 h-4" }) }))] }));
    }
    return (_jsxs("div", { className: "h-full w-full bg-card/80 backdrop-blur-sm border border-border/50 shadow-lg hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 overflow-hidden flex flex-col group relative", children: [!isReadOnly && (_jsx("button", { onClick: (e) => {
                    e.stopPropagation();
                    onRemove(layoutItem.i);
                }, className: "absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all p-1 rounded-md bg-background/50 backdrop-blur-sm z-20 border border-border/50", title: "Remove widget", children: _jsx(X, { className: "w-4 h-4" }) })), _jsx("div", { className: "flex-1 overflow-auto bg-gradient-to-br from-background/50 to-accent/5", children: WidgetComponent && (_jsx(WidgetComponent, { ...(widget.defaultProps || {}), title: widget.name, darkMode: theme === "dark" })) })] }));
}
