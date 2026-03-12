/**
 * sheetBuilder.ts
 * ───────────────
 * Builds a Univer sheet snapshot for a given product code by:
 *  1. Fetching active contracts from the internal API
 *  2. Generating spread rows (e.g. "Jan26-Feb26") from consecutive contracts
 *  3. Generating outright contract rows
 *  4. Deep-cloning the sheetTemplate and patching it with the dynamic data
 */

import sheetTemplate from "../../sheetTemplate.json";

// ─── Month mapping ─────────────────────────────────────────────────────────────

const MONTH_CODE_TO_NAME: Record<string, string> = {
    F: "Jan",
    G: "Feb",
    H: "Mar",
    J: "Apr",
    K: "May",
    M: "Jun",
    N: "Jul",
    Q: "Aug",
    U: "Sep",
    V: "Oct",
    X: "Nov",
    Z: "Dec",
};

// ─── API ───────────────────────────────────────────────────────────────────────

const API_BASE = "http://192.168.0.74:8003/";

export interface ContractInfo {
    /** Full contract code, e.g. "CLG26" */
    code: string;
    /** Month abbreviation, e.g. "Jan" */
    month: string;
    /** 2-digit year, e.g. "26" */
    year: string;
    /** Human-readable label, e.g. "Jan26" */
    label: string;
}

/**
 * Fetch active contracts for a product from the internal API.
 * Returns an ordered list of contract objects.
 */
export async function fetchContracts(product: string): Promise<ContractInfo[]> {
    const url = `${API_BASE}?instruments=${encodeURIComponent(product)}`;
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`API error ${res.status}: ${res.statusText}`);
    }
    const json = await res.json();

    // The API returns { "CL": ["CLG26", "CLH26", ...] }
    const contractCodes: string[] = json[product] ?? Object.values(json)[0] ?? [];
    if (!Array.isArray(contractCodes) || contractCodes.length === 0) {
        throw new Error(`No active contracts found for product "${product}"`);
    }

    return contractCodes.map((code): ContractInfo => {
        // code example: "CLG26"  →  product+monthCode+year
        const monthCode = code.charAt(product.length);
        const year = code.slice(product.length + 1);
        const month = MONTH_CODE_TO_NAME[monthCode] ?? monthCode;
        return { code, month, year, label: `${month}${year}` };
    });
}

// ─── Sheet snapshot builder ────────────────────────────────────────────────────

/** Generate a random short ID (6 alphanumeric chars) for a new sheet */
function genSheetId(): string {
    return Math.random().toString(36).slice(2, 8).toUpperCase();
}

/**
 * Return only the style (`s`) field from a template cell object.
 * This avoids copying stale `v` (cached value), `t` (type), `f` (formula),
 * or `si` (shared-formula ID) into newly built cells — all of which cause
 * Univer to skip formula recalculation on load.
 */
function styleOnly(templateCell: Record<string, any> | undefined): Record<string, any> {
    if (!templateCell) return {};
    const result: Record<string, any> = {};
    if (templateCell.s !== undefined) result.s = templateCell.s;
    return result;
}

/**
 * Build a formula cell that Univer will always recalculate on load.
 *
 * Key rules:
 *  - `f`  must be set (the formula string).
 *  - `v`  must be ABSENT — if present with a stale value, Univer treats it as
 *         the pre-computed result and skips recalculation (the intermittent bug).
 *  - `si` must be ABSENT — stale shared-formula IDs from template copies break
 *         the formula dependency graph.
 *  - `t`  should match the expected result type: 2 = number, 1 = string.
 */
function formulaCell(
    style: Record<string, any>,
    formula: string,
    resultType: 1 | 2 = 2
): Record<string, any> {
    return { ...style, f: formula, t: resultType };
}

/**
 * Build a spread label from two consecutive contracts.
 * e.g. "Jan26-Feb26"
 */
function spreadLabel(a: ContractInfo, b: ContractInfo): string {
    return `${a.label}-${b.label}`;
}

