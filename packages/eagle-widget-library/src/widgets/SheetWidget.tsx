"use client"

import React, { useEffect, useRef, useState, useCallback } from "react";
import ReactDOM from "react-dom";
import type { BaseWidgetProps } from "../types";
import { WidgetContainer } from "../components/WidgetContainer";
import { InsertSheetModal } from "../components/InsertSheetModal";
import { useSheetStore } from "../store/sheetStore";
import { UniverSheetsCorePreset } from "@univerjs/preset-sheets-core";
import { InsertSheetCommand } from "@univerjs/preset-sheets-core";
import { createUniver, defaultTheme, greenTheme, LocaleType, merge } from "@univerjs/presets";
import "@univerjs/presets/lib/styles/preset-sheets-core.css";
import sheetsCoreEnUs from "@univerjs/presets/preset-sheets-core/locales/en-US";
import sheetData from "../../sheetData.json";
import { buildProductSheet } from "../utils/sheetBuilder";

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

const MONTH_CODE_TO_NAME: Record<string, string> = {
    F: "Jan", G: "Feb", H: "Mar", J: "Apr", K: "May", M: "Jun",
    N: "Jul", Q: "Aug", U: "Sep", V: "Oct", X: "Nov", Z: "Dec",
};

/**
 * Parse an incoming WebSocket symbol into its product and label.
 * Example: "CLH26" -> { product: "CL", label: "MAR26" }
 */
function parseSymbol(symbol: string): { product: string; label: string } | null {
    const match = symbol.match(/^([A-Z]+)([FGHJKMNQUVXZ])(\d{2})$/i);
    if (!match) return null;
    const [, product, monthCode, year] = match;
    const month = MONTH_CODE_TO_NAME[monthCode.toUpperCase()];
    if (!month) return null;
    return { product: product.toUpperCase(), label: `${month}${year}`.toUpperCase() };
}

// ─── Component ────────────────────────────────────────────────────────────────

