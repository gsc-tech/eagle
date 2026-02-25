"use client"

import React, { useEffect, useRef } from "react";
import type { BaseWidgetProps } from "../types";
import { WidgetContainer } from "../components/WidgetContainer";
import { useSheetStore } from "../store/sheetStore";

import { UniverSheetsCorePreset } from "@univerjs/preset-sheets-core";
import { createUniver, defaultTheme, greenTheme, LocaleType, merge } from "@univerjs/presets";
import "@univerjs/presets/lib/styles/preset-sheets-core.css";
import sheetsCoreEnUs from "@univerjs/presets/preset-sheets-core/locales/en-US";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SheetWidgetProps extends BaseWidgetProps {
    wsUrl?: string;
    sheetName?: string;
    wsColumnMapping?: Record<string, string>; // Maps a WS data key to a Column key (e.g. { "positions": "Symbol" })
}


interface WsMessage {
    ts: number;
    data: Record<string, number[]>; // e.g. { "positions": [...], "key2": [...] }
}


/** Convert 0-based column index to A1-style letter(s). */
function colLetter(index: number): string {
    let letter = "";
    let n = index;
    do {
        letter = String.fromCharCode(65 + (n % 26)) + letter;
        n = Math.floor(n / 26) - 1;
    } while (n >= 0);
    return letter;
}

/** Write a numeric array column into the active Univer sheet using the mapped key. */
function writeDataToSheet(univerAPI: any, targetColKey: string, dataArray: number[]): void {
    try {
        const workbook = univerAPI.getActiveWorkbook();
        if (!workbook) return;

        const sheet = workbook.getActiveSheet();
        if (!sheet) return;

        const sheetSnapshot = sheet.getSheet().getSnapshot();
        console.log("sheetSnashot is", sheetSnapshot);

        const sheetName = sheetSnapshot.name ? sheetSnapshot.name : "Sheet1";

        // Find existing column by targetColKey in the header row (row 0)
        let totalCols = sheetSnapshot.columnCount;
        let targetColIdx = -1;

        // Scan the first row to find the matching header
        for (let c = 0; c < totalCols; c++) {
            const headerVal = sheet.getRange(`${colLetter(c)}1`)?.getValue();
            if (headerVal === targetColKey) {
                targetColIdx = c;
                break;
            } else if (headerVal == null || headerVal === '') {
                // We reached the end of headers, let's create it here if not found.
                if (targetColIdx === -1) {
                    targetColIdx = c;
                    sheet.getRange(`${colLetter(c)}1`)?.setValue(targetColKey);
                }
                break;
            }
        }

        if (targetColIdx === -1) {
            targetColIdx = 0; // Fallback
        }

        const updates: { row: number, col: number, value: any }[] = [];

        // Data rows start at row 1 (0-indexed array)
        const values2D: any[] = [];
        for (let i = 0; i < dataArray.length; i++) {
            const rowIndex = i + 1;
            const val = dataArray[i];

            values2D.push([{ v: val }]);
            updates.push({ row: rowIndex, col: targetColIdx, value: val });
        }

        const targetColStr = colLetter(targetColIdx);
        const range = sheet.getRange(`${targetColStr}2:${targetColStr}${dataArray.length + 1}`);
        if (range && typeof range.setValues === "function") {
            range.setValues(values2D);
        } else {
            // Fallback for older API versions
            for (let i = 0; i < dataArray.length; i++) {
                sheet.getRange(`${targetColStr}${i + 2}`)?.setValue(dataArray[i]);
            }
        }

        if (updates.length > 0) {
            useSheetStore.getState().updateCells(sheetName, updates);
        }
    } catch (err) {
        console.error("[SheetWidget] Failed to write data to sheet:", err);
    }
}

// ─── Component ────────────────────────────────────────────────────────────────

