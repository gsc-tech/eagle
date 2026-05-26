import * as React from "react";
import * as ReactDOM from "react-dom";
import {
  Database,
  Sigma,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  X,
  Pencil,
  RotateCcw,
  Check,
  ChevronsUpDown,
  Search,
} from "lucide-react";
import {
  cn,
  useMeasureRegistryStore,
  getAllDatasets,
  isDerivedDataset,
  DATASET_REGISTRY,
  VALID_AGGS_BY_VALUE_TYPE,
  getDatasetFields,
  buildDefaultDerivedColumns,
  DEFAULT_SCALARS,
  DEFAULT_FORMULAS,
  DEFAULT_EXTENDED_COLUMNS,
  TRANSFORM_TO_FUNCTION_NAME,
  FUNCTION_REGISTRY_MAP,
  type BaseDatasetConfig,
  type DerivedDatasetConfig,
  type DerivedColumnConfig,
  type ExtendedColumnConfig,
  type ScalarConfig,
  type FormulaConfig,
  type FieldAggregation,
  type FieldValueType,
} from "@gsc-tech/backoffice-core";
import type { Aggregation, PredicateOp } from "@gsc-tech/backoffice-core";
import type { SeriesTransform } from "@gsc-tech/backoffice-core";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const inputCls =
  "h-8 w-full rounded border border-border/50 bg-background px-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 focus:bg-muted/20";
const selectCls = `${inputCls} cursor-pointer pr-6`;

const GRANULARITY_OPTIONS = [
  { value: "week", label: "Weekly" },
  { value: "month", label: "Monthly" },
  { value: "year", label: "Yearly" },
] as const;

const ALL_AGG_OPTIONS: { value: FieldAggregation; label: string; hint: string }[] = [
  { value: "sum", label: "Sum", hint: "Total of all values" },
  { value: "mean", label: "Mean", hint: "Average value" },
  { value: "max", label: "Max", hint: "Highest value" },
  { value: "min", label: "Min", hint: "Lowest value" },
  { value: "count", label: "Count", hint: "Number of rows" },
  { value: "count_distinct", label: "Count Distinct", hint: "Unique values" },
  { value: "median", label: "Median", hint: "Middle value" },
  { value: "first", label: "First", hint: "First value" },
  { value: "last", label: "Last", hint: "Last value" },
  { value: "concat", label: "Concat", hint: 'Join with ", "' },
  { value: "mode", label: "Mode", hint: "Most frequent" },
  { value: "and", label: "AND", hint: "All true" },
  { value: "or", label: "OR", hint: "Any true" },
];

const AGGREGATION_OPTIONS: { value: Aggregation; label: string; hint: string }[] = [
  { value: "sum", label: "Sum", hint: "Total" },
  { value: "mean", label: "Mean", hint: "Average" },
  { value: "max", label: "Max", hint: "Highest" },
  { value: "min", label: "Min", hint: "Lowest" },
  { value: "count", label: "Count", hint: "Row count" },
  { value: "median", label: "Median", hint: "Middle" },
  { value: "first", label: "First", hint: "First value" },
  { value: "last", label: "Last", hint: "Last value" },
];

const FIELD_VALUE_TYPE_OPTIONS: { value: FieldValueType; label: string }[] = [
  { value: "number", label: "Number" },
  { value: "currency", label: "Currency" },
  { value: "percent", label: "Percent" },
  { value: "text", label: "Text" },
  { value: "boolean", label: "Boolean" },
  { value: "date", label: "Date" },
];

const PREDICATE_OPS: { value: PredicateOp; label: string }[] = [
  { value: ">", label: ">" },
  { value: ">=", label: ">=" },
  { value: "<", label: "<" },
  { value: "<=", label: "<=" },
  { value: "==", label: "=" },
  { value: "!=", label: "≠" },
];

const TRANSFORM_OPTIONS: { value: string; label: string }[] = [
  { value: "none", label: "None — raw values" },
  ...Object.entries(TRANSFORM_TO_FUNCTION_NAME)
    .filter(([k]) => k !== "none")
    .map(([k, v]) => ({ value: k, label: FUNCTION_REGISTRY_MAP[v]?.label ?? k })),
];

const KIND_BADGES = {
  dataset: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  derived: "bg-teal-500/10 text-teal-400 border-teal-500/20",
  column: "bg-sky-500/10 text-sky-400 border-sky-500/20",
  scalar: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  formula: "bg-amber-500/10 text-amber-400 border-amber-500/20",
} as const;

const DATASET_COLOR_PALETTE = [
  "bg-cyan-500/15 text-cyan-400 border-cyan-500/25",
  "bg-violet-500/15 text-violet-400 border-violet-500/25",
  "bg-amber-500/15 text-amber-400 border-amber-500/25",
  "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
  "bg-rose-500/15 text-rose-400 border-rose-500/25",
  "bg-sky-500/15 text-sky-400 border-sky-500/25",
];

const _colorCache: Record<string, string> = {};
function getDatasetBadgeColor(id: string): string {
  const base = id.split(":")[0];
  if (_colorCache[base]) return _colorCache[base];
  const idx = Object.keys(_colorCache).length % DATASET_COLOR_PALETTE.length;
  _colorCache[base] = DATASET_COLOR_PALETTE[idx];
  return _colorCache[base];
}

function getAggOptionsForType(vt: FieldValueType) {
  const valid = VALID_AGGS_BY_VALUE_TYPE[vt] ?? [];
  return ALL_AGG_OPTIONS.filter((o) => valid.includes(o.value));
}

const AGG_VERBS: Record<string, string> = {
  sum: "Total", mean: "Average", max: "Peak", min: "Lowest",
  count: "Count", count_distinct: "Unique count", median: "Median",
  first: "First", last: "Last",
};
const PRED_OP_WORDS: Record<string, string> = {
  ">": "above", ">=": "at least", "<": "below", "<=": "at most", "==": "equal to", "!=": "not equal to",
};

function labelizeField(field: string | undefined | null): string {
  if (!field) return "";
  return field
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/^./, (c) => c.toUpperCase());
}

function buildDefinition(
  measure: ScalarConfig | FormulaConfig | ExtendedColumnConfig,
  kind: "scalar" | "formula" | "column",
  datasetLabel?: string,
): string {
  const ds = datasetLabel ? ` from ${datasetLabel}` : "";
  if (kind === "scalar") {
    const s = measure as ScalarConfig;
    const verb = AGG_VERBS[s.aggregation] ?? s.aggregation;
    const filterStr =
      s.filter?.kind === "where"
        ? ` (${s.filter.field} ${PRED_OP_WORDS[s.filter.op] ?? s.filter.op} ${s.filter.value})`
        : "";
    return `${verb} of ${labelizeField(s.field)}${filterStr}${ds}`;
  }
  if (kind === "formula") return `Formula: ${(measure as FormulaConfig).expression || "(empty)"}`;
  if (kind === "column") return `Expression: ${(measure as ExtendedColumnConfig).expression || "(empty)"}${ds}`;
  return "";
}

