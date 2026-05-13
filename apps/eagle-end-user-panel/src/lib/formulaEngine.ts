/* eslint-disable @typescript-eslint/no-explicit-any */

export interface FormulaStep {
    outputColumn: string;
    /** Arithmetic expression using column names as variables, e.g. "(revenue - cost) / revenue * 100" */
    expression: string;
}

/**
 * Safely evaluates an arithmetic expression string, replacing column names with
 * their numeric row values. Only numbers and operators are allowed after substitution.
 */
export function evalExpression(
    expr: string,
    row: Record<string, any>,
    columns: string[]
): number {
    // Sort by length descending so longer names replace before shorter ones (avoids partial match)
    const sortedCols = [...columns].sort((a, b) => b.length - a.length);

    let sanitized = expr.trim();

    for (const col of sortedCols) {
        const val = Number(row[col]);
        const escaped = col.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        sanitized = sanitized.replace(new RegExp(`\\b${escaped}\\b`, "g"), isNaN(val) ? "0" : String(val));
    }

    // After substitution, only safe arithmetic chars should remain
    if (!/^[\d\s+\-*/().eE]+$/.test(sanitized)) return NaN;

    try {
        // eslint-disable-next-line no-new-func
        const result = Function('"use strict"; return (' + sanitized + ")")();
        return typeof result === "number" ? result : NaN;
    } catch {
        return NaN;
    }
}

/**
 * Applies formula steps sequentially to each row.
 * Each step adds a computed column; later steps can reference earlier computed columns.
 */
export function applyFormulas(
    rows: Record<string, any>[],
    steps: FormulaStep[]
): Record<string, any>[] {
    if (!steps.length) return rows;
    return rows.map((row) => {
        const result = { ...row };
        for (const step of steps) {
            if (!step.outputColumn || !step.expression) continue;
            const allCols = Object.keys(result);
            result[step.outputColumn] = evalExpression(step.expression, result, allCols);
        }
        return result;
    });
}

/**
 * Parses a CSV string into headers + rows.
 * Handles quoted fields containing commas or newlines.
 */
export function parseCsv(text: string): { headers: string[]; rows: Record<string, any>[] } {
    const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
    const nonEmpty = lines.filter((l) => l.trim() !== "");
    if (nonEmpty.length === 0) return { headers: [], rows: [] };

    const parseRow = (line: string): string[] => {
        const fields: string[] = [];
        let current = "";
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (ch === '"') {
                if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
                else inQuotes = !inQuotes;
            } else if (ch === "," && !inQuotes) {
                fields.push(current.trim());
                current = "";
            } else {
                current += ch;
            }
        }
        fields.push(current.trim());
        return fields;
    };

    const headers = parseRow(nonEmpty[0]);
    const rows = nonEmpty.slice(1).map((line) => {
        const values = parseRow(line);
        const row: Record<string, any> = {};
        headers.forEach((h, i) => {
            const raw = values[i] ?? "";
            const num = Number(raw);
            row[h] = raw !== "" && !isNaN(num) ? num : raw;
        });
        return row;
    });

    return { headers, rows };
}
