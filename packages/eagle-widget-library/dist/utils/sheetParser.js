/** Convert A1, B2 etc. to column index (0-based) */
export function colLetterToIndex(letter) {
    let index = 0;
    for (let i = 0; i < letter.length; i++) {
        index = index * 26 + letter.charCodeAt(i) - 64;
    }
    return index - 1;
}
/** Parses A1:C10 string to a RangeConfig object */
export function parseRange(rangeStr) {
    const parts = rangeStr.split('!'); // e.g., Sheet1!A1:B10
    const areaStr = parts.length > 1 ? parts[1] : parts[0];
    const [start, end] = areaStr.split(':');
    // Parse A1 -> column A, row 1
    const parseCellStr = (cellStr) => {
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
export async function normalizeSheetData(rawData, strategy) {
    if (strategy.useAutoParser) {
        // Auto-generation logic: assume the very first row contains the headers (keys)
        if (!rawData || rawData.length === 0)
            return [];
        const headers = rawData[0];
        const dataRows = rawData.slice(1);
        return dataRows.map(row => {
            const rowObj = {};
            headers.forEach((header, index) => {
                if (header !== null && header !== undefined && header !== "") {
                    rowObj[header.toString()] = row[index];
                }
            });
            return rowObj;
        });
    }
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
            }
            else {
                console.error('Failed to normalize data, endpoint returned:', res.status);
            }
        }
        catch (e) {
            console.error('Network failure while normalizing data via endpoint:', e);
        }
    }
    // Default fallback: return raw data if no parsing triggered
    return rawData;
}
