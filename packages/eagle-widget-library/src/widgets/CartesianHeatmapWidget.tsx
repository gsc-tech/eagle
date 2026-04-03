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

const POSITIVE_COLORS = ['#bbf7d0', '#86efac', '#4ade80', '#22c55e', '#16a34a', '#15803d', '#166534', '#14532d']; // Green 200 → 900
const ZERO_COLOR = '#f8fafc';
const NEGATIVE_COLORS = ['#fecaca', '#fca5a5', '#f87171', '#ef4444', '#dc2626', '#b91c1c', '#991b1b', '#7f1d1d']; // Red 200 → 900

const GROUP_EMPTY_COLORS: Record<string, string> = {
    'Energy': '#e0f2fe',                         // Light sky blue
    'Metals': '#fef3c7',                         // Light amber/yellow
    'Agriculture (Grains and OilSeeds)': '#f5f5dc', // Beige (distinct from yellow — fixed)
    'Soft Commodities (ICE)': '#fae8ff',         // Light fuchsia (more pinkish purple)
    'Livestock': '#ddd6fe',                      // Light violet (deeper indigo/purple)
    'Interest Rates/Fixed Income': '#f1f5f9',    // Light slate
    'Other': '#f8fafc',                          // Very light off-white/gray
};

const GROUP_ID_OFFSET = -1000;
const GROUP_IDS: Record<string, number> = {
    'Energy': 1,
    'Metals': 2,
    'Agriculture (Grains and OilSeeds)': 3,
    'Soft Commodities (ICE)': 4,
    'Livestock': 5,
    'Interest Rates/Fixed Income': 6,
    'Other': 7,
};

interface ParsedHeatmapData {
    xLabels: string[];
    yLabels: string[];
    series: any[];
    visualMaps: any[];
}

