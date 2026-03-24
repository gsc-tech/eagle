import { useState, useCallback, useMemo, useEffect, useRef } from "react";
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
    workbookSnapshots?: Record<string, Record<string, any>>;
    onSaveWorkbook?: (widgetId: string, snapshot: Record<string, any>, parameters?: any[]) => void;
}

const MINIMIZED_H = 1;

function ExpandIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
            <polyline points="9 21 3 21 3 15" /><line x1="14" y1="10" x2="3" y2="21" />
        </svg>
    );
}

function CompressIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="4 14 10 14 10 20" /><line x1="3" y1="21" x2="10" y2="14" />
            <polyline points="20 10 14 10 14 4" /><line x1="21" y1="3" x2="14" y2="10" />
        </svg>
    );
}

export default function DashboardCanvas({
    onLayoutChange,
    initialLayout,
    workbookSnapshots,
    onSaveWorkbook,
}: DashboardCanvasProps) {
    const [layoutItems, setLayoutItems] = useState<LayoutItem[]>(initialLayout || []);

    // Track theme for dark-mode-aware hover colours
    const [isDark, setIsDark] = useState(() => (localStorage.getItem("theme") || "dark") === "dark");
    useEffect(() => {
        const sync = () => setIsDark((localStorage.getItem("theme") || "dark") === "dark");
        window.addEventListener("storage", sync);
        window.addEventListener("theme-change", sync);
        return () => { window.removeEventListener("storage", sync); window.removeEventListener("theme-change", sync); };
    }, []);

    /** key = widget id, value = original h before minimizing */
    const [savedHeights, setSavedHeights] = useState<Record<string, number>>({});

    /**
     * Measured header pixel heights per widget (queried from the DOM at minimize-time).
     * This handles both simple-title widgets and parameter-heavy widgets accurately.
     */
    const [clipHeights, setClipHeights] = useState<Record<string, number>>({});

    /**
     * Refs to the INNER wrapper divs (not the RGL outer div).
     * RGL injects its own `height` style into our <div key={item.i}> outer div,
     * which would override our clip height. We use an inner div that RGL doesn't touch.
     */
    const innerRefs = useRef<Record<string, HTMLDivElement | null>>({});

    /** Prevents circular layout propagation when minimizing/restoring. */
    const suppressLayoutPropagation = useRef(false);

    const { width, containerRef, mounted } = useContainerWidth({ measureBeforeMount: false, initialWidth: 1280 });
    const reset = useGroupedParamsStore((s) => s.reset);

    useEffect(() => { reset(); }, [initialLayout, reset]);

    useEffect(() => {
        if (initialLayout) setLayoutItems(initialLayout);
    }, [initialLayout]);

    const toggleMinimize = useCallback((id: string) => {
        const isMinimized = id in savedHeights;
        suppressLayoutPropagation.current = true;

        if (isMinimized) {
            // ── Restore ────────────────────────────────────────────────────
            const originalH = savedHeights[id];
            setSavedHeights((prev) => { const n = { ...prev }; delete n[id]; return n; });
            setLayoutItems((prev) => prev.map((item) => item.i === id ? { ...item, h: originalH } : item));
        } else {
            // ── Minimize: measure actual header height from the DOM ─────────
            const inner = innerRefs.current[id];
            let headerPx = 44; // safe fallback (handles params row)
            if (inner) {
                // The drag-handle's direct parent is the `shrink-0` header container
                const dragHandle = inner.querySelector(".drag-handle");
                if (dragHandle?.parentElement) {
                    headerPx = Math.ceil(dragHandle.parentElement.getBoundingClientRect().height) + 2;
                }
            }
            setClipHeights((prev) => ({ ...prev, [id]: headerPx }));

            const originalH = layoutItems.find((item) => item.i === id)?.h ?? 4;
            setSavedHeights((prev) => ({ ...prev, [id]: originalH }));
            setLayoutItems((prev) => prev.map((item) => item.i === id ? { ...item, h: MINIMIZED_H } : item));
        }
    }, [layoutItems, savedHeights]);

    const gridLayout: Layout = useMemo(() =>
        layoutItems.map((item) => {
            const isMinimized = item.i in savedHeights;
            return {
                i: item.i, x: item.x, y: item.y, w: item.w, h: item.h,
                minW: item.minW, maxW: item.maxW,
                minH: isMinimized ? MINIMIZED_H : item.minH,
                maxH: isMinimized ? MINIMIZED_H : item.maxH,
                static: item.static,
            };
        }),
        [layoutItems, savedHeights]
    );

    const handleLayoutChange = useCallback((newLayout: Layout) => {
        const updatedItems = layoutItems.map((item) => {
            const g = newLayout.find((l) => l.i === item.i);
            return g ? { ...item, x: g.x, y: g.y, w: g.w, h: g.h } : item;
        });
        setLayoutItems(updatedItems);
        if (suppressLayoutPropagation.current) {
            suppressLayoutPropagation.current = false;
            return;
        }
        onLayoutChange?.(updatedItems);
    }, [layoutItems, onLayoutChange]);

    return (
        <div
            ref={containerRef}
            className="h-full w-full overflow-auto p-6 transition-colors bg-background
                [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar]:h-1.5
                [&::-webkit-scrollbar-track]:bg-transparent
                [&::-webkit-scrollbar-thumb]:bg-muted-foreground/50
                [&::-webkit-scrollbar-thumb]:rounded-full
                hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/70"
        >
            {!mounted ? (
                <div className="h-full flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
            ) : layoutItems.length === 0 ? (
                <div className="h-full border-2 border-dashed border-border rounded-lg flex items-center justify-center">
                    <div className="text-center">
                        <p className="text-muted-foreground text-lg mb-2">No widgets to display</p>
                        <p className="text-muted-foreground text-sm">This dashboard is empty</p>
                    </div>
                </div>
            ) : (
                <ReactGridLayout
                    layout={gridLayout} width={width}
                    onLayoutChange={handleLayoutChange}
                    gridConfig={{ cols: GRID_COLS, rowHeight: GRID_ROW_HEIGHT, margin: GRID_MARGIN }}
                    dragConfig={{ enabled: true, handle: ".drag-handle" }}
                    resizeConfig={{ enabled: true, handles: ["se", "sw", "ne", "nw"] }}
                    compactor={verticalCompactor}
                >
                    {layoutItems.map((item) => {
                        const isMinimized = item.i in savedHeights;
                        const clipH = clipHeights[item.i] ?? 44;

                        return (
                            /*
                             * OUTER div — RGL injects its own height style here.
                             * Never apply clip styles here; RGL will override them.
                             */
                            <div key={item.i}>
                                {/*
                                 * INNER div — RGL doesn't touch this one.
                                 * We use it for the clip. When minimized:
                                 *   height = measured header height (px)
                                 *   overflow = hidden  → content is fully hidden
                                 * When normal:
                                 *   height = 100%  → fills the RGL slot
                                 */}
                                <div
                                    ref={(el) => { innerRefs.current[item.i] = el; }}
                                    style={{
                                        position: "relative",
                                        width: "100%",
                                        height: isMinimized ? clipH : "100%",
                                        overflow: isMinimized ? "hidden" : undefined,
                                    }}
                                >
                                    {/* Minimize / Restore button */}
                                    <button
                                        title={isMinimized ? "Restore widget" : "Minimize widget"}
                                        onClick={(e) => { e.stopPropagation(); toggleMinimize(item.i); }}
                                        style={{
                                            position: "absolute", top: 10, right: 10, zIndex: 20,
                                            display: "inline-flex", alignItems: "center", justifyContent: "center",
                                            width: 22, height: 22, padding: 0, border: "none", borderRadius: 4,
                                            background: "transparent", cursor: "pointer",
                                            color: isDark ? "rgba(156,163,175,0.85)" : "rgba(107,114,128,0.8)",
                                            transition: "background 0.15s, color 0.15s",
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.07)";
                                            e.currentTarget.style.color = isDark ? "#f9fafb" : "#111827";
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = "transparent";
                                            e.currentTarget.style.color = isDark ? "rgba(156,163,175,0.85)" : "rgba(107,114,128,0.8)";
                                        }}
                                    >
                                        {isMinimized ? <ExpandIcon /> : <CompressIcon />}
                                    </button>

                                    <WidgetRenderer
                                        layoutItem={item}
                                        initialWorkbookData={workbookSnapshots?.[item.i]}
                                        onSaveWorkbook={onSaveWorkbook}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </ReactGridLayout>
            )}
        </div>
    );
}
