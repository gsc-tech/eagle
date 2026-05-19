interface FieldDef {
    field: string;
    label: string;
    required: boolean;
}

const WIDGET_FIELDS: Record<string, FieldDef[]> = {
    BarChartWidget: [
        { field: "valueField", label: "Value Field", required: true },
    ],
    LineChartWidget: [
        { field: "dateField", label: "X-Axis / Date Field", required: true },
        { field: "seriesValueField", label: "Y-Axis / Value Field", required: true },
    ],
    AreaChartWidget: [
        { field: "dateField", label: "Date Field", required: true },
        { field: "valueField", label: "Value Field", required: true },
    ],
    PieChartWidget: [
        { field: "categoryField", label: "Category Field", required: true },
        { field: "valueField", label: "Value Field", required: true },
    ],
    ScatterPlotWidget: [
        { field: "xField", label: "X Field", required: true },
        { field: "yField", label: "Y Field", required: true },
        { field: "categoryField", label: "Category Field (optional)", required: false },
    ],
    DataTableWidget: [],
    MetricWidget: [
        { field: "labelField", label: "Label Field", required: true },
        { field: "valueField", label: "Value Field", required: true },
        { field: "deltaField", label: "Delta Field (optional)", required: false },
    ],
};

interface Props {
    componentName: string;
    availableColumns: string[];
    mapping: Record<string, string>;
    widgetTitle: string;
    onMappingChange: (mapping: Record<string, string>) => void;
    onTitleChange: (title: string) => void;
}

export default function StepFieldMapping({
    componentName,
    availableColumns,
    mapping,
    widgetTitle,
    onMappingChange,
    onTitleChange,
}: Props) {
    const fields = WIDGET_FIELDS[componentName] || [];

    const handleChange = (field: string, value: string) => {
        onMappingChange({ ...mapping, [field]: value });
    };

    return (
        <div className="space-y-5">
            <p className="text-sm text-zinc-400">
                Map your dataset columns to the widget's display fields.
            </p>

            {/* Widget title */}
            <div>
                <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider block mb-1.5">
                    Widget Title
                </label>
                <input
                    type="text"
                    value={widgetTitle}
                    onChange={(e) => onTitleChange(e.target.value)}
                    placeholder="My Widget"
                    className="w-full text-sm bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:border-blue-500"
                />
            </div>

            {fields.length === 0 ? (
                <div className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700 text-sm text-zinc-400">
                    All columns will be displayed automatically — no mapping needed for Data Table.
                </div>
            ) : (
                <div className="space-y-4">
                    {fields.map(({ field, label, required }) => (
                        <div key={field}>
                            <label className="text-xs text-zinc-400 font-semibold block mb-1.5">
                                {label}
                                {required && <span className="text-red-400 ml-1">*</span>}
                            </label>
                            <select
                                value={mapping[field] || ""}
                                onChange={(e) => handleChange(field, e.target.value)}
                                className="w-full text-sm bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:border-blue-500"
                            >
                                <option value="">— select column —</option>
                                {availableColumns.map((col) => (
                                    <option key={col} value={col}>{col}</option>
                                ))}
                            </select>
                        </div>
                    ))}
                </div>
            )}

            {availableColumns.length > 0 && (
                <div>
                    <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider mb-2">
                        Available columns
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {availableColumns.map((col) => (
                            <span
                                key={col}
                                className="text-xs px-2 py-1 bg-zinc-800 border border-zinc-700 rounded-md text-zinc-400 font-mono"
                            >
                                {col}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export { WIDGET_FIELDS };
