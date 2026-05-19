/* eslint-disable @typescript-eslint/no-explicit-any */

interface AppearanceField {
    prop: string;
    label: string;
    type: "color" | "boolean" | "number" | "select" | "text";
    options?: { value: string; label: string }[];
    min?: number;
    max?: number;
    step?: number;
    placeholder?: string;
    showWhen?: { prop: string; value: any };
}

const WIDGET_APPEARANCE: Record<string, AppearanceField[]> = {
    BarChartWidget: [
        {
            prop: "colorMode",
            label: "Color Mode",
            type: "select",
            options: [
                { value: "static", label: "Static color" },
                { value: "price-based", label: "Price-based (up / down)" },
            ],
        },
        { prop: "staticColor", label: "Bar Color", type: "color", showWhen: { prop: "colorMode", value: "static" } },
        { prop: "upColor", label: "Up Color", type: "color", showWhen: { prop: "colorMode", value: "price-based" } },
        { prop: "downColor", label: "Down Color", type: "color", showWhen: { prop: "colorMode", value: "price-based" } },
        { prop: "showYAxis", label: "Show Y Axis", type: "boolean" },
    ],
    LineChartWidget: [
        // ── Series (first series) ──────────────────────────────────────────────
        { prop: "seriesColor", label: "Line Color", type: "color" },
        { prop: "seriesStrokeWidth", label: "Stroke Width", type: "number", min: 1, max: 8, step: 0.5 },
        { prop: "seriesDasharray", label: "Dash Array (e.g. 4,4)", type: "text", placeholder: "4,4" },
        { prop: "seriesFill", label: "Fill Area", type: "boolean" },
        { prop: "seriesFillOpacity", label: "Fill Opacity", type: "number", min: 0, max: 1, step: 0.05, showWhen: { prop: "seriesFill", value: true } },
        { prop: "seriesBullets", label: "Show Bullets", type: "boolean" },
        { prop: "seriesStepped", label: "Step Line", type: "boolean" },
        // ── Axes ──────────────────────────────────────────────────────────────
        {
            prop: "xAxisType",
            label: "X Axis Type",
            type: "select",
            options: [
                { value: "date", label: "Date" },
                { value: "category", label: "Category" },
                { value: "value", label: "Numeric" },
            ],
        },
        {
            prop: "baseTimeUnit",
            label: "Time Unit",
            type: "select",
            options: [
                { value: "millisecond", label: "Millisecond" },
                { value: "second", label: "Second" },
                { value: "minute", label: "Minute" },
                { value: "hour", label: "Hour" },
                { value: "day", label: "Day" },
                { value: "week", label: "Week" },
                { value: "month", label: "Month" },
                { value: "year", label: "Year" },
            ],
            showWhen: { prop: "xAxisType", value: "date" },
        },
        { prop: "xAxisDateFormat", label: "Date Format (e.g. MM/dd)", type: "text", placeholder: "MM/dd", showWhen: { prop: "xAxisType", value: "date" } },
        { prop: "xAxisLabel", label: "X Axis Label", type: "text", placeholder: "X axis" },
        { prop: "yAxisLabel", label: "Y Axis Label", type: "text", placeholder: "Y axis" },
        { prop: "yAxisMin", label: "Y Axis Min", type: "number", min: -1e9, max: 1e9, step: 1 },
        { prop: "yAxisMax", label: "Y Axis Max", type: "number", min: -1e9, max: 1e9, step: 1 },
        { prop: "dualYAxis", label: "Dual Y Axis", type: "boolean" },
        { prop: "yAxisRightLabel", label: "Right Y Axis Label", type: "text", placeholder: "Right axis", showWhen: { prop: "dualYAxis", value: true } },
        // ── Display ───────────────────────────────────────────────────────────
        { prop: "showGridLines", label: "Show Grid Lines", type: "boolean" },
        { prop: "showScrollbar", label: "Show Scrollbar", type: "boolean" },
        { prop: "showLegend", label: "Show Legend", type: "boolean" },
        {
            prop: "legendPosition",
            label: "Legend Position",
            type: "select",
            options: [
                { value: "bottom", label: "Bottom" },
                { value: "top", label: "Top" },
                { value: "right", label: "Right" },
            ],
            showWhen: { prop: "showLegend", value: true },
        },
        {
            prop: "cursorBehavior",
            label: "Cursor Behavior",
            type: "select",
            options: [
                { value: "none", label: "None" },
                { value: "zoomX", label: "Zoom X" },
                { value: "zoomY", label: "Zoom Y" },
                { value: "zoomXY", label: "Zoom XY" },
                { value: "selectX", label: "Select X" },
            ],
        },
        { prop: "showRefreshButton", label: "Show Refresh Button", type: "boolean" },
    ],
    AreaChartWidget: [
        { prop: "lineColor", label: "Line Color", type: "color" },
        { prop: "fillColor", label: "Fill Color", type: "color" },
        { prop: "fillOpacity", label: "Fill Opacity (0–1)", type: "number", min: 0, max: 1, step: 0.05 },
        { prop: "strokeWidth", label: "Stroke Width", type: "number", min: 1, max: 8, step: 0.5 },
    ],
    PieChartWidget: [
        { prop: "donut", label: "Donut Style", type: "boolean" },
        {
            prop: "innerRadius",
            label: "Inner Radius (%)",
            type: "number",
            min: 10,
            max: 80,
            step: 5,
            showWhen: { prop: "donut", value: true },
        },
    ],
    ScatterPlotWidget: [
        { prop: "pointColor", label: "Point Color", type: "color" },
        { prop: "pointSize", label: "Point Size (px)", type: "number", min: 2, max: 30, step: 1 },
        { prop: "showTrendLine", label: "Show Trend Line", type: "boolean" },
        { prop: "enableZoom", label: "Enable Zoom", type: "boolean" },
    ],
    MetricWidget: [
        { prop: "positiveColor", label: "Positive Delta Color", type: "color" },
        { prop: "negativeColor", label: "Negative Delta Color", type: "color" },
        { prop: "itemsPerRow", label: "Items Per Row", type: "number", min: 1, max: 6, step: 1 },
        { prop: "showDelta", label: "Show Delta", type: "boolean" },
    ],
    DataTableWidget: [],
};

