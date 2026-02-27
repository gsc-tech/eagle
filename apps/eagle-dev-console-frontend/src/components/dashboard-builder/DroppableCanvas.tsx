import { useState, useCallback, useMemo, useEffect } from "react";

import { useDrop } from "react-dnd";
import ReactGridLayout, { useContainerWidth } from "react-grid-layout";
import { verticalCompactor } from "react-grid-layout/core";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import type { DragItem, LayoutItem } from "./types";
import {
    WIDGET_DRAG_TYPE,
    DEFAULT_WIDGET_WIDTH,
    DEFAULT_WIDGET_HEIGHT,
    GRID_COLS,
    GRID_ROW_HEIGHT,
    GRID_MARGIN,
} from "./types";
import WidgetRenderer from "./WidgetRenderer";
import type { Layout } from "react-grid-layout";

interface DroppableCanvasProps {
    onLayoutChange?: (layout: LayoutItem[]) => void;
    initialLayout?: LayoutItem[];
}

export default function DroppableCanvas({ onLayoutChange, initialLayout }: DroppableCanvasProps) {
    const [layoutItems, setLayoutItems] = useState<LayoutItem[]>(initialLayout || []);

    const { width, containerRef, mounted } = useContainerWidth({
        measureBeforeMount: false,
        initialWidth: 1280,
    });

    // Convert LayoutItem[] to react-grid-layout's Layout format
    const gridLayout: Layout = useMemo(() => {
        return layoutItems.map((item) => ({
            i: item.i,
            x: item.x,
            y: item.y,
            w: item.w,
            h: item.h,
            minW: item.minW,
            maxW: item.maxW,
            minH: item.minH,
            maxH: item.maxH,
            static: item.static,
        }));
    }, [layoutItems]);

    // Handle drop from sidebar
    const [{ isOver, canDrop }, drop] = useDrop(() => ({
        accept: WIDGET_DRAG_TYPE,
        drop: (item: DragItem, monitor) => {
            const offset = monitor.getClientOffset();
            if (!offset || !containerRef.current) return;

            // Generate unique ID for the widget instance
            const uniqueId = `${item.widget.componentName}-${Date.now()}`;

            // Get container bounds to calculate relative position
            const containerRect = containerRef.current.getBoundingClientRect();
            const relativeX = offset.x - containerRect.left;
            const relativeY = offset.y - containerRect.top;

            // Calculate grid position based on drop coordinates
            // Account for padding (24px = p-6) and margins
            const paddingLeft = 24;
            const paddingTop = 24;

            const gridX = relativeX - paddingLeft;
            const gridY = relativeY - paddingTop;

            // Convert pixel position to grid coordinates
            const colWidth = (width - (GRID_COLS - 1) * GRID_MARGIN[0]) / GRID_COLS;
            const x = Math.max(0, Math.min(GRID_COLS - DEFAULT_WIDGET_WIDTH, Math.floor(gridX / (colWidth + GRID_MARGIN[0]))));
            const y = Math.max(0, Math.floor(gridY / (GRID_ROW_HEIGHT + GRID_MARGIN[1])));

            const newItem: LayoutItem = {
                i: uniqueId,
                x,
                y,
                w: DEFAULT_WIDGET_WIDTH,
                h: DEFAULT_WIDGET_HEIGHT,
                widget: item.widget,
                minW: 2,
                minH: 2,
            };

            setLayoutItems((prev) => [...prev, newItem]);
        },
        collect: (monitor) => ({
            isOver: monitor.isOver(),
            canDrop: monitor.canDrop(),
        }),
    }), [width]);


    // Handle layout changes from react-grid-layout
    const handleLayoutChange = useCallback(
        (newLayout: Layout) => {
            // Update our layoutItems with new positions/sizes
            setLayoutItems((prev) =>
                prev.map((item) => {
                    const gridItem = newLayout.find((l) => l.i === item.i);
                    if (gridItem) {
                        return {
                            ...item,
                            x: gridItem.x,
                            y: gridItem.y,
                            w: gridItem.w,
                            h: gridItem.h,
                        };
                    }
                    return item;
                })
            );
        },
        []
    );

    // Keep parent in sync with local layout items
    useEffect(() => {
        onLayoutChange?.(layoutItems);
    }, [layoutItems, onLayoutChange]);


    // Handle widget removal
    const handleRemoveWidget = useCallback((id: string) => {
        setLayoutItems((prev) => prev.filter((item) => item.i !== id));
    }, []);

    // Combine refs for drop and container width
    const combinedRef = useCallback(
        (node: HTMLDivElement | null) => {
            drop(node);
            (containerRef as any).current = node;
        },
        [drop, containerRef]
    );

    return (
        <div
            ref={combinedRef}
            className={`
        h-full overflow-auto p-6 transition-colors
        [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar]:h-1.5
        [&::-webkit-scrollbar-track]:bg-transparent 
        [&::-webkit-scrollbar-thumb]:bg-muted-foreground/50 
        [&::-webkit-scrollbar-thumb]:rounded-full 
        hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/70
        ${isOver && canDrop ? "bg-primary/10" : "bg-background"}
      `}
        >
            {!mounted ? (
                <div className="h-full flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            ) : layoutItems.length === 0 ? (
                <div className="h-full border-2 border-dashed border-border rounded-lg flex items-center justify-center">
                    <div className="text-center">
                        <p className="text-muted-foreground text-lg mb-2">Canvas area - Drag widgets here</p>
                        <p className="text-muted-foreground text-sm">
                            {isOver && canDrop ? "Drop to add widget" : "Drag from the sidebar to get started"}
                        </p>
                    </div>
                </div>
            ) : (
                <ReactGridLayout
                    layout={gridLayout}
                    width={width}
                    onLayoutChange={handleLayoutChange}
                    gridConfig={{
                        cols: GRID_COLS,
                        rowHeight: GRID_ROW_HEIGHT,
                        margin: GRID_MARGIN,
                    }}
                    dragConfig={{
                        enabled: true,
                        handle: ".drag-handle",
                    }}
                    resizeConfig={{
                        enabled: true,
                        handles: ["se", "sw", "ne", "nw"],
                    }}
                    compactor={verticalCompactor}
                >
                    {layoutItems.map((item) => (
                        <div key={item.i}>
                            <WidgetRenderer layoutItem={item} onRemove={handleRemoveWidget} />
                        </div>
                    ))}

                </ReactGridLayout>
            )}

            {/* Drop indicator overlay */}
            {isOver && canDrop && layoutItems.length > 0 && (
                <div className="fixed inset-0 pointer-events-none bg-primary/10" />
            )}
        </div>
    );
}
