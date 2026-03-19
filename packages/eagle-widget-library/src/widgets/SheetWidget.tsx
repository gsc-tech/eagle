"use client"

import React, { useEffect, useRef, useState, useCallback } from "react";
import ReactDOM from "react-dom";
import type { BaseWidgetProps, ParameterValues } from "../types";
import { WidgetContainer } from "../components/WidgetContainer";
import { InsertSheetModal } from "../components/InsertSheetModal";
import { useSheetStore } from "../store/sheetStore";
import { useParameterDefaults } from "../hooks/useParameterDefaults";
import { CalculationMode, UniverSheetsCorePreset } from "@univerjs/preset-sheets-core";
import { InsertSheetCommand } from "@univerjs/preset-sheets-core";
import { createUniver, defaultTheme, greenTheme, LocaleType, merge, mergeLocales } from "@univerjs/presets";
import "@univerjs/presets/lib/styles/preset-sheets-core.css";
import '@univerjs/preset-sheets-conditional-formatting/lib/index.css'
import UniverPresetSheetsCoreEnUS from '@univerjs/preset-sheets-core/locales/en-US'
import { UniverSheetsConditionalFormattingPreset } from "@univerjs/preset-sheets-conditional-formatting";
import UniverPresetSheetsConditionalFormattingEnUS from '@univerjs/preset-sheets-conditional-formatting/locales/en-US'
import { buildProductSheet, sanitizeWorkbookSnapshot, reconstructWorkbookFromSnapshot, getWorkbookSkeleton } from "../utils/sheetBuilder";


// ─── Conditional Formatting Helper ──────────────────────────────────────────

/**
 * Apply legacy position highlighting: 
 * Blue for longs (+) and Orange for shorts (-) in columns C-N.
 */
function applyDefaultConditionalFormatting(fWorksheet: any) {
    if (!fWorksheet) return;

    try {
        console.log(`[SheetWidget] Applying conditional formatting to ${fWorksheet.getSheetName()}...`);

        // Strategy legs: Columns C to N (index 2 to 13)
        // Data usually starts from Row 4 (index 3). 
        // We use the worksheet's actual row count to avoid "out of bounds" errors.

        const fRange = fWorksheet.getRange(3, 2, 996, 17);
        const rangeDetails = fRange.getRange();

        // 1. Rule for Positive (Longs) - Blue Theme
        const rulePos = fWorksheet.newConditionalFormattingRule()
            .whenNumberGreaterThan(0)
            .setRanges([rangeDetails])
            .setBackground('#002060')
            .setFontColor('rgb(224, 242, 254)')
            .setItalic(false)
            .setBold(true)
            .build();

        // 2. Rule for Negative (Shorts) - Orange Theme
        const ruleNeg = fWorksheet.newConditionalFormattingRule()
            .whenNumberLessThan(0)
            .setRanges([rangeDetails])
            .setBackground('#be5014')
            .setFontColor('rgb(255, 247, 237)')
            .setItalic(false)
            .setBold(true)
            .build();

        fWorksheet.addConditionalFormattingRule(rulePos);
        fWorksheet.addConditionalFormattingRule(ruleNeg);

        // 3. Rule for Mismatch: Column T (19) vs Column X (23) -> Excel Outright vs Excel NetPos
        const mismatchRangeExcel = fWorksheet.getRange(3, 19, 996, 1);
        const ruleMismatchExcel = fWorksheet.newConditionalFormattingRule()
            .whenFormulaSatisfied("=$T4<>$X4")
            .setRanges([mismatchRangeExcel.getRange()])
            .setBackground('#e8e8e8')
            .setFontColor('#0e2841')
            .setBold(true)
            .build();

        // 4. Rule for Mismatch: Column U (20) vs Column Y (24) -> Marex Outright vs Marex NetPos
        const mismatchRangeMarex = fWorksheet.getRange(3, 20, 996, 1);
        const ruleMismatchMarex = fWorksheet.newConditionalFormattingRule()
            .whenFormulaSatisfied("=$U4<>$Y4")
            .setRanges([mismatchRangeMarex.getRange()])
            .setBackground('#e8e8e8')
            .setFontColor('#0e2841')
            .setBold(true)
            .build();

        fWorksheet.addConditionalFormattingRule(ruleMismatchExcel);
        fWorksheet.addConditionalFormattingRule(ruleMismatchMarex);
    } catch (err) {
        console.error("[SheetWidget] Failed to apply conditional formatting:", err);
    }
}