export const SheetWidget: React.FC<SheetWidgetProps> = ({
    title = "Positions Sheet",
    darkMode = false,
    sheetName = "Positions",
    wsUrl = "ws://192.168.0.25:8000/ws",
    wsColumnMapping = {}
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const univerRef = useRef<any>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ── Univer init ──────────────────────────────────────────────────────────
    useEffect(() => {
        if (!containerRef.current || univerRef.current) return;

        const { univerAPI } = createUniver({
            locale: LocaleType.EN_US,
            locales: {
                [LocaleType.EN_US]: merge({}, sheetsCoreEnUs),
            },
            theme: darkMode ? greenTheme : defaultTheme,
            presets: [
                UniverSheetsCorePreset({
                    container: containerRef.current,
                    header: true,
                }),
            ],
        });

        const workbook = univerAPI.createWorkbook({ name: "MyWorkbook" });
        const activeSheet = workbook.getActiveSheet();
        activeSheet.setName(sheetName);
        console.log("sheet snapshot at creation", activeSheet.getSheet().getSnapshot());
        univerRef.current = univerAPI;

        let editSubscription: any = null;
        if (univerAPI.Event && univerAPI.Event.SheetEditEnded) {
            editSubscription = univerAPI.addEvent(univerAPI.Event.SheetEditEnded, (params: any) => {
                const { worksheet, row, column } = params;
                // row and column from Univer are 0-indexed
                const cellRef = `${colLetter(column)}${row + 1}`;
                let value = undefined;
                try {
                    value = worksheet.getRange(cellRef)?.getValue();
                } catch (e) {
                    console.error("[SheetWidget] Error getting cell value:", e);
                }
                console.log("sheet name in callback function", sheetName);
                useSheetStore.getState().updateCell(sheetName, row, column, value);
            });
        }

        return () => {
            if (editSubscription && typeof editSubscription.dispose === 'function') {
                editSubscription.dispose();
            }
            univerAPI.dispose();
            univerRef.current = null;
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // ── WebSocket connection ─────────────────────────────────────────────────
    useEffect(() => {
        if (!wsUrl) return;

        let alive = true;

        const connect = () => {
            if (!alive) return;

            console.log(`[SheetWidget] Connecting to ${wsUrl}…`);
            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.onopen = () => {
                console.log("[SheetWidget] WebSocket connected.");
            };

            ws.onmessage = (event: MessageEvent) => {
                try {
                    const msg: WsMessage = JSON.parse(event.data);

                    if (!msg.data) return;

                    // Wait until Univer is ready before writing
                    if (!univerRef.current) return;

                    // The developer passes wsColumnMapping, e.g. { "positions": "Symbol" }
                    // We check our mapping to see if 'data' has keys we care about
                    Object.keys(msg.data).forEach(wsKey => {
                        const targetColKey = wsColumnMapping[wsKey];
                        if (targetColKey && Array.isArray(msg.data[wsKey])) {
                            // Write this column array directly to the matching header column.
                            writeDataToSheet(univerRef.current, targetColKey, msg.data[wsKey]);
                        }
                    });

                } catch (err) {
                    console.error("[SheetWidget] WS parse error:", err);
                }
            };

            ws.onerror = (e) => {
                console.warn("[SheetWidget] WebSocket error:", e);
            };

            ws.onclose = () => {
                wsRef.current = null;
                if (alive) {
                    console.log("[SheetWidget] WebSocket closed. Reconnecting in 3 s…");
                    reconnectRef.current = setTimeout(connect, 3000);
                }
            };
        };

        connect();

        return () => {
            alive = false;
            if (reconnectRef.current) clearTimeout(reconnectRef.current);
            if (wsRef.current) {
                wsRef.current.onclose = null; // prevent reconnect loop on unmount
                wsRef.current.close();
                wsRef.current = null;
            }
        };
    }, [wsUrl]);

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <WidgetContainer title={title} darkMode={darkMode}>
            <div ref={containerRef} className="h-full w-full" />
        </WidgetContainer>
    );
};

export const SheetWidgetDef = {
    component: SheetWidget,
};