/**
 * Clone the template and produce a fully-populated Univer worksheet snapshot
 * for the given product + contract list.
 *
 * The template has:
 *  - Row 0 & 1: header rows (static)
 *  - Row 2:     product row with the product name in col 0 (static)
 *  - Row 3+:    spread rows (one per consecutive contract pair)
 *              AND also outright contract rows (cols 15-19) 
 *
 * Layout from the template (0-indexed columns):
 *  Col 0  (A) – Spread label  (e.g. "Jan26-Feb26")
 *  Col 1  (B) – Settle spread formula
 *  Col 2  (C) – Count (=SUM(D:O) for the row)
 *  Col 3-14 (D-O) – Strategy legs (blank by default)
 *  Col 15 (P) – Outright settle diff  formula (=T-S for same row)
 *  Col 16 (Q) – Contract month label (=RIGHT(A,5) formula)
 *  Col 17 (R) – Contract name  (e.g. "F.CL.JAN26")
 *  Col 18 (S) – Count outright formula (=$Cn+1 - $Cn)
 *  Col 19 (T) – NetPos (blank)
 *  Col 20 (U) – blank
 *  Col 21 (V) – settle diff col (=T-S) outright
 *  Col 22-23  – blanks
 *  Col 24 (Y) – hidden spread B diff formula
 */
export function buildSheetSnapshot(product: string, contracts: ContractInfo[]): Record<string, any> {
    // Deep-clone the template
    const templateKey = Object.keys(sheetTemplate)[0];
    const templateSheet: any = JSON.parse(JSON.stringify((sheetTemplate as any)[templateKey]));

    // Generate a new unique ID for this sheet
    const newId = genSheetId();
    templateSheet.id = newId;
    templateSheet.name = product;

    // ── Build cell data dynamically ───────────────────────────────────────────
    // Rows 0 and 1 (header rows) stay as-is from template.
    // Row 2 is the "product label" row — update col 0 with product name.
    const cellData: Record<string, any> = {};

    // Copy header rows 0 and 1 from template verbatim
    cellData["0"] = JSON.parse(JSON.stringify(templateSheet.cellData["0"]));
    cellData["1"] = JSON.parse(JSON.stringify(templateSheet.cellData["1"]));

    // Row 2: product header row — replicate from template, update col 0 value
    const row2Template = JSON.parse(JSON.stringify(templateSheet.cellData["2"] ?? {}));
    row2Template["0"] = { ...(row2Template["0"] ?? {}), v: product, t: 1 };
    cellData["2"] = row2Template;

    // Spreads: N contracts → N-1 spreads
    // Data rows start at sheet row index 3 (0-indexed).
    // Each row i (0-indexed among data rows) corresponds to spreadLabel(contracts[i], contracts[i+1])
    // Each outright row i corresponds to contracts[i]

    const numSpreads = contracts.length - 1; // number of spread rows
    const numContracts = contracts.length;

    // We'll use the spread row template from the template (row index 3, which is "3" in cellData).
    // We only extract styles from it — never copy v/f/si which would confuse Univer's formula engine.
    const spreadRowTemplate = JSON.parse(JSON.stringify(templateSheet.cellData["3"] ?? {}));

    for (let i = 0; i < numSpreads; i++) {
        const sheetRowIdx = 3 + i; // rows 3, 4, 5, ...
        const row: Record<string, any> = {};

        // Col 0 (A): spread label
        row["0"] = {
            ...(spreadRowTemplate["0"] ?? {}),
            v: spreadLabel(contracts[i], contracts[i + 1]),
            t: 1,
        };

        // Col 1 (B): settle spread = (W{row} - W{row+1}) / 100
        // In the template this was =(+W3 - W4)/100 for row 3
        const wRow = sheetRowIdx + 1; // 1-indexed for formulas
        const wRowNext = wRow + 1;
        // ↓ No `v` — Univer must compute the formula fresh (fixes intermittent calculation bug)
        row["1"] = formulaCell(styleOnly(spreadRowTemplate["1"]), `=(+W${wRow} - W${wRowNext})/100`, 2);

        // Col 2 (C): count sum = SUM(D{row}:O{row})

        row["2"] = formulaCell(styleOnly(spreadRowTemplate["2"]), `=SUM(D${wRow}:O${wRow})`, 2);

        // Cols 3-14 (D-O): strategy legs — blank
        for (let c = 3; c <= 14; c++) {
            row[String(c)] = { ...styleOnly(spreadRowTemplate[String(c)]), v: 0, t: 2 };
        }

        // Col 15 (P): outright settle diff = T{row} - S{row}
        row["15"] = formulaCell(styleOnly(spreadRowTemplate["15"]), `=T${wRow} - S${wRow}`, 2);

        // Col 16 (Q): contract label = RIGHT(A{row}, 5)
        // This is a text formula — result type is string (1)
        row["16"] = formulaCell(styleOnly(spreadRowTemplate["16"]), `=RIGHT(A${wRow}, 5)`, 1);

        // Col 17 (R): contract full name — "F.{PRODUCT}.{MONTH}{YEAR}" (static, no formula)
        row["17"] = {
            ...styleOnly(spreadRowTemplate["17"]),
            v: `F.${product}.${contracts[i + 1].month.toUpperCase()}${contracts[i + 1].year}`,
            t: 1,
        };

        // Col 18 (S): outright count = $C{row+1} - $C{row}   (next minus current)
        const cRowNext = wRow + 1;
        row["18"] = formulaCell(styleOnly(spreadRowTemplate["18"]), `=$C${cRowNext} -$C${wRow}`, 2);

        // Col 19 (T): NetPos — blank (written by WebSocket)
        row["19"] = { ...styleOnly(spreadRowTemplate["19"]), v: 0, t: 2 };

        // Col 20 (U): blank
        row["20"] = { ...styleOnly(spreadRowTemplate["20"]), v: 0, t: 2 };

        // Col 21 (V): settle diff — blank placeholder (no formula in builder)
        row["21"] = { ...styleOnly(spreadRowTemplate["21"]), v: 0, t: 2 };

        // Col 22 (W): blank
        row["22"] = { ...styleOnly(spreadRowTemplate["22"]), v: 0, t: 2 };

        // Col 23 (X): blank
        row["23"] = { ...styleOnly(spreadRowTemplate["23"]), v: 0, t: 2 };

        // Col 24 (Y): hidden spread diff B formula
        row["24"] = formulaCell({}, `=+B${wRow} - B${wRowNext}`, 2);

        cellData[String(sheetRowIdx)] = row;
    }


    // Commit cell data back to the sheet
    templateSheet.cellData = cellData;
    templateSheet.rowCount = Math.max(999, 3 + numContracts + 10);

    return { [newId]: templateSheet };
}

