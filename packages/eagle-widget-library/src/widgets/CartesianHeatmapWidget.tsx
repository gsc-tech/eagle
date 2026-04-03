import React, { useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { WidgetContainer } from '../components/WidgetContainer';
import type { BaseWidgetProps, ParameterValues } from '../types';
import { useWidgetData } from '../hooks/useWidgetData';
import { useSheetDependency } from '../hooks/useSheetDependency';
import { useParameterDefaults } from "../hooks/useParameterDefaults";
// ---------------------------------------------------------------------------
// API data field-mapping config
// ---------------------------------------------------------------------------

/**
 * Describes how to map fields of each API record to the heatmap axes.
 *
 * Example API record:
 *   { product: "CL", contract: "Jun26", netPos: -12 }
 *
 * Config:
 *   { productField: "product", contractField: "contract", valueField: "netPos" }
 *
 * Optional:
 *   groupField   – if each record already carries a group name, use it instead
 *                  of the built-in PRODUCT_GROUPS lookup.
 *   pollInterval – ms between re-fetches (default: no polling).
 */
export interface HeatmapApiDataConfig {
    /** Field containing the y-axis label (product symbol, e.g. "CL", "NG"). */
    productField: string;
    /** Field containing the x-axis label (contract/expiry, e.g. "Jun26"). */
    contractField: string;
    /** Field containing the numeric cell value. */
    valueField: string;
    /**
     * Optional field containing the group name for each record.
     * If omitted the widget falls back to the built-in PRODUCT_GROUPS map,
     * and records whose product is unknown land in the "Other" group.
     */
    groupField?: string;
    /** Polling interval in milliseconds. If omitted, fetches once. */
    pollInterval?: number;
}

// ---------------------------------------------------------------------------
// Public props
// ---------------------------------------------------------------------------

export interface CartesianHeatmapWidgetProps extends BaseWidgetProps {
    xLabels?: string[];
    yLabels?: string[];
    heatmapGroups?: { name: string; rows: number[]; min: number; max: number; colors: string[] }[];
    /**
     * When provided the widget fetches `apiUrl` and maps each record using
     * this config, replicating the exact same grouped/coloured heatmap that
     * the sheetData path produces.  apiUrl must also be set.
     */
    apiDataConfig?: HeatmapApiDataConfig;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

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
    'Other',
];

const POSITIVE_COLORS = ['#bbf7d0', '#86efac', '#4ade80', '#22c55e', '#16a34a', '#15803d', '#166534', '#14532d'];
const ZERO_COLOR = '#f8fafc';
const NEGATIVE_COLORS = ['#fecaca', '#fca5a5', '#f87171', '#ef4444', '#dc2626', '#b91c1c', '#991b1b', '#7f1d1d'];

const GROUP_EMPTY_COLORS: Record<string, string> = {
    'Energy': '#e0f2fe',
    'Metals': '#fef3c7',
    'Agriculture (Grains and OilSeeds)': '#f5f5dc',
    'Soft Commodities (ICE)': '#fae8ff',
    'Livestock': '#ddd6fe',
    'Interest Rates/Fixed Income': '#f1f5f9',
    'Other': '#f8fafc',
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

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

interface ParsedHeatmapData {
    xLabels: string[];
    yLabels: string[];
    series: any[];
    visualMaps: any[];
}

/** Sort contract labels chronologically (e.g. Mar26 < Jun26 < Sep26). */
function sortContracts(labels: string[]): string[] {
    const monthMap: Record<string, number> = {
        jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
        jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
    };
    return [...labels].sort((a, b) => {
        const parse = (s: string) => {
            const m = s.match(/^([A-Za-z]{3})(\d{2})$/);
            if (m) {
                const mo = monthMap[m[1].toLowerCase()];
                const yr = parseInt(m[2], 10);
                if (mo !== undefined) return new Date(2000 + yr, mo, 1).getTime();
            }
            return null;
        };
        const da = parse(a);
        const db = parse(b);
        if (da !== null && db !== null) return da - db;
        if (da !== null) return -1;
        if (db !== null) return 1;
        return a.localeCompare(b);
    });
}

/** Build visualMap pieces from collected numeric values (shared by both paths). */
function buildVisualMapPieces(allNumericValues: number[]): any[] {
    const pieces: any[] = [];

    // Group empty-cell pieces
    Object.entries(GROUP_IDS).forEach(([name, id]) => {
        pieces.push({
            value: GROUP_ID_OFFSET - id,
            color: GROUP_EMPTY_COLORS[name] || GROUP_EMPTY_COLORS['Other'],
            label: `${name} (Empty)`,
        });
    });

    // Zero
    pieces.push({ value: 0, color: ZERO_COLOR, label: 'Zero' });

    // Positive gradient
    const posValues = allNumericValues.filter(v => v > 0);
    const positiveMax = posValues.length > 0 ? posValues.reduce((a, b) => Math.max(a, b), 1) : 1;
    const posSteps = POSITIVE_COLORS.length;
    for (let i = 0; i < posSteps; i++) {
        const lo = i === 0 ? 0 : (positiveMax / posSteps) * i;
        const hi = (positiveMax / posSteps) * (i + 1);
        pieces.push({
            gt: i === 0 ? 0.000001 : lo,
            lte: i === posSteps - 1 ? 999999999 : hi,
            color: POSITIVE_COLORS[i],
            label: i === 0 ? 'Positive (low)' : i === posSteps - 1 ? 'Positive (high)' : undefined,
        });
    }

    // Negative gradient
    const negValues = allNumericValues.filter(v => v < 0);
    const negativeMin = negValues.length > 0 ? negValues.reduce((a, b) => Math.min(a, b), -1) : -1;
    const negSteps = NEGATIVE_COLORS.length;
    for (let i = 0; i < negSteps; i++) {
        const hi = i === 0 ? 0 : (negativeMin / negSteps) * i;
        const lo = (negativeMin / negSteps) * (i + 1);
        pieces.push({
            gt: i === negSteps - 1 ? -999.999 : lo,
            lte: i === 0 ? -0.000001 : hi,
            color: NEGATIVE_COLORS[i],
            label: i === 0 ? 'Negative (low)' : i === negSteps - 1 ? 'Negative (high)' : undefined,
        });
    }

    return pieces;
}

// ---------------------------------------------------------------------------
// sheetData path  (unchanged logic)
// ---------------------------------------------------------------------------

function processSheetData(data: Record<string, any[]>): ParsedHeatmapData {
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

    let xLabelsSet = new Set<string>();
    sheets.forEach(sheetData => {
        sheetData.forEach(item => {
            const val = item[contractKey];
            if (val !== undefined && val !== null && val !== '') xLabelsSet.add(String(val).trim());
        });
    });

    const xLabels = sortContracts(Array.from(xLabelsSet));

    const sheetsByGroup: Record<string, string[]> = {
        'Energy': [], 'Metals': [], 'Agriculture (Grains and OilSeeds)': [],
        'Soft Commodities (ICE)': [], 'Livestock': [], 'Interest Rates/Fixed Income': [], 'Other': [],
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
    const allNumericValues: number[] = [];

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

    return {
        xLabels,
        yLabels,
        series: [{
            name: 'Heatmap', type: 'heatmap', data: allMappedData,
            label: { show: true, fontSize: 10, formatter: (p: any) => p.data[2] <= GROUP_ID_OFFSET ? '' : p.data[2] },
            emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0, 0, 0, 0.5)' } },
        }],
        visualMaps: [{
            type: 'piecewise', show: false, seriesIndex: 0,
            pieces: buildVisualMapPieces(allNumericValues), dimension: 2,
        }],
    };
}

// ---------------------------------------------------------------------------
// API data path  (new — full grouped heatmap, same look as sheet path)
// ---------------------------------------------------------------------------

/**
 * Transforms a flat API array into the exact same grouped heatmap structure
 * produced by `processSheetData`, using field names provided in `config`.
 *
 * Expected API shape (one record per cell):
 *   [
 *     { product: "CL", contract: "Jun26", netPos: -12 },
 *     { product: "NG", contract: "Mar27", netPos:  45 },
 *     ...
 *   ]
 */
function processApiData(
    records: any[],
    config: HeatmapApiDataConfig,
): ParsedHeatmapData {
    const { productField, contractField, valueField, groupField } = config;

    // ── 1. Collect unique x-labels (contracts) ───────────────────────────
    const xLabelsSet = new Set<string>();
    records.forEach(r => {
        const contract = r[contractField];
        if (contract !== undefined && contract !== null && contract !== '') {
            xLabelsSet.add(String(contract).trim());
        }
    });
    const xLabels = sortContracts(Array.from(xLabelsSet));

    // ── 2. Collect unique products and assign group ───────────────────────
    const productGroupMap: Record<string, string> = {}; // product → groupName
    const productFullNameMap: Record<string, string> = {}; // product → display name

    records.forEach(r => {
        const product = String(r[productField] ?? '').trim();
        if (!product) return;

        if (!productGroupMap[product]) {
            // Prefer explicit groupField on the record
            if (groupField && r[groupField]) {
                productGroupMap[product] = String(r[groupField]).trim();
            } else {
                // Fall back to built-in lookup
                const meta = PRODUCT_GROUPS[product];
                productGroupMap[product] = meta ? meta.groupName : 'Other';
            }
            const meta = PRODUCT_GROUPS[product];
            productFullNameMap[product] = meta ? meta.fullName : product;
        }
    });

    // ── 3. Build ordered y-labels (same group ordering as sheet path) ─────
    const productsByGroup: Record<string, string[]> = {};
    GROUP_ORDER.forEach(g => { productsByGroup[g] = []; });

    Object.keys(productGroupMap).forEach(product => {
        const group = productGroupMap[product];
        if (!productsByGroup[group]) productsByGroup[group] = [];
        if (!productsByGroup[group].includes(product)) {
            productsByGroup[group].push(product);
        }
    });

    // Sort products within each group by their PRODUCT_GROUPS definition order,
    // then alphabetically for unknowns.
    const knownOrder = Object.keys(PRODUCT_GROUPS);
    Object.keys(productsByGroup).forEach(group => {
        productsByGroup[group].sort((a, b) => {
            const ia = knownOrder.indexOf(a);
            const ib = knownOrder.indexOf(b);
            if (ia !== -1 && ib !== -1) return ia - ib;
            if (ia !== -1) return -1;
            if (ib !== -1) return 1;
            return a.localeCompare(b);
        });
    });

    const yLabels: string[] = [];
    const yLabelGroup: Record<number, string> = {}; // yIndex → groupName

    GROUP_ORDER.forEach(groupName => {
        (productsByGroup[groupName] || []).forEach(product => {
            yLabelGroup[yLabels.length] = groupName;
            yLabels.push(productFullNameMap[product] || product);
        });
    });

    // ── 4. Build per-product value maps ───────────────────────────────────
    const productValueMap: Record<string, Record<string, number>> = {};
    // product → { contract → value }

    records.forEach(r => {
        const product = String(r[productField] ?? '').trim();
        const contract = String(r[contractField] ?? '').trim();
        const raw = r[valueField];
        if (!product || !contract) return;
        const numVal = Number(raw);
        if (!isNaN(numVal) && numVal !== 0) {
            if (!productValueMap[product]) productValueMap[product] = {};
            productValueMap[product][contract] = numVal;
        }
    });

    // ── 5. Build series data ──────────────────────────────────────────────
    const allMappedData: any[] = [];
    const allNumericValues: number[] = [];

    yLabels.forEach((yLabel, yIndex) => {
        const groupName = yLabelGroup[yIndex] || 'Other';
        const groupId = GROUP_IDS[groupName] || GROUP_IDS['Other'];

        // Find which product this yLabel corresponds to
        const product = Object.keys(productFullNameMap).find(
            p => (productFullNameMap[p] || p) === yLabel,
        ) || yLabel;

        const contractValues = productValueMap[product] || {};

        xLabels.forEach((xLabel, xIndex) => {
            const val = contractValues[xLabel];
            if (val !== undefined) {
                allMappedData.push([xIndex, yIndex, val, groupName]);
                allNumericValues.push(val);
            } else {
                allMappedData.push([xIndex, yIndex, GROUP_ID_OFFSET - groupId, groupName]);
            }
        });
    });

    return {
        xLabels,
        yLabels,
        series: [{
            name: 'Heatmap', type: 'heatmap', data: allMappedData,
            label: {
                show: true, fontSize: 10,
                formatter: (p: any) => p.data[2] <= GROUP_ID_OFFSET ? '' : p.data[2],
            },
            emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0, 0, 0, 0.5)' } },
        }],
        visualMaps: [{
            type: 'piecewise', show: false, seriesIndex: 0,
            pieces: buildVisualMapPieces(allNumericValues), dimension: 2,
        }],
    };
}

// ---------------------------------------------------------------------------
// Fallback labels (used only when neither sheet nor api data is available)
// ---------------------------------------------------------------------------

const fallbackXLabels = ['12a', '1a', '2a', '3a', '4a', '5a', '6a', '7a', '8a', '9a', '10a'];
const fallbackYLabels = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// ---------------------------------------------------------------------------
// Chart option builder (shared tooltip/grid/axis config)
// ---------------------------------------------------------------------------

function buildChartOption(parsed: ParsedHeatmapData, darkMode: boolean) {
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
            },
        },
        grid: { top: '30px', bottom: '10px', left: '10px', right: '10px', containLabel: true },
        xAxis: {
            type: 'category', data: parsed.xLabels,
            splitArea: { show: true },
            axisLabel: { interval: 0, rotate: 0, fontSize: 10 },
        },
        yAxis: {
            type: 'category', data: parsed.yLabels,
            splitArea: { show: true },
            axisLabel: { fontSize: 10 },
        },
        visualMap: parsed.visualMaps,
        series: parsed.series,
    };
}

