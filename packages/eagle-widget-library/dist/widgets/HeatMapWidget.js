"use client";
import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { WidgetContainer } from "../components/WidgetContainer";
import { useParameterDefaults } from "../hooks/useParameterDefaults";
import { useWidgetData } from "../hooks/useWidgetData";
// @ts-ignore - cal-heatmap types are not properly exported
import * as CalHeatmapModule from 'cal-heatmap';
import 'cal-heatmap/cal-heatmap.css';
const CalHeatmap = CalHeatmapModule.default || CalHeatmapModule;
export const HeatMapWidget = ({ apiUrl = "http://localhost:8080/api/data", title, parameters, range = 12, domainType = 'month', subDomainType = 'day', domainSort = 'asc', startDate, colorSchemeLight = 'Greens', colorSchemeDark = 'Blues', dateField = 'date', valueField = 'value', darkMode = false, onGroupedParametersChange, groupedParametersValues, }) => {
    const defaultParams = useParameterDefaults(parameters);
    const [currentParams, setCurrentParams] = useState(defaultParams);
    const heatMapRef = useRef(null);
    const calInstanceRef = useRef(null);
    const chartId = useId();
    const { data } = useWidgetData(apiUrl, {
        parameters: currentParams,
    });
    const handleParametersChange = (values) => {
        setCurrentParams(values);
    };
    const processedData = useMemo(() => {
        if (!data || !Array.isArray(data))
            return [];
        return data.map((item) => {
            const date = new Date(item[dateField]);
            return {
                date: date.getTime(), // ✅ timestamp
                value: Number(item[valueField] || 0),
            };
        });
    }, [data, dateField, valueField]);
    useEffect(() => {
        if (!heatMapRef.current || processedData.length === 0)
            return;
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
    return (_jsx(WidgetContainer, { title: title, parameters: parameters, onParametersChange: handleParametersChange, darkMode: darkMode, onGroupedParametersChange: onGroupedParametersChange, groupedParametersValues: groupedParametersValues, children: _jsx("div", { className: "w-full h-full overflow-auto p-4", children: processedData.length === 0 ? (_jsx("div", { className: "flex items-center justify-center h-full text-gray-500", children: "No data available" })) : (_jsx("div", { id: chartId, ref: heatMapRef, className: "w-full h-full" })) }) }));
};
export const HeatMapWidgetDef = {
    component: HeatMapWidget,
};
