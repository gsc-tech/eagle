/**
 * Pure-function utilities ported verbatim from Falcon (T1.6).
 *
 * UUID generation uses the `uuid` package (v4) — works on both HTTP and HTTPS.
 *
 * Sources:
 *   falcon-ui/src/seasonality/utils/UtilTypeFunctionSeasonality.ts
 *   falcon-ui/src/seasonality/utils/Types.ts  (Seasonality namespace)
 *   falcon-ui/src/metadata/Expiry.ts
 *   falcon-ui/src/seasonality/api/seasonality.ts  (currency constants only)
 *
 * Changes from Falcon originals:
 *   - Removed Redux hooks, logger, Auth0, and auth fetch (no framework coupling)
 *   - Replaced lodash min() with inline Array reduce
 *   - Removed @ts-ignore suppressions; types are explicit throughout
 *   - Flattened Seasonality.Types / Seasonality.Utils namespaces to top-level exports
 *   - uuidv4() replaced with uuid/v4 (crypto.randomUUID requires HTTPS)
 */

import { v4 as uuidv4 } from "uuid";

// ─── Market / scope types ─────────────────────────────────────────────────────

export type InterMarketTypes =
    | "Single Market"
    | "Intermarket 1"
    | "Intermarket 2"
    | "Intermarket 3";

export type Market = "Custom" | InterMarketTypes;

export const MarketList: Market[] = [
    "Custom",
    "Single Market",
    "Intermarket 1",
    "Intermarket 2",
    "Intermarket 3",
];

/**
 * Derive the market tier from an expression string by counting unique commodity
 * symbols, mirroring Falcon's SeasonalitySlice logic (MarketList[symbolCount]).
 * Uses the same regex Falcon uses: sign? multiplier? SYMBOL CONTRACT
 * e.g. "42000*(RBV26-RBF27)" → 1 unique symbol (RB) → "Single Market"
 *      "CLH27+HOH27"         → 2 unique symbols      → "Intermarket 1"
 * Falls back to "Custom" if the expression can't be parsed or has > 4 symbols.
 */
export function marketFromExpression(expression: string): Market {
    const cleaned = expression.replace(/\s+/g, "");
    const regex = /[+-]?\d*\*?([A-Z]{1,3})[A-Z]\d{2}/g;
    const symbols = new Set<string>();
    let match: RegExpExecArray | null;
    while ((match = regex.exec(cleaned)) !== null) {
        symbols.add(match[1]);
    }
    const count = symbols.size;
    // MarketList indices: 0=Custom, 1=Single Market, 2=IM1, 3=IM2, 4=IM3
    if (count >= 1 && count <= 4) return MarketList[count];
    return "Custom";
}

// ─── Product / contract types ─────────────────────────────────────────────────

export type ProductContract = {
    id: string;
    product: string;
    symbol: string;
    currencyMultiplier: number;
    currency: string;
    exchange: string;
    category: string;
    dataFromDate: string;
    exchangeProductId?: number | string;
    contractMonths?: string | null;
    contracts: {
        contractCode: string;
        expiry: string;
        FTD: string;
        FNDminus2: string;
    }[];
};

// ─── Matrix cell types ────────────────────────────────────────────────────────

export type Cell = {
    code: string;
    value: number;
};

export type CellPlaceholder = {
    code: string;
    value: number;
    placeholder: string;
};

/**
 * One row in the expression-builder matrix.
 * `id` is a stable UUID so React keys remain stable across re-renders.
 */
export type SymbolMatrix = {
    id: string;
    symbol: ProductContract;
    cells: Cell[];
    enabled: boolean;
};

// ─── Chart types ──────────────────────────────────────────────────────────────

export type Point = {
    x: number;
    y: number;
};

export type Series = {
    name: string;
    points: Point[];
};

export type SeasonalityChartData = {
    series: Series[];
    maxDate: number;
    minDate: number;
};

export type ChartType =
    | "Seasonality Stacked"
    | "Heatmap"
    | "Seasonality Monthly"
    | "Average";

export type DataItem = {
    uid: string;
    type: ChartType;
    data: SeasonalityChartData | undefined;
    expr: string;
};