export const SheetWidget: React.FC<SheetWidgetProps> = ({
    title = "Positions Sheet",
    darkMode = false,
    sheetName = "Positions",
    wsUrl = "ws://localhost:8000/ws",
    wsColumnMapping = {}
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const univerRef = useRef<any>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ── Modal state ───────────────────────────────────────────────────────────
    const [modalOpen, setModalOpen] = useState(false);
    const [modalLoading, setModalLoading] = useState(false);
    const [modalError, setModalError] = useState<string | null>(null);

    // Keep a ref so the Univer event handler (which closes over this callback)
    // always has access to the latest handler.
    const openModalRef = useRef<() => void>(() => setModalOpen(true));

    // Flag to bypass the InsertSheetCommand intercept when we're creating a
    // sheet programmatically (workbook.create() fires InsertSheetCommand too).
    const isProgrammaticInsertRef = useRef(false);
    useEffect(() => {
        openModalRef.current = () => {
            setModalError(null);
            setModalOpen(true);
        };
    });



    // ── Univer init ──────────────────────────────────────────────────────────
    useEffect(() => {
        const container = containerRef.current;
        if (!container || univerRef.current) return;

        let isCancelled = false;

        async function initUniver() {
            try {
                // Fetch template sheet for RB
                const { sheetId, sheetSnapshot } = await buildProductSheet("RB");

                // console.log(sheetSnapshot);
                sheetSnapshot[sheetId].name = "RB";

                if (isCancelled) return;

                const { univerAPI } = createUniver({
                    locale: LocaleType.EN_US,
                    locales: {
                        [LocaleType.EN_US]: merge({}, sheetsCoreEnUs),
                    },
                    theme: darkMode ? greenTheme : defaultTheme,
                    presets: [
                        UniverSheetsCorePreset({
                            container: container!,
                            header: true,
                        }),
                    ],
                });

                // Set up the workbook data with our new sheet but existing styles
                const workbookData = {
                    ...(sheetData as any),
                    id: "workbook-01",
                    sheets: sheetSnapshot,
                    sheetOrder: [sheetId],
                    name: "Universheet",
                };

                const workbook = univerAPI.createWorkbook(workbookData);
                univerRef.current = univerAPI;

                // Sync initial setup explicitly to store immediately
                const fWorkbook = univerAPI.getActiveWorkbook();
                if (fWorkbook) {
                    const snapshot = fWorkbook.save();
                    const targetSheetObj = Object.values(snapshot.sheets).find((s: any) => s.name === "RB") as any;
                    if (targetSheetObj && targetSheetObj.cellData) {
                        useSheetStore.getState().setSheet("RB", targetSheetObj.cellData);
                    }
                }

                // ── Intercept InsertSheetCommand ──────────────────────────────────────
                const disposable = univerAPI.addEvent(univerAPI.Event.BeforeCommandExecute, (event: any) => {
                    const { id } = event;

                    if (id === InsertSheetCommand.id) {
                        // If WE triggered this programmatically, let it through.
                        if (isProgrammaticInsertRef.current) return;

                        // Otherwise cancel the native dialog and open our custom modal.
                        event.cancel = true;
                        openModalRef.current();
                        return;
                    }

                    // For all other commands, do nothing (they execute normally).
                });

                let editSubscription: any = null;
                if (univerAPI.Event && univerAPI.Event.SheetEditEnded) {
                    editSubscription = univerAPI.addEvent(univerAPI.Event.SheetEditEnded, (params: any) => {
                        console.log(params);
                        const { worksheet, row, column } = params;
                        const name = worksheet._worksheet._snapshot.name;
                        // row and column from Univer are 0-indexed
                        const cellRef = `${colLetter(column)}${row + 1}`;
                        let value = undefined;
                        try {
                            value = worksheet.getRange(cellRef)?.getValue();
                        } catch (e) {
                            console.error("[SheetWidget] Error getting cell value:", e);
                        }
                        const fWorkbook = univerRef.current.getActiveWorkbook();
                        const snapshot = fWorkbook.save();

                        // Grab the fully evaluated/saved snapshot for this specific sheet
                        const targetSheetObj = Object.values(snapshot.sheets).find((s: any) => s.name === name) as any;
                        if (targetSheetObj && targetSheetObj.cellData) {
                            useSheetStore.getState().setSheet(name, targetSheetObj.cellData);
                        }
                    });
                }

                return { disposable, editSubscription };

            } catch (err) {
                console.error("[SheetWidget] Failed to initialize univer:", err);
            }
        }

        const initPromise = initUniver();

        return () => {
            isCancelled = true;
            initPromise.then((res) => {
                if (res) {
                    if (res.editSubscription && typeof res.editSubscription.dispose === 'function') {
                        res.editSubscription.dispose();
                    }
                    if (res.disposable && typeof res.disposable.dispose === 'function') {
                        res.disposable.dispose();
                    }
                }
                if (univerRef.current) {
                    univerRef.current.dispose();
                    univerRef.current = null;
                }
            });
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // ── WebSocket ────────────────────────────────────────────────────────────

    const handleWsData = useCallback((data: Record<string, any>) => {
        const univerAPI = univerRef.current;
        if (!univerAPI) return;
        const workbook = univerAPI.getActiveWorkbook();
        if (!workbook) return;

        // Map WS values to structured updates by product -> label -> value
        const updatesByProduct = new Map<string, Map<string, any>>();
        for (const [symbol, value] of Object.entries(data)) {
            const parsed = parseSymbol(symbol);
            if (parsed) {
                if (!updatesByProduct.has(parsed.product)) {
                    updatesByProduct.set(parsed.product, new Map());
                }
                // If it's an empty string or nullish, treat as ""
                const cleanValue = value === "" || value == null ? "" : value;
                updatesByProduct.get(parsed.product)!.set(parsed.label, cleanValue);
            }
        }

        console.log("updates by products", updatesByProduct);

        if (updatesByProduct.size === 0) return;

        // Apply updates to any sheet that has matching rules
        const sheets = workbook.getSheets();
        for (const sheet of sheets) {
            let cellData: any;
            let sheetName = "";
            try {
                const sheetSnapshot = sheet.getSheet().getSnapshot();
                cellData = sheetSnapshot?.cellData;
                sheetName = sheetSnapshot?.name || "";
            } catch (err) {
                console.error("[SheetWidget] Failed to get sheet snapshot:", err);
                continue;
            }

            if (!cellData || !sheetName) continue;

            // Extract base product from sheet name (e.g., "CL(2)" -> "CL")
            const baseSheetName = sheetName.replace(/\(\d+\)$/, "").toUpperCase();

            const productUpdates = updatesByProduct.get(baseSheetName);
            if (!productUpdates) continue;

            console.log("product updates", productUpdates);

            let updatedAnyCell = false;

            // Iterate over the cell data to find the matching contract in Column 16 (Q)
            for (const rowIdxStr of Object.keys(cellData)) {
                const rowObj = cellData[rowIdxStr];
                if (!rowObj) continue;

                const cellQ = rowObj["16"]; // Column Q holds "Mar26"
                if (cellQ && cellQ.v && typeof cellQ.v === "string") {
                    const labelVal = String(cellQ.v).toUpperCase();
                    if (productUpdates.has(labelVal)) {
                        const newVal = productUpdates.get(labelVal);
                        const rowNum = parseInt(rowIdxStr, 10) + 1; // 1-indexed for A1 notation
                        // Update Column T (T is index 19)
                        sheet.getRange(`T${rowNum}`)?.setValue(newVal);

                        updatedAnyCell = true;
                    }
                }
            }

            if (updatedAnyCell) {
                // Propagate the ENTIRE updated sheet to the store (so dependents receive all recalculated formulas)
                const fWorkbook = univerAPI.getActiveWorkbook();
                const snapshot = fWorkbook.save();
                const targetSheetObj = Object.values(snapshot.sheets).find((s: any) => s.name === sheetName) as any;

                if (targetSheetObj && targetSheetObj.cellData) {
                    useSheetStore.getState().setSheet(sheetName, targetSheetObj.cellData);
                }
            }
        }
    }, []);

    useEffect(() => {
        if (!wsUrl) return;

        function connect() {
            const ws = new WebSocket(wsUrl!);
            wsRef.current = ws;

            ws.onopen = () => {
                console.log("[SheetWidget] WS connected:", wsUrl);
            };

            ws.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data);
                    if (msg.data && typeof msg.data === "object") {
                        console.log("[SheetWidget] WS data:", msg.data);
                        handleWsData(msg.data);
                    }
                } catch (err) {
                    console.error("[SheetWidget] WS message error:", err);
                }
            };

            ws.onclose = () => {
                console.log("[SheetWidget] WS closed. Reconnecting in 3s...");
                reconnectRef.current = setTimeout(connect, 3000);
            };

            ws.onerror = (err: Event) => {
                console.error("[SheetWidget] WS error. Check connection.");
            };
        }

        connect();

        return () => {
            if (reconnectRef.current) clearTimeout(reconnectRef.current);
            if (wsRef.current) {
                wsRef.current.onclose = null; // Prevent reconnect loop on unmount
                wsRef.current.close();
            }
        };
    }, [wsUrl, handleWsData]);

    // ── Modal handlers ────────────────────────────────────────────────────────

    const handleModalConfirm = useCallback(async (product: string) => {
        if (!univerRef.current) return;

        setModalLoading(true);
        setModalError(null);

        try {
            // 1. Fetch contracts + build sheet snapshot
            const { sheetId, sheetSnapshot } = await buildProductSheet(product);

            // 2. Get the workbook and insert the new sheet
            const workbook = univerRef.current.getActiveWorkbook();
            if (!workbook) throw new Error("No active workbook found");

            // Use Univer's addSheet API to add the sheet from a snapshot
            // The workbook exposes createSheet or we can use the command layer.
            const univerAPI = univerRef.current;

            // Merge the new sheet snapshot into the workbook snapshot and reload,
            // or use the Univer API to insert a sheet programmatically.
            //
            // Strategy: use the univerAPI to execute an InsertSheet command with
            // the pre-built snapshot data.  If the Univer version supports it,
            // we can pass the sheet config directly.
            const success = await insertSheetIntoWorkbook(univerAPI, product, sheetId, sheetSnapshot, isProgrammaticInsertRef);
            if (!success) {
                throw new Error("Failed to insert sheet into workbook");
            }

            setModalOpen(false);
        } catch (err: any) {
            console.error("[SheetWidget] Failed to build product sheet:", err);
            setModalError(err?.message ?? "Unknown error occurred");
        } finally {
            setModalLoading(false);
        }
    }, []);

    const handleModalCancel = useCallback(() => {
        if (modalLoading) return; // Don't close while loading
        setModalOpen(false);
        setModalError(null);
    }, [modalLoading]);

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <WidgetContainer title={title} darkMode={darkMode}>
            <div ref={containerRef} className="h-full w-full" />

            {/* Render modal in a portal so it's above everything */}
            {modalOpen &&
                ReactDOM.createPortal(
                    <InsertSheetModal
                        isOpen={modalOpen}
                        isLoading={modalLoading}
                        error={modalError}
                        onConfirm={handleModalConfirm}
                        onCancel={handleModalCancel}
                    />,
                    document.body
                )}
        </WidgetContainer>
    );
};

