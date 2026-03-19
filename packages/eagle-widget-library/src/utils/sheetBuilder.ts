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

interface CacheEntry {
    promise: Promise<ContractInfo[]>;
    timestamp: number;
}

const contractsCache: Record<string, CacheEntry> = {};
const CACHE_TTL_MS = 18 * 60 * 60 * 1000; // 18 hours

/**
 * Fetch active contracts for a product from the internal API.
 * Returns an ordered list of contract objects.
 */
export async function fetchContracts(product: string): Promise<ContractInfo[]> {
    const now = Date.now();
    const cached = contractsCache[product];

    if (cached && (now - cached.timestamp < CACHE_TTL_MS)) {
        return cached.promise;
    }

    const promise = _fetchContracts(product).catch(err => {
        if (contractsCache[product]?.promise === promise) {
            delete contractsCache[product];
        }
        throw err;
    });

    contractsCache[product] = { promise, timestamp: now };
    return promise;
}

async function _fetchContracts(product: string): Promise<ContractInfo[]> {
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
 *  Col 1  (B) – Count (=SUM(C:N) for the row)
 *  Col 2-13 (C-N) – Strategy legs (blank by default)
 *  Col 14 (O) – Outright settle diff formula (=S-R for same row)
 *  Col 15 (P) – Contract month label (=RIGHT(A,5) formula)
 *  Col 16 (Q) – Contract name  (e.g. "F.CL.JAN26")
 *  Col 17 (R) – Count outright formula (=$Bn+1 - $Bn)
 *  Col 18 (S) – NetPos (blank)
 */

/**
 * Returns a minimal workbook skeleton with global styles and resources
 * from the consolidated template.
 */
export function getWorkbookSkeleton(): Record<string, any> {
    const template: any = sheetTemplate;
    return {
        styles: template.styles ?? {},
        resources: template.resources ?? [],
        id: "workbook-01",
        appVersion: "0.15.5",
        locale: "enUS",
        name: "Universheet",
    };
}
export function buildSheetSnapshot(product: string, contracts: ContractInfo[]): Record<string, any> {
    // Access the sheets from the consolidated template
    const templateSheets = (sheetTemplate as any).sheets ?? sheetTemplate;
    const templateKey = Object.keys(templateSheets)[0];
    const templateSheet: any = JSON.parse(JSON.stringify(templateSheets[templateKey]));

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
        const wRow = sheetRowIdx + 1; // 1-indexed for formulas
        const row: Record<string, any> = {};

        // Col 0 (A): spread label
        row["0"] = {
            ...(spreadRowTemplate["0"] ?? {}),
            v: spreadLabel(contracts[i], contracts[i + 1]),
            t: 1,
        };

        // Col 1 (B): count sum = SUM(C{row}:S{row})
        row["1"] = formulaCell(styleOnly(spreadRowTemplate["1"]), `=SUM(C${wRow}:S${wRow})`, 2);

        // Cols 2-18 (C-S): strategy legs — blank
        for (let c = 2; c <= 18; c++) {
            row[String(c)] = { ...styleOnly(spreadRowTemplate[String(c)]), t: 2 };
        }

        // Col 19 (T): Outright Excel
        row["19"] = formulaCell(styleOnly(spreadRowTemplate["19"]), `=X${wRow}-W${wRow}`, 2);

        // Col 20 (U): Outright Marex
        row["20"] = formulaCell(styleOnly(spreadRowTemplate["20"]), `=Y${wRow}-W${wRow}`, 2);

        // Col 21 (V): contract label formula
        row["21"] = formulaCell(styleOnly(spreadRowTemplate["21"]), `=RIGHT(A${wRow}, 5)`, 1);

        // Col 25 (Z): Hidden static full contract name for precise WebSocket matching
        row["25"] = {
            v: `F.${product}.${contracts[i + 1].month.toUpperCase()}${contracts[i + 1].year}`,
            t: 1,
        };

        // Col 22 (W): outright count = $B${row+1} - $B${row}   (next minus current)
        const cRowNext = wRow + 1;
        row["22"] = formulaCell(styleOnly(spreadRowTemplate["22"]), `=$B${cRowNext} -$B${wRow}`, 2);

        // Col 23 (X): NetPos Excel
        row["23"] = { ...styleOnly(spreadRowTemplate["23"]), v: 0, t: 2 };

        // Col 24 (Y): NetPos Marex (written by WebSocket)
        row["24"] = { ...styleOnly(spreadRowTemplate["24"]), v: 0, t: 2 };

        cellData[String(sheetRowIdx)] = row;
    }


    // Commit cell data back to the sheet
    templateSheet.cellData = cellData;
    templateSheet.rowCount = Math.max(150, 3 + numContracts + 10);
    templateSheet.columnCount = 26;

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
    const originalSheetOrder: string[] = snapshot.sheetOrder ?? Object.keys(sheetsMap);
    const sheetEntries = originalSheetOrder.map(id => sheetsMap[id]).filter(Boolean);

    if (sheetEntries.length === 0) return snapshot;

    const rebuiltSheets: Record<string, any> = {};
    const sheetOrder: string[] = [];

    // Helper to identify contract name and layout structure
    function getLayoutInfo(rowObj: any): { contractName: string; layout: "NEW" | "OLD" } | null {
        if (!rowObj || typeof rowObj !== 'object') return null;

        // Current layout (Static Name at 25)
        const v25 = rowObj["25"]?.v;
        if (typeof v25 === 'string' && v25.startsWith('F.')) {
            return { contractName: v25, layout: "NEW" };
        }
        // Intermediate layout (Static Name at 24)
        const v24 = rowObj["24"]?.v;
        if (typeof v24 === 'string' && v24.startsWith('F.')) {
            return { contractName: v24, layout: "NEW" };
        }
        // Old layout (Static Name at 16)
        const v16 = rowObj["16"]?.v;
        if (typeof v16 === 'string' && v16.startsWith('F.')) {
            return { contractName: v16, layout: "OLD" };
        }
        return null;
    }

    for (const oldSheet of sheetEntries) {
        const name = oldSheet.name || "";
        if (!name) continue;

        let baseProduct = name.replace(/\(\d+\)$/, "").toUpperCase();

        // Fallback: If name is generic (like "Universheet"), try to find product from a row
        if (baseProduct === "UNIVERSHEET" || baseProduct.length > 5) {
            const firstRow = Object.values(oldSheet.cellData || {})[3] as any; // Rows 0-2 are headers
            const layoutInfo = getLayoutInfo(firstRow);
            if (layoutInfo) {
                const parts = layoutInfo.contractName.split('.');
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
            const oldCellData = oldSheet.cellData || {};
            const newCellData = newSheet.cellData || {};

            // Map old rows by contract name
            const oldRowsByContract = new Map<string, { rowObj: any; layout: "NEW" | "OLD" }>();
            for (const rowObj of Object.values(oldCellData) as any[]) {
                const layoutInfo = getLayoutInfo(rowObj);
                if (layoutInfo && layoutInfo.contractName) {
                    oldRowsByContract.set(layoutInfo.contractName, { rowObj, layout: layoutInfo.layout });
                }
            }

            // Patch dynamic columns in the new skeleton
            for (const newRowObj of Object.values(newCellData) as any[]) {
                const newLayoutInfo = getLayoutInfo(newRowObj);
                if (!newLayoutInfo) continue;

                const oldData = oldRowsByContract.get(newLayoutInfo.contractName);
                if (oldData) {
                    const { rowObj: oldRowObj, layout: oldLayout } = oldData;

                    // Depending on the old layout, map strategy legs correctly
                    // New layout has legs on C-S (2-18). Old layout had C-N (2-13).
                    const maxLeg = oldLayout === "OLD" ? 13 : 18;

                    for (let col = 2; col <= maxLeg; col++) {
                        const colStr = String(col);
                        if (oldRowObj[colStr] && oldRowObj[colStr].v !== undefined) {
                             newRowObj[colStr] = {
                                 ...(newRowObj[colStr] || {}),
                                 v: oldRowObj[colStr].v,
                                 t: oldRowObj[colStr].t
                             };
                        }
                    }

                    // For NetPos, in OLD layout it was 18. In NEW layout it is 23 (Excel) and 24 (Marex).
                    // We only preserve NetPos if it's from NEW layout (to avoid mixing up columns).
                    if (oldLayout === "NEW") {
                        if (oldRowObj["23"] && oldRowObj["23"].v !== undefined) {
                             newRowObj["23"] = {
                                 ...(newRowObj["23"] || {}),
                                 v: oldRowObj["23"].v,
                                 t: oldRowObj["23"].t
                             };
                        }
                        if (oldRowObj["24"] && oldRowObj["24"].v !== undefined) {
                             newRowObj["24"] = {
                                 ...(newRowObj["24"] || {}),
                                 v: oldRowObj["24"].v,
                                 t: oldRowObj["24"].t
                             };
                        }
                    }
                }
            }

            rebuiltSheets[newId] = newSheet;
            sheetOrder.push(newId);
            console.log(`[sheetBuilder] Rebuilt skeleton for ${name}`);
        } catch (err) {
            console.error(`[sheetBuilder] Failed to rebuild skeleton for ${name}, falling back to original.`, err);
            rebuiltSheets[oldSheet.id] = oldSheet;
            sheetOrder.push(oldSheet.id);
        }
    }

    // Return the reconstructed workbook structure with a FRESH workbook ID
    // and the LATEST styles from the template.
    const skeleton = getWorkbookSkeleton();
    return {
        ...snapshot,
        id: `workbook-${Date.now()}`,
        sheets: rebuiltSheets,
        sheetOrder: sheetOrder,
        styles: skeleton.styles,
        resources: skeleton.resources
    };
}