// LineChartWidget uses a seriesConfig array. We flatten series[0] fields into
// virtual keys (seriesColor, seriesFill, etc.) for the editor, then re-pack on save.
export function extractAppearanceValues(componentName: string, defaultProps: Record<string, any>): Record<string, any> {
    if (componentName === "LineChartWidget") {
        const s0 = (defaultProps.seriesConfig as any[])?.[0] || {};
        return {
            // series
            seriesColor: s0.color ?? "#00998b",
            seriesStrokeWidth: s0.strokeWidth ?? 2,
            seriesDasharray: s0.strokeDasharray ?? "",
            seriesFill: s0.fill ?? false,
            seriesFillOpacity: s0.fillOpacity ?? 0.15,
            seriesBullets: s0.bullets ?? false,
            seriesStepped: s0.stepped ?? false,
            // axes
            xAxisType: defaultProps.xAxisType ?? "date",
            baseTimeUnit: defaultProps.baseTimeUnit ?? "day",
            xAxisDateFormat: defaultProps.xAxisDateFormat ?? "",
            xAxisLabel: defaultProps.xAxisLabel ?? "",
            yAxisLabel: defaultProps.yAxisLabel ?? "",
            yAxisMin: defaultProps.yAxisMin,
            yAxisMax: defaultProps.yAxisMax,
            dualYAxis: defaultProps.dualYAxis ?? false,
            yAxisRightLabel: defaultProps.yAxisRightLabel ?? "",
            // display
            showGridLines: defaultProps.showGridLines ?? true,
            showScrollbar: defaultProps.showScrollbar ?? false,
            showLegend: defaultProps.showLegend,
            legendPosition: defaultProps.legendPosition ?? "bottom",
            cursorBehavior: defaultProps.cursorBehavior ?? "zoomX",
            showRefreshButton: defaultProps.showRefreshButton ?? false,
        };
    }
    const fields = WIDGET_APPEARANCE[componentName] || [];
    const result: Record<string, any> = {};
    fields.forEach((f) => {
        if (defaultProps[f.prop] !== undefined) result[f.prop] = defaultProps[f.prop];
    });
    return result;
}

export function applyAppearanceToProps(
    componentName: string,
    appearance: Record<string, any>,
    baseProps: Record<string, any>
): Record<string, any> {
    if (componentName === "LineChartWidget") {
        const existing = (baseProps.seriesConfig as any[])?.[0] || { name: "Series", valueField: "value" };
        const updated: Record<string, any> = {
            ...baseProps,
            seriesConfig: [{
                ...existing,
                color: appearance.seriesColor ?? existing.color,
                strokeWidth: appearance.seriesStrokeWidth ?? existing.strokeWidth,
                strokeDasharray: appearance.seriesDasharray || undefined,
                fill: appearance.seriesFill ?? existing.fill,
                fillOpacity: appearance.seriesFillOpacity ?? existing.fillOpacity,
                bullets: appearance.seriesBullets ?? existing.bullets,
                stepped: appearance.seriesStepped ?? existing.stepped,
            }],
            // axes
            xAxisType: appearance.xAxisType ?? baseProps.xAxisType,
            baseTimeUnit: appearance.baseTimeUnit ?? baseProps.baseTimeUnit,
            xAxisDateFormat: appearance.xAxisDateFormat || undefined,
            xAxisLabel: appearance.xAxisLabel || undefined,
            yAxisLabel: appearance.yAxisLabel || undefined,
            dualYAxis: appearance.dualYAxis ?? baseProps.dualYAxis,
            yAxisRightLabel: appearance.yAxisRightLabel || undefined,
            // display
            showGridLines: appearance.showGridLines ?? baseProps.showGridLines,
            showScrollbar: appearance.showScrollbar ?? baseProps.showScrollbar,
            showLegend: appearance.showLegend,
            legendPosition: appearance.legendPosition ?? baseProps.legendPosition,
            cursorBehavior: appearance.cursorBehavior ?? baseProps.cursorBehavior,
            showRefreshButton: appearance.showRefreshButton ?? baseProps.showRefreshButton,
        };
        // Only set yAxisMin/Max if they have a value
        if (appearance.yAxisMin !== undefined && appearance.yAxisMin !== "") updated.yAxisMin = Number(appearance.yAxisMin);
        else delete updated.yAxisMin;
        if (appearance.yAxisMax !== undefined && appearance.yAxisMax !== "") updated.yAxisMax = Number(appearance.yAxisMax);
        else delete updated.yAxisMax;
        return updated;
    }
    return { ...baseProps, ...appearance };
}