// ─── Helper: insert sheet into Univer workbook ─────────────────────────────────

/**
 * Insert a new sheet (built from the template + API data) into the active Univer workbook.
 *
 * Univer's FWorkbook exposes:
 *   - `create(name, row, col, {index, data})` — creates a sheet with data
 */
async function insertSheetIntoWorkbook(
    univerAPI: any,
    product: string,
    sheetId: string,
    sheetSnapshot: Record<string, any>,
    isProgrammaticInsertRef: React.MutableRefObject<boolean>
): Promise<boolean> {
    try {
        const sheetData = sheetSnapshot[sheetId];
        if (!sheetData) return false;

        const workbook = univerAPI.getActiveWorkbook();
        if (!workbook) return false;

        // Create a new blank sheet with the product name
        // Univer's createSheet returns the new FWorksheet
        const existingSheetNames: string[] = workbook.getSheets
            ? workbook.getSheets().map((s: any) => s.getSheetName?.() ?? s.getName?.() ?? "")
            : [];


        // Deduplicate name if needed
        let finalName = product;
        if (existingSheetNames.includes(finalName)) {
            let counter = 2;
            while (existingSheetNames.includes(`${product}(${counter})`)) counter++;
            finalName = `${product}(${counter})`;
        }

        // Make sure the snapshot uses the deduplicated name
        sheetData.name = finalName;

        // Set the bypass flag BEFORE calling create() so the BeforeCommandExecute
        // handler knows this InsertSheetCommand is programmatic and lets it through.
        isProgrammaticInsertRef.current = true;
        let newSheet: any;
        try {
            newSheet = await workbook.create(
                finalName,
                sheetData.rowCount || 10,
                sheetData.columnCount || 10,
                {
                    index: existingSheetNames.length,
                    sheet: sheetData,
                }
            );
        } finally {
            // Always clear the flag, even if create() throws.
            isProgrammaticInsertRef.current = false;
        }

        if (!newSheet) {
            console.error("[SheetWidget] workbook.create returned null/undefined");
            return false;
        }

        console.log(`[SheetWidget] Successfully inserted sheet "${finalName}" using fWorkbook.create API`);
        return true;
    } catch (err) {
        console.error("[SheetWidget] insertSheetIntoWorkbook error:", err);
        return false;
    }
}

export const SheetWidgetDef = {
    component: SheetWidget,
};