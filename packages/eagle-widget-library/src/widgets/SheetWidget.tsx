"use client"

import React, { useEffect, useRef, useState, useCallback } from "react";
import ReactDOM from "react-dom";
import type { BaseWidgetProps, ParameterValues } from "../types";
import { WidgetContainer } from "../components/WidgetContainer";
import { InsertSheetModal } from "../components/InsertSheetModal";
import { useSheetStore } from "../store/sheetStore";
import { usePositionsStore } from "../store/positionsStore";
import { CalculationMode, UniverSheetsCorePreset } from "@univerjs/preset-sheets-core";
import { InsertSheetCommand } from "@univerjs/preset-sheets-core";
import { createUniver, defaultTheme, LocaleType, mergeLocales } from "@univerjs/presets";
//@ts-ignore
import "@univerjs/presets/lib/styles/preset-sheets-core.css";
//@ts-ignore
import '@univerjs/preset-sheets-conditional-formatting/lib/index.css'
import UniverPresetSheetsCoreEnUS from '@univerjs/preset-sheets-core/locales/en-US'
import { UniverSheetsConditionalFormattingPreset } from "@univerjs/preset-sheets-conditional-formatting";
import UniverPresetSheetsConditionalFormattingEnUS from '@univerjs/preset-sheets-conditional-formatting/locales/en-US'
import { buildProductSheet, reconstructWorkbookFromSnapshot, getWorkbookSkeleton } from "../utils/sheetBuilder";

// ─── Conditional Formatting Helper ──────────────────────────────────────────

/**
 * Apply legacy position highlighting:
 * Blue for longs (+) and Orange for shorts (-) in columns C-N.
 */
