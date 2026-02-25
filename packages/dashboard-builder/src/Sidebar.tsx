import { useDrag } from "react-dnd";
import { ChevronDown, ChevronRight, GripVertical, WifiOff, RefreshCw } from "lucide-react";
import { WIDGET_DRAG_TYPE, type BackendWidgetConfig, type widgetGroupWithStatus, type widgetInfo } from "./types";
import { useState, useMemo } from "react";

interface WidgetSidebarProps {
    widgetGroups: widgetGroupWithStatus;
    loading: boolean;
    onRefreshBackend?: (backendName: string) => void;
}

interface DraggableWidgetProps {
    widget: BackendWidgetConfig;
    widgetId: string;
}

const DraggableWidget = ({ widget, widgetId }: DraggableWidgetProps) => {
    const widgetWithId = { ...widget, widgetId };

    const [{ isDragging }, drag] = useDrag(() => ({
        type: WIDGET_DRAG_TYPE,
        item: { widget: widgetWithId },
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
    }));

    return (
        <div
            ref={drag as any}
            className={`
        group relative p-4 mb-3 bg-card border border-border rounded-lg 
        cursor-grab active:cursor-grabbing transition-all duration-200
        hover:shadow-md hover:border-primary
        ${isDragging ? "opacity-50 scale-95" : "opacity-100 scale-100"}
      `}
        >
            <div className="flex items-start gap-3">
                <div className="mt-1 text-muted-foreground group-hover:text-primary transition-colors">
                    <GripVertical className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-foreground truncate">
                        {widget.name}
                    </h3>
                    {/* {widget.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {widget.description}
                        </p>
                    )} */}
                    <div className="mt-2">
                        <span className="inline-block px-2 py-1 text-xs font-medium text-primary bg-primary/10 rounded">
                            {widget.componentName}
                        </span>
                    </div>
                </div>
            </div>

            {/* Drag indicator overlay */}
            {isDragging && (
                <div className="absolute inset-0 bg-primary/10 rounded-lg pointer-events-none" />
            )}
        </div>
    );
};

export default function WidgetSidebar({ widgetGroups, loading, onRefreshBackend }: WidgetSidebarProps) {
    const [expandedBackends, setExpandedBackends] = useState<Record<string, boolean>>({});
    const [refreshingBackends, setRefreshingBackends] = useState<Record<string, boolean>>({});

    const toggleBackend = (backendName: string) => {
        setExpandedBackends(prev => ({
            ...prev,
            [backendName]: !prev[backendName]
        }));
    };

    const handleRefresh = async (e: React.MouseEvent, backendName: string) => {
        e.stopPropagation();
        if (onRefreshBackend) {
            setRefreshingBackends(prev => ({ ...prev, [backendName]: true }));
            await onRefreshBackend(backendName);
            setRefreshingBackends(prev => ({ ...prev, [backendName]: false }));
        }
    };

    // Initialize all backends as collapsed
    useMemo(() => {
        const initialExpanded: Record<string, boolean> = {};
        Object.keys(widgetGroups).forEach(backend => {
            initialExpanded[backend] = false;
        });
        setExpandedBackends(initialExpanded);
    }, [widgetGroups]);

    const totalWidgets = Object.values(widgetGroups).reduce((acc, group) => acc + group.widgets.length, 0);

    return (
        <div className="w-80 bg-muted/30 border-r border-border flex flex-col h-full">
            {/* Sidebar Header */}
            <div className="p-4 bg-card border-b border-border">
                <h2 className="text-lg font-semibold text-foreground">Widget List</h2>
                <p className="text-xs text-muted-foreground mt-1">
                    Drag widgets to the canvas
                </p>
            </div>

            {/* Widget List */}
            <div className="flex-1 overflow-y-auto min-h-0 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-muted-foreground/50 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/70 transition-colors">
                <div className="p-4">
                    {loading ? (
                        <div className="flex items-center justify-center h-32">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    ) : totalWidgets === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-sm text-muted-foreground">No widgets available</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {Object.entries(widgetGroups).map(([backendName, groupData]) => (
                                <div key={backendName} className="space-y-2">
                                    {/* Backend Header */}
                                    <div
                                        className={`w-full flex items-center gap-2 p-2 rounded-lg transition-colors group ${groupData.isConnected
                                            ? "hover:bg-accent/50"
                                            : "hover:bg-destructive/10 opacity-70"
                                            }`}
                                    >
                                        <button
                                            onClick={() => toggleBackend(backendName)}
                                            className="flex-1 flex items-center gap-2 text-left"
                                        >
                                            <div className={`p-1 rounded transition-colors ${groupData.isConnected
                                                ? "bg-primary/10 group-hover:bg-primary/20"
                                                : "bg-destructive/10 group-hover:bg-destructive/20"
                                                }`}>
                                                {expandedBackends[backendName] ? (
                                                    <ChevronDown className={`h-4 w-4 ${groupData.isConnected ? "text-primary" : "text-destructive"}`} />
                                                ) : (
                                                    <ChevronRight className={`h-4 w-4 ${groupData.isConnected ? "text-primary" : "text-destructive"}`} />
                                                )}
                                            </div>
                                            <span className={`font-semibold text-sm text-left ${groupData.isConnected ? "text-foreground" : "text-muted-foreground"
                                                }`}>
                                                {backendName}
                                            </span>
                                        </button>

                                        {/* Refresh Button */}
                                        {onRefreshBackend && (
                                            <button
                                                onClick={(e) => handleRefresh(e, backendName)}
                                                className={`p-1.5 rounded-md transition-all hover:bg-background shadow-sm ${refreshingBackends[backendName] ? "animate-spin text-primary" : "text-muted-foreground hover:text-foreground"
                                                    }`}
                                                title="Refresh Backend"
                                            >
                                                <RefreshCw className="h-3.5 w-3.5" />
                                            </button>
                                        )}

                                        {!groupData.isConnected && (
                                            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-destructive/20">
                                                <WifiOff className="h-3 w-3 text-destructive" />
                                                {/* <span className="text-xs text-destructive font-medium">Disconnected</span> */}
                                            </div>
                                        )}
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${groupData.isConnected
                                            ? "text-muted-foreground bg-muted"
                                            : "text-destructive bg-destructive/10"
                                            }`}>
                                            {groupData.widgets.length}
                                        </span>
                                    </div>

                                    {/* Backend Widgets */}
                                    {expandedBackends[backendName] && (
                                        <div className="pl-2">
                                            {groupData.widgets.map((widgetInfo: widgetInfo, index: number) => (
                                                <DraggableWidget
                                                    key={`${widgetInfo.componentName}-${index}`}
                                                    widget={{
                                                        name: widgetInfo.name,
                                                        componentName: widgetInfo.componentName,
                                                        defaultProps: widgetInfo.defaultProps,
                                                    }}
                                                    widgetId={widgetInfo.widgetId}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>
            {/* Sidebar Footer */}
            <div className="p-4 bg-card border-t border-border">
                <div className="text-xs text-muted-foreground text-center">
                    {totalWidgets} widget{totalWidgets !== 1 ? "s" : ""} available
                </div>
            </div>
        </div>
    );
}