// ---------------------------------------------------------------------------
// Widget component
// ---------------------------------------------------------------------------

export const CartesianHeatmapWidget: React.FC<CartesianHeatmapWidgetProps> = ({ initialParameterValues, id,
    title = 'Grouped Cartesian Heatmap',
    parameters = [],
    darkMode = false,
    xLabels,
    yLabels,
    heatmapGroups,
    apiDataConfig,
    onGroupedParametersChange,
    groupedParametersValues,
    apiUrl = null,
    sheetDependency,
    isTokenRequired,
    getFirebaseToken,
    ...props
}) => {
    const defaultParams = useParameterDefaults(parameters);
    const [currentParams, setCurrentParams] = useState<ParameterValues>(defaultParams);
    const handleParametersChange = (values: ParameterValues) => setCurrentParams(values);

    // Determine whether to fetch from API
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
    const rawData = sheetDependency?.isDependent ? sheetData : routeData;

    // --- Optimization: Only update display data if it's deeply changed ---
    const [stabledData, setOptimizedData] = React.useState<any>(null);
    const prevDataRef = React.useRef<string>('');

    React.useEffect(() => {
        const dataStr = JSON.stringify(rawData);
        if (dataStr !== prevDataRef.current) {
            prevDataRef.current = dataStr;
            setOptimizedData(rawData);
        }
    }, [rawData]);

    // ── Derive parsed heatmap data ─────────────────────────────────────────
    const parsed = useMemo<ParsedHeatmapData | null>(() => {
        // 1) Sheet dependency path
        if (
            sheetDependency?.isDependent &&
            stabledData &&
            typeof stabledData === 'object' &&
            !Array.isArray(stabledData)
        ) {
            return processSheetData(stabledData as Record<string, any[]>);
        }

        // 2) API path with full config (replicates sheet look)
        if (
            apiDataConfig &&
            stabledData &&
            Array.isArray(stabledData) &&
            stabledData.length > 0
        ) {
            return processApiData(stabledData, apiDataConfig);
        }

        // 3) Legacy/simple API path (coordinate array or x/y/value objects)
        if (stabledData && Array.isArray(stabledData) && stabledData.length > 0) {
            const finalXLabels = xLabels || fallbackXLabels;
            const finalYLabels = yLabels || fallbackYLabels;
            const isCoordArray = Array.isArray(stabledData[0]);

            const mappedData = isCoordArray
                ? stabledData
                : stabledData.map((d: any) => [
                    finalXLabels.indexOf(d.$x || d.x || d.category || 'X'),
                    finalYLabels.indexOf(d.$y || d.y || d.name || 'Y'),
                    Number(d.$value !== undefined ? d.$value : d.value !== undefined ? d.value : 0),
                ]);

            const finalData = mappedData.map((d: any) => {
                const group = (heatmapGroups || []).find(g => g.rows.includes(d[1]));
                const groupName = group?.name || 'Other';
                if (d[2] === 0 || isNaN(d[2])) {
                    const id = GROUP_IDS[groupName] || GROUP_IDS['Other'];
                    return [d[0], d[1], GROUP_ID_OFFSET - id, groupName];
                }
                return [...d, groupName];
            });

            const numericVals = finalData.map((d: any) => d[2]).filter((v: any) => v > GROUP_ID_OFFSET && v !== 0);
            const pieces = buildVisualMapPieces(numericVals);

            return {
                xLabels: finalXLabels,
                yLabels: finalYLabels,
                series: [{
                    name: 'Heatmap', type: 'heatmap', data: finalData,
                    label: { show: true, fontSize: 10, formatter: (p: any) => p.data[2] <= GROUP_ID_OFFSET ? '' : p.data[2] },
                    emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0, 0, 0, 0.5)' } },
                }],
                visualMaps: [{ type: 'piecewise', show: false, seriesIndex: 0, pieces, dimension: 2 }],
            };
        }

        // 4) No data — return empty fallback structure so chart renders axes
        return {
            xLabels: xLabels || fallbackXLabels,
            yLabels: yLabels || fallbackYLabels,
            series: [],
            visualMaps: [],
        };
    }, [xLabels, yLabels, heatmapGroups, stabledData, sheetDependency, apiDataConfig]);

    // ── Chart option ────────────────────────────────────────────────────────
    const option = useMemo(
        () => (parsed ? buildChartOption(parsed, darkMode) : {}),
        [parsed, darkMode],
    );

    // ── Chart width ─────────────────────────────────────────────────────────
    const chartWidth = useMemo(() => {
        const count = parsed?.xLabels.length || (xLabels?.length ?? fallbackXLabels.length);
        return `${count * 40}px`;
    }, [parsed, xLabels]);

    const hasData = useMemo(() => {
        if (!stabledData) return false;
        if (Array.isArray(stabledData)) return stabledData.length > 0;
        if (typeof stabledData === 'object') {
            return Object.values(stabledData).some((val) => Array.isArray(val) && val.length > 0);
        }
        return false;
    }, [stabledData]);

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
            {!hasData ? (
                <div className="flex items-center justify-center h-full w-full">
                    <span className={`text-sm font-medium ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                        No data available
                    </span>
                </div>
            ) : (
                <>
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
                </>
            )}
        </WidgetContainer>
    );
};

export const CartesianHeatmapWidgetDef = { component: CartesianHeatmapWidget };
