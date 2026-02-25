import { SheetDependencyConfig } from '../types';
/** Convert A1, B2 etc. to column index (0-based) */
export declare function colLetterToIndex(letter: string): number;
/** Parses A1:C10 string to a RangeConfig object */
export declare function parseRange(rangeStr: string): {
    startRow: number;
    startCol: number;
    endRow: number;
    endCol: number;
};
export declare function normalizeSheetData(rawData: any[][], strategy: SheetDependencyConfig['parsingStrategy']): Promise<any>;