// ─── Types ────────────────────────────────────────────────────────────────────

export interface SheetWidgetProps extends BaseWidgetProps {
    getFirebaseToken?: () => Promise<string>;
    marexWsUrl?: string;
    excelWsUrl?: string;
    /**
     * A previously saved Univer workbook snapshot (returned by `fWorkbook.save()`).
     * When provided the widget skips the default template build and loads this data directly.
     */
    initialWorkbookData?: Record<string, any>;
    /**
     * Called with the full workbook snapshot when the widget unmounts (i.e. the window is closed).
     * Use this to persist the workbook state to your database.
     */
    onSave?: (workbookSnapshot: Record<string, any>) => void;
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
    marexWsUrl = "ws://localhost:8000/ws",
    excelWsUrl = "ws://localhost:8000/ws",
    parameters,
    getFirebaseToken,
    initialWorkbookData,
    onSave,
}) => {

    const [excelAccountId, setExcelAccountId] = useState<string>("");
    const [marexAccountId, setMarexAccountId] = useState<string>("");
    const containerRef = useRef<HTMLDivElement>(null);
    const univerRef = useRef<any>(null);
    const excelWsRef = useRef<WebSocket | null>(null);
    const marexWsRef = useRef<WebSocket | null>(null);
    const excelReconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const marexReconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    console.log("darkMode is ", darkMode);

    // Keep latest prop values accessible inside async/cleanup closures
    const onSaveRef = useRef(onSave);
    const initialWorkbookDataRef = useRef(initialWorkbookData);
    useEffect(() => {
        onSaveRef.current = onSave;
        initialWorkbookDataRef.current = initialWorkbookData;
    }, [onSave, initialWorkbookData]);

    const autoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const triggerAutoSave = useCallback(() => {
        if (autoSaveTimeoutRef.current) {
            clearTimeout(autoSaveTimeoutRef.current);
        }
        autoSaveTimeoutRef.current = setTimeout(() => {
            if (univerRef.current && onSaveRef.current) {
                try {
                    const fWorkbook = univerRef.current.getActiveWorkbook();
                    if (fWorkbook) {
                        console.log("[SheetWidget] Auto-saving workbook snapshot...");
                        onSaveRef.current(fWorkbook.save());
                    }
                } catch (err) {
                    console.error("[SheetWidget] Failed to auto-save:", err);
                }
            }
        }, 1000);
    }, []);

    const triggerAutoSaveRef = useRef(triggerAutoSave);
    useEffect(() => {
        triggerAutoSaveRef.current = triggerAutoSave;
    }, [triggerAutoSave]);

    console.log("initialWorkbookData", initialWorkbookData);

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

    const handleParametersChange = (values: ParameterValues) => {
        setExcelAccountId(values["Excel Account Id"]);
        setMarexAccountId(values["Marex Account Id"]);
        console.log("[SheetWidget] Parameters changed:", values);
    };



    // ── Univer init ──────────────────────────────────────────────────────────
    useEffect(() => {
        const container = containerRef.current;
        if (!container || univerRef.current) return;

        let isCancelled = false;

        async function initUniver() {
            try {
                let workbookData: Record<string, any>;

                if (initialWorkbookDataRef.current) {
                    // ── Atomic Reconstruction ──
                    // Instead of loading the buggy persisted snapshot directly, we rebuild 
                    // a fresh skeleton from templates and patch the old data back into it.
                    // This is the "bringing back" workaround to fix frozen formulas.
                    workbookData = await reconstructWorkbookFromSnapshot(initialWorkbookDataRef.current);
                    console.log("[SheetWidget] Successfully reconstructed workbook from snapshot");
                } else {
                    console.log("setting new data")
                    // ── Build default template (RB sheet) ────────────────────
                    const { sheetId, sheetSnapshot } = await buildProductSheet("RB");
                    sheetSnapshot[sheetId].name = "RB";

                    workbookData = {
                        ...getWorkbookSkeleton(),
                        sheets: sheetSnapshot,
                        sheetOrder: [sheetId],
                    };
                }

                if (isCancelled) return;

                const { univerAPI } = createUniver({
                    locale: LocaleType.EN_US,
                    locales: {
                        [LocaleType.EN_US]: mergeLocales(UniverPresetSheetsCoreEnUS, UniverPresetSheetsConditionalFormattingEnUS),
                    },
                    theme: defaultTheme,
                    presets: [
                        UniverSheetsCorePreset({
                            container: container!,
                            header: true,
                            formula: {
                                initialFormulaComputing: CalculationMode.FORCED,
                            }
                        }),
                        UniverSheetsConditionalFormattingPreset(),
                    ],
                });

                univerAPI.createWorkbook(workbookData);
                univerRef.current = univerAPI;

                // Sync ALL sheets from the loaded workbook into the store
                const fWorkbook = univerAPI.getActiveWorkbook();
                if (fWorkbook) {
                    const sheets = fWorkbook.getSheets();
                    sheets.forEach((s: any) => {
                        // Apply conditional formatting to each sheet
                        applyDefaultConditionalFormatting(s);

                        const snapshot = s.getSheet().getSnapshot();
                        if (snapshot?.name && snapshot?.cellData) {
                            useSheetStore.getState().setSheet(snapshot.name, snapshot.cellData);
                        }
                    });
                }


                // Give Univer one JS task to finish its internal async setup
                // (formula-engine warm-up, canvas render) before we accept data.
                setTimeout(() => {
                    // Send snapshot request now that Univer is ready
                    if (excelWsRef.current && excelWsRef.current.readyState === WebSocket.OPEN) {
                        excelWsRef.current.send(JSON.stringify({ msg: "send_snapshot" }));
                    }
                }, 500);

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
                        // console.log(params);
                        const { worksheet } = params;
                        const name = worksheet._worksheet._snapshot.name;
                        const fWorkbook = univerRef.current.getActiveWorkbook();
                        const snapshot = fWorkbook.save();

                        triggerAutoSaveRef.current?.();

                        // Grab the fully evaluated/saved snapshot for this specific sheet

                        setTimeout(() => {
                            const targetSheetObj = Object.values(snapshot.sheets).find((s: any) => s.name === name) as any;
                            if (targetSheetObj && targetSheetObj.cellData) {
                                useSheetStore.getState().setSheet(name, targetSheetObj.cellData);
                            }
                        }, 500)
                    });
                }

                // ── Global Formula Listener ──────────────────────────────────────────
                let formulaSubscription: any = null;
                const formulaEngine = univerAPI.getFormula();
                if (formulaEngine && typeof formulaEngine.calculationResultApplied === 'function') {
                    formulaSubscription = formulaEngine.calculationResultApplied((result: any) => {
                        console.log("[SheetWidget] Formula calculation applied:", result);
                        const fWorkbook = univerAPI.getActiveWorkbook();
                        if (!fWorkbook) return;

                        triggerAutoSaveRef.current?.();

                        const snapshot = fWorkbook.save();
                        // Update the store with the fully evaluated snapshot
                        for (const sheetObj of Object.values(snapshot.sheets) as any[]) {
                            if (sheetObj?.name && sheetObj?.cellData) {
                                useSheetStore.getState().setSheet(sheetObj.name, sheetObj.cellData);
                            }
                        }
                    });
                }

                return { disposable, editSubscription, formulaSubscription };

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
                    if (res.formulaSubscription && typeof res.formulaSubscription.dispose === 'function') {
                        res.formulaSubscription.dispose();
                    }
                }
                if (univerRef.current) {
                    // ── Persist workbook to database on close ─────────────────
                    const fWorkbook = univerRef.current.getActiveWorkbook();
                    if (fWorkbook && onSaveRef.current) {
                        try {
                            const snapshot = fWorkbook.save();
                            console.log("[SheetWidget] Saving workbook snapshot on close.");
                            onSaveRef.current(snapshot);
                        } catch (err) {
                            console.error("[SheetWidget] Failed to save workbook snapshot:", err);
                        }
                    }
                    univerRef.current.dispose();
                    univerRef.current = null;
                }
            });
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // ── WebSocket ────────────────────────────────────────────────────────────

    const handleWsData = useCallback((dataArray: Record<string, any>[], expectedAccountId: string, targetColIndex: number) => {
        const univerAPI = univerRef.current;
        if (!univerAPI) return;
        const workbook = univerAPI.getActiveWorkbook();
        if (!workbook) return;

        const accountItem = dataArray.find(d => String(d.accountId) === String(expectedAccountId));
        if (!accountItem || !accountItem.data) return;

        const actualData = accountItem.data;

        // Map WS values to structured updates by product -> label -> value
        const updatesByProduct = new Map<string, Map<string, any>>();
        for (const [symbol, value] of Object.entries(actualData)) {
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

            let updatedAnyCell = false;

            // Iterate over the cell data snapshot to find the matching contract row.
            // Using Column 25 (index "25") for static contract name matching.
            for (const [rowIdxStr, rowObj] of Object.entries(cellData)) {
                if (!rowObj || typeof rowObj !== 'object') continue;

                const cellR = (rowObj as any)["25"]; // Column Z (Static Contract Name)
                if (cellR && cellR.v && typeof cellR.v === "string") {
                    const currentContract = String(cellR.v).toUpperCase();

                    for (const [labelVal, newVal] of productUpdates.entries()) {
                        const expectedContract = `F.${baseSheetName}.${labelVal.toUpperCase()}`;

                        if (currentContract === expectedContract) {
                            const rowNum = parseInt(rowIdxStr, 10) + 1; // 1-indexed for A1 notation
                            console.log(`[SheetWidget] Updating ${sheetName} Row ${rowNum} for ${currentContract} to ${newVal}`);

                            // Update dynamic target column
                            const letter = colLetter(targetColIndex);
                            sheet.getRange(`${letter}${rowNum}`)?.setValue(newVal);
                            updatedAnyCell = true;
                        }
                    }
                }
            }

            if (updatedAnyCell) {
                // Manually trigger calculation for the workbook to ensure inactive sheets calculate too
                const formulaEngine = univerAPI.getFormula && univerAPI.getFormula();
                if (formulaEngine && typeof formulaEngine.executeCalculation === "function") {
                    formulaEngine.executeCalculation();
                }

                // Propagate the ENTIRE updated sheet to the store (synchronous initial, formulaResultApplied handles async)
                const fWorkbook = univerAPI.getActiveWorkbook();
                const snapshot = fWorkbook.save();
                const targetSheetObj = Object.values(snapshot.sheets).find((s: any) => s.name === sheetName) as any;

                if (targetSheetObj && targetSheetObj.cellData) {
                    useSheetStore.getState().setSheet(sheetName, targetSheetObj.cellData);
                }
            }
        }

        if (updatesByProduct.size > 0) {
            triggerAutoSaveRef.current?.();
        }
    }, []);

    // ── WebSocket Excel ────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!excelWsUrl || !excelAccountId) return;

        function connect() {
            const ws = new WebSocket(excelWsUrl!);
            excelWsRef.current = ws;

            ws.onopen = () => {
                console.log("[SheetWidget] Excel WS connected:", excelWsUrl);
            };

            ws.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data);
                    if (msg.data && Array.isArray(msg.data)) {
                        console.log("[SheetWidget] Excel WS data:", msg.data);
                        handleWsData(msg.data, excelAccountId, 23); // NetPos Excel is X (23)
                    }
                } catch (err) {
                    console.error("[SheetWidget] Excel WS message error:", err);
                }
            };

            ws.onclose = () => {
                console.log("[SheetWidget] Excel WS closed. Reconnecting in 3s...");
                excelReconnectRef.current = setTimeout(connect, 3000);
            };

            ws.onerror = (err: Event) => {
                console.error("[SheetWidget] Excel WS error. Check connection.");
            };
        }

        connect();

        return () => {
            if (excelReconnectRef.current) clearTimeout(excelReconnectRef.current);
            if (excelWsRef.current) {
                excelWsRef.current.onclose = null; // Prevent reconnect loop on unmount
                excelWsRef.current.close();
            }
        };
    }, [excelWsUrl, excelAccountId, handleWsData]);


    // ── WebSocket Marex ────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!marexWsUrl || !marexAccountId) return;

        function connect() {
            const ws = new WebSocket(marexWsUrl!);
            marexWsRef.current = ws;

            ws.onopen = async () => {
                console.log("[SheetWidget] Marex WS connected:", marexWsUrl);
                try {
                    const token = getFirebaseToken ? await getFirebaseToken() : "";
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({
                            token,
                            account_id: marexAccountId
                        }));
                    }
                } catch (err) {
                    console.error("[SheetWidget] Failed to get firebase token", err);
                }
            };

            ws.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data);
                    if (msg.data && Array.isArray(msg.data)) {
                        handleWsData(msg.data, marexAccountId, 24); // NetPos Marex is Y (24)
                    }
                } catch (err) {
                    console.error("[SheetWidget] Marex WS message error:", err);
                }
            };

            ws.onclose = () => {
                console.log("[SheetWidget] Marex WS closed. Reconnecting in 3s...");
                marexReconnectRef.current = setTimeout(connect, 3000);
            };

            ws.onerror = (err: Event) => {
                console.error("[SheetWidget] Marex WS error. Check connection.");
            };
        }

        connect();

        return () => {
            if (marexReconnectRef.current) clearTimeout(marexReconnectRef.current);
            if (marexWsRef.current) {
                marexWsRef.current.onclose = null;
                marexWsRef.current.close();
            }
        };
    }, [marexWsUrl, marexAccountId, getFirebaseToken, handleWsData]);
    // ── Modal handlers ────────────────────────────────────────────────────────

    const handleModalConfirm = useCallback(async (product: string) => {
        if (!univerRef.current) return;

        setModalLoading(true);
        setModalError(null);

        try {
            // 1. Fetch contracts + build sheet snapshot
            const { sheetId, sheetSnapshot } = await buildProductSheet(product);

            // 2. Get the workbook and insert the new sheet
            const univerAPI = univerRef.current;
            const newSheet = await insertSheetIntoWorkbook(univerAPI, product, sheetId, sheetSnapshot, isProgrammaticInsertRef);

            if (!newSheet) {
                throw new Error("Failed to insert sheet into workbook");
            }

            // apply conditional formatting to the newly created sheet
            applyDefaultConditionalFormatting(newSheet);

            // Allow Univer to finish adding the sheet and hydrating the UI
            // before we ask for values over WebSocket (which writes cells).
            setTimeout(() => {
                if (excelWsRef.current && excelWsRef.current.readyState === WebSocket.OPEN) {
                    excelWsRef.current.send(JSON.stringify({ msg: "send_snapshot" }));
                }
            }, 500);

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
        <WidgetContainer
            title={title}
            darkMode={darkMode}
            parameters={parameters}
            onParametersChange={handleParametersChange}
        >
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
): Promise<any> {
    try {
        const sheetData = sheetSnapshot[sheetId];
        if (!sheetData) return false;

        const workbook = univerAPI.getActiveWorkbook();
        if (!workbook) return null;

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
            return null;
        }

        console.log(`[SheetWidget] Successfully inserted sheet "${finalName}" using fWorkbook.create API`);
        return newSheet;
    } catch (err) {
        console.error("[SheetWidget] insertSheetIntoWorkbook error:", err);
        return null;
    }
}

export const SheetWidgetDef = {
    component: SheetWidget,
};