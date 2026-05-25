import { useState, useMemo } from "react";
import { X, ChevronRight } from "lucide-react";
import { useCsvDataStore, type CsvDataset } from "@/store/csvDataStore";
import type { FormulaStep } from "@/lib/formulaEngine";
import type { LocalDataConfig } from "@/components/dashboard-renderer/types";
import AppearanceEditor, { applyAppearanceToProps, extractAppearanceValues } from "@/components/EditWidgetModal/AppearanceEditor";
import { CURATED_WIDGETS } from "./widgetTypes";
import { FALCON_WIDGETS } from "./falconWidgetCatalog";
import StepSelectWidget from "./StepSelectWidget";
import StepCsvUpload from "./StepCsvUpload";
import StepFormulaBuilder from "./StepFormulaBuilder";
import StepFieldMapping, { WIDGET_FIELDS } from "./StepFieldMapping";
import StepFalconConfigure from "./StepFalconConfigure";

export type AddWidgetConfig = {
    componentName: string;
    widgetTitle: string;
    defaultProps: Record<string, unknown>;
    localDataConfig?: LocalDataConfig;
    suggestedSize?: { w: number; h: number };
};

interface Props {
    onClose: () => void;
    onAdd: (config: AddWidgetConfig) => void;
}

const CSV_STEPS = ["Select Widget", "Load Data", "Transform", "Map Fields", "Appearance"];
const FALCON_STEPS = ["Select Widget", "Configure"];

