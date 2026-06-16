const MONTH_CODE_TO_NAME: Record<string, string> = {
    F: "Jan", G: "Feb", H: "Mar", J: "Apr", K: "May", M: "Jun",
    N: "Jul", Q: "Aug", U: "Sep", V: "Oct", X: "Nov", Z: "Dec",
};

/**
 * Parse a futures symbol into its product and human-readable contract label.
 * Convention: last 2 chars = year, 3rd-from-last char = month code, everything before = product.
 * Example: "CLH26" → { product: "CL", label: "MAR26" }; "M2KM25" → { product: "M2K", label: "JUN25" }
 */
export function parseSymbol(symbol: string): { product: string; label: string } | null {
    if (symbol.length < 4) return null;
    const year = symbol.slice(-2);
    const monthCode = symbol.slice(-3, -2);
    const product = symbol.slice(0, -3);
    if (!/^\d{2}$/.test(year)) return null;
    const month = MONTH_CODE_TO_NAME[monthCode.toUpperCase()];
    if (!month) return null;
    if (!product) return null;
    return { product: product.toUpperCase(), label: `${month}${year}`.toUpperCase() };
}