function processSheetData(data: Record<string, any[]>): ParsedHeatmapData {
    let xLabelsSet = new Set<string>();
    let contractKey = 'Contract';
    let valExcelKey = 'NetPosExcel';
    let valMarexKey = 'NetPosMarex';

    const sheets = Object.values(data).filter(Array.isArray);

    if (sheets.length > 0) {
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

    sheets.forEach(sheetData => {
        sheetData.forEach(item => {
            const val = item[contractKey];
            if (val !== undefined && val !== null && val !== '') {
                xLabelsSet.add(String(val).trim());
            }
        });
    });

    let xLabels = Array.from(xLabelsSet);
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
                if (month !== undefined) return new Date(2000 + year, month, 1).getTime();
            }
            return null;
        };
        const dateA = parseDate(a);
        const dateB = parseDate(b);
        if (dateA !== null && dateB !== null) return dateA - dateB;
        if (dateA !== null) return -1;
        if (dateB !== null) return 1;
        return a.localeCompare(b);
    });

    const sheetsByGroup: Record<string, string[]> = {
        'Energy': [], 'Metals': [], 'Agriculture (Grains and OilSeeds)': [],
        'Soft Commodities (ICE)': [], 'Livestock': [], 'Interest Rates/Fixed Income': [], 'Other': []
    };

    Object.keys(data).forEach(sheetName => {
        const meta = PRODUCT_GROUPS[sheetName];
        if (meta) sheetsByGroup[meta.groupName].push(sheetName);
        else if (Array.isArray(data[sheetName])) sheetsByGroup['Other'].push(sheetName);
    });

    const yLabels: string[] = [];
    GROUP_ORDER.forEach(groupName => {
        sheetsByGroup[groupName].forEach(sheetName => {
            const meta = PRODUCT_GROUPS[sheetName];
            yLabels.push(meta ? meta.fullName : sheetName);
        });
    });

    const allMappedData: any[] = [];
    let allNumericValues: number[] = [];

    GROUP_ORDER.forEach(groupName => {
        sheetsByGroup[groupName].forEach(sheetName => {
            const rowData = data[sheetName];
            const meta = PRODUCT_GROUPS[sheetName];
            const fullName = meta ? meta.fullName : sheetName;
            const yIndex = yLabels.indexOf(fullName);
            const rowVals = Array(xLabels.length).fill(null);

            rowData.forEach((item: any) => {
                const xIndex = xLabels.indexOf(String(item[contractKey] || ''));
                if (xIndex === -1) return;
                let val = item[valExcelKey];
                if (val === null || val === undefined || val === '' || val === 0) val = item[valMarexKey];
                if (val !== null && val !== undefined && val !== '' && Number(val) !== 0) {
                    const numVal = Number(val);
                    rowVals[xIndex] = numVal;
                    allNumericValues.push(numVal);
                }
            });

            rowVals.forEach((val, xIndex) => {
                if (val === null) {
                    const id = GROUP_IDS[groupName] || GROUP_IDS['Other'];
                    allMappedData.push([xIndex, yIndex, GROUP_ID_OFFSET - id, groupName]);
                } else {
                    allMappedData.push([xIndex, yIndex, val, groupName]);
                }
            });
        });
    });

    const visualMapPieces: any[] = [];

    // --- Group empty-cell pieces (flat colors per group) ---
    Object.entries(GROUP_IDS).forEach(([name, id]) => {
        visualMapPieces.push({ value: GROUP_ID_OFFSET - id, color: GROUP_EMPTY_COLORS[name] || GROUP_EMPTY_COLORS['Other'], label: `${name} (Empty)` });
    });

    // --- Zero piece ---
    visualMapPieces.push({ value: 0, color: ZERO_COLOR, label: 'Zero' });

    // --- Gradient pieces for positive values ---
    const positiveMax = Math.max(...allNumericValues.filter(v => v > 0), 1);
    const posSteps = POSITIVE_COLORS.length;
    for (let i = 0; i < posSteps; i++) {
        const lo = i === 0 ? 0 : (positiveMax / posSteps) * i;
        const hi = (positiveMax / posSteps) * (i + 1);
        visualMapPieces.push({
            gt: i === 0 ? 0 : lo,
            lte: i === posSteps - 1 ? positiveMax * 10 : hi,
            color: POSITIVE_COLORS[i],
            label: i === 0 ? 'Positive (low)' : i === posSteps - 1 ? 'Positive (high)' : undefined,
        });
    }

    // --- Gradient pieces for negative values ---
    const negativeMin = Math.min(...allNumericValues.filter(v => v < 0), -1);
    const negSteps = NEGATIVE_COLORS.length;
    // Build from least-negative (closest to 0) → most-negative, mapping to light → dark colors
    for (let i = 0; i < negSteps; i++) {
        const hi = i === 0 ? 0 : (negativeMin / negSteps) * i;          // closer to 0
        const lo = (negativeMin / negSteps) * (i + 1);                   // more negative
        visualMapPieces.push({
            gt: i === negSteps - 1 ? negativeMin * 10 : lo,
            lte: i === 0 ? 0 : hi,
            color: NEGATIVE_COLORS[i],
            label: i === 0 ? 'Negative (low)' : i === negSteps - 1 ? 'Negative (high)' : undefined,
        });
    }

    return {
        xLabels, yLabels,
        series: [{
            name: 'Heatmap', type: 'heatmap', data: allMappedData,
            label: { show: true, fontSize: 10, formatter: (p: any) => p.data[2] <= GROUP_ID_OFFSET ? '' : p.data[2] },
            emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0, 0, 0, 0.5)' } }
        }],
        visualMaps: [{ type: 'piecewise', show: false, seriesIndex: 0, pieces: visualMapPieces, dimension: 2 }]
    };
}