export const analysisDropdown: { id: string; name: ChartType }[] = [
    { id: "1", name: "Seasonality Stacked" },
    { id: "2", name: "Heatmap" },
    { id: "3", name: "Seasonality Monthly" },
    { id: "4", name: "Average" },
];

// ─── Dollar-conversion types ──────────────────────────────────────────────────

/** Maps currency code (e.g. "GBP") → current FX rate vs USD. Populated at runtime via /DE endpoint. */
export type DollarConversion = Record<string, number>;

// ─── Currency mapping constants ───────────────────────────────────────────────

/**
 * Maps non-USD currency code → its continuous front-month futures symbol.
 * Used in expression construction when dollar-equivalent mode is active.
 * Source: falcon-ui/src/seasonality/utils/UtilTypeFunctionSeasonality.ts
 */
export const currencyToFuturesSymbol: Record<string, string> = {
    GBP: "BPc1",
    EUR: "EUc1",
    CAD: "CDc1",
};

/**
 * Maps futures symbol → ISO currency code.
 * Used when parsing the /DE endpoint response.
 * Source: falcon-ui/src/seasonality/api/seasonality.ts (SeasonalityDE)
 */
export const futuresSymbolToCurrency: Record<string, string> = {
    ADc1: "AUD",
    BPc1: "GBP",
    JYc1: "JPY",
    CDc1: "CAD",
    EUc1: "EUR",
};

// ─── Empty cell scaffold ──────────────────────────────────────────────────────

const MONTH_CODES = ["F", "G", "H", "J", "K", "M", "N", "Q", "U", "V", "X", "Z"];
const buildCodesForYear = (year: string) => MONTH_CODES.map((m) => `${m}${year}`);
const DEFAULT_CODES = [...buildCodesForYear("25"), ...buildCodesForYear("26")];

export const EmptyCells: Cell[] = DEFAULT_CODES.map((code) => ({ code, value: 0 }));

// ─── Matrix cell builders ─────────────────────────────────────────────────────

/** Returns up to 24 cells (one per contract) for a given product, all with value 0. */
export function CellsBySymbol(input: ProductContract): Cell[] {
    return input.contracts
        .map((c) => ({ code: c.contractCode, value: 0 }))
        .slice(0, 24);
}

/** Like CellsBySymbol but includes a `placeholder` label (G1, G2, …) for template expressions. */
export function CellsBySymbolPlaceHolder(input: ProductContract): CellPlaceholder[] {
    const rollingMonths = (input.contractMonths ?? "").replace(/-/g, "").split("");
    return input.contracts
        .filter((c) => rollingMonths.includes(c.contractCode.slice(0, 1)))
        .map((c, index) => ({
            code: c.contractCode,
            value: 0,
            placeholder: `G${index + 1}`,
        }))
        .slice(0, 24);
}

// ─── Expression builders ──────────────────────────────────────────────────────

/**
 * Converts a filled Cell[] matrix row into a Falcon expression string.
 * Handles dollar-equivalent (DE) and dynamic-dollar-equivalent (DDE) modes.
 */
export function cellToExpr(
    cells: Cell[],
    symbol: ProductContract,
    DE: boolean,
    DDE: boolean,
    conversion: DollarConversion
): string {
    let updatedExpr = cells.reduce((acc, cell) => {
        if (cell.value === 0) return acc;
        const contractCode = symbol.symbol + cell.code;
        if (cell.value === 1)  return acc + "+" + contractCode;
        if (cell.value === -1) return acc + "-" + contractCode;
        if (cell.value > 1)   return acc + "+" + cell.value + "*" + contractCode;
        return acc + cell.value + "*" + contractCode;
    }, "");

    if (updatedExpr.startsWith("+")) updatedExpr = updatedExpr.slice(1);

    if (updatedExpr === "") return updatedExpr;

    const fxSymbol = currencyToFuturesSymbol[symbol.currency];
    const isNonUSD = symbol.currency !== "USD";

    if (DDE) {
        return isNonUSD && fxSymbol
            ? `${symbol.currencyMultiplier}*${fxSymbol}*(${updatedExpr})`
            : `${symbol.currencyMultiplier}*(${updatedExpr})`;
    }

    if (DE) {
        const rate = Math.round(symbol.currencyMultiplier * (conversion[symbol.currency] ?? 1) * 100) / 100;
        return isNonUSD
            ? `${rate}*(${updatedExpr})`
            : `${symbol.currencyMultiplier}*(${updatedExpr})`;
    }

    return updatedExpr;
}

