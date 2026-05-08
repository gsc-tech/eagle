import type { SheetDependencyConfig } from '../types';

/** Convert A1, B2 etc. to column index (0-based) */
export function colLetterToIndex(letter: string): number {
    let index = 0;
    for (let i = 0; i < letter.length; i++) {
        index = index * 26 + letter.charCodeAt(i) - 64;
    }
    return index - 1;
}

/** Parses A1:C10 string to a RangeConfig object */
export function parseRange(rangeStr: string) {
    const parts = rangeStr.split('!'); // e.g., Sheet1!A1:B10
    const areaStr = parts.length > 1 ? parts[1] : parts[0];
    const [start, end] = areaStr.split(':');

    // Parse A1 -> column A, row 1
    const parseCellStr = (cellStr: string) => {
        const colMatch = cellStr.match(/[A-Z]+/);
        const rowMatch = cellStr.match(/[0-9]+/);
        const col = colMatch ? colLetterToIndex(colMatch[0]) : 0;
        const row = rowMatch ? parseInt(rowMatch[0], 10) - 1 : 0; // 0-indexed
        return { col, row };
    };

    const startCell = parseCellStr(start);
    const endCell = end ? parseCellStr(end) : startCell;

    return {
        startRow: startCell.row,
        startCol: startCell.col,
        endRow: endCell.row,
        endCol: endCell.col
    };
}

export function gridToRecords(rawData: any[][]): Record<string, any>[] {
    if (!rawData || rawData.length < 2) return [];
    const headers = rawData[0];
    const dataRows = rawData.slice(1);

    return dataRows.map(row => {
        const rowObj: Record<string, any> = {};
        headers.forEach((header, index) => {
            if (header !== null && header !== undefined && header !== "") {
                rowObj[String(header)] = row[index];
            }
        });
        return rowObj;
    });
}

export function recordsToSeries(records: Record<string, any>[]): Record<string, any[]> {
    if (!records || records.length === 0) return {};
    const series: Record<string, any[]> = {};
    
    // Create an array for every key found in any record
    // Usually the first record defines all keys, but we can be safe
    const allKeys = Array.from(new Set(records.flatMap(r => Object.keys(r))));
    allKeys.forEach(key => {
        series[key] = records.map(record => record[key]);
    });
    return series;
}

export async function normalizeSheetData(
    rawData: any[][],
    strategy: SheetDependencyConfig['parsingStrategy']
) {
    let result: any = rawData;

    if (strategy.normalizationEndpoint) {
        // POST to custom dev endpoint
        try {
            const res = await fetch(strategy.normalizationEndpoint.endpointUrl, {
                method: strategy.normalizationEndpoint.method || 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...strategy.normalizationEndpoint.headers
                },
                body: JSON.stringify({ data: rawData })
            });
            if (res.ok) {
                return await res.json();
            } else {
                console.error('Failed to normalize data, endpoint returned:', res.status);
            }
        } catch (e) {
            console.error('Network failure while normalizing data via endpoint:', e);
        }
    }

    // Determine target format
    const format = strategy.format || 'records';

    if (format === 'records') {
        result = gridToRecords(Array.isArray(result) ? result : rawData);
    } else if (format === 'series') {
        const records = gridToRecords(Array.isArray(result) ? result : rawData);
        result = recordsToSeries(records);
    }

    console.log(`[sheetParser] Normalized data (format: ${format}):`, result);
    return result;
}
