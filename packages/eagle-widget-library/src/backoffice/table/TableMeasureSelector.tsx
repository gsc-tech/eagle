import * as React from "react";
import { X } from "lucide-react";
import { Button } from "./primitives/Button";
import { Checkbox } from "./primitives/Checkbox";
import {
  cn,
  getDatasetFields,
  getAllDatasets,
  isDerivedDataset,
  useMeasureRegistryStore,
  type WidgetConfig,
  type MeasureRef,
} from "@gsc-tech/backoffice-core";

// ── Types ─────────────────────────────────────────────────────────────────────

type Opt = { value: string; label: string; kind: MeasureRef["kind"] };

interface TableMeasureSelectorProps {
  widget: WidgetConfig;
  isAdmin?: boolean;
  onSave: (measures: MeasureRef[]) => void;
  onClose: () => void;
}

// ── Dataset tab strip ─────────────────────────────────────────────────────────

function DatasetTabStrip({
  datasets,
  selected,
  onSelect,
}: {
  datasets: { id: string; label: string }[];
  selected: string;
  onSelect: (id: string) => void;
}) {
  if (datasets.length <= 1) return null;
  return (
    <div className="flex border-b border-border/40 overflow-x-auto shrink-0">
      {datasets.map((ds) => (
        <button
          key={ds.id}
          type="button"
          onClick={() => onSelect(ds.id)}
          className={cn(
            "shrink-0 px-3 py-2 text-xs border-b-2 transition-colors whitespace-nowrap",
            selected === ds.id
              ? "border-primary text-foreground font-medium"
              : "border-transparent text-muted-foreground hover:text-foreground hover:border-border/60",
          )}
        >
          {ds.label}
        </button>
      ))}
    </div>
  );
}

// ── Checklist ─────────────────────────────────────────────────────────────────

function ChecklistPicker({
  options,
  selected,
  onChange,
}: {
  options: Opt[];
  selected: MeasureRef[];
  onChange: (refs: MeasureRef[]) => void;
}) {
  const isChecked = (item: Opt) =>
    selected.some((r) => r.name === item.value && r.kind === item.kind);

  const toggle = (item: Opt) => {
    if (isChecked(item)) {
      onChange(selected.filter((r) => !(r.name === item.value && r.kind === item.kind)));
    } else {
      onChange([...selected, { kind: item.kind, name: item.value }]);
    }
  };

  if (options.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-3 text-center">
        No measures available for this dataset.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-0.5">
      {options.map((opt) => (
        <label
          key={`${opt.kind}:${opt.value}`}
          className={cn(
            "flex items-center gap-2.5 px-2 py-1.5 rounded cursor-pointer text-sm",
            "hover:bg-muted/50 transition-colors",
            isChecked(opt) && "bg-muted/40",
          )}
        >
          <Checkbox
            checked={isChecked(opt)}
            onCheckedChange={() => toggle(opt)}
            className="shrink-0"
          />
          <span className="text-foreground truncate flex-1">{opt.label}</span>
          <span className="ml-auto shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground/90">
            {opt.kind}
          </span>
        </label>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function TableMeasureSelector({
  widget,
  isAdmin = false,
  onSave,
  onClose,
}: TableMeasureSelectorProps) {
  const registry = useMeasureRegistryStore();
  const baseDatasetId = (widget.datasetId ?? "financial").split(":")[0];

  // All datasets scoped to this widget's base dataset
  const scopedDatasets = React.useMemo(() => {
    const all = getAllDatasets(registry);
    return all.filter((ds) =>
      isDerivedDataset(ds) ? ds.sourceDatasetId === baseDatasetId : ds.id === baseDatasetId,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registry.baseDatasets, registry.derivedDatasets, baseDatasetId]);

  const [selectedDatasetId, setSelectedDatasetId] = React.useState<string>(
    widget.datasetId ?? baseDatasetId,
  );

  // Column options for the selected tab
  const columnOptions: Opt[] = React.useMemo(() => {
    if (!selectedDatasetId) return [];
    const tabBase = selectedDatasetId.split(":")[0];
    const rawCols: Opt[] = Object.values(getDatasetFields(tabBase, isAdmin))
      .filter((f) => f.kind !== "dimension")
      .map((f) => ({ value: f.key, label: f.label ?? f.key, kind: "column" as const }));
    const extCols: Opt[] = registry.extendedColumns
      .filter((c) => c.datasetId === selectedDatasetId)
      .map((c) => ({ value: c.name, label: c.label ?? c.name, kind: "column" as const }));
    return [...rawCols, ...extCols];
  }, [selectedDatasetId, registry.extendedColumns, isAdmin]);

  const [draftMeasures, setDraftMeasures] = React.useState<MeasureRef[]>(
    () => widget.measures ?? [],
  );

  const handleClearAll = () => setDraftMeasures([]);

  const handleSave = () => {
    onSave(draftMeasures);
    onClose();
  };

  return (
    // Backdrop — clicking outside closes
    <div
      className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-[480px] max-w-[95%] max-h-[85%] flex flex-col rounded-lg border border-border/60 bg-card shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-start justify-between px-5 py-3 border-b border-border/40 shrink-0">
          <div>
            <p className="text-sm font-semibold tracking-wide">
              Edit — {widget.title}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Choose which measures are shown in this widget.
            </p>
          </div>
          <button
            onClick={onClose}
            className="ml-3 text-muted-foreground hover:text-foreground transition-colors mt-0.5"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Dataset tab strip */}
        <div className="px-5 pt-3 shrink-0">
          <DatasetTabStrip
            datasets={scopedDatasets.map((ds) => ({ id: ds.id, label: ds.label }))}
            selected={selectedDatasetId}
            onSelect={setSelectedDatasetId}
          />
        </div>

        {/* Scrollable measure list */}
        <div className="flex-1 overflow-y-auto px-5 py-3 min-h-0">
          <ChecklistPicker
            options={columnOptions}
            selected={draftMeasures}
            onChange={setDraftMeasures}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-border/40 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground hover:text-foreground"
            onClick={handleClearAll}
          >
            Clear All
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" className="text-xs" onClick={onClose}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="text-xs"
              disabled={draftMeasures.length === 0}
              onClick={handleSave}
            >
              Apply
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}