function suggestLabel(
  measure: ScalarConfig | FormulaConfig | ExtendedColumnConfig,
  kind: "scalar" | "formula" | "column",
  datasetLabel?: string,
): string {
  if (kind === "scalar") {
    const s = measure as ScalarConfig;
    const verb = AGG_VERBS[s.aggregation] ?? s.aggregation;
    const filterStr =
      s.filter?.kind === "where"
        ? ` (${labelizeField(s.filter.field)} ${PRED_OP_WORDS[s.filter.op] ?? s.filter.op} ${s.filter.value})`
        : "";
    const ds = datasetLabel ? ` · ${datasetLabel}` : "";
    return `${verb} ${labelizeField(s.field)}${filterStr}${ds}`;
  }
  if (kind === "formula") return labelizeField((measure as FormulaConfig).name);
  if (kind === "column") return labelizeField((measure as ExtendedColumnConfig).name);
  return "";
}

// ─── Shared primitives ────────────────────────────────────────────────────────

function KindBadge({ kind }: { kind: keyof typeof KIND_BADGES }) {
  return (
    <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wide", KIND_BADGES[kind])}>
      {kind}
    </span>
  );
}

function MiniBadge({ label, className }: { label: string; className: string }) {
  return (
    <span className={cn("inline-flex items-center px-1.5 py-0 rounded text-[10px] font-mono border leading-4", className)}>
      {label}
    </span>
  );
}

function Divider() {
  return <div className="w-full h-px bg-border/40" />;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs text-muted-foreground mb-1">{children}</label>;
}

function SectionHeader({ label, count }: { label: string; count?: number }) {
  return (
    <div className="flex items-center gap-2 pt-1">
      <span className="text-[9px] uppercase tracking-widest text-muted-foreground/80 font-medium">{label}</span>
      {count !== undefined && <span className="text-[9px] tabular-nums text-muted-foreground/80">{count}</span>}
      <div className="flex-1 h-px bg-border/40 ml-1" />
    </div>
  );
}

// ─── TransformCombobox ────────────────────────────────────────────────────────

function TransformCombobox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const q = search.toLowerCase();
  const filtered = TRANSFORM_OPTIONS.filter((o) => !q || o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q));
  const selectedLabel = TRANSFORM_OPTIONS.find((o) => o.value === value)?.label ?? value;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-48 items-center justify-between rounded border border-border/50 bg-background px-3 text-sm hover:bg-muted/30 focus:outline-none focus:ring-1 focus:ring-primary/50"
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-56 rounded border border-border bg-card shadow-lg">
          <div className="flex items-center border-b border-border/40 px-2">
            <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search transforms…"
              className="h-8 w-full bg-transparent px-2 text-xs outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="max-h-56 overflow-y-auto">
            {filtered.length === 0 && <p className="py-3 text-center text-xs text-muted-foreground">No transform found.</p>}
            {filtered.map((o) => (
              <button
                key={o.value}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); onChange(o.value); setOpen(false); setSearch(""); }}
                className={cn("flex w-full items-center gap-2 px-2 py-1.5 text-xs hover:bg-muted/50", value === o.value && "text-primary")}
              >
                <Check className={cn("h-3.5 w-3.5 shrink-0", value === o.value ? "opacity-100" : "opacity-0")} />
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── FieldCombobox ────────────────────────────────────────────────────────────

function FieldCombobox({
  value,
  measureFields,
  untransformedExtNames,
  seriesExtNames,
  dimensionFields,
  onChange,
}: {
  value: string;
  measureFields: string[];
  untransformedExtNames: string[];
  seriesExtNames: string[];
  dimensionFields: string[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const q = search.toLowerCase();
  const f = (s: string) => !q || s.toLowerCase().includes(q);
  const fMeasures = measureFields.filter(f);
  const fExt = untransformedExtNames.filter(f);
  const fSeries = seriesExtNames.filter(f);
  const fDims = dimensionFields.filter(f);
  const hasResults = fMeasures.length + fExt.length + fSeries.length + fDims.length > 0;

  const select = (v: string) => { onChange(v); setOpen(false); setSearch(""); };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-full min-w-40 items-center justify-between rounded border border-border/50 bg-background px-3 text-sm font-mono hover:bg-muted/30 focus:outline-none focus:ring-1 focus:ring-primary/50"
      >
        <span className="truncate">{value || "Select field…"}</span>
        <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-48 rounded border border-border bg-card shadow-lg">
          <div className="flex items-center border-b border-border/40 px-2">
            <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search fields…"
              className="h-8 w-full bg-transparent px-2 text-xs outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="max-h-56 overflow-y-auto">
            {!hasResults && <p className="py-3 text-center text-xs text-muted-foreground">No field found.</p>}
            {(fMeasures.length > 0 || fExt.length > 0 || fSeries.length > 0) && (
              <div>
                <p className="px-2 py-1 text-[10px] uppercase tracking-widest text-muted-foreground/60">Measures</p>
                {[...fMeasures.map(f => ({ f, tag: "" })), ...fExt.map(f => ({ f, tag: "computed" })), ...fSeries.map(f => ({ f, tag: "series" }))].map(({ f: field, tag }) => (
                  <button
                    key={field}
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); select(field); }}
                    className={cn("flex w-full items-center gap-2 px-2 py-1.5 text-xs font-mono hover:bg-muted/50", value === field && "text-primary")}
                  >
                    <Check className={cn("h-3.5 w-3.5 shrink-0", value === field ? "opacity-100" : "opacity-0")} />
                    {field}
                    {tag && <span className="ml-auto text-[10px] text-muted-foreground">{tag}</span>}
                  </button>
                ))}
              </div>
            )}
            {fDims.length > 0 && (
              <div className={cn((fMeasures.length + fExt.length + fSeries.length) > 0 && "border-t border-border/40")}>
                <p className="px-2 py-1 text-[10px] uppercase tracking-widest text-muted-foreground/60">Dimensions</p>
                {fDims.map((field) => (
                  <button
                    key={field}
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); select(field); }}
                    className={cn("flex w-full items-center gap-2 px-2 py-1.5 text-xs font-mono hover:bg-muted/50", value === field && "text-primary")}
                  >
                    <Check className={cn("h-3.5 w-3.5 shrink-0", value === field ? "opacity-100" : "opacity-0")} />
                    {field}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ExpressionTextarea (replaces BackOffice ExpressionBuilder) ───────────────

function ExpressionTextarea({
  value,
  availableFields,
  onChange,
  placeholder,
}: {
  value: string;
  availableFields: string[];
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        placeholder={placeholder ?? "e.g. netPL / volume"}
        className="w-full rounded border border-border/50 bg-background px-2.5 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 resize-none"
      />
      {availableFields.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {availableFields.slice(0, 20).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => onChange(value ? `${value} ${f}` : f)}
              className="px-1.5 py-0.5 rounded bg-muted/40 border border-border/30 text-[10px] font-mono text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors"
            >
              {f}
            </button>
          ))}
          {availableFields.length > 20 && (
            <span className="text-[10px] text-muted-foreground/60 self-center">+{availableFields.length - 20} more</span>
          )}
        </div>
      )}
    </div>
  );
}

// ─── ConfigNameField ──────────────────────────────────────────────────────────