/**
 * Full pipeline: fetch contracts → build sheet snapshot.
 * Returns both the sheet snapshot and the new sheet ID.
 */
export async function buildProductSheet(
    product: string
): Promise<{ sheetId: string; sheetSnapshot: Record<string, any>; contracts: ContractInfo[] }> {
    const contracts = await fetchContracts(product);
    const sheetSnapshot = buildSheetSnapshot(product, contracts);
    const sheetId = Object.keys(sheetSnapshot)[0];
    return { sheetId, sheetSnapshot, contracts };
}

// ─── Snapshot sanitizer ────────────────────────────────────────────────────────

/**
 * Strip stale cached values from formula cells in a persisted Univer workbook
 * snapshot so that Univer recomputes every formula fresh on the next load.
 *
 * Background
 * ──────────
 * When you call `fWorkbook.save()` Univer serialises each formula cell with:
 *   { f: "=...", v: <last computed result>, si: <shared-formula-id> }
 *
 * On the next `createWorkbook(snapshot)` call Univer's formula engine sees `v`
 * already present and treats the cell as "already evaluated" — it therefore
 * skips recalculation.  After a WebSocket `setValue()` the downstream formula
 * cells never update because the engine still considers them solved.
 *
 * Fix: before passing a persisted snapshot back to `createWorkbook`, walk every
 * cell in every sheet and, for any cell that has a formula (`f`), delete the
 * cached `v` and `si` fields.  Univer will then treat them as unevaluated and
 * will run a full recalculation pass, restoring the expected behaviour.
 *
 * @param snapshot - The raw object returned by `fWorkbook.save()`.
 * @returns A deep-cloned, sanitised copy of the snapshot (original untouched).
 */
export function sanitizeWorkbookSnapshot(
    snapshot: Record<string, any>
): Record<string, any> {
    // Deep-clone so we never mutate the caller's object
    const clean: Record<string, any> = JSON.parse(JSON.stringify(snapshot));

    const sheetsMap: Record<string, any> = clean.sheets ?? {};
    for (const sheetObj of Object.values(sheetsMap) as any[]) {
        const cellData: Record<string, any> = sheetObj?.cellData ?? {};
        for (const rowObj of Object.values(cellData) as any[]) {
            if (!rowObj) continue;
            for (const cell of Object.values(rowObj) as any[]) {
                if (cell && typeof cell === "object" && cell.f) {
                    // Cell has a formula → remove the stale cached result
                    delete cell.v;
                    delete cell.si; // stale shared-formula ID breaks dependency graph
                }
            }
        }
    }

    return clean;
}

// ─── Atomic Reconstruction Workaround ──────────────────────────────────────────

