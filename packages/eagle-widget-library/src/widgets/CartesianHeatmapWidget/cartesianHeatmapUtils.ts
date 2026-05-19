import {
    PRODUCT_GROUPS, GROUP_ORDER, GROUP_IDS, GROUP_ID_OFFSET,
    POSITIVE_COLORS, ZERO_COLOR, NEGATIVE_COLORS, GROUP_EMPTY_COLORS,
    type HeatmapApiDataConfig, type ParsedHeatmapData,
} from "./cartesianHeatmapConfig";

// ─── Sort contract labels chronologically ─────────────────────────────────────

export function sortContracts(labels: string[]): string[] {
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
        const da = parse(a), db = parse(b);
        if (da !== null && db !== null) return da - db;
        if (da !== null) return -1;
        if (db !== null) return 1;
        return a.localeCompare(b);
    });
}

// ─── Build visualMap pieces ───────────────────────────────────────────────────

export function buildVisualMapPieces(allNumericValues: number[]): any[] {
    const pieces: any[] = [];

    Object.entries(GROUP_IDS).forEach(([name, id]) => {
        pieces.push({
            value: GROUP_ID_OFFSET - id,
            color: GROUP_EMPTY_COLORS[name] || GROUP_EMPTY_COLORS["Other"],
            label: `${name} (Empty)`,
        });
    });
    pieces.push({ value: 0, color: ZERO_COLOR, label: "Zero" });

    const posValues = allNumericValues.filter((v) => v > 0);
    const positiveMax = posValues.length > 0 ? posValues.reduce((a, b) => Math.max(a, b), 1) : 1;
    const posSteps = POSITIVE_COLORS.length;
    for (let i = 0; i < posSteps; i++) {
        const lo = i === 0 ? 0 : (positiveMax / posSteps) * i;
        const hi = (positiveMax / posSteps) * (i + 1);
        pieces.push({
            gt: i === 0 ? 0.000001 : lo,
            lte: i === posSteps - 1 ? 999999999 : hi,
            color: POSITIVE_COLORS[i],
            label: i === 0 ? "Positive (low)" : i === posSteps - 1 ? "Positive (high)" : undefined,
        });
    }

    const negValues = allNumericValues.filter((v) => v < 0);
    const negativeMin = negValues.length > 0 ? negValues.reduce((a, b) => Math.min(a, b), -1) : -1;
    const negSteps = NEGATIVE_COLORS.length;
    for (let i = 0; i < negSteps; i++) {
        const hi = i === 0 ? 0 : (negativeMin / negSteps) * i;
        const lo = (negativeMin / negSteps) * (i + 1);
        pieces.push({
            gt: i === negSteps - 1 ? -999.999 : lo,
            lte: i === 0 ? -0.000001 : hi,
            color: NEGATIVE_COLORS[i],
            label: i === 0 ? "Negative (low)" : i === negSteps - 1 ? "Negative (high)" : undefined,
        });
    }

    return pieces;
}

// ─── Sheet data path ──────────────────────────────────────────────────────────