function ConfigNameField({ kind, name, onRename }: { kind: keyof typeof KIND_BADGES; name: string; onRename: (n: string) => void }) {
  const [draft, setDraft] = React.useState(name);
  React.useEffect(() => setDraft(name), [name]);
  const commit = () => {
    const t = draft.trim();
    if (t && t !== name) onRename(t);
    else setDraft(name);
  };
  return (
    <div className="flex items-center gap-2 pb-3 border-b border-border/50">
      <KindBadge kind={kind} />
      <div className="flex-1 min-w-0">
        <label className="text-[9px] uppercase tracking-widest text-muted-foreground/80 mb-1 block">
          Identifier <span className="font-normal normal-case tracking-normal">(variable name used in expressions)</span>
        </label>
        <div className="relative">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") setDraft(name); }}
            className={cn(inputCls, "pr-7 font-mono")}
            placeholder="measure name"
          />
          <Pencil className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60 pointer-events-none" />
        </div>
      </div>
    </div>
  );
}

// ─── ListSectionHeader ────────────────────────────────────────────────────────

function ListSectionHeader({
  label,
  count,
  onAdd,
  getMissingDefaults,
  onConfirmRestore,
}: {
  label: string;
  count: number;
  onAdd: () => void;
  getMissingDefaults?: () => string[];
  onConfirmRestore?: () => void;
}) {
  const [pending, setPending] = React.useState<string[] | null>(null);

  const handleRestoreClick = () => {
    const missing = getMissingDefaults?.() ?? [];
    if (missing.length === 0) return;
    setPending(missing);
  };

  return (
    <div className="space-y-1 pt-1 pb-0.5">
      <div className="flex items-center gap-2">
        <span className="text-[9px] uppercase tracking-widest text-muted-foreground/80 font-medium">{label}</span>
        <span className="text-[9px] tabular-nums text-muted-foreground/80">{count}</span>
        <div className="flex-1 h-px bg-border/40 mx-1" />
        {getMissingDefaults && onConfirmRestore && (
          <button
            type="button"
            onClick={handleRestoreClick}
            className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5 shrink-0"
          >
            <RotateCcw className="h-3 w-3" />
            Restore defaults
          </button>
        )}
        <button
          type="button"
          onClick={onAdd}
          className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5 shrink-0"
        >
          <Plus className="h-3 w-3" />
          Add
        </button>
      </div>

      {pending && (
        <div className="rounded border border-border/50 bg-muted/30 px-2.5 py-2 space-y-1.5">
          <p className="text-[10px] text-muted-foreground">Restore {pending.length} missing default{pending.length !== 1 ? "s" : ""}:</p>
          <div className="flex flex-wrap gap-1">
            {pending.map((n) => (
              <span key={n} className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded text-foreground">{n}</span>
            ))}
          </div>
          <div className="flex items-center gap-2 pt-0.5">
            <button type="button" onClick={() => { onConfirmRestore?.(); setPending(null); }} className="text-[10px] text-emerald-500 hover:text-emerald-400 font-medium">Confirm</button>
            <button type="button" onClick={() => setPending(null)} className="text-[10px] text-muted-foreground hover:text-foreground">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SplitPane ────────────────────────────────────────────────────────────────

function SplitPane({
  left,
  leftHeader,
  right,
  leftRef,
}: {
  left: React.ReactNode;
  leftHeader?: React.ReactNode;
  right: React.ReactNode;
  leftRef?: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div className="flex h-full">
      <div className="w-[40%] shrink-0 border-r border-border/40 flex flex-col">
        {leftHeader && (
          <div className="px-4 pt-4 pb-2 shrink-0 bg-background border-b border-border/30">
            {leftHeader}
          </div>
        )}
        <div ref={leftRef} className="flex-1 overflow-y-auto">
          <div className="p-4 pt-2 space-y-2">{left}</div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="p-6">{right}</div>
      </div>
    </div>
  );
}

function EmptyConfig({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center gap-3 text-muted-foreground py-16">
      <Sigma className="h-8 w-8 opacity-20" />
      <p className="text-sm">Select a {label} to configure it</p>
      <p className="text-xs text-muted-foreground/80">Or add a new one from the left panel</p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: DATASETS
// ═══════════════════════════════════════════════════════════════════════════════

function BaseDatasetPreview({ dataset }: { dataset: BaseDatasetConfig }) {
  const [expanded, setExpanded] = React.useState(false);
  const datasetMeta = DATASET_REGISTRY[dataset.id];
  const allFields = datasetMeta ? Object.values(datasetMeta.fields) : [];
  const measureFields = Object.values(getDatasetFields(dataset.id, false)).filter((f) => f.kind !== "dimension");
  const dimensionFields = allFields.filter((f) => f.kind === "dimension");

  return (
    <div className="rounded border border-border bg-card">
      <div className="flex items-center gap-2 px-3 py-2">
        <KindBadge kind="dataset" />
        <span className="text-sm font-medium">{dataset.label}</span>
        <span className="text-xs text-muted-foreground/80 font-mono ml-1">{dataset.granularity}</span>
        <span className="text-xs text-muted-foreground/80 ml-auto tabular-nums">{allFields.length} fields</span>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="h-7 w-7 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted/40"
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>
      {expanded && allFields.length > 0 && (
        <div className="border-t border-border/50">
          <div className="grid grid-cols-[1fr_auto_auto] gap-0 text-[10px] uppercase tracking-widest text-muted-foreground/80 px-3 py-1.5 border-b border-border/40 bg-muted/20">
            <span>Field</span>
            <span className="mr-2">Kind</span>
            <span>Temporal Agg</span>
          </div>
          <div className="divide-y divide-border/30">
            {measureFields.map((f) => (
              <div key={f.key} className="grid grid-cols-[1fr_auto_auto] items-center gap-2 px-3 py-1.5">
                <div className="min-w-0">
                  <p className="text-xs text-foreground truncate">{f.label}</p>
                  <p className="font-mono text-[10px] text-muted-foreground/80 truncate">{f.key}</p>
                </div>
                <span className="text-[10px] text-muted-foreground/80 shrink-0 mr-2">{f.kind}</span>
                <span className="inline-flex items-center px-1.5 py-0 rounded text-xs font-mono border border-border/50 text-muted-foreground">
                  {f.temporalAggregation ?? "—"}
                </span>
              </div>
            ))}
            {dimensionFields.length > 0 && (
              <>
                <div className="px-3 py-1 bg-muted/20">
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground/80">Dimensions</span>
                </div>
                {dimensionFields.map((f) => (
                  <div key={f.key} className="grid grid-cols-[1fr_auto_auto] items-center gap-2 px-3 py-1.5">
                    <div className="min-w-0">
                      <p className="text-xs text-foreground/80 truncate">{f.label}</p>
                      <p className="font-mono text-[10px] text-muted-foreground/80 truncate">{f.key}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground/80 shrink-0 mr-2">dimension</span>
                    <span className="inline-flex items-center px-1.5 py-0 rounded text-xs font-mono border border-border/50 text-muted-foreground/80">—</span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DerivedDatasetRow({
  dataset,
  onUpdate,
  onRemove,
}: {
  dataset: DerivedDatasetConfig;
  onUpdate: (id: string, updates: Partial<DerivedDatasetConfig>) => void;
  onRemove: (id: string) => void;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const granLabel = dataset.granularity === "week" ? "Weekly" : dataset.granularity === "month" ? "Monthly" : "Yearly";
  const datasetMeta = DATASET_REGISTRY[dataset.sourceDatasetId];

  const updateColumnAgg = (fieldKey: string, agg: FieldAggregation) => {
    onUpdate(dataset.id, {
      columns: dataset.columns.map((c) => (c.fieldKey === fieldKey ? { ...c, aggregation: agg } : c)),
    });
  };

  return (
    <div className="rounded border border-border bg-card">
      <div className="flex items-center gap-2 px-3 py-2">
        <KindBadge kind="derived" />
        <span className="text-sm font-medium">{dataset.label}</span>
        <span className="text-xs text-muted-foreground font-mono ml-1">{granLabel}</span>
        <span className="text-xs text-muted-foreground ml-auto tabular-nums">{dataset.columns.length} columns</span>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="h-7 w-7 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted/40"
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        <button
          type="button"
          onClick={() => onRemove(dataset.id)}
          className="h-7 w-7 flex items-center justify-center rounded text-muted-foreground hover:text-red-400 hover:bg-red-400/10"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {expanded && (
        <div className="border-t border-border/50">
          <div className="grid grid-cols-[1fr_auto_auto] gap-0 text-[10px] uppercase tracking-widest text-muted-foreground/80 px-3 py-1.5 border-b border-border/40 bg-muted/20">
            <span>Field</span>
            <span className="mr-2">Label</span>
            <span>Aggregation</span>
          </div>
          <div className="divide-y divide-border/30">
            {dataset.columns.map((col) => {
              const fieldMeta = datasetMeta?.fields[col.fieldKey];
              const vt = fieldMeta?.valueType ?? "number";
              const allowed = fieldMeta?.allowedTemporalAggregations;
              const options = getAggOptionsForType(vt).filter((o) => !allowed || allowed.includes(o.value));
              return (
                <div key={col.fieldKey} className="grid grid-cols-[1fr_auto_auto] items-center gap-2 px-3 py-1.5">
                  <span className="font-mono text-xs text-foreground truncate">{col.fieldKey}</span>
                  <span className="text-xs text-muted-foreground text-right mr-2 truncate max-w-24">{col.label}</span>
                  <select
                    value={col.aggregation}
                    onChange={(e) => updateColumnAgg(col.fieldKey, e.target.value as FieldAggregation)}
                    className="h-7 rounded border border-border/50 bg-background px-1.5 text-xs font-mono cursor-pointer focus:outline-none focus:border-primary/50 min-w-20"
                  >
                    {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function DatasetsTab() {
  const { baseDatasets, derivedDatasets, addDerivedDataset, updateDerivedDataset, removeDerivedDataset } =
    useMeasureRegistryStore();
  const [showAddForm, setShowAddForm] = React.useState(false);
  const [newSource, setNewSource] = React.useState("financial");
  const [newGranularity, setNewGranularity] = React.useState<"week" | "month" | "year">("week");
  const [previewColumns, setPreviewColumns] = React.useState<DerivedColumnConfig[]>(() => buildDefaultDerivedColumns("financial"));

  React.useEffect(() => { setPreviewColumns(buildDefaultDerivedColumns(newSource)); }, [newSource]);

  const handleAddDerived = () => {
    const suffix = newGranularity === "week" ? "weekly" : newGranularity === "month" ? "monthly" : "yearly";
    const id = `${newSource}:${suffix}`;
    if (derivedDatasets.some((d) => d.id === id)) return;
    const sourceLabel = DATASET_REGISTRY[newSource]?.label ?? newSource;
    const granLabel = newGranularity === "week" ? "Weekly" : newGranularity === "month" ? "Monthly" : "Yearly";
    addDerivedDataset({ id, label: `${sourceLabel} (${granLabel})`, sourceDatasetId: newSource, granularity: newGranularity, columns: previewColumns });
    setShowAddForm(false);
    setPreviewColumns(buildDefaultDerivedColumns(newSource));
  };

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <SectionHeader label="Base Datasets" count={baseDatasets.length} />
        <p className="text-xs text-muted-foreground/80">Raw daily data from the API. Columns and their default aggregation methods are fixed by the field registry.</p>
        {baseDatasets.map((d) => <BaseDatasetPreview key={d.id} dataset={d} />)}
      </div>

      <Divider />

      <div className="space-y-2">
        <SectionHeader label="Derived Datasets" count={derivedDatasets.length} />
        <p className="text-xs text-muted-foreground/80">Temporal re-aggregations of base datasets (weekly, monthly, yearly). Each column inherits its aggregation method from the field registry, but you can override per column.</p>

        {derivedDatasets.length === 0 && !showAddForm && (
          <div className="text-sm text-muted-foreground border border-dashed border-border rounded px-4 py-4 text-center">
            <p>No derived datasets yet.</p>
            <p className="text-xs text-muted-foreground/80 mt-1">Create one to aggregate daily data into weekly, monthly, or yearly buckets.</p>
          </div>
        )}

        {derivedDatasets.map((d) => (
          <DerivedDatasetRow key={d.id} dataset={d} onUpdate={updateDerivedDataset} onRemove={removeDerivedDataset} />
        ))}

        {showAddForm ? (
          <div className="border border-dashed border-primary/30 rounded p-3 space-y-3 bg-muted/10">
            <div className="flex items-end gap-3 flex-wrap">
              <div className="space-y-1">
                <FieldLabel>Source Dataset</FieldLabel>
                <select value={newSource} onChange={(e) => setNewSource(e.target.value)} className={cn(selectCls, "min-w-40")}>
                  {baseDatasets.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <FieldLabel>Granularity</FieldLabel>
                <select value={newGranularity} onChange={(e) => setNewGranularity(e.target.value as typeof newGranularity)} className={cn(selectCls, "min-w-28")}>
                  {GRANULARITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>

            {previewColumns.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-[9px] uppercase tracking-widest text-muted-foreground/80 block">Column Preview — adjust aggregation methods before creating</label>
                <div className="rounded border border-border/60 overflow-hidden">
                  <div className="grid grid-cols-[1fr_auto_auto] gap-0 text-[10px] uppercase tracking-widest text-muted-foreground/80 px-2.5 py-1.5 border-b border-border/40 bg-muted/20">
                    <span>Field</span>
                    <span className="text-right mr-2">Label</span>
                    <span>Aggregation</span>
                  </div>
                  <div className="max-h-48 overflow-y-auto divide-y divide-border/30">
                    {previewColumns.map((col) => {
                      const fieldMeta = DATASET_REGISTRY[newSource]?.fields[col.fieldKey];
                      const vt = fieldMeta?.valueType ?? "number";
                      const allowed = fieldMeta?.allowedTemporalAggregations;
                      const options = getAggOptionsForType(vt).filter((o) => !allowed || allowed.includes(o.value));
                      return (
                        <div key={col.fieldKey} className="grid grid-cols-[1fr_auto_auto] items-center gap-2 px-2.5 py-1.5">
                          <span className="font-mono text-xs text-foreground truncate">{col.fieldKey}</span>
                          <span className="text-xs text-muted-foreground text-right mr-1 truncate max-w-28">{col.label}</span>
                          <select
                            value={col.aggregation}
                            onChange={(e) =>
                              setPreviewColumns((prev) =>
                                prev.map((c) => c.fieldKey === col.fieldKey ? { ...c, aggregation: e.target.value as FieldAggregation } : c)
                              )
                            }
                            className="h-7 rounded border border-border/50 bg-background px-1.5 text-xs font-mono cursor-pointer focus:outline-none focus:border-primary/50 min-w-20"
                          >
                            {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
              <button type="button" onClick={handleAddDerived} className="h-8 px-3 rounded bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors">Create Dataset</button>
              <button type="button" onClick={() => setShowAddForm(false)} className="h-8 px-3 rounded border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors">Cancel</button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="flex items-center justify-center gap-2 w-full h-8 rounded border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Derived Dataset
          </button>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIG PANELS
// ═══════════════════════════════════════════════════════════════════════════════

function ColumnConfigPanel({
  column,
  availableFields,
  datasets,
  onUpdate,
  onDatasetChange,
  onRemove,
  onRename,
}: {
  column: ExtendedColumnConfig;
  availableFields: string[];
  datasets: (BaseDatasetConfig | DerivedDatasetConfig)[];
  onUpdate: (updates: Partial<ExtendedColumnConfig>) => void;
  onDatasetChange: (id: string) => void;
  onRemove: () => void;
  onRename: (newName: string) => void;
}) {
  const fnName = column.transform ? (TRANSFORM_TO_FUNCTION_NAME[column.transform] ?? "") : "";
  const fnDef = fnName ? FUNCTION_REGISTRY_MAP[fnName] : undefined;
  const needsWindow = fnDef?.needsWindow ?? false;
  const extraParams = fnDef?.extraParams ?? [];

  return (
    <div className="space-y-4">
      <ConfigNameField kind="column" name={column.name} onRename={onRename} />

      <div className="flex items-end gap-3 flex-wrap">
        <div className="flex-1 min-w-32 space-y-1">
          <FieldLabel>Display label <span className="font-normal">(defaults to identifier)</span></FieldLabel>
          <input value={column.label ?? ""} onChange={(e) => onUpdate({ label: e.target.value || undefined })} className={inputCls} placeholder={column.name} />
        </div>
        <div className="space-y-1">
          <FieldLabel>Value type</FieldLabel>
          <select value={column.valueType ?? "number"} onChange={(e) => onUpdate({ valueType: e.target.value as FieldValueType })} className={cn(selectCls, "min-w-28")}>
            {FIELD_VALUE_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      <div className="space-y-1">
        <FieldLabel>Dataset</FieldLabel>
        <select value={column.datasetId} onChange={(e) => onDatasetChange(e.target.value)} className={cn(selectCls, "min-w-36")}>
          {datasets.map((d) => <option key={d.id} value={d.id}>{d.label}{isDerivedDataset(d) ? " (derived)" : ""}</option>)}
        </select>
      </div>

      <Divider />

      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">Per-row expression using raw dataset fields.</p>
        <ExpressionTextarea value={column.expression} availableFields={availableFields} onChange={(v) => onUpdate({ expression: v })} />
      </div>

      <Divider />

      <div className="space-y-2">
        <FieldLabel>Aggregation — how this column is reduced when multiple rows share the same date or time bucket</FieldLabel>
        <p className="text-xs text-muted-foreground/80">
          Example: <code className="font-mono">margin</code> → <code className="font-mono">sum</code> across accounts, then <code className="font-mono">max</code> across days in a week.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground/80 block">Entity Agg <span className="font-normal normal-case tracking-normal">(same date, diff accounts)</span></label>
            <select value={column.entityAggregation ?? "sum"} onChange={(e) => onUpdate({ entityAggregation: e.target.value as FieldAggregation })} className={selectCls}>
              {getAggOptionsForType(column.valueType ?? "number").map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground/80 block">Temporal Agg <span className="font-normal normal-case tracking-normal">(daily → weekly/monthly)</span></label>
            <select value={column.temporalAggregation ?? "sum"} onChange={(e) => onUpdate({ temporalAggregation: e.target.value as FieldAggregation })} className={selectCls}>
              {getAggOptionsForType(column.valueType ?? "number").map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      <Divider />

      <div className="space-y-2">
        <FieldLabel>Series Transform <span className="font-normal">(optional — applied after temporal bucketing)</span></FieldLabel>
        <div className="flex items-end gap-3 flex-wrap">
          <div className="space-y-1">
            <FieldLabel>Transform</FieldLabel>
            <TransformCombobox value={column.transform ?? "none"} onChange={(v) => onUpdate({ transform: v as SeriesTransform })} />
          </div>
          {needsWindow && (
            <div className="space-y-1">
              <FieldLabel>Window</FieldLabel>
              <input type="number" min={1} value={column.window ?? 7} onChange={(e) => onUpdate({ window: parseInt(e.target.value) || 7 })} className={cn(inputCls, "w-20")} />
            </div>
          )}
          {extraParams.map((p: { key: string; label: string; hint: string; min?: number; step?: number; default: number }) => (
            <div key={p.key} className="space-y-1">
              <FieldLabel>{p.label} <span className="font-normal">(optional)</span></FieldLabel>
              <input
                type="number"
                min={p.min}
                step={p.step}
                value={(column as unknown as Record<string, number>)[p.key] ?? p.default}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  onUpdate({ [p.key]: isNaN(val) ? p.default : val } as Partial<ExtendedColumnConfig>);
                }}
                className={cn(inputCls, "w-24")}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <FieldLabel>Post-transform <span className="font-normal">(optional — variable = <code className="font-mono text-xs bg-muted px-1 rounded">x</code>)</span></FieldLabel>
        <input value={column.postTransform ?? ""} onChange={(e) => onUpdate({ postTransform: e.target.value || undefined })} className={cn(inputCls, "font-mono")} placeholder="e.g. x * 100   or   abs(x)" />
      </div>

      <div className="flex justify-end pt-1">
        <button type="button" onClick={onRemove} className="flex items-center gap-1.5 h-7 px-2 rounded text-xs text-red-400/60 hover:text-red-400 hover:bg-red-400/10 transition-colors">
          <Trash2 className="h-3.5 w-3.5" />
          Delete Column
        </button>
      </div>
    </div>
  );
}

function ScalarConfigPanel({
  scalar,
  datasets,
  extendedColumns,
  onUpdate,
  onRemove,
  onRename,
}: {
  scalar: ScalarConfig;
  datasets: (BaseDatasetConfig | DerivedDatasetConfig)[];
  extendedColumns: ExtendedColumnConfig[];
  onUpdate: (updates: Partial<ScalarConfig>) => void;
  onRemove: () => void;
  onRename: (newName: string) => void;
}) {
  const baseDatasetId = scalar.datasetId.split(":")[0];
  const datasetMeta = DATASET_REGISTRY[scalar.datasetId] ?? DATASET_REGISTRY[baseDatasetId];
  const allRawFields = datasetMeta ? Object.values(datasetMeta.fields) : [];
  const measureFields = Object.values(getDatasetFields(scalar.datasetId, false))
    .filter((f) => f.kind !== "dimension")
    .map((f) => f.key);
  const dimensionFields = allRawFields.filter((f) => f.kind === "dimension").map((f) => f.key);

  const extCols = extendedColumns.filter((c) => c.datasetId === scalar.datasetId || c.datasetId === baseDatasetId);
  const untransformedExtNames = extCols.filter((c) => !c.transform || c.transform === "none").map((c) => c.name);
  const seriesExtNames = extCols.filter((c) => c.transform && c.transform !== "none").map((c) => c.name);
  const allFields = [...measureFields, ...dimensionFields, ...untransformedExtNames];
  const isFiltered = scalar.filter?.kind === "where";
  const datasetLabel = datasets.find((d) => d.id === scalar.datasetId)?.label ?? scalar.datasetId;
  const autoLabel = suggestLabel(scalar, "scalar", datasetLabel);

  return (
    <div className="space-y-4">
      <ConfigNameField kind="scalar" name={scalar.name} onRename={onRename} />

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <FieldLabel>Display label</FieldLabel>
          {!scalar.label && autoLabel && (
            <button type="button" onClick={() => onUpdate({ label: autoLabel })} className="text-[10px] text-primary/70 hover:text-primary">auto-fill</button>
          )}
        </div>
        <input value={scalar.label ?? ""} onChange={(e) => onUpdate({ label: e.target.value || undefined })} className={inputCls} placeholder={autoLabel || scalar.name} />
      </div>

      <Divider />

      <div className="space-y-1">
        <FieldLabel>Dataset</FieldLabel>
        <select value={scalar.datasetId} onChange={(e) => onUpdate({ datasetId: e.target.value })} className={cn(selectCls, "min-w-36")}>
          {datasets.map((d) => <option key={d.id} value={d.id}>{d.label}{isDerivedDataset(d) ? " (derived)" : ""}</option>)}
        </select>
      </div>

      <div className="flex items-end gap-2 flex-wrap">
        <div className="space-y-1">
          <FieldLabel>Aggregation</FieldLabel>
          <select value={scalar.aggregation} onChange={(e) => onUpdate({ aggregation: e.target.value as Aggregation })} className={cn(selectCls, "min-w-24")}>
            {AGGREGATION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-40 space-y-1">
          <FieldLabel>Field</FieldLabel>
          <FieldCombobox
            value={scalar.field}
            measureFields={measureFields}
            untransformedExtNames={untransformedExtNames}
            seriesExtNames={seriesExtNames}
            dimensionFields={dimensionFields}
            onChange={(v) => onUpdate({ field: v })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <FieldLabel>Filter rows</FieldLabel>
          <button
            type="button"
            onClick={() => onUpdate({ filter: isFiltered ? { kind: "all" } : { kind: "where", field: scalar.field, op: ">", value: 0 } })}
            className={cn("text-xs px-2 py-0.5 rounded border transition-colors",
              isFiltered ? "border-primary/50 bg-primary/10 text-primary hover:bg-primary/20" : "border-border text-muted-foreground hover:text-foreground"
            )}
          >
            {isFiltered ? "on — click to remove" : "all rows — click to add filter"}
          </button>
        </div>
        {isFiltered && scalar.filter?.kind === "where" && (
          <div className="flex items-end gap-2 flex-wrap pl-2 border-l-2 border-primary/20">
            <div className="space-y-1">
              <FieldLabel>Field</FieldLabel>
              <select value={scalar.filter.field} onChange={(e) => onUpdate({ filter: { ...scalar.filter!, field: e.target.value } as ScalarConfig["filter"] })} className={cn(selectCls, "min-w-32 font-mono")}>
                {allFields.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <FieldLabel>Operator</FieldLabel>
              <select value={scalar.filter.op} onChange={(e) => onUpdate({ filter: { ...scalar.filter!, op: e.target.value as PredicateOp } as ScalarConfig["filter"] })} className={cn(selectCls, "w-16")}>
                {PREDICATE_OPS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <FieldLabel>Value</FieldLabel>
              <input type="number" value={scalar.filter.value} onChange={(e) => onUpdate({ filter: { ...scalar.filter!, value: parseFloat(e.target.value) || 0 } as ScalarConfig["filter"] })} className={cn(inputCls, "w-24")} />
            </div>
          </div>
        )}
      </div>

      <div className="space-y-1">
        <FieldLabel>Post-transform <span className="font-normal">(optional — variable = <code className="font-mono text-xs bg-muted px-1 rounded">x</code>)</span></FieldLabel>
        <input value={scalar.postTransform ?? ""} onChange={(e) => onUpdate({ postTransform: e.target.value || undefined })} className={cn(inputCls, "font-mono")} placeholder="e.g. x * 100   or   abs(x)" />
      </div>

      <div className="flex justify-end pt-1">
        <button type="button" onClick={onRemove} className="flex items-center gap-1.5 h-7 px-2 rounded text-xs text-red-400/60 hover:text-red-400 hover:bg-red-400/10 transition-colors">
          <Trash2 className="h-3.5 w-3.5" />
          Delete Scalar
        </button>
      </div>
    </div>
  );
}

function FormulaConfigPanel({
  formula,
  availableVars,
  onUpdate,
  onRemove,
  onRename,
}: {
  formula: FormulaConfig;
  availableVars: string[];
  onUpdate: (updates: Partial<FormulaConfig>) => void;
  onRemove: () => void;
  onRename: (newName: string) => void;
}) {
  const autoLabel = suggestLabel(formula, "formula");

  return (
    <div className="space-y-4">
      <ConfigNameField kind="formula" name={formula.name} onRename={onRename} />

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <FieldLabel>Display label</FieldLabel>
          {!formula.label && autoLabel && (
            <button type="button" onClick={() => onUpdate({ label: autoLabel })} className="text-[10px] text-primary/70 hover:text-primary">auto-fill</button>
          )}
        </div>
        <input value={formula.label ?? ""} onChange={(e) => onUpdate({ label: e.target.value || undefined })} className={inputCls} placeholder={autoLabel || formula.name} />
      </div>

      <Divider />

      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">
          Arithmetic over resolved measure values. Variables are scalar/formula names. Division is always aggregate-then-divide — correct for ratios.
        </p>
        <ExpressionTextarea
          value={formula.expression}
          availableFields={availableVars}
          onChange={(v) => onUpdate({ expression: v })}
          placeholder="e.g. winDays / totalDays"
        />
      </div>

      <div className="flex justify-end pt-1">
        <button type="button" onClick={onRemove} className="flex items-center gap-1.5 h-7 px-2 rounded text-xs text-red-400/60 hover:text-red-400 hover:bg-red-400/10 transition-colors">
          <Trash2 className="h-3.5 w-3.5" />
          Delete Formula
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: COLUMNS
// ═══════════════════════════════════════════════════════════════════════════════

function ColumnsTab() {
  const store = useMeasureRegistryStore();
  const { extendedColumns, addExtendedColumn, updateExtendedColumn, removeExtendedColumn } = store;
  const [selected, setSelected] = React.useState<string | null>(null);
  const leftPaneRef = React.useRef<HTMLDivElement>(null);
  const allDatasets = React.useMemo(() => getAllDatasets(store), [store]);

  const sortedColumns = React.useMemo(() => {
    const order = allDatasets.map((d) => d.id);
    return [...extendedColumns].sort((a, b) => order.indexOf(a.datasetId) - order.indexOf(b.datasetId));
  }, [allDatasets, extendedColumns]);

  const handleAdd = () => {
    const existing = extendedColumns.map((c) => c.name);
    let i = 1;
    while (existing.includes(`col${i}`)) i++;
    const name = `col${i}`;
    addExtendedColumn({ name, datasetId: allDatasets[0]?.id ?? "financial", expression: "" });
    setSelected(name);
  };

  const selectedCol = selected ? (extendedColumns.find((c) => c.name === selected) ?? null) : null;

  const renderConfig = () => {
    if (!selectedCol) return <EmptyConfig label="column" />;
    const ds = allDatasets.find((d) => d.id === selectedCol.datasetId);
    const sourceId = ds && isDerivedDataset(ds) ? ds.sourceDatasetId : selectedCol.datasetId;
    const rawFields = Object.keys(getDatasetFields(sourceId, false));
    const siblingNames = extendedColumns.filter((c) => c.name !== selectedCol.name && c.datasetId === selectedCol.datasetId).map((c) => c.name);
    return (
      <ColumnConfigPanel
        column={selectedCol}
        availableFields={[...rawFields, ...siblingNames]}
        datasets={allDatasets}
        onUpdate={(updates) => updateExtendedColumn(selectedCol.name, updates)}
        onDatasetChange={(id) => updateExtendedColumn(selectedCol.name, { datasetId: id })}
        onRemove={() => { removeExtendedColumn(selectedCol.name); setSelected(null); }}
        onRename={(newName) => { removeExtendedColumn(selectedCol.name); addExtendedColumn({ ...selectedCol, name: newName }); setSelected(newName); }}
      />
    );
  };

  return (
    <SplitPane
      leftRef={leftPaneRef}
      leftHeader={
        <ListSectionHeader
          label="Columns"
          count={sortedColumns.length}
          onAdd={handleAdd}
          getMissingDefaults={() => {
            const existing = new Set(extendedColumns.map((c) => c.name));
            return DEFAULT_EXTENDED_COLUMNS.filter((c) => !existing.has(c.name)).map((c) => c.name);
          }}
          onConfirmRestore={() => {
            const existing = new Set(extendedColumns.map((c) => c.name));
            for (const c of DEFAULT_EXTENDED_COLUMNS) { if (!existing.has(c.name)) addExtendedColumn(c); }
          }}
        />
      }
      left={
        <>
          {sortedColumns.length === 0 && <p className="text-[11px] text-muted-foreground/80 pl-0.5 pt-1">No columns yet</p>}
          {sortedColumns.map((col) => {
            const dsLabel = allDatasets.find((d) => d.id === col.datasetId)?.label ?? col.datasetId;
            return (
              <button
                key={col.name}
                type="button"
                onClick={() => setSelected(col.name)}
                className={cn(
                  "w-full flex items-start gap-2 px-2.5 py-2 rounded text-left transition-colors group border",
                  selected === col.name ? "bg-primary/10 border-primary/30" : "hover:bg-muted/40 border-transparent hover:border-border/40",
                )}
              >
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-baseline gap-1.5 min-w-0">
                    <span className="font-mono text-xs text-foreground truncate">{col.name}</span>
                    {col.label && col.label !== col.name && <span className="text-[11px] text-muted-foreground/80 truncate shrink-0">{col.label}</span>}
                  </div>
                  <div className="flex items-center gap-1">
                    <MiniBadge label={dsLabel} className={getDatasetBadgeColor(col.datasetId)} />
                  </div>
                  {col.expression && <span className="text-[11px] text-muted-foreground/80 font-mono block truncate">{col.expression}</span>}
                </div>
                <span
                  role="button"
                  tabIndex={-1}
                  onClick={(e) => { e.stopPropagation(); removeExtendedColumn(col.name); if (selected === col.name) setSelected(null); }}
                  className="opacity-0 group-hover:opacity-100 text-red-400 p-0.5 shrink-0 cursor-pointer transition-opacity"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </span>
              </button>
            );
          })}
        </>
      }
      right={renderConfig()}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: SCALARS
// ═══════════════════════════════════════════════════════════════════════════════

function ScalarsTab() {
  const store = useMeasureRegistryStore();
  const { extendedColumns, scalars, addScalar, updateScalar, removeScalar } = store;
  const [selected, setSelected] = React.useState<string | null>(null);
  const leftPaneRef = React.useRef<HTMLDivElement>(null);
  const allDatasets = React.useMemo(() => getAllDatasets(store), [store]);

  const sortedScalars = React.useMemo(() => {
    const order = allDatasets.map((d) => d.id);
    return [...scalars].sort((a, b) => order.indexOf(a.datasetId) - order.indexOf(b.datasetId));
  }, [allDatasets, scalars]);

  const handleAdd = () => {
    const existing = scalars.map((s) => s.name);
    let i = 1;
    while (existing.includes(`s${i}`)) i++;
    const name = `s${i}`;
    addScalar({ name, datasetId: allDatasets[0]?.id ?? "financial", field: "netPL", aggregation: "sum" });
    setSelected(name);
  };

  const selectedScalar = selected ? (scalars.find((s) => s.name === selected) ?? null) : null;

  const renderConfig = () => {
    if (!selectedScalar) return <EmptyConfig label="scalar" />;
    return (
      <ScalarConfigPanel
        scalar={selectedScalar}
        datasets={allDatasets}
        extendedColumns={extendedColumns}
        onUpdate={(updates) => updateScalar(selectedScalar.name, updates)}
        onRemove={() => { removeScalar(selectedScalar.name); setSelected(null); }}
        onRename={(newName) => { removeScalar(selectedScalar.name); addScalar({ ...selectedScalar, name: newName }); setSelected(newName); }}
      />
    );
  };

  return (
    <SplitPane
      leftRef={leftPaneRef}
      leftHeader={
        <ListSectionHeader
          label="Scalars"
          count={sortedScalars.length}
          onAdd={handleAdd}
          getMissingDefaults={() => {
            const existing = new Set(scalars.map((s) => s.name));
            return DEFAULT_SCALARS.filter((s) => !existing.has(s.name)).map((s) => s.name);
          }}
          onConfirmRestore={() => {
            const existing = new Set(scalars.map((s) => s.name));
            for (const s of DEFAULT_SCALARS) { if (!existing.has(s.name)) addScalar(s); }
          }}
        />
      }
      left={
        <>
          {sortedScalars.length === 0 && <p className="text-[11px] text-muted-foreground/80 pl-0.5 pt-1">No scalars yet</p>}
          {sortedScalars.map((s) => {
            const dsLabel = allDatasets.find((d) => d.id === s.datasetId)?.label ?? s.datasetId;
            const definition = buildDefinition(s, "scalar", dsLabel);
            return (
              <button
                key={s.name}
                type="button"
                onClick={() => setSelected(s.name)}
                className={cn(
                  "w-full flex items-start gap-2 px-2.5 py-2 rounded text-left transition-colors group border",
                  selected === s.name ? "bg-primary/10 border-primary/30" : "hover:bg-muted/40 border-transparent hover:border-border/40",
                )}
              >
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-baseline gap-1.5 min-w-0">
                    <span className="font-mono text-xs text-foreground truncate">{s.name}</span>
                    {s.label && s.label !== s.name && <span className="text-[11px] text-muted-foreground/80 truncate shrink-0">{s.label}</span>}
                  </div>
                  <div className="flex items-center gap-1">
                    <MiniBadge label={dsLabel} className={getDatasetBadgeColor(s.datasetId)} />
                    <MiniBadge label={s.aggregation} className="bg-blue-500/10 text-blue-400 border-blue-500/20" />
                  </div>
                  {definition && <span className="text-[11px] text-muted-foreground/80 block truncate">{definition}</span>}
                </div>
                <span
                  role="button"
                  tabIndex={-1}
                  onClick={(e) => { e.stopPropagation(); removeScalar(s.name); if (selected === s.name) setSelected(null); }}
                  className="opacity-0 group-hover:opacity-100 text-red-400 p-0.5 shrink-0 cursor-pointer transition-opacity"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </span>
              </button>
            );
          })}
        </>
      }
      right={renderConfig()}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: FORMULAS
// ═══════════════════════════════════════════════════════════════════════════════

function FormulasTab() {
  const store = useMeasureRegistryStore();
  const { scalars, formulas, addFormula, updateFormula, removeFormula } = store;
  const [selected, setSelected] = React.useState<string | null>(null);
  const allDatasets = React.useMemo(() => getAllDatasets(store), [store]);

  const allMeasureNames = React.useMemo(
    () => [...scalars.map((s) => s.name), ...formulas.map((f) => f.name)],
    [scalars, formulas],
  );

  const scalarDatasetLabel = React.useMemo(() => {
    const map: Record<string, string> = {};
    for (const s of scalars) map[s.name] = allDatasets.find((d) => d.id === s.datasetId)?.label ?? s.datasetId;
    return map;
  }, [scalars, allDatasets]);

  const getFormulaDatasets = (expr: string): string[] => {
    if (!expr) return [];
    const refs = scalars
      .filter((s) => { try { return new RegExp(`\\b${s.name}\\b`).test(expr); } catch { return false; } })
      .map((s) => scalarDatasetLabel[s.name])
      .filter(Boolean);
    return Array.from(new Set(refs));
  };

  const handleAdd = () => {
    const existing = formulas.map((f) => f.name);
    let i = 1;
    while (existing.includes(`f${i}`)) i++;
    const name = `f${i}`;
    addFormula({ name, expression: "" });
    setSelected(name);
  };

  const selectedFormula = selected ? (formulas.find((f) => f.name === selected) ?? null) : null;

  const renderConfig = () => {
    if (!selectedFormula) return <EmptyConfig label="formula" />;
    return (
      <FormulaConfigPanel
        formula={selectedFormula}
        availableVars={allMeasureNames}
        onUpdate={(updates) => updateFormula(selectedFormula.name, updates)}
        onRemove={() => { removeFormula(selectedFormula.name); setSelected(null); }}
        onRename={(newName) => { removeFormula(selectedFormula.name); addFormula({ ...selectedFormula, name: newName }); setSelected(newName); }}
      />
    );
  };

  return (
    <SplitPane
      leftHeader={
        <ListSectionHeader
          label="Formulas"
          count={formulas.length}
          onAdd={handleAdd}
          getMissingDefaults={() => {
            const existing = new Set(formulas.map((f) => f.name));
            return DEFAULT_FORMULAS.filter((f) => !existing.has(f.name)).map((f) => f.name);
          }}
          onConfirmRestore={() => {
            const existing = new Set(formulas.map((f) => f.name));
            for (const f of DEFAULT_FORMULAS) { if (!existing.has(f.name)) addFormula(f); }
          }}
        />
      }
      left={
        <>
          {formulas.length === 0 && <p className="text-[11px] text-muted-foreground/80 pl-0.5 pt-1">No formulas yet</p>}
          {formulas.map((f) => {
            const dsets = getFormulaDatasets(f.expression ?? "");
            return (
              <button
                key={f.name}
                type="button"
                onClick={() => setSelected(f.name)}
                className={cn(
                  "w-full flex items-start gap-2 px-2.5 py-2 rounded text-left transition-colors group border",
                  selected === f.name ? "bg-primary/10 border-primary/30" : "hover:bg-muted/40 border-transparent hover:border-border/40",
                )}
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-sm text-foreground truncate">{f.label && f.label !== f.name ? f.label : f.name}</span>
                    {f.label && f.label !== f.name && <span className="font-mono text-[10px] text-muted-foreground/80 truncate shrink-0">{f.name}</span>}
                  </div>
                  {dsets.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap">
                      {dsets.map((dl) => {
                        const matchingScalar = scalars.find((s) => allDatasets.find((d) => d.id === s.datasetId)?.label === dl);
                        const dsId = matchingScalar?.datasetId ?? dl;
                        return <MiniBadge key={dl} label={dl} className={getDatasetBadgeColor(dsId)} />;
                      })}
                    </div>
                  )}
                  {f.expression && <span className="text-[11px] text-muted-foreground/80 font-mono block truncate">{f.expression}</span>}
                </div>
                <span
                  role="button"
                  tabIndex={-1}
                  onClick={(e) => { e.stopPropagation(); removeFormula(f.name); if (selected === f.name) setSelected(null); }}
                  className="opacity-0 group-hover:opacity-100 text-red-400 p-0.5 shrink-0 cursor-pointer transition-opacity"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </span>
              </button>
            );
          })}
        </>
      }
      right={renderConfig()}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN MODAL
// ═══════════════════════════════════════════════════════════════════════════════

type TabKey = "datasets" | "columns" | "scalars" | "formulas";

export interface MeasureRegistryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MeasureRegistryModal({ isOpen, onClose }: MeasureRegistryModalProps) {
  const store = useMeasureRegistryStore();
  const [activeTab, setActiveTab] = React.useState<TabKey>("datasets");
  const totalMeasures = store.extendedColumns.length + store.scalars.length + store.formulas.length;

  // Close on Escape
  React.useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === "undefined") return null;

  const TABS: { key: TabKey; label: string; icon?: React.ReactNode; count: number | null }[] = [
    { key: "datasets", label: "Datasets", icon: <Database className="h-3.5 w-3.5" />, count: store.baseDatasets.length + store.derivedDatasets.length },
    { key: "columns", label: "Columns", icon: null, count: store.extendedColumns.length > 0 ? store.extendedColumns.length : null },
    { key: "scalars", label: "Scalars", icon: null, count: store.scalars.length > 0 ? store.scalars.length : null },
    { key: "formulas", label: "Formulas", icon: null, count: store.formulas.length > 0 ? store.formulas.length : null },
  ];

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative flex flex-col bg-card border border-border rounded-lg shadow-2xl overflow-hidden"
        style={{ width: "80vw", height: "80vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <span className="text-sm font-semibold">Measures</span>
          <div className="flex items-center gap-3">
            {totalMeasures > 0 && (
              <span className="text-xs text-muted-foreground tabular-nums">
                {totalMeasures} measure{totalMeasures !== 1 ? "s" : ""} defined
              </span>
            )}
            <button
              type="button"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex items-stretch border-b border-border bg-background shrink-0 px-4">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2.5 text-xs border-b-2 transition-colors",
                activeTab === tab.key
                  ? "border-primary text-foreground font-medium"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.icon}
              {tab.label}
              {tab.count !== null && (
                <span className={cn(
                  "inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full text-[10px] font-bold",
                  activeTab === tab.key ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
                )}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 min-h-0 overflow-hidden relative">
          {activeTab === "datasets" && (
            <div className="absolute inset-0 overflow-y-auto">
              <div className="p-6">
                <DatasetsTab />
              </div>
            </div>
          )}
          {activeTab === "columns" && (
            <div className="absolute inset-0">
              <ColumnsTab />
            </div>
          )}
          {activeTab === "scalars" && (
            <div className="absolute inset-0">
              <ScalarsTab />
            </div>
          )}
          {activeTab === "formulas" && (
            <div className="absolute inset-0">
              <FormulasTab />
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
