// ── API client ────────────────────────────────────────────────────────────────
// init({ baseUrl, getFirebaseToken }) — call once at app startup (task 4.1).
// fetchFinancialStatements(params)   — populates useFinancialDataStore.
// fetchDeepAnalysisStatements(group, params) — populates per-group slice.
// fetchProductwiseStatements(params) — returns raw data; caller owns the store.
export * from "./api/backOfficeApiClient";

// ── Data stores (backoffice-core owns these) ──────────────────────────────────
// useFinancialDataStore              — daily/weekly/monthly statements + KPIs.
// useDeepAnalysisFinancialDataStore  — same, sliced per GroupId (A/B/C/D).
// useJournalFinancialDataStore       — journal variant.
// useLoadingStatusStore              — global fetch loading flag.
// useMeasureRegistryStore            — scalars/formulas/extended-columns registry,
//                                      persisted to localStorage "tpa-measure-registry-v2".
// useFinancialTimeInputStore         — date/YMW filter state for the financial topbar.
// useFinancialTradingAccountsStore   — account list + selection for the financial topbar.
// useFilterModificationStatusStore   — dirty-filter flag + debounce timing.
// useGroupsStore                     — active comparison groups (A/B/C/D) + per-group contexts.
// useGroupColorStore                 — group color token assignments (persisted).
export * from "./store/groups";
export * from "./store/loadingStatusStore";
export * from "./store/financialDataStore";
export * from "./store/measure-store";
export * from "./store/timeInputStore";
export * from "./store/tradingAccountStore";
export * from "./store/filterModificationStatusStore";
export * from "./store/groupsStore";
export * from "./store/groupColorStore";

// ── Domain types ──────────────────────────────────────────────────────────────
// WidgetConfig, ChartItemConfig, MeasureRef, VizTypeV2, SeriesTransform, etc.
export * from "./types/chart-types";
// KpiRow, TableColumnDef, TableRow, ResolvedTableColumn, CellMetaSpec.
export * from "./types/widget-extras";

// ── Expression & measure engine ───────────────────────────────────────────────
export * from "./lib/utils";
export * from "./lib/field-registry";
export * from "./lib/function-registry";
export * from "./lib/expression-engine";
export * from "./lib/temporal-utils";
export * from "./lib/aggregation-spec";
export * from "./lib/series-config";
// measure.ts exports Aggregation, PredicateOp, RowFilter — same names as measure-store.ts.
// Export them here; callers that need measure-store versions import directly.
export {
  ColumnMeasure,
  ScalarMeasure,
  FormulaMeasure,
  SeriesMeasure,
  Measure,
  MeasureCycleError,
  topoSort,
  executeMeasuresForKpi,
  BucketedScalars,
  executeMeasuresPerBucket,
  applySeriesTransforms,
  describeMeasure,
  MEASURE_KIND_BADGES,
} from "./lib/measure";
export type { Aggregation, PredicateOp, RowFilter } from "./lib/measure";
export * from "./lib/chart-query";
export * from "./lib/data-transformers";
export * from "./lib/measure-registry-executor";
export * from "./lib/default-measures";
export * from "./lib/dashboard-config";
export * from "./lib/dashboard-chart-builders";
export * from "./lib/table-utils";
// ── Widget V2 adapter ─────────────────────────────────────────────────────────
// buildChartsFromV2Config(widget, financialData, productWiseData, registry, activeGroupsOverride?)
// → ChartItemConfig[]  — use activeGroupsOverride: ["A"] for single-group Financial View.
export * from "./lib/widget-v2-adapter";