const fallbackXLabels = ['12a', '1a', '2a', '3a', '4a', '5a', '6a', '7a', '8a', '9a', '10a'];
const fallbackYLabels = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const CartesianHeatmapWidget: React.FC<CartesianHeatmapWidgetProps> = ({
    title = 'Grouped Cartesian Heatmap', parameters = [], darkMode = false, xLabels, yLabels, heatmapGroups,
    onGroupedParametersChange, groupedParametersValues, apiUrl = null, sheetDependency, ...props
}) => {
    const defaultParams = useParameterDefaults(parameters);
    const [currentParams, setCurrentParams] = React.useState<ParameterValues>(defaultParams);
    let routeData: any = null;
    if (apiUrl !== null) {
        const { data } = useWidgetData(apiUrl as string, { parameters: currentParams });
        routeData = data;
    }
    const { sheetData } = useSheetDependency(sheetDependency);
    const rawData = sheetDependency?.isDependent ? sheetData : routeData;

    const handleParametersChange = (values: ParameterValues) => setCurrentParams(values);

    const option = useMemo(() => {
        if (sheetDependency?.isDependent && rawData && typeof rawData === 'object' && !Array.isArray(rawData)) {
            const parsed = processSheetData(rawData as Record<string, any[]>);
            return {
                tooltip: {
                    position: 'top',
                    confine: true,
                    backgroundColor: darkMode ? '#1e293b' : '#ffffff',
                    borderColor: darkMode ? '#334155' : '#e2e8f0',
                    textStyle: { color: darkMode ? '#f8fafc' : '#1e293b', fontSize: 12 },
                    formatter: (params: any) => {
                        const [xIdx, yIdx, val, groupName] = params.value;
                        const xLabel = parsed.xLabels[xIdx];
                        const yLabel = parsed.yLabels[yIdx];
                        const displayValue = val <= GROUP_ID_OFFSET ? '-' : val;
                        return `
                            <div style="font-family: inherit; min-width: 120px;">
                                <div style="font-size: 10px; color: ${darkMode ? '#94a3b8' : '#64748b'}; margin-bottom: 2px; text-transform: uppercase; letter-spacing: 0.05em;">${groupName}</div>
                                <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;">
                                    <span style="font-weight: 600;">${yLabel} <span style="font-weight: 400; color: ${darkMode ? '#64748b' : '#94a3b8'}; margin-left: 4px;">${xLabel}</span></span>
                                    <span style="font-weight: 700; font-size: 14px; color: ${val > 0 ? '#22c55e' : val < 0 && val > GROUP_ID_OFFSET ? '#ef4444' : 'inherit'}">${displayValue}</span>
                                </div>
                            </div>
                        `;
                    }
                },
                grid: { top: '30px', bottom: '10px', left: '10px', right: '10px', containLabel: true },
                xAxis: { type: 'category', data: parsed.xLabels, splitArea: { show: true }, axisLabel: { interval: 0, rotate: 0, fontSize: 10 } },
                yAxis: { type: 'category', data: parsed.yLabels, splitArea: { show: true }, axisLabel: { fontSize: 10 } },
                visualMap: parsed.visualMaps,
                series: parsed.series
            };
        }

        let finalXLabels = xLabels || fallbackXLabels;
        let finalYLabels = yLabels || fallbackYLabels;
        let visualMapConfig: any[] = [];
        let seriesConfig: any[] = [];

        if (routeData && Array.isArray(routeData) && routeData.length > 0) {
            const isCoordArray = Array.isArray(routeData[0]);
            let mappedData = isCoordArray ? routeData : routeData.map((d: any) => [
                finalXLabels.indexOf(d.$x || d.x || d.category || 'X'),
                finalYLabels.indexOf(d.$y || d.y || d.name || 'Y'),
                Number(d.$value !== undefined ? d.$value : (d.value !== undefined ? d.value : 0))
            ]);

            const numericVals = mappedData.map((d: any) => d[2]).filter((v: any) => !isNaN(v) && v !== 0 && v > GROUP_ID_OFFSET);
            const finalData = mappedData.map((d: any) => {
                const group = (heatmapGroups || []).find(g => g.rows.includes(d[1]));
                const groupName = group?.name || 'Other';
                if (d[2] === 0 || isNaN(d[2])) {
                    const id = GROUP_IDS[groupName] || GROUP_IDS['Other'];
                    return [d[0], d[1], GROUP_ID_OFFSET - id, groupName];
                }
                return [...d, groupName];
            });

            const pieces: any[] = Object.entries(GROUP_IDS).map(([n, id]) => ({ value: GROUP_ID_OFFSET - id, color: GROUP_EMPTY_COLORS[n] || GROUP_EMPTY_COLORS['Other'] }));
            pieces.push({ value: 0, color: ZERO_COLOR });

            const numericData = finalData.map((d: any) => d[2]).filter((v: any) => v > GROUP_ID_OFFSET && v !== 0);
            const posMax = Math.max(...numericData.filter((v: any) => v > 0), 1);
            const negMin = Math.min(...numericData.filter((v: any) => v < 0), -1);
            const posSteps = POSITIVE_COLORS.length;
            const negSteps = NEGATIVE_COLORS.length;
            for (let i = 0; i < posSteps; i++) {
                const lo = i === 0 ? 0 : (posMax / posSteps) * i;
                const hi = (posMax / posSteps) * (i + 1);
                pieces.push({ gt: i === 0 ? 0 : lo, lte: i === posSteps - 1 ? posMax * 10 : hi, color: POSITIVE_COLORS[i] });
            }
            for (let i = 0; i < negSteps; i++) {
                const hi = i === 0 ? 0 : (negMin / negSteps) * i;
                const lo = (negMin / negSteps) * (i + 1);
                pieces.push({ gt: i === negSteps - 1 ? negMin * 10 : lo, lte: i === 0 ? 0 : hi, color: NEGATIVE_COLORS[i] });
            }

            visualMapConfig = [{ type: 'piecewise', show: false, seriesIndex: 0, pieces, dimension: 2 }];
            seriesConfig = [{
                name: 'Heatmap', type: 'heatmap', data: finalData,
                label: { show: true, fontSize: 10, formatter: (p: any) => p.data[2] <= GROUP_ID_OFFSET ? '' : p.data[2] },
                emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0, 0, 0, 0.5)' } }
            }];
        }

        return {
            tooltip: {
                position: 'top',
                confine: true,
                backgroundColor: darkMode ? '#1e293b' : '#ffffff',
                borderColor: darkMode ? '#334155' : '#e2e8f0',
                textStyle: { color: darkMode ? '#f8fafc' : '#1e293b', fontSize: 12 },
                formatter: (params: any) => {
                    const [xIdx, yIdx, val, groupName] = params.value;
                    const xLabel = finalXLabels[xIdx];
                    const yLabel = finalYLabels[yIdx];
                    const displayValue = val <= GROUP_ID_OFFSET ? '-' : val;
                    return `
                        <div style="font-family: inherit; min-width: 120px;">
                            <div style="font-size: 10px; color: ${darkMode ? '#94a3b8' : '#64748b'}; margin-bottom: 2px; text-transform: uppercase; letter-spacing: 0.05em;">${groupName}</div>
                            <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;">
                                <span style="font-weight: 600;">${yLabel} <span style="font-weight: 400; color: ${darkMode ? '#64748b' : '#94a3b8'}; margin-left: 4px;">${xLabel}</span></span>
                                <span style="font-weight: 700; font-size: 14px; color: ${val > 0 ? '#22c55e' : val < 0 && val > GROUP_ID_OFFSET ? '#ef4444' : 'inherit'}">${displayValue}</span>
                            </div>
                        </div>
                    `;
                }
            },
            grid: { top: '30px', bottom: '10px', left: '10px', right: '10px', containLabel: true },
            xAxis: { type: 'category', data: finalXLabels, splitArea: { show: true }, axisLabel: { interval: 0, rotate: 0, fontSize: 10 } },
            yAxis: { type: 'category', data: finalYLabels, splitArea: { show: true }, axisLabel: { fontSize: 10 } },
            visualMap: visualMapConfig, series: seriesConfig
        };
    }, [xLabels, yLabels, heatmapGroups, rawData, sheetDependency]);

    const chartWidth = useMemo(() => {
        let count = 0;
        if (sheetDependency?.isDependent && rawData && typeof rawData === 'object' && !Array.isArray(rawData)) {
            count = processSheetData(rawData as Record<string, any[]>).xLabels.length;
        } else if (routeData && Array.isArray(routeData) && routeData.length > 0) {
            count = new Set(routeData.map((d: any) => Array.isArray(d) ? d[0] : (d.$x || d.x || d.category || 'X'))).size;
        } else count = xLabels?.length || fallbackXLabels.length;
        return `${count * 40}px`;
    }, [xLabels, rawData, routeData, sheetDependency]);

    return (
        <WidgetContainer title={title} parameters={parameters} darkMode={darkMode} onGroupedParametersChange={onGroupedParametersChange}
            groupedParametersValues={groupedParametersValues} onParametersChange={handleParametersChange} {...props}
        >
            <div className="w-full h-full overflow-x-auto overflow-y-hidden custom-scrollbar">
                <div style={{ width: chartWidth, height: '100%', minWidth: '100%' }}>
                    <ReactECharts option={option} style={{ height: '100%', width: '100%' }} theme={darkMode ? 'dark' : 'light'} />
                </div>
            </div>
            <style>{`
                .custom-scrollbar::-webkit-scrollbar { height: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: ${darkMode ? '#334155' : '#cbd5e1'}; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: ${darkMode ? '#475569' : '#94a3b8'}; }
            `}</style>
        </WidgetContainer>
    );
};

export const CartesianHeatmapWidgetDef = { component: CartesianHeatmapWidget };