/**
 * The "Atomic Reconstruction" workaround.
 * Instead of loading a buggy persisted snapshot (which has frozen formulas),
 * we build a FRESH skeleton for the required products and "patch" the old
 * values back into it.
/**
 * The "Atomic Reconstruction" workaround.
 * Instead of loading a buggy persisted snapshot (which has frozen formulas),
 * we build a FRESH skeleton for the required products and "patch" the old
 * values back into it.
 *
 * This ensures the formulas are brand new (linked correctly) while the user's
 * data is preserved.
 */
export async function reconstructWorkbookFromSnapshot(
    snapshot: Record<string, any>
): Promise<Record<string, any>> {
    console.log("[sheetBuilder] Starting atomic reconstruction of workbook...");

    const sheetsMap: Record<string, any> = snapshot.sheets ?? {};
    const sheetEntries = Object.values(sheetsMap);

    if (sheetEntries.length === 0) return snapshot;

    const rebuiltSheets: Record<string, any> = {};
    const sheetOrder: string[] = [];

    for (const oldSheet of sheetEntries) {
        const name = oldSheet.name || "";
        if (!name) continue;

        let baseProduct = name.replace(/\(\d+\)$/, "").toUpperCase();

        // Fallback: If name is generic (like "Universheet"), try to find product from a row
        if (baseProduct === "UNIVERSHEET" || baseProduct.length > 5) {
            const firstRow = Object.values(oldSheet.cellData || {})[3] as any; // Rows 0-2 are headers
            const sampleContract = firstRow?.["17"]?.v;
            if (sampleContract && typeof sampleContract === "string") {
                const parts = sampleContract.split('.');
                if (parts.length >= 2) baseProduct = parts[1].toUpperCase();
            }
        }

        console.log(`[sheetBuilder] Rebuilding skeleton for product: ${baseProduct} (Name: ${name})`);

        if (baseProduct === "UNIVERSHEET") {
            console.warn(`[sheetBuilder] Could not determine product for sheet ${name}, using original.`);
            rebuiltSheets[oldSheet.id] = oldSheet;
            sheetOrder.push(oldSheet.id);
            continue;
        }

        try {
            // Build a fresh skeleton for this product
            const { sheetSnapshot } = await buildProductSheet(baseProduct);
            const newId = Object.keys(sheetSnapshot)[0];
            const newSheet = sheetSnapshot[newId];

            // Ensure the new sheet has the same name as the old one (to preserve layout)
            newSheet.name = name;

            // 2. Transfer data from oldSheet to newSheet
            // We match rows using Column 17 (Static contract name)
            const oldCellData = oldSheet.cellData || {};
            const newCellData = newSheet.cellData || {};

            // Map old rows by contract name
            const oldRowsByContract = new Map<string, any>();
            for (const rowObj of Object.values(oldCellData) as any[]) {
                const contractName = rowObj?.["17"]?.v;
                if (contractName) oldRowsByContract.set(contractName, rowObj);
            }

            // Patch dynamic columns in the new skeleton
            for (const newRowObj of Object.values(newCellData) as any[]) {
                const contractName = newRowObj?.["17"]?.v;
                const oldRowObj = oldRowsByContract.get(contractName);

                if (oldRowObj) {
                    // Columns to preserve:
                    // 3-14: Strategy legs (D-O)
                    // 19:   NetPos (T)
                    // 22:   Settle helper (W)
                    const colsToPreserve = ["3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "19", "22"];

                    for (const col of colsToPreserve) {
                        if (oldRowObj[col]) {
                            // Preserve the value 'v', but keep the new style 's' from the template
                            newRowObj[col] = {
                                ...(newRowObj[col] || {}),
                                v: oldRowObj[col].v,
                                t: oldRowObj[col].t
                            };
                        }
                    }
                }
            }

            rebuiltSheets[newId] = newSheet;
            sheetOrder.push(newId);
        } catch (err) {
            console.error(`[sheetBuilder] Failed to rebuild skeleton for ${name}, falling back to original.`, err);
            rebuiltSheets[oldSheet.id] = oldSheet;
            sheetOrder.push(oldSheet.id);
        }
    }

    // Return the reconstructed workbook structure with a FRESH workbook ID
    // to force Univer to treat this as a brand new instance.
    return {
        ...snapshot,
        id: `workbook-${Date.now()}`,
        sheets: rebuiltSheets,
        sheetOrder: sheetOrder
    };
}