/**
 * Like cellToExpr but for placeholder cells (template-based expressions).
 * DE-only — DDE is not supported in placeholder mode.
 */
export function cellToExprPlaceholder(
    cells: CellPlaceholder[],
    symbol: ProductContract,
    DE: boolean,
    conversion: DollarConversion
): string {
    let updatedExpr = cells.reduce((acc, cell) => {
        if (cell.value === 0) return acc;
        let term = distributeCoefficient(cell.code, cell.value, symbol.symbol);
        if (acc === "") {
            term = term.startsWith("+") ? term.slice(1) : term;
        } else if (!term.startsWith("+") && !term.startsWith("-")) {
            term = "+" + term;
        }
        return acc + term;
    }, "");

    if (updatedExpr === "") return updatedExpr;

    if (DE) {
        const rate = Math.round(symbol.currencyMultiplier * (conversion[symbol.currency] ?? 1) * 100) / 100;
        return symbol.currency !== "USD"
            ? `${rate}*(${updatedExpr})`
            : `${symbol.currencyMultiplier}*(${updatedExpr})`;
    }

    return updatedExpr;
}

/** Distributes a scalar coefficient across a potentially compound placeholder term. */
function distributeCoefficient(placeholder: string, coefficient: number, symbol: string): string {
    const terms = placeholder.split(/(?=[+-])/).filter((t) => t.trim() !== "");
    return terms.reduce((result, term) => {
        const clean = term.trim();
        const sign = clean.startsWith("-") ? -1 : 1;
        const body = clean.replace(/^[+-]/, "");
        const [multiplierStr, variable] = body.includes("*") ? body.split("*") : ["1", body];
        const finalCoeff = coefficient * (parseInt(multiplierStr) || 1) * sign;
        const contractCode = symbol + variable;
        if (finalCoeff === 1)  return result + "+" + contractCode;
        if (finalCoeff === -1) return result + "-" + contractCode;
        if (finalCoeff > 1)   return result + "+" + finalCoeff + "*" + contractCode;
        return result + finalCoeff + "*" + contractCode;
    }, "");
}

// ─── Expression → matrix parser ──────────────────────────────────────────────

/**
 * Parses a Falcon expression string back into a SymbolMatrix[] so the builder
 * can display coefficients in its cell inputs instead of showing all zeros.
 *
 * Handles the common forms produced by cellToExpr:
 *   RBH27-RBJ27+RBK27            (plain, no multiplier)
 *   2*RBH27-3*RBJ27              (integer multipliers)
 *   42000*(RBH27-RBJ27)          (scalar wrapper — DE mode)
 *   1.5*(RBH27)                  (decimal scalar)
 *
 * Returns null when the expression can't be parsed into a clean matrix (e.g.
 * multi-symbol IM expressions, or expressions the builder can't represent).
 * The caller falls back to showing the expression only in the Custom tab.
 *
 * @param expression  The raw expression string to parse.
 * @param universe    The full product catalogue to look up ProductContract by symbol.
 * @param maxRows     Maximum number of matrix rows to build (1=Single, 2=IM1, …).
 */
