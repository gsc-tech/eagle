import { useState, useMemo } from "react";
import { X, ChevronRight } from "lucide-react";
import { useCsvDataStore, type CsvDataset } from "@/store/csvDataStore";
import type { FormulaStep } from "@/lib/formulaEngine";
import type { LocalDataConfig } from "@/components/dashboard-renderer/types";
import AppearanceEditor, { applyAppearanceToProps, extractAppearanceValues } from "@/components/EditWidgetModal/AppearanceEditor";
import { CURATED_WIDGETS } from "./widgetTypes";
import StepSelectWidget from "./StepSelectWidget";
import StepCsvUpload from "./StepCsvUpload";
import StepFormulaBuilder from "./StepFormulaBuilder";
import StepFieldMapping, { WIDGET_FIELDS } from "./StepFieldMapping";

interface Props {
    onClose: () => void;
    onAdd: (config: {
        componentName: string;
        widgetTitle: string;
        localDataConfig: LocalDataConfig;
        fieldMapping: Record<string, string>;
    }) => void;
}

const STEPS = ["Select Widget", "Load Data", "Transform", "Map Fields", "Appearance"];

export default function AddWidgetModal({ onClose, onAdd }: Props) {
    const [step, setStep] = useState(0);
    const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
    const [pendingDataset, setPendingDataset] = useState<CsvDataset | null>(null);
    const [selectedDatasetId, setSelectedDatasetId] = useState<string | null>(null);
    const [formulaSteps, setFormulaSteps] = useState<FormulaStep[]>([]);
    const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
    const [widgetTitle, setWidgetTitle] = useState("");
    const [appearanceValues, setAppearanceValues] = useState<Record<string, unknown>>({});

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

    // When the user reaches the Appearance step, seed defaults based on any
    // field mapping already chosen (e.g. seriesValueField → seriesConfig[0]).
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

    const isStepValid = (): boolean => {
        if (step === 0) return !!selectedComponent;
        if (step === 1) return !!activeDataset;
        if (step === 2) return true;
        if (step === 3) {
            if (!selectedComponent) return false;
            const requiredFields = (WIDGET_FIELDS[selectedComponent] || [])
                .filter((f) => f.required)
                .map((f) => f.field);
            return requiredFields.every((f) => !!fieldMapping[f]);
        }
        if (step === 4) return true;
        return true;
    };

    const handleNext = () => {
        if (step === 3 && selectedComponent) {
            seedAppearanceDefaults(selectedComponent, fieldMapping);
        }
        if (step < STEPS.length - 1) {
            setStep((s) => s + 1);
        } else {
            handleConfirm();
        }
    };

    const handleConfirm = () => {
        if (!selectedComponent || !activeDataset) return;

        if (pendingDataset) {
            addDataset(pendingDataset);
        }

        const datasetId = pendingDataset ? pendingDataset.id : (selectedDatasetId as string);
        saveFormulas(datasetId, formulaSteps);
        const localDataConfig: LocalDataConfig = {
            datasetId,
            formulaSteps,
            fieldMapping,
        };

        // Build base props from field mapping then apply appearance on top
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
            localDataConfig,
            fieldMapping: widgetDefaultProps,
        });
    };

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
        if (selectedDatasetId === id) {
            setSelectedDatasetId(null);
        }
    };

    const previewRows = activeDataset?.rows.slice(0, 5) || [];

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
                        <h2 className="text-base font-bold text-white">Add Widget</h2>
                        <p className="text-xs text-zinc-500 mt-0.5">
                            Bring your own CSV data to the dashboard
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
                    {STEPS.map((label, i) => (
                        <div key={i} className="flex items-center">
                            <div className="flex items-center gap-2">
                                <div
                                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                                        i < step
                                            ? "bg-blue-500 text-white"
                                            : i === step
                                            ? "bg-blue-500/20 border-2 border-blue-500 text-blue-400"
                                            : "bg-zinc-800 border border-zinc-600 text-zinc-500"
                                    }`}
                                >
                                    {i < step ? "✓" : i + 1}
                                </div>
                                <span
                                    className={`text-xs font-medium whitespace-nowrap ${
                                        i === step ? "text-blue-400" : i < step ? "text-zinc-300" : "text-zinc-600"
                                    }`}
                                >
                                    {label}
                                </span>
                            </div>
                            {i < STEPS.length - 1 && (
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
                            onSelect={setSelectedComponent}
                        />
                    )}
                    {step === 1 && (
                        <StepCsvUpload
                            existingDatasets={existingDatasets}
                            selectedDatasetId={selectedDatasetId}
                            onDatasetReady={handleDatasetReady}
                            onSelectExisting={handleSelectExisting}
                            onRemoveExisting={handleRemoveExisting}
                        />
                    )}
                    {step === 2 && (
                        <StepFormulaBuilder
                            headers={activeDataset?.headers || []}
                            steps={formulaSteps}
                            onChange={setFormulaSteps}
                            previewRows={previewRows}
                        />
                    )}
                    {step === 3 && (
                        <StepFieldMapping
                            componentName={selectedComponent || ""}
                            availableColumns={allColumns}
                            mapping={fieldMapping}
                            widgetTitle={widgetTitle}
                            onMappingChange={setFieldMapping}
                            onTitleChange={setWidgetTitle}
                        />
                    )}
                    {step === 4 && selectedComponent && (
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
                                    ? "bg-blue-600 hover:bg-blue-500 text-white"
                                    : "bg-zinc-700 text-zinc-500 cursor-not-allowed"
                            }`}
                        >
                            {step === STEPS.length - 1 ? "Add to Dashboard" : "Next"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
