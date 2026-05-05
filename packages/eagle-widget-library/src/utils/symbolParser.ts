const MONTH_CODE_TO_NAME: Record<string, string> = {
    F: "Jan", G: "Feb", H: "Mar", J: "Apr", K: "May", M: "Jun",
    N: "Jul", Q: "Aug", U: "Sep", V: "Oct", X: "Nov", Z: "Dec",
};

/**
 * Parse a futures symbol into its product and human-readable contract label.
 * Example: "CLH26" → { product: "CL", label: "MAR26" }
 */
export function parseSymbol(symbol: string): { product: string; label: string } | null {
    const match = symbol.match(/^([A-Z]+)([FGHJKMNQUVXZ])(\d{2})$/i);
    if (!match) return null;
    const [, product, monthCode, year] = match;
    const month = MONTH_CODE_TO_NAME[monthCode.toUpperCase()];
    if (!month) return null;
    return { product: product.toUpperCase(), label: `${month}${year}`.toUpperCase() };
}