export function exprToMatrix(
    expression: string,
    universe: ProductContract[],
    maxRows = 1,
): { matrix: SymbolMatrix[]; de: boolean } | null {
    if (!expression) return null;

    // Strip scalar wrappers produced by DE mode. Two forms:
    //   single-symbol:  "42000*(RBH27-RBJ27)"          → "RBH27-RBJ27"
    //   multi-symbol:   "42000*(RBN26-RBF27) + 42000*(HOV26-HOH27)"
    //                   → "RBN26-RBF27 + HOV26-HOH27"
    // Presence of any such wrapper means DE mode was active.
    let inner = expression.trim();
    // Strip scalar wrappers produced by DE mode. Two forms:
    //   single-symbol:  "42000*(RBH27-RBJ27)"          → "RBH27-RBJ27"
    //   multi-symbol:   "42000*(RBN26-RBF27) + 42000*(HOV26-HOH27)"
    //                   → "RBN26-RBF27 + HOV26-HOH27"
    // Per-term strip runs first (handles both forms); single-wrap is a subset.
    // [^)]+ ensures we don't greedily consume across closing parens.
    const perTermStripped = inner.replace(/[-\d.]+\*\(([^)]+)\)/g, "$1");
    let de = perTermStripped !== inner;
    if (de) inner = perTermStripped;

    // Normalise: remove all spaces, ensure every term has an explicit sign
    const normalised = inner.replace(/\s+/g, "").replace(/^([^+-])/, "+$1");
    console.log("[exprToMatrix] normalised:", JSON.stringify(normalised));

    // Split on sign boundaries (keep the sign as part of each token)
    const tokens = normalised.match(/[+-][^+-]+/g);
    console.log("[exprToMatrix] tokens:", tokens);
    if (!tokens) return null;

    // Parse each token: optional sign, optional coeff, SYMBOL, contractCode
    // e.g. "+2*RBH27"  →  { coeff: 2, symbol: "RB", code: "H27" }
    //      "-RBJ27"    →  { coeff: -1, symbol: "RB", code: "J27" }
    //      "+3*HOH27"  →  { coeff: 3, symbol: "HO", code: "H27" }
    const termRe = /^([+-])(\d+(?:\.\d+)?\*)?([A-Z]{1,3})([A-Z]\d{2})$/;

    type ParsedTerm = { coeff: number; symbolTicker: string; code: string };
    const parsed: ParsedTerm[] = [];
    for (const tok of tokens) {
        const m = termRe.exec(tok);
        if (!m) return null; // unknown form — bail
        const sign = m[1] === "-" ? -1 : 1;
        const coeff = m[2] ? sign * parseFloat(m[2].slice(0, -1)) : sign * 1;
        if (!Number.isFinite(coeff)) return null;
        parsed.push({ coeff, symbolTicker: m[3], code: m[4] });
    }
    if (parsed.length === 0) return null;

    // Group by symbol ticker
    const bySymbol = new Map<string, ParsedTerm[]>();
    for (const t of parsed) {
        const list = bySymbol.get(t.symbolTicker) ?? [];
        list.push(t);
        bySymbol.set(t.symbolTicker, list);
    }
    if (bySymbol.size > maxRows) return null; // more symbols than allowed rows

    const rows: SymbolMatrix[] = [];
    for (const [ticker, terms] of bySymbol) {
        const product = universe.find((p) => p.symbol === ticker);
        if (!product) return null;
        const baseCells = CellsBySymbol(product);
        const cellMap = new Map(baseCells.map((c) => [c.code, 0]));
        for (const t of terms) {
            if (!cellMap.has(t.code)) return null; // contract not in product
            cellMap.set(t.code, t.coeff);
        }
        const cells: Cell[] = baseCells.map((c) => ({ code: c.code, value: cellMap.get(c.code) ?? 0 }));
        rows.push({ id: uuidv4(), symbol: product, cells, enabled: true });
    }
    return rows.length > 0 ? { matrix: rows, de } : null;
}

// ─── Alert → chart overlay markers ────────────────────────────────────────────

/**
 * Converts a Falcon-shaped alert condition into chart overlay markers (the
 * shape `LineChartWidget` consumes). Use this from any widget that wants to
 * pop the quick-view modal *with the alert threshold drawn on the chart* —
 * e.g. `SeasonalityAlertsWidget` (T6.1) on row click, or the watchlist
 * widget when the row's expression has an active alert.
 *
 * The output type intentionally mirrors `LineChartWidget`'s `OverlayMarker`
 * shape but is declared inline here so this util has no cross-package import
 * cycle. Consumers can pass the result straight into `overlayMarkers` on
 * either the widget or a `chart:quick-view` payload.
 */
export type AlertOverlayMarker = { 
    value: number; 
    style?: "dashed" | "solid";
    draggable?: boolean;
    id?: string;
};

