import { useState, useEffect, useId } from 'react';
import { useSheetStore, extractSheetAsGrid } from '../store/sheetStore';
import { SheetDependencyConfig } from '../types';
import { parseRange, normalizeSheetData } from '../utils/sheetParser';

export function useSheetDependency(dependency?: SheetDependencyConfig) {
    const [sheetData, setSheetData] = useState<any[] | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const widgetId = useId();

    useEffect(() => {
        if (!dependency || !dependency.isDependent || !dependency.workbookId) {
            setSheetData(null);
            return;
        }

        const { workbookId, sheetNames, ranges, parsingStrategy } = dependency;

        const parsedRanges: any[] = [];

        if (ranges && ranges.length > 0) {
            for (const rangeStr of ranges) {
                if (rangeStr && rangeStr.trim() !== "") {
                    try {
                        const parsed = parseRange(rangeStr);
                        parsedRanges.push(parsed);
                    } catch (e) {
                        console.error("[useSheetDependency] Invalid range format:", rangeStr);
                    }
                }
            }
        }

        // Unique sheet names from both explicitly provided names and those found in range strings
        const finalSheetNames = Array.from(new Set(sheetNames || []));

        let isMounted = true;
        setIsLoading(true);

        const handleDataUpdate = async (rawData: any) => {
            if (!isMounted) return;
            setIsLoading(true);
            try {
                const processArrayData = async (dataArray: any[][]) => {
                    const normalizedData = await normalizeSheetData(dataArray, parsingStrategy);
                    return normalizedData;
                };

                let finalData: any;

                if (Array.isArray(rawData)) {
                    finalData = await processArrayData(rawData);
                } else if (typeof rawData === 'object' && rawData !== null) {
                    finalData = {};
                    for (const [key, value] of Object.entries(rawData)) {
                        if (Array.isArray(value)) {
                            finalData[key] = await processArrayData(value);
                        } else {
                            finalData[key] = value; // Retain full SheetData objects if no ranges provided
                        }
                    }
                } else {
                    // If rawData is neither an array nor an object, treat it as is.
                    // This case should ideally not happen if the store consistently returns arrays or objects of arrays.
                    finalData = rawData;
                }

                if (isMounted) {
                    console.log(`[useSheetDependency] Setting sheetData for widget ${widgetId}:`, finalData);
                    setSheetData(finalData);
                }
            } catch (err) {
                console.error("[useSheetDependency] Error processing data:", err);
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        const store = useSheetStore.getState();
        store.subscribe(workbookId, widgetId, finalSheetNames, parsedRanges, handleDataUpdate);

        return () => {
            isMounted = false;
            store.unsubscribe(workbookId, widgetId);
        };
    }, [dependency, widgetId]);

    return { sheetData, isLoading };
}