function applyDefaultConditionalFormatting(fWorksheet: any) {
    if (!fWorksheet) return;

    try {
        const fRange = fWorksheet.getRange(3, 2, 146, 17);
        const rangeDetails = fRange.getRange();

        const rulePos = fWorksheet.newConditionalFormattingRule()
            .whenNumberGreaterThan(0)
            .setRanges([rangeDetails])
            .setBackground('#002060')
            .setFontColor('rgb(224, 242, 254)')
            .setItalic(false)
            .setBold(true)
            .build();

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

        const mismatchRangeExcel = fWorksheet.getRange(3, 19, 146, 1);
        const ruleMismatchExcel = fWorksheet.newConditionalFormattingRule()
            .whenNumberNotEqualTo(0)
            .setRanges([mismatchRangeExcel.getRange()])
            .setBackground('#e8e8e8')
            .setFontColor('#0e2841')
            .setBold(true)
            .build();

        const mismatchRangeMarex = fWorksheet.getRange(3, 20, 146, 1);
        const ruleMismatchMarex = fWorksheet.newConditionalFormattingRule()
            .whenNumberNotEqualTo(0)
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
    /**
     * A previously saved Univer workbook snapshot (returned by `fWorkbook.save()`).
     * When provided the widget skips the default template build and loads this data directly.
     */
    initialWorkbookData?: Record<string, any>;
    initialParameterValues?: Record<string, string>;
    /**
     * Called with the full workbook snapshot when the widget unmounts (i.e. the window is closed).
     * Use this to persist the workbook state to your database.
     */
    onSave?: (workbookSnapshot: Record<string, any>, parameters?: any[]) => void;
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


// ─── Component ────────────────────────────────────────────────────────────────

export const SheetWidget: React.FC<SheetWidgetProps> = ({
    id,
    title = "Positions Sheet",
    darkMode = false,
    parameters,
    initialWorkbookData,
    initialParameterValues,
    onSave,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const univerRef = useRef<any>(null);

    // Keep latest prop values accessible inside async/cleanup closures
    const onSaveRef = useRef(onSave);
    const initialWorkbookDataRef = useRef(initialWorkbookData);
    useEffect(() => {
        onSaveRef.current = onSave;
        initialWorkbookDataRef.current = initialWorkbookData;
    }, [onSave, initialWorkbookData]);

    const autoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const currentParamsRef = useRef<ParameterValues>(initialParameterValues || {});

    const triggerAutoSave = useCallback(() => {
        if (autoSaveTimeoutRef.current) {
            clearTimeout(autoSaveTimeoutRef.current);
        }
        autoSaveTimeoutRef.current = setTimeout(() => {
            if (univerRef.current && onSaveRef.current) {
                try {
                    const fWorkbook = univerRef.current.getActiveWorkbook();
                    if (fWorkbook) {
                        const paramsArray = Object.entries(currentParamsRef.current).map(([k, v]) => ({ [k]: String(v) }));
                        onSaveRef.current(fWorkbook.save(), paramsArray);
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

    // ── Modal state ───────────────────────────────────────────────────────────
    const [modalOpen, setModalOpen] = useState(false);
    const [modalLoading, setModalLoading] = useState(false);
    const [modalError, setModalError] = useState<string | null>(null);

    const openModalRef = useRef<() => void>(() => setModalOpen(true));
    const isProgrammaticInsertRef = useRef(false);
    useEffect(() => {
        openModalRef.current = () => {
            setModalError(null);
            setModalOpen(true);
        };
    });

    const handleParametersChange = useCallback((values: ParameterValues) => {
        currentParamsRef.current = values;
    }, []);

    // ── Global Focus Patch ───────────────────────────────────────────────────
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const patchedFlag = '__univerFocusPatched';
        if (!(HTMLElement.prototype as any)[patchedFlag]) {
            const originalFocus = HTMLElement.prototype.focus;
            HTMLElement.prototype.focus = function (options?: FocusOptions) {
                if (this && typeof this.closest === 'function' && this.closest('.univer-scroll-lock-container')) {
                    return originalFocus.call(this, { ...options, preventScroll: true });
                }
                return originalFocus.call(this, options);
            };
            (HTMLElement.prototype as any)[patchedFlag] = true;
        }
    }, []);

    // ── Univer init ──────────────────────────────────────────────────────────
    useEffect(() => {
        const container = containerRef.current;
        if (!container || univerRef.current) return;

        let isCancelled = false;
        let createdUniverAPI: any = null;

        async function initUniver() {
            try {
                let workbookData: Record<string, any>;

                if (initialWorkbookDataRef.current) {
                    workbookData = await reconstructWorkbookFromSnapshot(initialWorkbookDataRef.current);
                } else {
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
                createdUniverAPI = univerAPI;

                const fWorkbook = univerAPI.getActiveWorkbook();
                if (fWorkbook) {
                    const sheets = fWorkbook.getSheets();
                    const sheetsDataToBatch: Record<string, any> = {};
                    const activeSheet = fWorkbook.getActiveSheet();

                    if (activeSheet) {
                        applyDefaultConditionalFormatting(activeSheet);
                    }

                    sheets.forEach((s: any, index: number) => {
                        const snapshot = s.getSheet().getSnapshot();
                        if (snapshot?.name && snapshot?.cellData) {
                            sheetsDataToBatch[snapshot.name] = snapshot.cellData;
                        }
                        if (s !== activeSheet) {
                            setTimeout(() => applyDefaultConditionalFormatting(s), (index + 1) * 200);
                        }
                    });

                    if (Object.keys(sheetsDataToBatch).length > 0) {
                        useSheetStore.getState().setSheets(id || "univer", sheetsDataToBatch);
                    }
                }

                const disposable = univerAPI.addEvent(univerAPI.Event.BeforeCommandExecute, (event: any) => {
                    const { id } = event;
                    if (id === InsertSheetCommand.id || id === 'sheet.command.insert-sheet') {
                        if (isProgrammaticInsertRef.current) return;
                        event.cancel = true;
                        setTimeout(() => { openModalRef.current(); }, 0);
                        return;
                    }
                });

                let editSubscription: any = null;
                if (univerAPI.Event && univerAPI.Event.SheetEditEnded) {
                    editSubscription = univerAPI.addEvent(univerAPI.Event.SheetEditEnded, (params: any) => {
                        const { worksheet } = params;
                        const name = worksheet._worksheet._snapshot.name;
                        const fWorkbook = univerRef.current.getActiveWorkbook();
                        const snapshot = fWorkbook.save();
                        triggerAutoSaveRef.current?.();
                        const targetSheetObj = Object.values(snapshot.sheets).find((s: any) => s.name === name) as any;
                        if (targetSheetObj && targetSheetObj.cellData) {
                            useSheetStore.getState().setSheet(id || "univer", name, targetSheetObj.cellData);
                        }
                    });
                }

                let deleteSubscription: any = null;
                if (univerAPI.Event && univerAPI.Event.BeforeSheetDelete) {
                    deleteSubscription = univerAPI.addEvent(univerAPI.Event.BeforeSheetDelete, (params: any) => {
                        const { worksheet } = params;
                        const name = worksheet._worksheet._snapshot.name;
                        triggerAutoSaveRef.current?.();
                        useSheetStore.getState().deleteSheet(id || "univer", name);
                    });
                }

                let formulaSubscription: any = null;
                const formulaEngine = univerAPI.getFormula();
                if (formulaEngine && typeof formulaEngine.calculationResultApplied === 'function') {
                    formulaSubscription = formulaEngine.calculationResultApplied((_result: any) => {
                        const fWorkbook = univerAPI.getActiveWorkbook();
                        if (!fWorkbook) return;
                        triggerAutoSaveRef.current?.();
                        const snapshot = fWorkbook.save();
                        for (const sheetObj of Object.values(snapshot.sheets) as any[]) {
                            if (sheetObj?.name && sheetObj?.cellData) {
                                useSheetStore.getState().setSheet(id || "univer", sheetObj.name, sheetObj.cellData);
                            }
                        }
                    });
                }

                return { disposable, editSubscription, formulaSubscription, deleteSubscription };

            } catch (err) {
                console.error("[SheetWidget] Failed to initialize univer:", err);
            }
        }

        const initPromise = initUniver();

        return () => {
            isCancelled = true;
            initPromise.then((res) => {
                if (res) {
                    res.editSubscription?.dispose?.();
                    res.disposable?.dispose?.();
                    res.formulaSubscription?.dispose?.();
                    res.deleteSubscription?.dispose?.();
                }
                if (createdUniverAPI) {
                    const fWorkbook = createdUniverAPI.getActiveWorkbook();
                    if (fWorkbook && onSaveRef.current) {
                        try {
                            const snapshot = fWorkbook.save();
                            const paramsArray = Object.entries(currentParamsRef.current).map(([k, v]) => ({ [k]: String(v) }));
                            onSaveRef.current(snapshot, paramsArray);
                        } catch (err) {
                            console.error("[SheetWidget] Failed to save workbook snapshot:", err);
                        }
                    }
                    createdUniverAPI.dispose();
                    if (univerRef.current === createdUniverAPI) {
                        univerRef.current = null;
                    }
                }
            });
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Apply positions from positionsStore ──────────────────────────────────
    // Subscribes to both marex and excel positions and writes them into the
    // active Univer workbook cells (same column mapping as before).
    const marexPositions = usePositionsStore((s) => s.marex);
    const excelPositions = usePositionsStore((s) => s.excel);

    const applyPositionsToSheet = useCallback((
        positions: Record<string, Record<string, number>>,
        targetColIndex: number // 23 = Excel (X), 24 = Marex (Y)
    ) => {
        const univerAPI = univerRef.current;
        if (!univerAPI) return;
        const workbook = univerAPI.getActiveWorkbook();
        if (!workbook) return;

        const contractPrefix = (product: string) => `F.${product}.`;
        const sheets = workbook.getSheets();
        let anyUpdated = false;

        for (const sheet of sheets) {
            let cellData: any;
            let sheetName = "";
            try {
                const snapshot = sheet.getSheet().getSnapshot();
                cellData = snapshot?.cellData;
                sheetName = snapshot?.name || "";
            } catch {
                continue;
            }
            if (!cellData || !sheetName) continue;

            const baseSheetName = sheetName.replace(/\(\d+\)$/, "").toUpperCase();
            const prefix = contractPrefix(baseSheetName);
            const productUpdates = positions[baseSheetName] ?? {};

            let updatedAnyCell = false;

            for (const [rowIdxStr, rowObj] of Object.entries(cellData)) {
                if (!rowObj || typeof rowObj !== "object") continue;
                const cellR = (rowObj as any)["25"]; // Column Z — static contract name
                if (!cellR?.v || typeof cellR.v !== "string") continue;

                const currentContract = String(cellR.v).toUpperCase();
                if (!currentContract.startsWith(prefix)) continue;

                const labelPart = currentContract.substring(prefix.length).toUpperCase();
                const hasUpdate = labelPart in productUpdates;
                const newVal = hasUpdate ? productUpdates[labelPart] : 0;

                const targetColIdxStr = String(targetColIndex);
                const currentValue = (rowObj as any)[targetColIdxStr]?.v;
                if (currentValue !== newVal) {
                    const rowNum = parseInt(rowIdxStr, 10) + 1;
                    const letter = colLetter(targetColIndex);
                    sheet.getRange(`${letter}${rowNum}`)?.setValue(newVal);
                    if (hasUpdate || Number(currentValue || 0) !== 0) {
                        updatedAnyCell = true;
                    }
                }
            }

            if (updatedAnyCell) {
                anyUpdated = true;
                const formulaEngine = univerAPI.getFormula?.();
                if (formulaEngine && typeof formulaEngine.executeCalculation === "function") {
                    formulaEngine.executeCalculation();
                }
                const fWorkbook = univerAPI.getActiveWorkbook();
                const snapshot = fWorkbook.save();
                const targetSheetObj = Object.values(snapshot.sheets).find((s: any) => s.name === sheetName) as any;
                if (targetSheetObj?.cellData) {
                    useSheetStore.getState().setSheet(id || "univer", sheetName, targetSheetObj.cellData);
                }
            }
        }

        if (anyUpdated) {
            triggerAutoSaveRef.current?.();
        }
    }, [id]);

    useEffect(() => {
        applyPositionsToSheet(excelPositions, 23); // NetPos Excel → column X
    }, [excelPositions, applyPositionsToSheet]);

    useEffect(() => {
        applyPositionsToSheet(marexPositions, 24); // NetPos Marex → column Y
    }, [marexPositions, applyPositionsToSheet]);

    // ── Modal handlers ────────────────────────────────────────────────────────

    const handleModalConfirm = useCallback(async (product: string) => {
        if (!univerRef.current) return;

        setModalLoading(true);
        setModalError(null);

        try {
            const { sheetId, sheetSnapshot } = await buildProductSheet(product);
            const univerAPI = univerRef.current;
            const newSheet = await insertSheetIntoWorkbook(univerAPI, product, sheetId, sheetSnapshot, isProgrammaticInsertRef);

            if (!newSheet) throw new Error("Failed to insert sheet into workbook");

            applyDefaultConditionalFormatting(newSheet);

            // Re-apply current positions to the new sheet
            setTimeout(() => {
                applyPositionsToSheet(excelPositions, 23);
                applyPositionsToSheet(marexPositions, 24);
            }, 500);

            setModalOpen(false);
        } catch (err: any) {
            console.error("[SheetWidget] Failed to build product sheet:", err);
            setModalError(err?.message ?? "Unknown error occurred");
        } finally {
            setModalLoading(false);
        }
    }, [excelPositions, marexPositions, applyPositionsToSheet]);

    const handleModalCancel = useCallback(() => {
        if (modalLoading) return;
        setModalOpen(false);
        setModalError(null);
    }, [modalLoading]);

    // ── Render ───────────────────────────────────────────────────────────────

    return (
        <WidgetContainer
            title={title}
            darkMode={darkMode}
            parameters={parameters}
            initialParameterValues={initialParameterValues}
            onParametersChange={handleParametersChange}
        >
            <div ref={containerRef} className="h-full w-full univer-scroll-lock-container" />

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

async function insertSheetIntoWorkbook(
    univerAPI: any,
    product: string,
    sheetId: string,
    sheetSnapshot: Record<string, any>,
    isProgrammaticInsertRef: React.RefObject<boolean>
): Promise<any> {
    try {
        const sheetData = sheetSnapshot[sheetId];
        if (!sheetData) return false;

        const workbook = univerAPI.getActiveWorkbook();
        if (!workbook) return null;

        const existingSheetNames: string[] = workbook.getSheets
            ? workbook.getSheets().map((s: any) => s.getSheetName?.() ?? s.getName?.() ?? "")
            : [];

        let finalName = product;
        if (existingSheetNames.includes(finalName)) {
            let counter = 2;
            while (existingSheetNames.includes(`${product}(${counter})`)) counter++;
            finalName = `${product}(${counter})`;
        }

        sheetData.name = finalName;

        isProgrammaticInsertRef.current = true;
        let newSheet: any;
        try {
            newSheet = await workbook.create(
                finalName,
                sheetData.rowCount || 10,
                sheetData.columnCount || 10,
                { index: existingSheetNames.length, sheet: sheetData }
            );
        } finally {
            isProgrammaticInsertRef.current = false;
        }

        if (!newSheet) {
            console.error("[SheetWidget] workbook.create returned null/undefined");
            return null;
        }

        return newSheet;
    } catch (err) {
        console.error("[SheetWidget] insertSheetIntoWorkbook error:", err);
        return null;
    }
}

export const SheetWidgetDef = {
    component: SheetWidget,
};