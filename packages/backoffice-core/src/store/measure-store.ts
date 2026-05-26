import { create } from "zustand";
import { devtools, persist, createJSONStorage } from "zustand/middleware";
import type { SeriesTransform } from "../types/chart-types";
import { DATASET_REGISTRY, type FieldAggregation, type FieldValueType } from "../lib/field-registry";

export interface BaseDatasetConfig {
  id: string;
  label: string;
  granularity: "day";
  source: "financial" | "productwise";
}

export interface DerivedDatasetConfig {
  id: string;
  label: string;
  sourceDatasetId: string;
  granularity: "week" | "month" | "year";
  columns: DerivedColumnConfig[];
}

export interface DerivedColumnConfig {
  fieldKey: string;
  label: string;
  aggregation: FieldAggregation;
}

export type DatasetConfig = BaseDatasetConfig | DerivedDatasetConfig;

export function isDerivedDataset(d: DatasetConfig): d is DerivedDatasetConfig {
  return "sourceDatasetId" in d;
}

export interface ExtendedColumnConfig {
  name: string;
  label?: string;
  datasetId: string;
  expression: string;
  valueType?: FieldValueType;
  entityAggregation?: FieldAggregation;
  temporalAggregation?: FieldAggregation;
  transform?: SeriesTransform;
  window?: number;
  riskFreeRate?: number;
  postTransform?: string;
}

export type PredicateOp = ">" | "<" | ">=" | "<=" | "==" | "!=";

export type Aggregation = "sum" | "mean" | "min" | "max" | "count" | "median" | "first" | "last";

export type RowFilter =
  | { kind: "all" }
  | { kind: "where"; field: string; op: PredicateOp; value: number };

export interface ScalarConfig {
  name: string;
  label?: string;
  datasetId: string;
  field: string;
  aggregation: Aggregation;
  filter?: RowFilter;
  postTransform?: string;
}

export interface FormulaConfig {
  name: string;
  label?: string;
  expression: string;
}

export interface MeasureRegistryState {
  baseDatasets: BaseDatasetConfig[];
  derivedDatasets: DerivedDatasetConfig[];
  extendedColumns: ExtendedColumnConfig[];
  scalars: ScalarConfig[];
  formulas: FormulaConfig[];

  addDerivedDataset: (d: DerivedDatasetConfig) => void;
  updateDerivedDataset: (id: string, updates: Partial<DerivedDatasetConfig>) => void;
  removeDerivedDataset: (id: string) => void;

  addExtendedColumn: (col: ExtendedColumnConfig) => void;
  updateExtendedColumn: (name: string, updates: Partial<ExtendedColumnConfig>) => void;
  removeExtendedColumn: (name: string) => void;

  addScalar: (s: ScalarConfig) => void;
  updateScalar: (name: string, updates: Partial<ScalarConfig>) => void;
  removeScalar: (name: string) => void;

  addFormula: (f: FormulaConfig) => void;
  updateFormula: (name: string, updates: Partial<FormulaConfig>) => void;
  removeFormula: (name: string) => void;

  setAll: (state: Pick<MeasureRegistryState,
    "baseDatasets" | "derivedDatasets" | "extendedColumns" | "scalars" | "formulas"
  >) => void;
  reset: () => void;
}

const DEFAULT_BASE_DATASETS: BaseDatasetConfig[] = [
  {
    id: "financial",
    label: "Financial (Daily)",
    granularity: "day",
    source: "financial",
  },
  {
    id: "productwise",
    label: "Product Wise (Daily)",
    granularity: "day",
    source: "productwise",
  },
];

function buildDerivedColumnsFromRegistry(sourceDatasetId: string): DerivedColumnConfig[] {
  const meta = DATASET_REGISTRY[sourceDatasetId];
  if (!meta) return [];
  return Object.values(meta.fields)
    .filter((f) => f.kind !== "dimension")
    .map((f) => ({
      fieldKey: f.key,
      label: f.label,
      aggregation: f.temporalAggregation ?? "sum",
    }));
}

const DEFAULT_DERIVED_GRANULARITIES: { granularity: "week" | "month" | "year"; suffix: string; label: string }[] = [
  { granularity: "week",  suffix: "weekly",  label: "Weekly" },
  { granularity: "month", suffix: "monthly", label: "Monthly" },
  { granularity: "year",  suffix: "yearly",  label: "Yearly" },
];

const DEFAULT_DERIVED_DATASETS: DerivedDatasetConfig[] = DEFAULT_BASE_DATASETS.flatMap((base) =>
  DEFAULT_DERIVED_GRANULARITIES.map(({ granularity, suffix, label }) => ({
    id: `${base.id}:${suffix}`,
    label: `${base.label.replace(/\s*\(Daily\)\s*$/, "")} (${label})`,
    sourceDatasetId: base.id,
    granularity,
    columns: buildDerivedColumnsFromRegistry(base.id),
  })),
);

