import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { WidgetContainer } from '../components/WidgetContainer';
import type { BaseWidgetProps, ParameterValues } from '../types';
import { useWidgetData } from '../hooks/useWidgetData';
import { useSheetDependency } from '../hooks/useSheetDependency';
import { useParameterDefaults } from '../hooks/useParameterDefaults';

export interface CartesianHeatmapWidgetProps extends BaseWidgetProps {
    xLabels?: string[];
    yLabels?: string[];
    heatmapGroups?: { name: string; rows: number[]; min: number; max: number; colors: string[] }[];
}

const PRODUCT_GROUPS: Record<string, { fullName: string; groupName: string }> = {
    // Energy
    CL: { fullName: 'CL', groupName: 'Energy' },
    HO: { fullName: 'HO', groupName: 'Energy' },
    NG: { fullName: 'NG', groupName: 'Energy' },
    RB: { fullName: 'RB', groupName: 'Energy' },
    BRN: { fullName: 'BRN', groupName: 'Energy' },
    G: { fullName: 'G', groupName: 'Energy' },
    // Metals
    GC: { fullName: 'GC', groupName: 'Metals' },
    SI: { fullName: 'SI', groupName: 'Metals' },
    PL: { fullName: 'PL', groupName: 'Metals' },
    PA: { fullName: 'PA', groupName: 'Metals' },
    HG: { fullName: 'HG', groupName: 'Metals' },
    // Agriculture
    ZC: { fullName: 'ZC', groupName: 'Agriculture (Grains and OilSeeds)' },
    ZS: { fullName: 'ZS', groupName: 'Agriculture (Grains and OilSeeds)' },
    ZL: { fullName: 'ZL', groupName: 'Agriculture (Grains and OilSeeds)' },
    ZM: { fullName: 'ZM', groupName: 'Agriculture (Grains and OilSeeds)' },
    ZW: { fullName: 'ZW', groupName: 'Agriculture (Grains and OilSeeds)' },
    KE: { fullName: 'KE', groupName: 'Agriculture (Grains and OilSeeds)' },
    // Softs
    KC: { fullName: 'KC', groupName: 'Soft Commodities (ICE)' },
    RC: { fullName: 'RC', groupName: 'Soft Commodities (ICE)' },
    CC: { fullName: 'CC', groupName: 'Soft Commodities (ICE)' },
    C: { fullName: 'C', groupName: 'Soft Commodities (ICE)' },
    CT: { fullName: 'CT', groupName: 'Soft Commodities (ICE)' },
    // Livestock
    LE: { fullName: 'LE', groupName: 'Livestock' },
    GF: { fullName: 'GF', groupName: 'Livestock' },
    HE: { fullName: 'HE', groupName: 'Livestock' },
    // Rates
    ZN: { fullName: 'ZN', groupName: 'Interest Rates/Fixed Income' },
    ZB: { fullName: 'ZB', groupName: 'Interest Rates/Fixed Income' },
    ZF: { fullName: 'ZF', groupName: 'Interest Rates/Fixed Income' },
    ZT: { fullName: 'ZT', groupName: 'Interest Rates/Fixed Income' },
    ZQ: { fullName: 'ZQ', groupName: 'Interest Rates/Fixed Income' },
    SR3: { fullName: 'SR3', groupName: 'Interest Rates/Fixed Income' },
    SR1: { fullName: 'SR1', groupName: 'Interest Rates/Fixed Income' },
    SO3: { fullName: 'SO3', groupName: 'Interest Rates/Fixed Income' },
};

const GROUP_ORDER = [
    'Energy',
    'Metals',
    'Agriculture (Grains and OilSeeds)',
    'Soft Commodities (ICE)',
    'Livestock',
    'Interest Rates/Fixed Income',
    'Other'
];

const GROUP_COLORS: Record<string, string[]> = {
    'Energy': ['#e0f2fe', '#0369a1'], // Blue
    'Metals': ['#fef3c7', '#d97706'], // Amber
    'Agriculture (Grains and OilSeeds)': ['#dcfce7', '#15803d'], // Green
    'Soft Commodities (ICE)': ['#f3e8ff', '#7e22ce'], // Purple
    'Livestock': ['#fee2e2', '#b91c1c'], // Red
    'Interest Rates/Fixed Income': ['#f1f5f9', '#334155'], // Slate
    'Other': ['#f3f4f6', '#4b5563'], // Gray
};