export default function AddWidgetModal({ onClose, onAdd }: Props) {
    const [source, setSource] = useState<"csv" | "falcon">("csv");
    const [step, setStep] = useState(0);
    const [selectedComponent, setSelectedComponent] = useState<string | null>(null);

    // ── CSV-specific state ──────────────────────────────────────────────────────
    const [pendingDataset, setPendingDataset] = useState<CsvDataset | null>(null);
    const [selectedDatasetId, setSelectedDatasetId] = useState<string | null>(null);
    const [formulaSteps, setFormulaSteps] = useState<FormulaStep[]>([]);
    const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
    const [widgetTitle, setWidgetTitle] = useState("");
    const [appearanceValues, setAppearanceValues] = useState<Record<string, unknown>>({});

    // ── Falcon-specific state ───────────────────────────────────────────────────
    const [falconPropValues, setFalconPropValues] = useState<Record<string, string>>({});
    const [falconWidgetTitle, setFalconWidgetTitle] = useState("");

    const { datasets, addDataset, removeDataset, saveFormulas } = useCsvDataStore();
    const existingDatasets = Object.values(datasets);

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

    const steps = source === "falcon" ? FALCON_STEPS : CSV_STEPS;

    // ── Source-tab switch ───────────────────────────────────────────────────────
    const handleSourceChange = (next: "csv" | "falcon") => {
        setSource(next);
        setSelectedComponent(null);
        setFalconPropValues({});
        setFalconWidgetTitle("");
        setWidgetTitle("");
        // Stay on step 0 regardless
        setStep(0);
    };

    // ── Widget selection ────────────────────────────────────────────────────────
    const handleSelect = (componentName: string) => {
        setSelectedComponent(componentName || null);
        if (source === "falcon" && componentName) {
            const def = FALCON_WIDGETS.find((w) => w.componentName === componentName);
            const defaults: Record<string, string> = {};
            def?.props.forEach((p) => {
                if (p.defaultValue !== undefined) defaults[p.key] = p.defaultValue;
            });
            setFalconPropValues(defaults);
            setFalconWidgetTitle("");
        }
    };

    // ── Step validation ─────────────────────────────────────────────────────────
    const isStepValid = (): boolean => {
        if (step === 0) return !!selectedComponent;
        if (source === "falcon") return true; // configure step is always valid
        if (step === 1) return !!activeDataset;
        if (step === 2) return true;
        if (step === 3) {
            if (!selectedComponent) return false;
            const required = (WIDGET_FIELDS[selectedComponent] || [])
                .filter((f) => f.required)
                .map((f) => f.field);
            return required.every((f) => !!fieldMapping[f]);
        }
        if (step === 4) return true;
        return true;
    };

    // ── Navigation ──────────────────────────────────────────────────────────────
    const handleNext = () => {
        if (step === 3 && source === "csv" && selectedComponent) {
            seedAppearanceDefaults(selectedComponent, fieldMapping);
        }
        if (step < steps.length - 1) {
            setStep((s) => s + 1);
        } else {
            source === "falcon" ? handleConfirmFalcon() : handleConfirmCsv();
        }
    };

    // ── CSV confirm ─────────────────────────────────────────────────────────────
    const seedAppearanceDefaults = (component: string, mapping: Record<string, string>) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const baseProps: Record<string, any> = {};
        if (component === "LineChartWidget") {
            baseProps.seriesConfig = [{ name: "Series", valueField: mapping.seriesValueField ?? "value", color: "#00998b", strokeWidth: 2 }];
            if (mapping.dateField) baseProps.dateField = mapping.dateField;
            baseProps.xAxisType = "category";
        }
        setAppearanceValues(extractAppearanceValues(component, baseProps));
    };

    const handleConfirmCsv = () => {
        if (!selectedComponent || !activeDataset) return;

        if (pendingDataset) addDataset(pendingDataset);

        const datasetId = pendingDataset ? pendingDataset.id : (selectedDatasetId as string);
        saveFormulas(datasetId, formulaSteps);
        const localDataConfig: LocalDataConfig = { datasetId, formulaSteps, fieldMapping };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let widgetDefaultProps: Record<string, any> = {};
        if (selectedComponent === "LineChartWidget" && fieldMapping.seriesValueField) {
            widgetDefaultProps.seriesConfig = [
                { name: "Series", valueField: fieldMapping.seriesValueField, color: "#00998b", strokeWidth: 2 },
            ];
            if (fieldMapping.dateField) widgetDefaultProps.dateField = fieldMapping.dateField;
            widgetDefaultProps.xAxisType = "category";
        } else {
            Object.entries(fieldMapping).forEach(([widgetField, colName]) => {
                widgetDefaultProps[widgetField] = colName;
            });
        }
        widgetDefaultProps = applyAppearanceToProps(selectedComponent, appearanceValues as Record<string, unknown>, widgetDefaultProps);

        onAdd({
            componentName: selectedComponent,
            widgetTitle: widgetTitle || (CURATED_WIDGETS.find((w) => w.componentName === selectedComponent)?.label ?? selectedComponent),
            defaultProps: widgetDefaultProps,
            localDataConfig,
        });
    };

    // ── Falcon confirm ──────────────────────────────────────────────────────────
    const handleConfirmFalcon = () => {
        if (!selectedComponent) return;
        const def = FALCON_WIDGETS.find((w) => w.componentName === selectedComponent);
        if (!def) return;

        const defaultProps: Record<string, unknown> = { ...(def.staticProps ?? {}) };
        def.props.forEach((p) => {
            const val = falconPropValues[p.key];
            if (val !== undefined && val !== "") defaultProps[p.key] = val;
        });

        onAdd({
            componentName: selectedComponent,
            widgetTitle: falconWidgetTitle || def.label,
            defaultProps,
            suggestedSize: { w: def.defaultWidth, h: def.defaultHeight },
        });
    };

    // ── CSV dataset helpers ─────────────────────────────────────────────────────
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

    const previewRows = activeDataset?.rows.slice(0, 5) || [];

    const selectedFalconDef = source === "falcon" && selectedComponent
        ? FALCON_WIDGETS.find((w) => w.componentName === selectedComponent) ?? null
        : null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-zinc-700 shadow-2xl bg-[#111113]">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-800">
                    <div>
                        <h2 className="text-base font-bold text-white">Add Widget</h2>
                        <p className="text-xs text-zinc-500 mt-0.5">
                            {source === "falcon"
                                ? "Live Falcon Analytics — no CSV required"
                                : "Bring your own CSV data to the dashboard"}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Step bar */}
                <div className="flex items-center gap-0 px-6 pt-5 pb-3 overflow-x-auto">
                    {steps.map((label, i) => (
                        <div key={i} className="flex items-center">
                            <div className="flex items-center gap-2">
                                <div
                                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                                        i < step
                                            ? source === "falcon" ? "bg-violet-500 text-white" : "bg-blue-500 text-white"
                                            : i === step
                                            ? source === "falcon"
                                                ? "bg-violet-500/20 border-2 border-violet-500 text-violet-400"
                                                : "bg-blue-500/20 border-2 border-blue-500 text-blue-400"
                                            : "bg-zinc-800 border border-zinc-600 text-zinc-500"
                                    }`}
                                >
                                    {i < step ? "✓" : i + 1}
                                </div>
                                <span
                                    className={`text-xs font-medium whitespace-nowrap ${
                                        i === step
                                            ? source === "falcon" ? "text-violet-400" : "text-blue-400"
                                            : i < step ? "text-zinc-300" : "text-zinc-600"
                                    }`}
                                >
                                    {label}
                                </span>
                            </div>
                            {i < steps.length - 1 && (
                                <ChevronRight size={14} className="text-zinc-700 mx-2" />
                            )}
                        </div>
                    ))}
                </div>

                {/* Step content */}
                <div className="flex-1 overflow-y-auto px-6 py-4">
                    {step === 0 && (
                        <StepSelectWidget
                            selected={selectedComponent}
                            onSelect={handleSelect}
                            source={source}
                            onSourceChange={handleSourceChange}
                        />
                    )}

                    {/* Falcon: configure step */}
                    {step === 1 && source === "falcon" && selectedFalconDef && (
                        <StepFalconConfigure
                            widgetDef={selectedFalconDef}
                            values={falconPropValues}
                            widgetTitle={falconWidgetTitle}
                            onChange={setFalconPropValues}
                            onTitleChange={setFalconWidgetTitle}
                        />
                    )}

                    {/* CSV steps */}
                    {step === 1 && source === "csv" && (
                        <StepCsvUpload
                            existingDatasets={existingDatasets}
                            selectedDatasetId={selectedDatasetId}
                            onDatasetReady={handleDatasetReady}
                            onSelectExisting={handleSelectExisting}
                            onRemoveExisting={handleRemoveExisting}
                        />
                    )}
                    {step === 2 && source === "csv" && (
                        <StepFormulaBuilder
                            headers={activeDataset?.headers || []}
                            steps={formulaSteps}
                            onChange={setFormulaSteps}
                            previewRows={previewRows}
                        />
                    )}
                    {step === 3 && source === "csv" && (
                        <StepFieldMapping
                            componentName={selectedComponent || ""}
                            availableColumns={allColumns}
                            mapping={fieldMapping}
                            widgetTitle={widgetTitle}
                            onMappingChange={setFieldMapping}
                            onTitleChange={setWidgetTitle}
                        />
                    )}
                    {step === 4 && source === "csv" && selectedComponent && (
                        <AppearanceEditor
                            componentName={selectedComponent}
                            values={appearanceValues as Record<string, unknown>}
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
                    <div className="flex items-center gap-3">
                        {step > 0 && (
                            <button
                                onClick={() => setStep((s) => s - 1)}
                                className="text-sm px-4 py-2 rounded-lg border border-zinc-700 text-zinc-300 hover:bg-zinc-800 transition-colors"
                            >
                                Back
                            </button>
                        )}
                        <button
                            onClick={handleNext}
                            disabled={!isStepValid()}
                            className={`text-sm px-5 py-2 rounded-lg font-semibold transition-all ${
                                isStepValid()
                                    ? source === "falcon"
                                        ? "bg-violet-600 hover:bg-violet-500 text-white"
                                        : "bg-blue-600 hover:bg-blue-500 text-white"
                                    : "bg-zinc-700 text-zinc-500 cursor-not-allowed"
                            }`}
                        >
                            {step === steps.length - 1 ? "Add to Dashboard" : "Next"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