export function alertConditionToOverlayMarkers(
    condition: { type: ">" | "<" | "inRange"; value: { lhs?: string; rhs?: number; low?: number; high?: number } },
    alertId?: string
): AlertOverlayMarker[] | undefined {
    const v = condition.value;
    if (condition.type === "inRange") {
        const out: AlertOverlayMarker[] = [];
        if (typeof v.low === "number") out.push({ value: v.low, style: "dashed", id: alertId, draggable: !!alertId });
        if (typeof v.high === "number") out.push({ value: v.high, style: "dashed", id: alertId, draggable: !!alertId });
        return out.length ? out : undefined;
    }
    return typeof v.rhs === "number"
        ? [{ value: v.rhs, style: "dashed", id: alertId, draggable: !!alertId }]
        : undefined;
}

// ─── Year extraction utilities ────────────────────────────────────────────────

export function extractYearFromName(name: string): string[] {
    const match = name.match(/(?<=[FGHJKMNQUVXZ])(\d{2})\b/g);
    return match ? [match[0]] : [];
}

export function extractYearWithMonthFromName(name: string): string | string[] {
    const match = name.match(/([FGHJKMNQUVXZ]\d{2})\b/g);
    return match ? match[0] : [];
}

// ─── DataItem factory ─────────────────────────────────────────────────────────

export function newDataItem(type: ChartType, expr: string): DataItem {
    return { uid: uuidv4(), type, data: undefined, expr };
}

// ─── SymbolMatrix factory helpers ─────────────────────────────────────────────

/** Build a SymbolMatrix row array from the first `size` contracts in the list. */
export function symbolToSymbolMatrix(
    productContracts: ProductContract[],
    size: number
): SymbolMatrix[] {
    return productContracts.slice(0, size).map((s) => ({
        id: uuidv4(),
        symbol: s,
        cells: CellsBySymbol(s),
        enabled: true,
    }));
}

/**
 * Like symbolToSymbolMatrix but filters + orders by a fixed symbol list
 * (RB, HO, CL, NG) before slicing — matches Falcon's contract-tab default.
 */
export function symbolToSymbolMatrixContract(
    productContracts: ProductContract[],
    size: number
): SymbolMatrix[] {
    const symbolOrder = ["RB", "HO", "CL", "NG"];
    const filtered = productContracts
        .filter((s) => symbolOrder.includes(s.symbol))
        .sort((a, b) => symbolOrder.indexOf(a.symbol) - symbolOrder.indexOf(b.symbol));
    return symbolToSymbolMatrix(filtered, size);
}

// ─── Expiry utilities ─────────────────────────────────────────────────────────

/**
 * Parses an expression string and returns all unique contract codes found.
 * e.g. "CLH27 + CLJ27 - 2*CLK27" → ["CLH27", "CLJ27", "CLK27"]
 */
export function parseContractCodes(expression: string): string[] {
    return Array.from(new Set(expression.match(/\b[A-Z0-9]{1,3}[A-Z]\d{2}\b/g) ?? []));
}

/**
 * Returns the earliest expiry date across all contracts referenced in the expression.
 * Returns a fallback string if none are found or all have expired without a successor.
 */
export function getExpiry(expression: string, productContractData: ProductContract[]): string {
    const contractCodes = parseContractCodes(expression);
    const expiryDates: string[] = [];

    contractCodes.forEach((contract) => {
        const symbol = contract.slice(0, contract.length - 3);
        const contractCode = contract.slice(-3);
        const product = productContractData.find((p) => p.symbol === symbol);
        const expiry = product?.contracts.find((c) => c.contractCode === contractCode)?.expiry;
        if (expiry) expiryDates.push(expiry);
    });

    if (expiryDates.length === 0) return "Expired but next contract not active yet";
    return expiryDates.reduce((min, d) => (d < min ? d : min));
}

/**
 * Builds a flat map of all contract codes → their expiry dates
 * across every product in the list. Useful for bulk expiry lookups.
 */
export function getExpiryContract(productContracts: ProductContract[]): Record<string, string> {
    return productContracts.reduce<Record<string, string>>((acc, product) => {
        product.contracts.forEach((c) => {
            acc[product.symbol + c.contractCode] = c.expiry;
        });
        return acc;
    }, {});
}