interface Props {
    componentName: string;
    values: Record<string, any>;
    onChange: (values: Record<string, any>) => void;
}

export default function AppearanceEditor({ componentName, values, onChange }: Props) {
    const fields = WIDGET_APPEARANCE[componentName] || [];

    if (fields.length === 0) {
        return (
            <div className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700 text-sm text-zinc-400">
                No appearance options are available for {componentName}.
            </div>
        );
    }

    const set = (prop: string, value: any) => onChange({ ...values, [prop]: value });

    return (
        <div className="space-y-5">
            {fields.map((f) => {
                if (f.showWhen && values[f.showWhen.prop] !== f.showWhen.value) return null;
                return (
                    <div key={f.prop}>
                        <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider block mb-2">
                            {f.label}
                        </label>

                        {f.type === "color" && (
                            <div className="flex items-center gap-3">
                                <input
                                    type="color"
                                    value={values[f.prop] || "#6366f1"}
                                    onChange={(e) => set(f.prop, e.target.value)}
                                    className="w-10 h-10 rounded-lg border border-zinc-600 cursor-pointer bg-zinc-900 p-0.5"
                                />
                                <input
                                    type="text"
                                    value={values[f.prop] || "#6366f1"}
                                    onChange={(e) => set(f.prop, e.target.value)}
                                    placeholder="#6366f1"
                                    className="w-28 text-xs bg-zinc-800 border border-zinc-600 rounded-lg px-2 py-1.5 text-zinc-300 font-mono focus:outline-none focus:border-blue-500"
                                />
                            </div>
                        )}

                        {f.type === "boolean" && (
                            <div
                                className="flex items-center gap-3 cursor-pointer w-fit"
                                onClick={() => set(f.prop, !values[f.prop])}
                            >
                                <div
                                    className={`relative w-10 h-5 rounded-full transition-colors ${
                                        values[f.prop] ? "bg-blue-500" : "bg-zinc-600"
                                    }`}
                                >
                                    <div
                                        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                                            values[f.prop] ? "translate-x-5" : "translate-x-0.5"
                                        }`}
                                    />
                                </div>
                                <span className="text-sm text-zinc-300">{values[f.prop] ? "On" : "Off"}</span>
                            </div>
                        )}

                        {f.type === "number" && (
                            <div className="flex items-center gap-3">
                                <input
                                    type="range"
                                    min={f.min ?? 0}
                                    max={f.max ?? 100}
                                    step={f.step ?? 1}
                                    value={values[f.prop] ?? f.min ?? 0}
                                    onChange={(e) => set(f.prop, parseFloat(e.target.value))}
                                    className="flex-1 accent-blue-500"
                                />
                                <input
                                    type="number"
                                    min={f.min}
                                    max={f.max}
                                    step={f.step}
                                    value={values[f.prop] ?? f.min ?? 0}
                                    onChange={(e) => set(f.prop, parseFloat(e.target.value))}
                                    className="w-16 text-xs bg-zinc-800 border border-zinc-600 rounded-lg px-2 py-1.5 text-zinc-300 font-mono focus:outline-none focus:border-blue-500 text-center"
                                />
                            </div>
                        )}

                        {f.type === "select" && (
                            <select
                                value={values[f.prop] || f.options?.[0]?.value || ""}
                                onChange={(e) => set(f.prop, e.target.value)}
                                className="w-full text-sm bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:border-blue-500"
                            >
                                {f.options?.map((o) => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                            </select>
                        )}

                        {f.type === "text" && (
                            <input
                                type="text"
                                value={values[f.prop] ?? ""}
                                onChange={(e) => set(f.prop, e.target.value)}
                                placeholder={f.placeholder ?? ""}
                                className="w-full text-sm bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:border-blue-500"
                            />
                        )}
                    </div>
                );
            })}
        </div>
    );
}