interface ParsedHeatmapData {
    xLabels: string[];
    yLabels: string[];
    series: any[];
    visualMaps: any[];
}

function processSheetData(data: Record<string, any[]>): ParsedHeatmapData {
    // 1. Identify xLabels (Contracts) by taking the UNION across ALL sheets
    let xLabelsSet = new Set<string>();
    let contractKey = 'Contract';
    let valExcelKey = 'NetPosExcel';
    let valMarexKey = 'NetPosMarex';

    const sheets = Object.values(data).filter(Array.isArray);

    if (sheets.length > 0) {
        // Find keys from the first available populated sheet
        const firstSheet = sheets.find(s => s.length > 0) || [];
        const firstObj = firstSheet.find(obj => obj && typeof obj === 'object') || {};
        const keys = Object.keys(firstObj);

        const possibleContractKey = keys.find(k => k.toLowerCase().includes('contract'));
        if (possibleContractKey) contractKey = possibleContractKey;

        const possibleExcelKey = keys.find(k => k.toLowerCase().includes('excel') && k.toLowerCase().includes('netpos'));
        if (possibleExcelKey) valExcelKey = possibleExcelKey;

        const possibleMarexKey = keys.find(k => k.toLowerCase().includes('marex') && k.toLowerCase().includes('netpos'));
        if (possibleMarexKey) valMarexKey = possibleMarexKey;
    }

    // Collect all unique xLabels
    sheets.forEach(sheetData => {
        sheetData.forEach(item => {
            const val = item[contractKey];
            if (val !== undefined && val !== null && val !== '') {
                xLabelsSet.add(String(val).trim());
            }
        });
    });

    let xLabels = Array.from(xLabelsSet);

    // Sort chronologically if labels match typical format (e.g. "MAR26" or "Mar26")
    const monthMap: Record<string, number> = {
        'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
        'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
    };

    xLabels.sort((a, b) => {
        const parseDate = (str: string) => {
            const match = str.match(/^([A-Za-z]{3})(\d{2})$/);
            if (match) {
                const month = monthMap[match[1].toLowerCase()];
                const year = parseInt(match[2], 10);
                if (month !== undefined) {
                    return new Date(2000 + year, month, 1).getTime();
                }
            }
            return null;
        };

        const dateA = parseDate(a);
        const dateB = parseDate(b);

        if (dateA !== null && dateB !== null) return dateA - dateB;
        if (dateA !== null) return -1; // date strings come before text
        if (dateB !== null) return 1;
        return a.localeCompare(b);
    });

    // 2. Identify Groups and Y-Labels
    const sheetsByGroup: Record<string, string[]> = {
        'Energy': [],
        'Metals': [],
        'Agriculture (Grains and OilSeeds)': [],
        'Soft Commodities (ICE)': [],
        'Livestock': [],
        'Interest Rates/Fixed Income': [],
        'Other': []
    };

    const sheetNames = Object.keys(data).filter(k => Array.isArray(data[k]));

    sheetNames.forEach(sheetName => {
        // Strip trailing chars if custom names used. Default assumes sheet name matches code.
        const meta = PRODUCT_GROUPS[sheetName];
        if (meta) {
            sheetsByGroup[meta.groupName].push(sheetName);
        } else {
            sheetsByGroup['Other'].push(sheetName);
        }
    });

    const yLabels: string[] = [];

    // Fill yLabels in grouped visual order
    GROUP_ORDER.forEach(groupName => {
        const sNames = sheetsByGroup[groupName];
        if (sNames && sNames.length > 0) {
            sNames.forEach(sheetName => {
                const meta = PRODUCT_GROUPS[sheetName];
                yLabels.push(meta ? meta.fullName : sheetName);
            });
        }
    });

    // 3. Build Series Data and Visual Maps
    const seriesConfig: any[] = [];
    const visualMapConfig: any[] = [];
    let seriesIndex = 0;

    GROUP_ORDER.forEach(groupName => {
        const sNames = sheetsByGroup[groupName];
        if (!sNames || sNames.length === 0) return;

        const mappedData: (number | string)[][] = [];

        sNames.forEach(sheetName => {
            const rowData = data[sheetName];
            const meta = PRODUCT_GROUPS[sheetName];
            const fullName = meta ? meta.fullName : sheetName;
            const yIndex = yLabels.indexOf(fullName);

            const rowVals = Array(xLabels.length).fill(0);

            rowData.forEach((item: any) => {
                const cVal = item[contractKey];
                const xIndex = xLabels.indexOf(String(cVal || ''));
                if (xIndex === -1) return;

                // Grab value logic
                let val = item[valExcelKey];
                if (val === null || val === undefined || val === '') {
                    val = item[valMarexKey];
                }

                if (val !== null && val !== undefined && val !== '') {
                    rowVals[xIndex] = Number(val);
                }
            });

            rowVals.forEach((val, xIndex) => {
                mappedData.push([xIndex, yIndex, val === 0 ? '-' : val]);
            });
        });

        const numericVals = mappedData.map(d => d[2]).filter((v): v is number => typeof v === 'number');
        const min = numericVals.length > 0 ? Math.min(...numericVals) : 0;
        const max = numericVals.length > 0 ? Math.max(...numericVals) : 100;

        visualMapConfig.push({
            show: false,
            min: min === max ? min - 1 : min,
            max: max === min ? max + 1 : max,
            seriesIndex,
            inRange: { color: GROUP_COLORS[groupName] || GROUP_COLORS['Other'] }
        });

        seriesConfig.push({
            name: groupName,
            type: 'heatmap',
            data: mappedData,
            label: { show: true, fontSize: 10 },
            emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0, 0, 0, 0.5)' } }
        });

        seriesIndex++;
    });

    return { xLabels, yLabels, series: seriesConfig, visualMaps: visualMapConfig };
}