export const useMeasureRegistryStore = create<MeasureRegistryState>()(
  devtools(
    persist(
      (set) => ({
        baseDatasets: DEFAULT_BASE_DATASETS,
        derivedDatasets: DEFAULT_DERIVED_DATASETS,
        extendedColumns: [],
        scalars: [],
        formulas: [],

        addDerivedDataset: (d) =>
          set(
            (s) => ({ derivedDatasets: [...s.derivedDatasets, d] }),
            false,
            "measureRegistry/addDerivedDataset",
          ),
        updateDerivedDataset: (id, updates) =>
          set(
            (s) => ({
              derivedDatasets: s.derivedDatasets.map((d) =>
                d.id === id ? { ...d, ...updates } : d,
              ),
            }),
            false,
            "measureRegistry/updateDerivedDataset",
          ),
        removeDerivedDataset: (id) =>
          set(
            (s) => ({ derivedDatasets: s.derivedDatasets.filter((d) => d.id !== id) }),
            false,
            "measureRegistry/removeDerivedDataset",
          ),

        addExtendedColumn: (col) =>
          set(
            (s) => s.extendedColumns.some((c) => c.name === col.name)
              ? s
              : { extendedColumns: [...s.extendedColumns, col] },
            false,
            "measureRegistry/addExtendedColumn",
          ),
        updateExtendedColumn: (name, updates) =>
          set(
            (s) => ({
              extendedColumns: s.extendedColumns.map((c) =>
                c.name === name ? { ...c, ...updates } : c,
              ),
            }),
            false,
            "measureRegistry/updateExtendedColumn",
          ),
        removeExtendedColumn: (name) =>
          set(
            (s) => ({ extendedColumns: s.extendedColumns.filter((c) => c.name !== name) }),
            false,
            "measureRegistry/removeExtendedColumn",
          ),

        addScalar: (scalar) =>
          set(
            (s) => s.scalars.some((sc) => sc.name === scalar.name)
              ? s
              : { scalars: [...s.scalars, scalar] },
            false,
            "measureRegistry/addScalar",
          ),
        updateScalar: (name, updates) =>
          set(
            (s) => ({
              scalars: s.scalars.map((sc) =>
                sc.name === name ? { ...sc, ...updates } : sc,
              ),
            }),
            false,
            "measureRegistry/updateScalar",
          ),
        removeScalar: (name) =>
          set(
            (s) => ({ scalars: s.scalars.filter((sc) => sc.name !== name) }),
            false,
            "measureRegistry/removeScalar",
          ),

        addFormula: (f) =>
          set(
            (s) => s.formulas.some((fo) => fo.name === f.name)
              ? s
              : { formulas: [...s.formulas, f] },
            false,
            "measureRegistry/addFormula",
          ),
        updateFormula: (name, updates) =>
          set(
            (s) => ({
              formulas: s.formulas.map((f) =>
                f.name === name ? { ...f, ...updates } : f,
              ),
            }),
            false,
            "measureRegistry/updateFormula",
          ),
        removeFormula: (name) =>
          set(
            (s) => ({ formulas: s.formulas.filter((f) => f.name !== name) }),
            false,
            "measureRegistry/removeFormula",
          ),

        setAll: (state) => set(state, false, "measureRegistry/setAll"),
        reset: () =>
          set(
            {
              baseDatasets: DEFAULT_BASE_DATASETS,
              derivedDatasets: DEFAULT_DERIVED_DATASETS,
              extendedColumns: [],
              scalars: [],
              formulas: [],
            },
            false,
            "measureRegistry/reset",
          ),
      }),
      {
        name: "tpa-measure-registry-v2",
        storage: createJSONStorage(() => localStorage),
        partialize: (s) => ({
          scalars: s.scalars,
          formulas: s.formulas,
          extendedColumns: s.extendedColumns,
        }),
        version: 1,
        migrate: (persisted: unknown, version: number) => {
          const state = persisted as { scalars?: ScalarConfig[]; formulas?: unknown[]; extendedColumns?: unknown[] };
          if (version < 1 && Array.isArray(state.scalars)) {
            state.scalars = state.scalars.map((s) =>
              s.field === "traderClosingBalance" && s.aggregation === "first"
                ? { ...s, aggregation: "last" }
                : s,
            );
          }
          return state;
        },
      },
    ),
    { name: "useMeasureRegistryStore" },
  ),
);

export function getAllDatasets(state: MeasureRegistryState): DatasetConfig[] {
  return [...state.baseDatasets, ...state.derivedDatasets];
}

export function getColumnsForDataset(
  state: MeasureRegistryState,
  datasetId: string,
): ExtendedColumnConfig[] {
  return state.extendedColumns.filter((c) => c.datasetId === datasetId);
}

export function getScalarsForDataset(
  state: MeasureRegistryState,
  datasetId: string,
): ScalarConfig[] {
  return state.scalars.filter((s) => s.datasetId === datasetId);
}

export function getAllMeasureNames(state: MeasureRegistryState): string[] {
  return [
    ...state.scalars.map((s) => s.name),
    ...state.formulas.map((f) => f.name),
  ];
}

export function getAvailableFields(
  state: MeasureRegistryState,
  datasetId: string,
  registryFields: string[],
): string[] {
  const extendedNames = state.extendedColumns
    .filter((c) => c.datasetId === datasetId)
    .map((c) => c.name);
  return [...registryFields, ...extendedNames];
}