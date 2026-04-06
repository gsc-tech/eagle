"use client"

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { WidgetContainer } from "../components/WidgetContainer";
import { useParameterDefaults } from "../hooks/useParameterDefaults";
import type { BaseWidgetProps, ParameterValues } from "../types";
import { useWidgetData } from "../hooks/useWidgetData";
// @ts-ignore - cal-heatmap types are not properly exported
import * as CalHeatmapModule from 'cal-heatmap';
import 'cal-heatmap/cal-heatmap.css';

const CalHeatmap = (CalHeatmapModule as any).default || CalHeatmapModule;

export interface HeatMapWidgetProps extends BaseWidgetProps {
    range?: number;
    domainType?: 'year' | 'month' | 'week' | 'day' | 'hour';
    subDomainType?: 'year' | 'month' | 'week' | 'day' | 'hour' | 'minute';
    domainSort?: 'asc' | 'desc';
    startDate?: Date | string;
    colorSchemeLight?: string;  // scheme name from d3-scale-chromatic
    colorSchemeDark?: string;  // scheme name from d3-scale-chromatic
    dateField?: string;    // field name for date in API response
    valueField?: string;   // field name for value in API response
}

export const HeatMapWidget: React.FC<HeatMapWidgetProps & { darkMode?: boolean }> = ({
    apiUrl = "http://localhost:8080/api/data",
    title,
    parameters,
    range = 12,
    domainType = 'month',
    subDomainType = 'day',
    domainSort = 'asc',
    startDate,
    colorSchemeLight = 'Greens',
    colorSchemeDark = 'Blues',
    dateField = 'date',
    valueField = 'value',
    darkMode = false,
    onGroupedParametersChange,
    groupedParametersValues,
    initialWidgetState,
    onWidgetStateChange,
}) => {
    const defaultParams = useParameterDefaults(parameters);
    const [currentParams, setCurrentParams] = useState<ParameterValues>(() => {
        return initialWidgetState?.parameters || defaultParams;
    });

    useEffect(() => {
        if (onWidgetStateChange) {
            onWidgetStateChange({ parameters: currentParams });
        }
    }, [currentParams, onWidgetStateChange]);
    const heatMapRef = useRef<HTMLDivElement>(null);
    const calInstanceRef = useRef<any>(null);

    const chartId = useId();

    const { data } = useWidgetData(apiUrl as string, {
        parameters: currentParams,
    });

    const handleParametersChange = (values: ParameterValues) => {
        setCurrentParams(values);
    };

    const processedData = useMemo(() => {
        if (!data || !Array.isArray(data)) return [];

        return data.map((item: any) => {
            const date = new Date(item[dateField]);

            return {
                date: date.getTime(),   // ✅ timestamp
                value: Number(item[valueField] || 0),
            };
        });
    }, [data, dateField, valueField]);


    useEffect(() => {
        if (!heatMapRef.current || processedData.length === 0) return;
        const minDate = Math.min(...processedData.map(d => d.date));
        const maxValue = Math.max(...processedData.map(d => d.value), 1);

        if (calInstanceRef.current) {
            calInstanceRef.current.destroy();
            calInstanceRef.current = null;
        }

        const cal = new CalHeatmap();
        calInstanceRef.current = cal;

        cal.paint({
            theme: darkMode ? 'dark' : 'light',
            itemSelector: `#${chartId}`,
            range: range,
            domain: {
                type: domainType,
                sort: domainSort,
            },
            subDomain: {
                type: subDomainType,
            },
            date: {
                start: startDate ? new Date(startDate) : new Date(minDate),
            },
            data: {
                source: processedData,
                x: 'date',
                y: 'value',
            },
            scale: {
                color: {
                    scheme: darkMode ? colorSchemeDark : colorSchemeLight,
                    type: 'linear',
                    domain: [0, maxValue],
                }

            }
        });

        // Cleanup on unmount
        return () => {
            if (calInstanceRef.current) {
                calInstanceRef.current.destroy();
                calInstanceRef.current = null;
            }
        };
    }, [processedData, range, domainType, subDomainType, domainSort, startDate, colorSchemeLight, colorSchemeDark, darkMode]);

    return (
        <WidgetContainer
            title={title}
            parameters={parameters}
            onParametersChange={handleParametersChange}
            darkMode={darkMode}
            initialParameterValues={currentParams}
            onGroupedParametersChange={onGroupedParametersChange}
            groupedParametersValues={groupedParametersValues}
        >
            <div className="w-full h-full overflow-auto p-4">
                {processedData.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-500">
                        No data available
                    </div>
                ) : (
                    <div id={chartId} ref={heatMapRef} className="w-full h-full" />
                )}
            </div>
        </WidgetContainer>
    );
};

export const HeatMapWidgetDef = {
    component: HeatMapWidget,
};