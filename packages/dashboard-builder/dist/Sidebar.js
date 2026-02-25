import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useDrag } from "react-dnd";
import { ChevronDown, ChevronRight, GripVertical, WifiOff, RefreshCw } from "lucide-react";
import { WIDGET_DRAG_TYPE } from "./types";
import { useState, useMemo } from "react";
const DraggableWidget = ({ widget, widgetId }) => {
    const widgetWithId = { ...widget, widgetId };
    const [{ isDragging }, drag] = useDrag(() => ({
        type: WIDGET_DRAG_TYPE,
        item: { widget: widgetWithId },
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
    }));
    return (_jsxs("div", { ref: drag, className: `
        group relative p-4 mb-3 bg-card border border-border rounded-lg 
        cursor-grab active:cursor-grabbing transition-all duration-200
        hover:shadow-md hover:border-primary
        ${isDragging ? "opacity-50 scale-95" : "opacity-100 scale-100"}
      `, children: [_jsxs("div", { className: "flex items-start gap-3", children: [_jsx("div", { className: "mt-1 text-muted-foreground group-hover:text-primary transition-colors", children: _jsx(GripVertical, { className: "w-5 h-5" }) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("h3", { className: "text-sm font-semibold text-foreground truncate", children: widget.name }), _jsx("div", { className: "mt-2", children: _jsx("span", { className: "inline-block px-2 py-1 text-xs font-medium text-primary bg-primary/10 rounded", children: widget.componentName }) })] })] }), isDragging && (_jsx("div", { className: "absolute inset-0 bg-primary/10 rounded-lg pointer-events-none" }))] }));
};
export default function WidgetSidebar({ widgetGroups, loading, onRefreshBackend }) {
    const [expandedBackends, setExpandedBackends] = useState({});
    const [refreshingBackends, setRefreshingBackends] = useState({});
    const toggleBackend = (backendName) => {
        setExpandedBackends(prev => ({
            ...prev,
            [backendName]: !prev[backendName]
        }));
    };
    const handleRefresh = async (e, backendName) => {
        e.stopPropagation();
        if (onRefreshBackend) {
            setRefreshingBackends(prev => ({ ...prev, [backendName]: true }));
            await onRefreshBackend(backendName);
            setRefreshingBackends(prev => ({ ...prev, [backendName]: false }));
        }
    };
    // Initialize all backends as collapsed
    useMemo(() => {
        const initialExpanded = {};
        Object.keys(widgetGroups).forEach(backend => {
            initialExpanded[backend] = false;
        });
        setExpandedBackends(initialExpanded);
    }, [widgetGroups]);
    const totalWidgets = Object.values(widgetGroups).reduce((acc, group) => acc + group.widgets.length, 0);
    return (_jsxs("div", { className: "w-80 bg-muted/30 border-r border-border flex flex-col h-full", children: [_jsxs("div", { className: "p-4 bg-card border-b border-border", children: [_jsx("h2", { className: "text-lg font-semibold text-foreground", children: "Widget List" }), _jsx("p", { className: "text-xs text-muted-foreground mt-1", children: "Drag widgets to the canvas" })] }), _jsx("div", { className: "flex-1 overflow-y-auto min-h-0 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-muted-foreground/50 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/70 transition-colors", children: _jsx("div", { className: "p-4", children: loading ? (_jsx("div", { className: "flex items-center justify-center h-32", children: _jsx("div", { className: "animate-spin rounded-full h-8 w-8 border-b-2 border-primary" }) })) : totalWidgets === 0 ? (_jsx("div", { className: "text-center py-8", children: _jsx("p", { className: "text-sm text-muted-foreground", children: "No widgets available" }) })) : (_jsx("div", { className: "space-y-4", children: Object.entries(widgetGroups).map(([backendName, groupData]) => (_jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: `w-full flex items-center gap-2 p-2 rounded-lg transition-colors group ${groupData.isConnected
                                        ? "hover:bg-accent/50"
                                        : "hover:bg-destructive/10 opacity-70"}`, children: [_jsxs("button", { onClick: () => toggleBackend(backendName), className: "flex-1 flex items-center gap-2 text-left", children: [_jsx("div", { className: `p-1 rounded transition-colors ${groupData.isConnected
                                                        ? "bg-primary/10 group-hover:bg-primary/20"
                                                        : "bg-destructive/10 group-hover:bg-destructive/20"}`, children: expandedBackends[backendName] ? (_jsx(ChevronDown, { className: `h-4 w-4 ${groupData.isConnected ? "text-primary" : "text-destructive"}` })) : (_jsx(ChevronRight, { className: `h-4 w-4 ${groupData.isConnected ? "text-primary" : "text-destructive"}` })) }), _jsx("span", { className: `font-semibold text-sm text-left ${groupData.isConnected ? "text-foreground" : "text-muted-foreground"}`, children: backendName })] }), onRefreshBackend && (_jsx("button", { onClick: (e) => handleRefresh(e, backendName), className: `p-1.5 rounded-md transition-all hover:bg-background shadow-sm ${refreshingBackends[backendName] ? "animate-spin text-primary" : "text-muted-foreground hover:text-foreground"}`, title: "Refresh Backend", children: _jsx(RefreshCw, { className: "h-3.5 w-3.5" }) })), !groupData.isConnected && (_jsx("div", { className: "flex items-center gap-1 px-2 py-0.5 rounded-full bg-destructive/20", children: _jsx(WifiOff, { className: "h-3 w-3 text-destructive" }) })), _jsx("span", { className: `text-xs px-2 py-0.5 rounded-full ${groupData.isConnected
                                                ? "text-muted-foreground bg-muted"
                                                : "text-destructive bg-destructive/10"}`, children: groupData.widgets.length })] }), expandedBackends[backendName] && (_jsx("div", { className: "pl-2", children: groupData.widgets.map((widgetInfo, index) => (_jsx(DraggableWidget, { widget: {
                                            name: widgetInfo.name,
                                            componentName: widgetInfo.componentName,
                                            defaultProps: widgetInfo.defaultProps,
                                        }, widgetId: widgetInfo.widgetId }, `${widgetInfo.componentName}-${index}`))) }))] }, backendName))) })) }) }), _jsx("div", { className: "p-4 bg-card border-t border-border", children: _jsxs("div", { className: "text-xs text-muted-foreground text-center", children: [totalWidgets, " widget", totalWidgets !== 1 ? "s" : "", " available"] }) })] }));
}
