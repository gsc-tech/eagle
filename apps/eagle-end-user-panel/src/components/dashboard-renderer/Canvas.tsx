import { useState, useCallback, useMemo, useEffect } from "react";
import ReactGridLayout, { useContainerWidth } from "react-grid-layout";
import { verticalCompactor } from "react-grid-layout/core";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import type { LayoutItem } from "./types";
import { GRID_COLS, GRID_ROW_HEIGHT, GRID_MARGIN } from "./types";
import WidgetRenderer from "./WidgetRenderer";
import type { Layout } from "react-grid-layout";
import { useGroupedParamsStore } from "@/store/groupedParamsStore";

interface DashboardCanvasProps {
    onLayoutChange?: (layout: LayoutItem[]) => void;
    initialLayout?: LayoutItem[];
}

export default function DashboardCanvas({
    onLayoutChange,
    initialLayout,
}: DashboardCanvasProps) {
    const [layoutItems, setLayoutItems] = useState<LayoutItem[]>(
        initialLayout || []
    );
    const { width, containerRef, mounted } = useContainerWidth({
        measureBeforeMount: false,
        initialWidth: 1280,
    });

    // Reset grouped params whenever a new dashboard/tab is loaded
    const reset = useGroupedParamsStore((s) => s.reset);
    useEffect(() => {
        reset();
    }, [initialLayout, reset]);

    // Update layout items when initialLayout prop changes
    useEffect(() => {
        if (initialLayout) {
            setLayoutItems(initialLayout);
        }
    }, [initialLayout]);

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

    // Handle layout changes from react-grid-layout
    const handleLayoutChange = useCallback(
        (newLayout: Layout) => {
            const updatedItems = layoutItems.map((item) => {
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
            });

            setLayoutItems(updatedItems);
            onLayoutChange?.(updatedItems);
        },
        [layoutItems, onLayoutChange]
    );

    return (
        <div
            ref={containerRef}
            className={`
        h-full w-full overflow-auto p-6 transition-colors
        [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar]:h-1.5
        [&::-webkit-scrollbar-track]:bg-transparent 
        [&::-webkit-scrollbar-thumb]:bg-muted-foreground/50 
        [&::-webkit-scrollbar-thumb]:rounded-full 
        hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/70
        bg-background
      `}
        >
            {!mounted ? (
                <div className="h-full flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            ) : layoutItems.length === 0 ? (
                <div className="h-full border-2 border-dashed border-border rounded-lg flex items-center justify-center">
                    <div className="text-center">
                        <p className="text-muted-foreground text-lg mb-2">
                            No widgets to display
                        </p>
                        <p className="text-muted-foreground text-sm">
                            This dashboard is empty
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
                            <WidgetRenderer layoutItem={item} />
                        </div>
                    ))}
                </ReactGridLayout>
            )}
        </div>
    );
}
