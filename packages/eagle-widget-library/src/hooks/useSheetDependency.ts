import { useState, useEffect, useId } from 'react';
import { useSheetStore } from '../store/sheetStore';
import { SheetDependencyConfig } from '../types';
import { parseRange, normalizeSheetData } from '../utils/sheetParser';

export function useSheetDependency(dependency?: SheetDependencyConfig) {
    const [sheetData, setSheetData] = useState<any[] | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const widgetId = useId();

    useEffect(() => {
        if (!dependency || !dependency.isDependent || !dependency.sheetId || !dependency.range) {
            setSheetData(null);
            return;
        }

        const { sheetId: sheetWidgetId, range, parsingStrategy } = dependency;

        let parsedRange;
        try {
            parsedRange = parseRange(range);
        } catch (e) {
            console.error("[useSheetDependency] Invalid range format:", range);
            return;
        }

        let isMounted = true;
        setIsLoading(true);

        const handleDataUpdate = async (rawData: any[][]) => {
            if (!isMounted) return;
            setIsLoading(true);
            try {
                // Tier 1 & 3: Run normalization step first (AutoParser or Backend POST)
                const normalizedData = await normalizeSheetData(rawData, parsingStrategy);

                // Tier 2: Explicit Mapping
                let finalData = normalizedData;
                if (parsingStrategy.mapping && Array.isArray(normalizedData)) {
                    const { xAxis, yAxis, series } = parsingStrategy.mapping;

                    // The mapping essentially guarantees standard keys ($x, $y) exist
                    // so the dependent widgets don't have to guess.
                    finalData = normalizedData.map(row => {
                        const mappedRow: Record<string, any> = { ...row };

                        // Standardize basic X/Y mapping if present
                        if (xAxis && row[xAxis] !== undefined) {
                            mappedRow.$x = row[xAxis];
                        }
                        if (yAxis && row[yAxis] !== undefined) {
                            mappedRow.$y = row[yAxis];
                        }
                        return mappedRow;
                    });
                }

                if (isMounted) {
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
        store.subscribe(sheetWidgetId, widgetId, parsedRange, handleDataUpdate);

        return () => {
            isMounted = false;
            store.unsubscribe(sheetWidgetId, widgetId);
        };
    }, [dependency, widgetId]);

    return { sheetData, isLoading };
}