export function processSheetData(data: Record<string, any[]>): ParsedHeatmapData {
    let contractKey = "Contract";
    let valExcelKey = "NetPosExcel";
    let valMarexKey = "NetPosMarex";

    const sheets = Object.values(data).filter(Array.isArray);
    if (sheets.length > 0) {
        const firstSheet = sheets.find((s) => s.length > 0) || [];
        const firstObj = firstSheet.find((obj) => obj && typeof obj === "object") || {};
        const keys = Object.keys(firstObj);
        const ck = keys.find((k) => k.toLowerCase().includes("contract"));
        if (ck) contractKey = ck;
        const ek = keys.find((k) => k.toLowerCase().includes("excel") && k.toLowerCase().includes("netpos"));
        if (ek) valExcelKey = ek;
        const mk = keys.find((k) => k.toLowerCase().includes("marex") && k.toLowerCase().includes("netpos"));
        if (mk) valMarexKey = mk;
    }

    const xLabelsSet = new Set<string>();
    sheets.forEach((sheetData) => {
        sheetData.forEach((item) => {
            const val = item[contractKey];
            if (val !== undefined && val !== null && val !== "") xLabelsSet.add(String(val).trim());
        });
    });
    const xLabels = sortContracts(Array.from(xLabelsSet));

    const sheetsByGroup: Record<string, string[]> = {
        Energy: [], Metals: [], "Agriculture (Grains and OilSeeds)": [],
        "Soft Commodities (ICE)": [], Livestock: [], Equities: [],
        "Interest Rates/Fixed Income": [], Other: [],
    };

    Object.keys(data).forEach((sheetName) => {
        const meta = PRODUCT_GROUPS[sheetName];
        if (meta) sheetsByGroup[meta.groupName].push(sheetName);
        else if (Array.isArray(data[sheetName])) sheetsByGroup["Other"].push(sheetName);
    });

    const yLabels: string[] = [];
    GROUP_ORDER.forEach((groupName) => {
        sheetsByGroup[groupName].forEach((sheetName) => {
            const meta = PRODUCT_GROUPS[sheetName];
            yLabels.push(meta ? meta.fullName : sheetName);
        });
    });

    const allMappedData: any[] = [];
    const allNumericValues: number[] = [];

    GROUP_ORDER.forEach((groupName) => {
        sheetsByGroup[groupName].forEach((sheetName) => {
            const rowData = data[sheetName];
            const meta = PRODUCT_GROUPS[sheetName];
            const fullName = meta ? meta.fullName : sheetName;
            const yIndex = yLabels.indexOf(fullName);
            const rowVals = Array(xLabels.length).fill(null);

            rowData.forEach((item: any) => {
                const xIndex = xLabels.indexOf(String(item[contractKey] || ""));
                if (xIndex === -1) return;
                let val = item[valExcelKey];
                if (val === null || val === undefined || val === "" || val === 0) val = item[valMarexKey];
                if (val !== null && val !== undefined && val !== "" && Number(val) !== 0) {
                    const numVal = Number(val);
                    rowVals[xIndex] = numVal;
                    allNumericValues.push(numVal);
                }
            });

            rowVals.forEach((val, xIndex) => {
                if (val === null) {
                    const id = GROUP_IDS[groupName] || GROUP_IDS["Other"];
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
            name: "Heatmap", type: "heatmap", data: allMappedData,
            label: { show: true, fontSize: 10, formatter: (p: any) => p.data[2] <= GROUP_ID_OFFSET ? "" : p.data[2] },
            emphasis: { itemStyle: { shadowBlur: 10, shadowColor: "rgba(0,0,0,0.5)" } },
        }],
        visualMaps: [{
            type: "piecewise", show: false, seriesIndex: 0,
            pieces: buildVisualMapPieces(allNumericValues), dimension: 2,
        }],
    };
}

// ─── API data path ────────────────────────────────────────────────────────────

export function processApiData(records: any[], config: HeatmapApiDataConfig): ParsedHeatmapData {
    const { productField, contractField, valueField, groupField } = config;

    const xLabelsSet = new Set<string>();
    records.forEach((r) => {
        const contract = r[contractField];
        if (contract !== undefined && contract !== null && contract !== "")
            xLabelsSet.add(String(contract).trim());
    });
    const xLabels = sortContracts(Array.from(xLabelsSet));

    const productGroupMap: Record<string, string> = {};
    const productFullNameMap: Record<string, string> = {};

    records.forEach((r) => {
        const product = String(r[productField] ?? "").trim();
        if (!product) return;
        if (!productGroupMap[product]) {
            if (groupField && r[groupField]) {
                productGroupMap[product] = String(r[groupField]).trim();
            } else {
                const meta = PRODUCT_GROUPS[product];
                productGroupMap[product] = meta ? meta.groupName : "Other";
            }
            const meta = PRODUCT_GROUPS[product];
            productFullNameMap[product] = meta ? meta.fullName : product;
        }
    });

    const productsByGroup: Record<string, string[]> = {};
    GROUP_ORDER.forEach((g) => { productsByGroup[g] = []; });
    Object.keys(productGroupMap).forEach((product) => {
        const group = productGroupMap[product];
        if (!productsByGroup[group]) productsByGroup[group] = [];
        if (!productsByGroup[group].includes(product)) productsByGroup[group].push(product);
    });

    const knownOrder = Object.keys(PRODUCT_GROUPS);
    Object.keys(productsByGroup).forEach((group) => {
        productsByGroup[group].sort((a, b) => {
            const ia = knownOrder.indexOf(a), ib = knownOrder.indexOf(b);
            if (ia !== -1 && ib !== -1) return ia - ib;
            if (ia !== -1) return -1;
            if (ib !== -1) return 1;
            return a.localeCompare(b);
        });
    });

    const yLabels: string[] = [];
    const yLabelGroup: Record<number, string> = {};
    GROUP_ORDER.forEach((groupName) => {
        (productsByGroup[groupName] || []).forEach((product) => {
            yLabelGroup[yLabels.length] = groupName;
            yLabels.push(productFullNameMap[product] || product);
        });
    });

    const productValueMap: Record<string, Record<string, number>> = {};
    records.forEach((r) => {
        const product = String(r[productField] ?? "").trim();
        const contract = String(r[contractField] ?? "").trim();
        if (!product || !contract) return;
        const numVal = Number(r[valueField]);
        if (!isNaN(numVal) && numVal !== 0) {
            if (!productValueMap[product]) productValueMap[product] = {};
            productValueMap[product][contract] = numVal;
        }
    });

    const allMappedData: any[] = [];
    const allNumericValues: number[] = [];

    yLabels.forEach((yLabel, yIndex) => {
        const groupName = yLabelGroup[yIndex] || "Other";
        const groupId = GROUP_IDS[groupName] || GROUP_IDS["Other"];
        const product = Object.keys(productFullNameMap).find(
            (p) => (productFullNameMap[p] || p) === yLabel
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
            name: "Heatmap", type: "heatmap", data: allMappedData,
            label: { show: true, fontSize: 10, formatter: (p: any) => p.data[2] <= GROUP_ID_OFFSET ? "" : p.data[2] },
            emphasis: { itemStyle: { shadowBlur: 10, shadowColor: "rgba(0,0,0,0.5)" } },
        }],
        visualMaps: [{
            type: "piecewise", show: false, seriesIndex: 0,
            pieces: buildVisualMapPieces(allNumericValues), dimension: 2,
        }],
    };
}

// ─── Chart option builder ─────────────────────────────────────────────────────

export function buildChartOption(parsed: ParsedHeatmapData, darkMode: boolean) {
    return {
        tooltip: {
            position: "top",
            confine: true,
            backgroundColor: darkMode ? "#1e293b" : "#ffffff",
            borderColor: darkMode ? "#334155" : "#e2e8f0",
            textStyle: { color: darkMode ? "#f8fafc" : "#1e293b", fontSize: 12 },
            formatter: (params: any) => {
                const [xIdx, yIdx, val, groupName] = params.value;
                const xLabel = parsed.xLabels[xIdx];
                const yLabel = parsed.yLabels[yIdx];
                const displayValue = val <= GROUP_ID_OFFSET ? "-" : val;
                return `
                    <div style="font-family:inherit;min-width:120px;">
                        <div style="font-size:10px;color:${darkMode ? "#94a3b8" : "#64748b"};margin-bottom:2px;text-transform:uppercase;letter-spacing:0.05em;">${groupName}</div>
                        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
                            <span style="font-weight:600;">${yLabel} <span style="font-weight:400;color:${darkMode ? "#64748b" : "#94a3b8"};margin-left:4px;">${xLabel}</span></span>
                            <span style="font-weight:700;font-size:14px;color:${val > 0 ? "#22c55e" : val < 0 && val > GROUP_ID_OFFSET ? "#ef4444" : "inherit"}">${displayValue}</span>
                        </div>
                    </div>
                `;
            },
        },
        grid: { top: "30px", bottom: "10px", left: "10px", right: "10px", containLabel: true },
        xAxis: {
            type: "category", data: parsed.xLabels,
            splitArea: { show: true },
            axisLabel: { interval: 0, rotate: 0, fontSize: 10 },
        },
        yAxis: {
            type: "category", data: parsed.yLabels,
            splitArea: { show: true },
            axisLabel: { fontSize: 10 },
        },
        visualMap: parsed.visualMaps,
        series: parsed.series,
    };
}