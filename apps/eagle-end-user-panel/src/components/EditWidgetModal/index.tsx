/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo } from "react";
import { X, Database, Palette } from "lucide-react";
import { useCsvDataStore } from "@/store/csvDataStore";
import type { CsvDataset } from "@/store/csvDataStore";
import type { FormulaStep } from "@/lib/formulaEngine";
import type { LocalDataConfig, LayoutItem } from "@/components/dashboard-renderer/types";
import { CURATED_WIDGETS } from "@/components/AddWidgetModal/widgetTypes";
import StepCsvUpload from "@/components/AddWidgetModal/StepCsvUpload";
import StepFormulaBuilder from "@/components/AddWidgetModal/StepFormulaBuilder";
import StepFieldMapping, { WIDGET_FIELDS } from "@/components/AddWidgetModal/StepFieldMapping";
import AppearanceEditor, { extractAppearanceValues, applyAppearanceToProps } from "./AppearanceEditor";

interface Props {
    item: LayoutItem;
    onClose: () => void;
    onSave: (widgetId: string, widgetTitle: string, newDefaultProps: Record<string, any>) => void;
}

type TabId = "data" | "appearance";

export default function EditWidgetModal({ item, onClose, onSave }: Props) {
    const { widget } = item;
    const componentName = widget?.componentName || "";
    const localDataConfig = widget?.defaultProps?.localDataConfig as LocalDataConfig | undefined;

    const { datasets, addDataset, removeDataset, saveFormulas } = useCsvDataStore();
    const existingDatasets = Object.values(datasets);

    const [activeTab, setActiveTab] = useState<TabId>("data");

    // ── Data source state — pre-populated from existing config ─────────────────
    const [pendingDataset, setPendingDataset] = useState<CsvDataset | null>(null);
    const [selectedDatasetId, setSelectedDatasetId] = useState<string | null>(
        localDataConfig?.datasetId || null
    );
    const [formulaSteps, setFormulaSteps] = useState<FormulaStep[]>(
        localDataConfig?.formulaSteps || []
    );
    const [fieldMapping, setFieldMapping] = useState<Record<string, string>>(() => {
        if (localDataConfig?.fieldMapping) return localDataConfig.fieldMapping;
        // Fallback: reconstruct from defaultProps using known field keys
        const fields = WIDGET_FIELDS[componentName] || [];
        const mapping: Record<string, string> = {};
        if (componentName === "LineChartWidget") {
            const s0 = widget?.defaultProps?.seriesConfig?.[0];
            if (s0?.valueField) mapping.seriesValueField = s0.valueField;
            if (widget?.defaultProps?.dateField) mapping.dateField = widget.defaultProps.dateField;
        } else {
            fields.forEach((f) => {
                if (widget?.defaultProps?.[f.field]) mapping[f.field] = widget.defaultProps[f.field];
            });
        }
        return mapping;
    });
    const [widgetTitle, setWidgetTitle] = useState(widget?.name || "");

    // ── Appearance state ────────────────────────────────────────────────────────
    const [appearanceValues, setAppearanceValues] = useState<Record<string, any>>(
        () => extractAppearanceValues(componentName, widget?.defaultProps || {})
    );

    // ── Derived ─────────────────────────────────────────────────────────────────
    const activeDataset: CsvDataset | null = useMemo(() => {
        if (pendingDataset) return pendingDataset;
        if (selectedDatasetId) return datasets[selectedDatasetId] || null;
        return null;
    }, [pendingDataset, selectedDatasetId, datasets]);

    const allColumns = useMemo(() => {
        if (!activeDataset) return [];
        const computed = formulaSteps
            .map((s) => s.outputColumn)
            .filter((n) => n && !activeDataset.headers.includes(n));
        return [...activeDataset.headers, ...computed];
    }, [activeDataset, formulaSteps]);

    const previewRows = activeDataset?.rows.slice(0, 5) || [];

    // ── Handlers ─────────────────────────────────────────────────────────────────
    const handleDatasetReady = (ds: CsvDataset) => {
        setPendingDataset(ds);
        setSelectedDatasetId(null);
    };

    const handleSelectExisting = (id: string) => {
        setSelectedDatasetId(id);
        setPendingDataset(null);
        setFormulaSteps(datasets[id]?.savedFormulas || []);
        setFieldMapping({});
    };

    const handleRemoveExisting = (id: string) => {
        removeDataset(id);
        if (selectedDatasetId === id) setSelectedDatasetId(null);
    };

    const handleSave = () => {
        if (!activeDataset) return;

        if (pendingDataset) addDataset(pendingDataset);

        const datasetId = pendingDataset ? pendingDataset.id : (selectedDatasetId as string);
        saveFormulas(datasetId, formulaSteps);

        const newLocalDataConfig: LocalDataConfig = { datasetId, formulaSteps, fieldMapping };

        let newDefaultProps: Record<string, any>;

        if (componentName === "LineChartWidget") {
            // Build seriesConfig directly with appearance values — avoids the virtual-prop
            // translation layer that caused color changes to be silently dropped.
            const seriesValueField = fieldMapping.seriesValueField
                || (widget?.defaultProps?.seriesConfig as any[])?.[0]?.valueField
                || "";
            newDefaultProps = {
                seriesConfig: [{
                    name: "Series",
                    valueField: seriesValueField,
                    color: appearanceValues.seriesColor || "#6366f1",
                    strokeWidth: appearanceValues.seriesStrokeWidth || 2,
                }],
                dateField: fieldMapping.dateField || widget?.defaultProps?.dateField || "date",
                xAxisType: "category",
                localDataConfig: newLocalDataConfig,
            };
        } else {
            const widgetFieldProps: Record<string, any> = {};
            Object.entries(fieldMapping).forEach(([k, v]) => { widgetFieldProps[k] = v; });
            newDefaultProps = applyAppearanceToProps(componentName, appearanceValues, {
                ...widgetFieldProps,
                localDataConfig: newLocalDataConfig,
            });
        }

        onSave(item.i, widgetTitle, newDefaultProps);
    };

    const widgetLabel = CURATED_WIDGETS.find((w) => w.componentName === componentName)?.label || componentName;

    const TABS: { id: TabId; label: string; Icon: typeof Database }[] = [
        { id: "data", label: "Data Source", Icon: Database },
        { id: "appearance", label: "Appearance", Icon: Palette },
    ];

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div
                className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-zinc-700 shadow-2xl bg-[#111113]"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-800">
                    <div>
                        <h2 className="text-base font-bold text-white">Edit Widget</h2>
                        <p className="text-xs text-zinc-500 mt-0.5">{widgetLabel}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Tab bar */}
                <div className="flex border-b border-zinc-800 px-6">
                    {TABS.map(({ id, label, Icon }) => (
                        <button
                            key={id}
                            onClick={() => setActiveTab(id)}
                            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
                                activeTab === id
                                    ? "border-blue-500 text-blue-400"
                                    : "border-transparent text-zinc-500 hover:text-zinc-300"
                            }`}
                        >
                            <Icon size={14} />
                            {label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
                    {activeTab === "data" && (
                        <>
                            <section className="space-y-3">
                                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                                    Data Source
                                </p>
                                <StepCsvUpload
                                    existingDatasets={existingDatasets}
                                    selectedDatasetId={selectedDatasetId}
                                    onDatasetReady={handleDatasetReady}
                                    onSelectExisting={handleSelectExisting}
                                    onRemoveExisting={handleRemoveExisting}
                                />
                            </section>

                            {activeDataset && (
                                <section className="space-y-3">
                                    <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                                        Computed Columns
                                    </p>
                                    <StepFormulaBuilder
                                        headers={activeDataset.headers}
                                        steps={formulaSteps}
                                        onChange={setFormulaSteps}
                                        previewRows={previewRows}
                                    />
                                </section>
                            )}

                            {activeDataset && (
                                <section className="space-y-3">
                                    <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                                        Field Mapping
                                    </p>
                                    <StepFieldMapping
                                        componentName={componentName}
                                        availableColumns={allColumns}
                                        mapping={fieldMapping}
                                        widgetTitle={widgetTitle}
                                        onMappingChange={setFieldMapping}
                                        onTitleChange={setWidgetTitle}
                                    />
                                </section>
                            )}
                        </>
                    )}

                    {activeTab === "appearance" && (
                        <AppearanceEditor
                            componentName={componentName}
                            values={appearanceValues}
                            onChange={setAppearanceValues}
                        />
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800">
                    <button
                        onClick={onClose}
                        className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!activeDataset}
                        className={`text-sm px-5 py-2 rounded-lg font-semibold transition-all ${
                            activeDataset
                                ? "bg-blue-600 hover:bg-blue-500 text-white"
                                : "bg-zinc-700 text-zinc-500 cursor-not-allowed"
                        }`}
                    >
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
}