// Dummy configurations for fallback
const fallbackXLabels = ['12a', '1a', '2a', '3a', '4a', '5a', '6a', '7a', '8a', '9a', '10a'];
const fallbackYLabels = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const fallbackGroups = [
    { name: 'Group A', rows: [0, 1, 2, 3], min: 0, max: 10, colors: ['#e0f2fe', '#0369a1'] },
    { name: 'Group B', rows: [4, 5, 6], min: 50, max: 200, colors: ['#f5f3ff', '#6d28d9'] }
];

export const CartesianHeatmapWidget: React.FC<CartesianHeatmapWidgetProps> = ({
    title = 'Grouped Cartesian Heatmap',
    parameters = [],
    darkMode = false,
    xLabels,
    yLabels,
    heatmapGroups,
    onGroupedParametersChange,
    groupedParametersValues,
    apiUrl = null,
    sheetDependency,
    ...props
}) => {
    const defaultParams = useParameterDefaults(parameters);
    const [currentParams, setCurrentParams] = React.useState<ParameterValues>(defaultParams);

    let routeData: any = null;
    if (apiUrl !== null) {
        const { data } = useWidgetData(apiUrl as string, {
            parameters: currentParams,
        });
        routeData = data;
    }

    const { sheetData } = useSheetDependency(sheetDependency);
    const rawData = sheetDependency?.isDependent ? sheetData : routeData;

    const handleParametersChange = (values: ParameterValues) => {
        setCurrentParams(values);
    };

    const option = useMemo(() => {
        // Priority 1: Sheet Data (Option 2 Records mapped into Groups)
        if (sheetDependency?.isDependent && rawData && typeof rawData === 'object' && !Array.isArray(rawData)) {
            const parsed = processSheetData(rawData as Record<string, any[]>);
            return {
                tooltip: { position: 'top', confine: true },
                grid: { top: '30px', bottom: '10px', left: '10px', right: '10px', containLabel: true },
                xAxis: {
                    type: 'category',
                    data: parsed.xLabels,
                    splitArea: { show: true },
                    axisLabel: { interval: 0, rotate: 0, fontSize: 10 }
                },
                yAxis: {
                    type: 'category',
                    data: parsed.yLabels,
                    splitArea: { show: true },
                    axisLabel: { fontSize: 10 }
                },
                visualMap: parsed.visualMaps,
                series: parsed.series
            };
        }

        // Priority 2: API Data or Pre-configured Widget with basic records
        let finalXLabels = xLabels || fallbackXLabels;
        let finalYLabels = yLabels || fallbackYLabels;
        let visualMapConfig: any[] = [];
        let seriesConfig: any[] = [];

        if (routeData && Array.isArray(routeData) && routeData.length > 0) {
            // Assume the API provides `xIndex`, `yIndex`, `val` arrays, or Map from strings if they provide $x, $y
            const isCoordArray = Array.isArray(routeData[0]);

            let mappedData = [];
            if (isCoordArray) {
                mappedData = routeData;
            } else {
                finalXLabels = xLabels || Array.from(new Set(routeData.map((d: any) => d.$x || d.x || d.category || 'X')));
                finalYLabels = yLabels || Array.from(new Set(routeData.map((d: any) => d.$y || d.y || d.name || 'Y')));

                mappedData = routeData.map((d: any) => {
                    const xIndex = finalXLabels.indexOf(d.$x || d.x || d.category || 'X');
                    const yIndex = finalYLabels.indexOf(d.$y || d.y || d.name || 'Y');
                    const val = d.$value !== undefined ? d.$value : (d.value !== undefined ? d.value : 0);
                    const finalVal = Number(val);
                    return [xIndex, yIndex, finalVal === 0 ? '-' : finalVal];
                });
            }

            const numericVals = mappedData.map((d: any) => d[2]).filter((v: any): v is number => typeof v === 'number');
            const min = numericVals.length > 0 ? Math.min(...numericVals) : 0;
            const max = numericVals.length > 0 ? Math.max(...numericVals) : 100;

            const groups = heatmapGroups || [{ name: 'Heatmap', rows: finalYLabels.map((_, i) => i), min, max, colors: ['#e0f2fe', '#0369a1'] }];

            groups.forEach((group, index) => {
                visualMapConfig.push({
                    show: false,
                    min: group.min,
                    max: group.max,
                    seriesIndex: index,
                    inRange: { color: group.colors }
                });

                // Filter data specific for this group's rows
                const groupData = mappedData.filter((d: any) => group.rows.includes(d[1]));

                seriesConfig.push({
                    name: group.name,
                    type: 'heatmap',
                    data: groupData,
                    label: { show: true, fontSize: 10 },
                    emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0, 0, 0, 0.5)' } }
                });
            });
        }

        return {
            tooltip: { position: 'top', confine: true },
            grid: { top: '30px', bottom: '10px', left: '10px', right: '10px', containLabel: true },
            xAxis: {
                type: 'category',
                data: finalXLabels,
                splitArea: { show: true },
                axisLabel: { interval: 0, rotate: 0, fontSize: 10 }
            },
            yAxis: {
                type: 'category',
                data: finalYLabels,
                splitArea: { show: true },
                axisLabel: { fontSize: 10 }
            },
            visualMap: visualMapConfig,
            series: seriesConfig
        };
    }, [xLabels, yLabels, heatmapGroups, rawData, sheetDependency]);

    const { chartWidth, finalXLabelsCount } = useMemo(() => {
        let count = 0;
        if (sheetDependency?.isDependent && rawData && typeof rawData === 'object' && !Array.isArray(rawData)) {
            const parsed = processSheetData(rawData as Record<string, any[]>);
            count = parsed.xLabels.length;
        } else if (routeData && Array.isArray(routeData) && routeData.length > 0) {
            const isCoordArray = Array.isArray(routeData[0]);
            if (isCoordArray) {
                const uniqueX = new Set(routeData.map((d: any) => d[0]));
                count = uniqueX.size;
            } else {
                const uniqueX = new Set(routeData.map((d: any) => d.$x || d.x || d.category || 'X'));
                count = uniqueX.size;
            }
        } else {
            count = xLabels?.length || fallbackXLabels.length;
        }
        
        // 40px per label for compact single/double digit display
        const minWidth = count * 40;
        return { chartWidth: minWidth > 0 ? `${minWidth}px` : '100%', finalXLabelsCount: count };
    }, [xLabels, rawData, routeData, sheetDependency]);

    return (
        <WidgetContainer
            title={title}
            parameters={parameters}
            darkMode={darkMode}
            onGroupedParametersChange={onGroupedParametersChange}
            groupedParametersValues={groupedParametersValues}
            onParametersChange={handleParametersChange}
            {...props}
        >
            <div className="w-full h-full overflow-x-auto overflow-y-hidden custom-scrollbar">
                <div style={{ width: chartWidth, height: '100%', minWidth: '100%' }}>
                    <ReactECharts
                        option={option}
                        style={{ height: '100%', width: '100%' }}
                        theme={darkMode ? 'dark' : 'light'}
                    />
                </div>
            </div>
            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    height: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: ${darkMode ? '#334155' : '#cbd5e1'};
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: ${darkMode ? '#475569' : '#94a3b8'};
                }
            `}</style>
        </WidgetContainer>
    );
};

export const CartesianHeatmapWidgetDef = {
    component: CartesianHeatmapWidget
};
