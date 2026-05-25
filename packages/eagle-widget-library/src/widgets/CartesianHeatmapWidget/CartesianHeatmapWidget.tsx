import React, { useEffect, useMemo, useState } from "react";
import ReactECharts from "echarts-for-react";
import { WidgetContainer } from "../../components/WidgetContainer";
import type { ParameterValues } from "../../types";
import { useWidgetData } from "../../hooks/useWidgetData";
import { useSheetDependency } from "../../hooks/useSheetDependency";
import { useParameterDefaults } from "../../hooks/useParameterDefaults";
import {
    fallbackXLabels, fallbackYLabels, GROUP_ID_OFFSET, GROUP_IDS,
    type CartesianHeatmapWidgetProps, type ParsedHeatmapData,
} from "./cartesianHeatmapConfig";
import { processSheetData, processApiData, buildChartOption, buildVisualMapPieces } from "./cartesianHeatmapUtils";

export const CartesianHeatmapWidget: React.FC<CartesianHeatmapWidgetProps> = ({
    id,
    title = "Grouped Cartesian Heatmap",
    parameters = [],
    darkMode = false,
    xLabels,
    yLabels,
    heatmapGroups,
    apiDataConfig,
    visualMapOverride,
    valueFormatter,
    xAxisLabelRotate,
    onGroupedParametersChange,
    groupedParametersValues,
    apiUrl = null,
    sheetDependency,
    staticData,
    isTokenRequired,
    getFirebaseToken,
    initialWidgetState,
    onWidgetStateChange,
    ...props
}) => {
    const defaultParams = useParameterDefaults(parameters);
    const [currentParams, setCurrentParams] = useState<ParameterValues>(
        () => initialWidgetState?.parameters || defaultParams
    );

    useEffect(() => {
        if (onWidgetStateChange) onWidgetStateChange({ parameters: currentParams });
    }, [currentParams, onWidgetStateChange]);

    const shouldFetchApi = apiUrl !== null && !sheetDependency?.isDependent;
    let routeData: any = null;
    if (shouldFetchApi) {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const { data } = useWidgetData(apiUrl as string, {
            parameters: currentParams,
            pollInterval: apiDataConfig?.pollInterval,
            isTokenRequired,
            getFirebaseToken,
        });
        routeData = data;
    }

    const { sheetData } = useSheetDependency(sheetDependency);
    const rawData = staticData ?? (sheetDependency?.isDependent ? sheetData : routeData);

    const [stabledData, setOptimizedData] = React.useState<any>(null);
    const prevDataRef = React.useRef<string>("");

    React.useEffect(() => {
        const dataStr = JSON.stringify(rawData);
        if (dataStr !== prevDataRef.current) {
            prevDataRef.current = dataStr;
            setOptimizedData(rawData);
        }
    }, [rawData]);

    const parsed = useMemo<ParsedHeatmapData | null>(() => {
        if (sheetDependency?.isDependent && stabledData && typeof stabledData === "object" && !Array.isArray(stabledData)) {
            return processSheetData(stabledData as Record<string, any[]>);
        }
        if (apiDataConfig && stabledData && Array.isArray(stabledData) && stabledData.length > 0) {
            return processApiData(stabledData, apiDataConfig);
        }
        if (stabledData && Array.isArray(stabledData) && stabledData.length > 0) {
            const finalXLabels = xLabels || fallbackXLabels;
            const finalYLabels = yLabels || fallbackYLabels;
            const isCoordArray = Array.isArray(stabledData[0]);
            const mappedData = isCoordArray
                ? stabledData
                : stabledData.map((d: any) => [
                    finalXLabels.indexOf(d.$x || d.x || d.category || "X"),
                    finalYLabels.indexOf(d.$y || d.y || d.name || "Y"),
                    Number(d.$value !== undefined ? d.$value : d.value !== undefined ? d.value : 0),
                ]);
            // Group placeholders only make sense when the caller has supplied
            // `heatmapGroups`. Otherwise (e.g. seasonality use), preserve real
            // zero/NaN values as data — rewriting them to a group offset would
            // hide them behind the "—" placeholder label.
            const hasGroups = (heatmapGroups?.length ?? 0) > 0;
            const finalData = mappedData.map((d: any) => {
                const group = (heatmapGroups || []).find((g) => g.rows.includes(d[1]));
                const groupName = group?.name || "Other";
                if (hasGroups && (d[2] === 0 || isNaN(d[2]))) {
                    const gid = GROUP_IDS[groupName] || GROUP_IDS["Other"];
                    return [d[0], d[1], GROUP_ID_OFFSET - gid, groupName];
                }
                return [...d, groupName];
            });
            const numericVals = finalData.map((d: any) => d[2]).filter((v: any) => v > GROUP_ID_OFFSET && v !== 0);
            const pieces = buildVisualMapPieces(numericVals);
            return {
                xLabels: finalXLabels, yLabels: finalYLabels,
                series: [{
                    name: "Heatmap", type: "heatmap", data: finalData,
                    label: { show: true, fontSize: 10, formatter: (p: any) => p.data[2] <= GROUP_ID_OFFSET ? "" : p.data[2] },
                    emphasis: { itemStyle: { shadowBlur: 10, shadowColor: "rgba(0,0,0,0.5)" } },
                }],
                visualMaps: [{ type: "piecewise", show: false, seriesIndex: 0, pieces, dimension: 2 }],
            };
        }
        return {
            xLabels: xLabels || fallbackXLabels,
            yLabels: yLabels || fallbackYLabels,
            series: [],
            visualMaps: [],
        };
    }, [xLabels, yLabels, heatmapGroups, stabledData, sheetDependency, apiDataConfig]);

    const option = useMemo(
        () => (parsed ? buildChartOption(parsed, darkMode, { visualMapOverride, valueFormatter, xAxisLabelRotate }) : {}),
        [parsed, darkMode, visualMapOverride, valueFormatter, xAxisLabelRotate],
    );

    const chartWidth = useMemo(() => {
        const count = parsed?.xLabels.length || (xLabels?.length ?? fallbackXLabels.length);
        return `${count * 40}px`;
    }, [parsed, xLabels]);

    const hasData = useMemo(() => {
        if (!stabledData) return false;
        if (Array.isArray(stabledData)) return stabledData.length > 0;
        if (typeof stabledData === "object") return Object.values(stabledData).some((val) => Array.isArray(val) && (val as any[]).length > 0);
        return false;
    }, [stabledData]);

    return (
        <WidgetContainer
            title={title}
            parameters={parameters}
            darkMode={darkMode}
            onGroupedParametersChange={onGroupedParametersChange}
            groupedParametersValues={groupedParametersValues}
            onParametersChange={(values: ParameterValues) => setCurrentParams(values)}
            initialParameterValues={currentParams}
            {...props}
        >
            {!hasData ? (
                <div className="flex items-center justify-center h-full w-full">
                    <span className={`text-sm font-medium ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                        No data available
                    </span>
                </div>
            ) : (
                <>
                    <div className="w-full h-full overflow-x-auto overflow-y-hidden custom-scrollbar">
                        <div style={{ width: chartWidth, height: "100%", minWidth: "100%" }}>
                            <ReactECharts option={option} notMerge style={{ height: "100%", width: "100%" }} theme={darkMode ? "dark" : "light"} />
                        </div>
                    </div>
                    <style>{`
                        .custom-scrollbar::-webkit-scrollbar { height: 6px; }
                        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                        .custom-scrollbar::-webkit-scrollbar-thumb { background: ${darkMode ? "#334155" : "#cbd5e1"}; border-radius: 10px; }
                        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: ${darkMode ? "#475569" : "#94a3b8"}; }
                    `}</style>
                </>
            )}
        </WidgetContainer>
    );
};

export const CartesianHeatmapWidgetDef = { component: CartesianHeatmapWidget };