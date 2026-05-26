import { math } from "./expression-engine";
import { expressionEngine } from "./expression-engine";
import { buildSeriesExpression, COMPUTED_FIELD } from "./series-config";
import {
  getTemporalAgg,
  getEntityAgg,
  DATASET_REGISTRY,
  FieldAggregation,
  NUMERIC_AGGREGATIONS,
  getDatasetEntityLevels,
  getEntityHierarchy,
  getEntityAxes,
} from "./field-registry";
import { BucketAgg, SeriesTransform } from "../types/chart-types";
import { FUNCTION_REGISTRY_MAP, TRANSFORM_TO_FUNCTION_NAME } from "./function-registry";
import type {
  ExtendedColumnConfig,
  ScalarConfig,
  FormulaConfig,
  DerivedDatasetConfig,
  DerivedColumnConfig,
  MeasureRegistryState,
} from "../store/measure-store";
import { getBucketKey, formatBucketDate, bucket } from "./temporal-utils";

export function resolveScalarsAndFormulas(
  rows: Record<string, unknown>[],
  columns: ExtendedColumnConfig[],
  scalars: ScalarConfig[],
  formulas: FormulaConfig[],
  interval: bucket = "day",
  dateKey: string = "date",
  datasetId?: string,
): Record<string, number | null> {
  if (rows.length === 0) return {};

  const columnByName = new Map(columns.map((c) => [c.name, c]));

  const materialisation = materialiseColumnsPerBucket(rows, columns, interval, dateKey, datasetId);
  const enrichedRows = materialiseExtendedColumns(rows, columns, datasetId, dateKey);

  const results: Record<string, number | null> = {};

  for (const scalar of scalars) {
    const col = columnByName.get(scalar.field);
    if (col) {
      results[scalar.name] = evaluateScalarOnColumnSeries(
        scalar, col, materialisation.columnSeries.get(col.name) ?? [],
      );
    } else {
      results[scalar.name] = evaluateScalar(scalar, enrichedRows);
    }
  }

  for (const formula of formulas) {
    results[formula.name] = evaluateFormula(formula, results);
  }

  return results;
}

function evaluateScalarOnColumnSeries(
  scalar: ScalarConfig,
  col: ExtendedColumnConfig,
  series: (number | null)[],
): number | null {
  if (series.length === 0) return null;

  const values = series.filter((v): v is number => v !== null && isFinite(v));
  if (values.length === 0) return null;

  let agg = scalar.aggregation as string;
  if (agg === "sum" && col.transform && col.transform !== "none") {
    const fnName = TRANSFORM_TO_FUNCTION_NAME[col.transform as string];
    const footerAgg = fnName ? FUNCTION_REGISTRY_MAP[fnName]?.postTransformFooterAgg : undefined;
    if (footerAgg && footerAgg !== "blank") agg = footerAgg;
  }

  const raw = aggregateValues(values, agg);
  return scalar.postTransform ? applyPostTransform(raw, scalar.postTransform) : raw;
}

function extractExpressionIdentifiers(expr: string): string[] {
  const isBuiltin = (name: string) =>
    (math as unknown as Record<string, unknown>)[name] !== undefined;
  const isCustomFn = (name: string) => name in FUNCTION_REGISTRY_MAP;

  try {
    const node = math.parse(expr);
    const names: string[] = [];
    node.traverse((n: { type: string; name?: string; isSymbolNode?: boolean }) => {
      if ((n.isSymbolNode || n.type === "SymbolNode") && n.name) {
        if (isBuiltin(n.name) || isCustomFn(n.name)) return;
        names.push(n.name);
      }
    });
    return Array.from(new Set(names));
  } catch {
    return Array.from(new Set(expr.match(/\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g) ?? []))
      .filter((name) => !isBuiltin(name) && !isCustomFn(name));
  }
}

function collectWithDependencies(
  requestedNames: string[],
  allCols: ExtendedColumnConfig[],
): ExtendedColumnConfig[] {
  const byName = new Map(allCols.map((c) => [c.name, c]));
  const included = new Set<string>();

  const visit = (name: string) => {
    if (included.has(name)) return;
    const col = byName.get(name);
    if (!col) return;
    included.add(name);
    for (const dep of extractExpressionIdentifiers(col.expression ?? "")) {
      visit(dep);
    }
  };

  for (const name of requestedNames) visit(name);
  return allCols.filter((c) => included.has(c.name));
}

function topoSortColumns(columns: ExtendedColumnConfig[]): ExtendedColumnConfig[] {
  if (columns.length <= 1) return columns;

  const nameSet = new Set(columns.map((c) => c.name));
  const inDegree = new Map<string, number>();
  const dependents = new Map<string, string[]>();

  for (const col of columns) {
    inDegree.set(col.name, 0);
    dependents.set(col.name, []);
  }

  for (const col of columns) {
    const deps = extractExpressionIdentifiers(col.expression ?? "").filter(
      (id) => nameSet.has(id) && id !== col.name,
    );
    inDegree.set(col.name, deps.length);
    for (const dep of deps) {
      dependents.get(dep)!.push(col.name);
    }
  }

  const queue = columns.filter((c) => inDegree.get(c.name) === 0).map((c) => c.name);
  const order: string[] = [];

  while (queue.length > 0) {
    const name = queue.shift()!;
    order.push(name);
    for (const dependent of dependents.get(name) ?? []) {
      const deg = inDegree.get(dependent)! - 1;
      inDegree.set(dependent, deg);
      if (deg === 0) queue.push(dependent);
    }
  }

  if (order.length !== columns.length) return columns;

  const map = new Map(columns.map((c) => [c.name, c]));
  return order.map((n) => map.get(n)!);
}

function runPerRowPipeline(
  rows: Record<string, unknown>[],
  columns: ExtendedColumnConfig[],
  entityLevels: string[],
  dateKey: string,
): Record<string, unknown>[] {
  if (columns.length === 0) return rows;

  const sorted = topoSortColumns(columns);

  const compiled = sorted.map((col) => {
    try {
      return { col, fn: math.parse(col.expression).compile() };
    } catch {
      return { col, fn: null };
    }
  });

  const enriched: Record<string, unknown>[] = rows.map((r) => ({ ...r }));

  for (const { col, fn } of compiled) {
    for (const row of enriched) {
      if (!fn) { row[col.name] = 0; continue; }
      try {
        const scope: Record<string, number> = {};
        for (const [k, v] of Object.entries(row)) {
          if (typeof v === "number") scope[k] = v;
        }
        const result = fn.evaluate(scope);
        row[col.name] = typeof result === "number" && isFinite(result) ? result : 0;
      } catch {
        row[col.name] = 0;
      }
    }

    if (col.transform && col.transform !== "none") {
      const expr = buildSeriesExpression({
        transform: col.transform as SeriesTransform,
        windowSize: col.window ?? 7,
        riskFreeRate: col.riskFreeRate ?? 0,
      });

      const groups = new Map<string, number[]>();
      enriched.forEach((row, idx) => {
        const key = entityLevels.length
          ? entityLevels.map((f) => String(row[f] ?? "")).join("\x00")
          : "__portfolio__";
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(idx);
      });

      for (const indices of Array.from(groups.values())) {
        const sortedIdx = indices
          .slice()
          .sort((a, b) => String(enriched[a][dateKey] ?? "").localeCompare(String(enriched[b][dateKey] ?? "")));

        const rawSeries = sortedIdx.map((i) => {
          const v = enriched[i][col.name];
          return typeof v === "number" && isFinite(v) ? v : 0;
        });
        const synthetic = rawSeries.map((v) => ({ [COMPUTED_FIELD]: v }));
        const transformed = expressionEngine.evaluateSeries(expr, synthetic);

        sortedIdx.forEach((rowIdx, seriesIdx) => {
          const v = transformed[seriesIdx];
          enriched[rowIdx][col.name] = isFinite(v) ? v : 0;
        });
      }
    }

    if (col.postTransform) {
      for (const row of enriched) {
        const v = row[col.name];
        if (typeof v === "number" && isFinite(v)) {
          row[col.name] = applyPostTransform(v, col.postTransform);
        }
      }
    }
  }

  return enriched;
}

export function materialiseExtendedColumns(
  rows: Record<string, unknown>[],
  columns: ExtendedColumnConfig[],
  datasetId?: string,
  dateKey: string = "date",
): Record<string, unknown>[] {
  if (columns.length === 0) return rows;
  const entityLevels = datasetId ? getDatasetEntityLevels(datasetId) : [];
  return runPerRowPipeline(rows, columns, entityLevels, dateKey);
}

export interface BucketedColumnMaterialisation {
  bucketKeys: string[];
  bucketLabels: string[];
  columnSeries: Map<string, (number | null)[]>;
}

function aggregateBucketForColumn(
  bucketRows: Record<string, unknown>[],
  col: ExtendedColumnConfig,
  entityLevels: string[],
  dateKey: string,
): number | null {
  if (bucketRows.length === 0) return null;

  const transformSemanticAgg = (() => {
    if (!col.transform || col.transform === "none") return null;
    const fnName = TRANSFORM_TO_FUNCTION_NAME[col.transform as string];
    const footerAgg = fnName ? FUNCTION_REGISTRY_MAP[fnName]?.postTransformFooterAgg : undefined;
    return footerAgg && footerAgg !== "blank" ? (footerAgg as string) : null;
  })();

  const entityAgg = (col.entityAggregation != null ? col.entityAggregation : (transformSemanticAgg ?? "sum")) as string;
  const temporalAgg = (col.temporalAggregation != null ? col.temporalAggregation : (transformSemanticAgg ?? "sum")) as string;

  type Bucket = { key: string; values: number[] };
  const initialGroups = new Map<string, number[]>();
  for (const row of bucketRows) {
    const rawDate = String(row[dateKey] ?? "");
    const entityParts = entityLevels.map((f) => String(row[f] ?? ""));
    const key = [rawDate, ...entityParts].join("\x00");
    const v = Number(row[col.name]);
    if (!initialGroups.has(key)) initialGroups.set(key, []);
    initialGroups.get(key)!.push(isFinite(v) ? v : 0);
  }
  let buckets: Bucket[] = Array.from(initialGroups.entries()).map(([key, values]) => ({ key, values }));

  for (let depth = entityLevels.length; depth > 0; depth--) {
    const merged = new Map<string, number[]>();
    for (const b of buckets) {
      const parts = b.key.split("\x00");
      parts.pop();
      const shorterKey = parts.join("\x00");
      const reduced = aggregateValues(b.values, entityAgg);
      if (!merged.has(shorterKey)) merged.set(shorterKey, []);
      merged.get(shorterKey)!.push(reduced);
    }
    buckets = Array.from(merged.entries()).map(([key, values]) => ({ key, values }));
  }

  const dailyValues = buckets.map((b) => aggregateValues(b.values, entityAgg));

  return dailyValues.length > 0 ? aggregateValues(dailyValues, temporalAgg) : null;
}

export function materialiseColumnsPerBucket(
  rows: Record<string, unknown>[],
  columns: ExtendedColumnConfig[],
  interval: bucket,
  dateKey: string = "date",
  datasetId?: string,
): BucketedColumnMaterialisation {
  const entityLevels = datasetId ? getDatasetEntityLevels(datasetId) : [];

  const baseRows = entityLevels.length > 0 && datasetId
    ? collapseSubEntityRows(rows, datasetId, dateKey)
    : rows;

  const collapsedEntityLevels = entityLevels.slice(0, -1);
  const enriched = runPerRowPipeline(baseRows, columns, collapsedEntityLevels, dateKey);

  const bucketMap = new Map<string, Record<string, unknown>[]>();
  for (const row of enriched) {
    const rawDate = String(row[dateKey] ?? "");
    const key = getBucketKey(rawDate, interval);
    if (!key) continue;
    if (!bucketMap.has(key)) bucketMap.set(key, []);
    bucketMap.get(key)!.push(row);
  }
  const bucketKeys = Array.from(bucketMap.keys()).sort();
  const bucketLabels = bucketKeys.map((k) => formatBucketDate(k, interval));

  const columnSeries = new Map<string, (number | null)[]>();
  if (columns.length === 0 || bucketKeys.length === 0) {
    return { bucketKeys, bucketLabels, columnSeries };
  }

  for (const col of columns) {
    const series = bucketKeys.map((key) => {
      const bucketRows = bucketMap.get(key) ?? [];
      const value = aggregateBucketForColumn(bucketRows, col, entityLevels, dateKey);
      return value !== null && isFinite(value) ? value : null;
    });
    columnSeries.set(col.name, series);
  }

  return { bucketKeys, bucketLabels, columnSeries };
}

function evaluateScalar(
  scalar: ScalarConfig,
  rows: Record<string, unknown>[],
): number | null {
  let filtered = rows;
  if (scalar.filter && scalar.filter.kind === "where") {
    const { field, op, value: threshold } = scalar.filter;
    filtered = rows.filter((row) => {
      const val = Number(row[field]);
      if (!isFinite(val)) return false;
      switch (op) {
        case ">":  return val > threshold;
        case "<":  return val < threshold;
        case ">=": return val >= threshold;
        case "<=": return val <= threshold;
        case "==": return val === threshold;
        case "!=": return val !== threshold;
      }
    });
  }

  if (scalar.aggregation === "last" || scalar.aggregation === "first") {
    filtered = [...filtered].sort((a, b) =>
      String(a.date ?? "").localeCompare(String(b.date ?? "")),
    );
  }

  const values = filtered.map((row) => {
    const v = Number(row[scalar.field]);
    return isFinite(v) ? v : 0;
  });

  if (values.length === 0) return null;

  const raw = aggregateValues(values, scalar.aggregation);

  if (scalar.postTransform) {
    return applyPostTransform(raw, scalar.postTransform);
  }
  return raw;
}

function aggregateValues(values: number[], agg: string): number {
  if (values.length === 0) return 0;
  switch (agg) {
    case "sum":    return values.reduce((a, b) => a + b, 0);
    case "mean":   return values.reduce((a, b) => a + b, 0) / values.length;
    case "min":    return Math.min(...values);
    case "max":    return Math.max(...values);
    case "count":  return values.length;
    case "first":  return values[0];
    case "last":   return values[values.length - 1];
    case "median": {
      const s = [...values].sort((a, b) => a - b);
      const mid = Math.floor(s.length / 2);
      return s.length % 2 !== 0 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
    }
    default:       return values.reduce((a, b) => a + b, 0);
  }
}

export function aggregateRawValues(
  values: unknown[],
  agg: FieldAggregation,
): number | string | boolean | null {
  if (values.length === 0) return null;

  switch (agg) {
    case "sum":
    case "mean":
    case "min":
    case "max":
    case "median": {
      const nums = values.map((v) => Number(v)).filter(isFinite);
      return nums.length > 0 ? aggregateValues(nums, agg) : null;
    }
    case "count":
      return values.length;
    case "count_distinct":
      return new Set(values.map((v) => String(v))).size;
    case "first":
      return (values[0] as number | string | boolean | null) ?? null;
    case "last":
      return (values[values.length - 1] as number | string | boolean | null) ?? null;
    case "concat":
      return values
        .filter((v) => v !== null && v !== undefined && v !== "")
        .map((v) => String(v))
        .join(", ");
    case "mode": {
      const freq = new Map<string, number>();
      for (const v of values) {
        const k = String(v);
        freq.set(k, (freq.get(k) ?? 0) + 1);
      }
      let topKey = "";
      let topCount = 0;
      freq.forEach((n, k) => {
        if (n > topCount) { topKey = k; topCount = n; }
      });
      return topKey;
    }
    case "and":
      return values.every((v) => Boolean(v));
    case "or":
      return values.some((v) => Boolean(v));
    case "blank":
      return null;
  }
}

function applyPostTransform(value: number, expr: string): number {
  try {
    const result = math.parse(expr).compile().evaluate({ x: value });
    return typeof result === "number" && isFinite(result) ? result : value;
  } catch {
    return value;
  }
}

function evaluateFormula(
  formula: FormulaConfig,
  scalarResults: Record<string, number | null>,
): number | null {
  const scope: Record<string, number> = {};
  for (const [name, val] of Object.entries(scalarResults)) {
    scope[name] = val ?? 0;
  }
  try {
    const result = math.parse(formula.expression).compile().evaluate(scope);
    return typeof result === "number" && isFinite(result) ? result : null;
  } catch {
    return null;
  }
}

export interface ResolvedDatasetResult {
  bucketKeys: string[];
  bucketLabels: string[];
  series: Record<string, (number | string | boolean | null)[]>;
}

export function resolveDatasetWithColumns(
  rows: Record<string, unknown>[],
  requestedFields: string[],
  extendedColumns: ExtendedColumnConfig[],
  interval: bucket,
  dateKey: string = "date",
  datasetId?: string,
): ResolvedDatasetResult {
  if (rows.length === 0) {
    return { bucketKeys: [], bucketLabels: [], series: {} };
  }

  const { bucketKeys, bucketLabels, columnSeries } = materialiseColumnsPerBucket(
    rows,
    extendedColumns,
    interval,
    dateKey,
    datasetId,
  );

  const series: Record<string, (number | string | boolean | null)[]> = {};

  if (requestedFields.length > 0) {
    const entityLevels = datasetId ? getDatasetEntityLevels(datasetId) : [];
    const effectiveRows = entityLevels.length > 0
      ? collapseSubEntityRows(rows, datasetId!, dateKey)
      : rows;

    const sortedEffectiveRows = [...effectiveRows].sort((a, b) =>
      String(a[dateKey] ?? "").localeCompare(String(b[dateKey] ?? "")),
    );

    const bucketRowMap = new Map<string, Record<string, unknown>[]>();
    for (const row of sortedEffectiveRows) {
      const rawDate = String(row[dateKey] ?? "");
      const key = getBucketKey(rawDate, interval);
      if (!key) continue;
      if (!bucketRowMap.has(key)) bucketRowMap.set(key, []);
      bucketRowMap.get(key)!.push(row);
    }
    for (const field of requestedFields) {
      const agg = getTemporalAgg(field);
      series[field] = bucketKeys.map((key) => {
        const bucketRows = bucketRowMap.get(key) ?? [];
        const rawValues = bucketRows.map((r) => r[field]);
        return rawValues.length > 0 ? aggregateRawValues(rawValues, agg) : null;
      });
    }
  }

  for (const col of extendedColumns) {
    series[col.name] = columnSeries.get(col.name) ?? bucketKeys.map(() => null);
  }

  return { bucketKeys, bucketLabels, series };
}

export function materializeDerivedDataset(
  rows: Record<string, unknown>[],
  config: DerivedDatasetConfig,
  dateKey: string = "date",
): Record<string, unknown>[] {
  if (rows.length === 0) return [];

  const interval = config.granularity as bucket;

  const bucketMap = new Map<string, Record<string, unknown>[]>();
  for (const row of rows) {
    const rawDate = String(row[dateKey] ?? "");
    const key = getBucketKey(rawDate, interval);
    if (!key) continue;
    if (!bucketMap.has(key)) bucketMap.set(key, []);
    bucketMap.get(key)!.push(row);
  }

  const sortedKeys = Array.from(bucketMap.keys()).sort();
  return sortedKeys.map((bucketKey) => {
    const bucketRows = bucketMap.get(bucketKey)!;
    const result: Record<string, unknown> = { [dateKey]: bucketKey };

    for (const colDef of config.columns) {
      const rawValues = bucketRows.map((r) => r[colDef.fieldKey]);

      if (rawValues.length === 0) {
        result[colDef.fieldKey] = null;
        continue;
      }

      result[colDef.fieldKey] = aggregateRawValues(rawValues, colDef.aggregation);
    }

    return result;
  });
}

export function buildDefaultDerivedColumns(sourceDatasetId: string): DerivedColumnConfig[] {
  const datasetMeta = DATASET_REGISTRY[sourceDatasetId];
  if (!datasetMeta) return [];

  return Object.values(datasetMeta.fields)
    .filter((f) => f.kind !== "dimension")
    .map((f) => ({
      fieldKey: f.key,
      label: f.label,
      aggregation: f.temporalAggregation ?? "sum",
    }));
}

function toMidPipelineAgg(agg: FieldAggregation): string {
  if (NUMERIC_AGGREGATIONS.has(agg)) return agg;
  return "count";
}

function isRollupGroupBy(datasetId: string, groupByColumn: string): boolean {
  const axes = getEntityAxes(datasetId);
  for (const axis of axes) {
    for (const level of axis.levels) {
      if (level.field === groupByColumn) return !level.isRawKey;
    }
  }
  return false;
}

function collapseSubEntityRows(
  rows: Record<string, unknown>[],
  datasetId: string,
  dateKey: string = "date",
): Record<string, unknown>[] {
  if (rows.length === 0) return rows;

  const baseId = datasetId.split(":")[0];
  const datasetMeta = DATASET_REGISTRY[baseId];
  if (!datasetMeta) return rows;

  const measureFields = Object.values(datasetMeta.fields).filter((f) => f.kind !== "dimension");

  const byDate = new Map<string, Record<string, unknown>[]>();
  for (const row of rows) {
    const d = String(row[dateKey] ?? "");
    if (!byDate.has(d)) byDate.set(d, []);
    byDate.get(d)!.push(row);
  }

  return Array.from(byDate.entries()).map(([d, bucketRows]) => {
    const collapsed: Record<string, unknown> = { [dateKey]: d };
    for (const fieldMeta of measureFields) {
      const agg = fieldMeta.entityAggregation ?? "sum";
      const values = bucketRows.map((r) => r[fieldMeta.key]);
      collapsed[fieldMeta.key] = aggregateRawValues(values, agg);
    }
    return collapsed;
  });
}

export interface DistributionSlice {
  label: string;
  value: number | null;
}

export function resolveScalarGrouped(
  rows: Record<string, unknown>[],
  columns: ExtendedColumnConfig[],
  scalar: ScalarConfig,
  groupByColumn: string,
  interval: bucket = "day",
  dateKey: string = "date",
): DistributionSlice[] {
  if (rows.length === 0) return [];

  const columnByName = new Map(columns.map((c) => [c.name, c]));
  const targetCol = columnByName.get(scalar.field);

  const rawGroups = new Map<string, Record<string, unknown>[]>();
  for (const row of rows) {
    const key = String(row[groupByColumn] ?? "—");
    if (!rawGroups.has(key)) rawGroups.set(key, []);
    rawGroups.get(key)!.push(row);
  }

  const needsCollapse = scalar.datasetId ? isRollupGroupBy(scalar.datasetId, groupByColumn) : false;

  const results: DistributionSlice[] = Array.from(rawGroups.entries()).map(([label, groupRows]) => {
    const partRows = needsCollapse
      ? collapseSubEntityRows(groupRows, scalar.datasetId, dateKey)
      : groupRows;
    let value: number | null;
    if (targetCol) {
      const { columnSeries } = materialiseColumnsPerBucket(
        partRows, columns, interval, dateKey, scalar.datasetId,
      );
      value = evaluateScalarOnColumnSeries(scalar, targetCol, columnSeries.get(targetCol.name) ?? []);
    } else {
      const enrichedGroupRows = materialiseExtendedColumns(partRows, columns, scalar.datasetId, dateKey);
      value = evaluateScalar(scalar, enrichedGroupRows);
    }
    return { label, value };
  });

  return results.sort((a, b) => {
    if (a.value === null && b.value === null) return 0;
    if (a.value === null) return 1;
    if (b.value === null) return -1;
    return b.value - a.value;
  });
}

export function resolveRegistryScalarForGroups(
  scalarName: string,
  groupByColumn: string,
  rowsByGroup: Record<string, Record<string, unknown>[]>,
  registry: Pick<MeasureRegistryState, "scalars" | "extendedColumns">,
): Record<string, DistributionSlice[]> {
  const scalar = registry.scalars.find((s) => s.name === scalarName);
  if (!scalar) return {};

  const columns = registry.extendedColumns.filter((c) => c.datasetId === scalar.datasetId);

  const out: Record<string, DistributionSlice[]> = {};
  for (const [groupTag, rows] of Object.entries(rowsByGroup)) {
    out[groupTag] = resolveScalarGrouped(rows, columns, scalar, groupByColumn);
  }
  return out;
}

export function resolveRegistryMeasureForGroups(
  measureName: string,
  groupByColumn: string,
  rowsByGroup: Record<string, Record<string, unknown>[]>,
  registry: Pick<MeasureRegistryState, "scalars" | "formulas" | "extendedColumns">,
): Record<string, DistributionSlice[]> {
  if (registry.scalars.some((s) => s.name === measureName)) {
    return resolveRegistryScalarForGroups(measureName, groupByColumn, rowsByGroup, registry);
  }

  const formula = registry.formulas.find((f) => f.name === measureName);
  if (!formula) return {};

  const depNames = new Set<string>();
  try {
    math.parse(formula.expression).traverse((node: any) => {
      const n = node as unknown as Record<string, unknown>;
      if (n["type"] === "SymbolNode" && typeof n["name"] === "string") {
        const varName = n["name"] as string;
        if (registry.scalars.some((s) => s.name === varName)) depNames.add(varName);
      }
    });
  } catch {
    return {};
  }

  const depScalars = registry.scalars.filter((s) => depNames.has(s.name));

  const out: Record<string, DistributionSlice[]> = {};

  for (const [groupTag, rows] of Object.entries(rowsByGroup)) {
    if (rows.length === 0) {
      out[groupTag] = [];
      continue;
    }

    const partitions = new Map<string, Record<string, unknown>[]>();
    for (const row of rows) {
      const key = String(row[groupByColumn] ?? "—");
      if (!partitions.has(key)) partitions.set(key, []);
      partitions.get(key)!.push(row);
    }

    const refDatasetId = depScalars[0]?.datasetId;
    const needsCollapse = refDatasetId ? isRollupGroupBy(refDatasetId, groupByColumn) : false;

    const slices: DistributionSlice[] = Array.from(partitions.entries()).map(([label, rawPartRows]) => {
      const partRows = needsCollapse && refDatasetId
        ? collapseSubEntityRows(rawPartRows, refDatasetId)
        : rawPartRows;
      const scope: Record<string, number> = {};
      for (const scalar of depScalars) {
        const extCols = registry.extendedColumns.filter((c) => c.datasetId === scalar.datasetId);
        const results = resolveScalarsAndFormulas(partRows, extCols, [scalar], [], "day", "date", scalar.datasetId);
        scope[scalar.name] = results[scalar.name] ?? 0;
      }

      let value: number | null = null;
      try {
        const result = math.parse(formula.expression).compile().evaluate(scope);
        value = typeof result === "number" && isFinite(result) ? result : null;
      } catch {
        value = null;
      }

      return { label, value };
    });

    slices.sort((a, b) => {
      if (a.value === null && b.value === null) return 0;
      if (a.value === null) return 1;
      if (b.value === null) return -1;
      return b.value - a.value;
    });

    out[groupTag] = slices;
  }

  return out;
}

export function resolveRegistryMeasuresForKpi(
  measureNames: string[],
  rowsByDatasetGroup: Record<string, Record<string, unknown>[]>,
  registry: Pick<MeasureRegistryState, "scalars" | "formulas" | "extendedColumns" | "derivedDatasets">,
): Record<string, Record<string, number | null>> {
  const requestedFormulas = registry.formulas.filter((f) => measureNames.includes(f.name));

  const allScalarNames = new Set(
    registry.scalars.filter((s) => measureNames.includes(s.name)).map((s) => s.name),
  );
  for (const formula of requestedFormulas) {
    try {
      math.parse(formula.expression).traverse((node: any) => {
        const n = node as unknown as Record<string, unknown>;
        if (n["type"] === "SymbolNode" && typeof n["name"] === "string") {
          const varName = n["name"] as string;
          if (registry.scalars.some((s) => s.name === varName)) {
            allScalarNames.add(varName);
          }
        }
      });
    } catch {
      // unparseable — skip dep collection
    }
  }

  const neededScalars = registry.scalars.filter((s) => allScalarNames.has(s.name));

  const groupTags = Array.from(
    new Set(
      Object.keys(rowsByDatasetGroup).map((k) => k.split(":::")[1]).filter(Boolean),
    ),
  );

  const resolvedByGroup: Record<string, Record<string, number | null>> = {};

  for (const groupTag of groupTags) {
    const merged: Record<string, number | null> = {};

    const scalarsByDataset = new Map<string, typeof neededScalars>();
    for (const scalar of neededScalars) {
      if (!scalarsByDataset.has(scalar.datasetId)) scalarsByDataset.set(scalar.datasetId, []);
      scalarsByDataset.get(scalar.datasetId)!.push(scalar);
    }

    for (const [dsId, scalars] of Array.from(scalarsByDataset)) {
      const rowsKey = `${dsId}:::${groupTag}`;
      const rawRows = rowsByDatasetGroup[rowsKey] ?? [];
      const extCols = registry.extendedColumns.filter((c) => c.datasetId === dsId);

      const entityLevels = getDatasetEntityLevels(dsId);
      const portfolioRows = entityLevels.length > 0
        ? collapseSubEntityRows(rawRows, dsId)
        : rawRows;

      const derivedConfig = registry.derivedDatasets.find((d) => d.id === dsId);
      const rows = derivedConfig
        ? materializeDerivedDataset(portfolioRows, derivedConfig)
        : portfolioRows;

      const results = resolveScalarsAndFormulas(rows, extCols, scalars, [], "day", "date", dsId);
      Object.assign(merged, results);
    }

    for (const formula of requestedFormulas) {
      const scope: Record<string, number> = {};
      for (const [name, val] of Object.entries(merged)) {
        scope[name] = val ?? 0;
      }
      try {
        const result = math.parse(formula.expression).compile().evaluate(scope);
        merged[formula.name] = typeof result === "number" && isFinite(result) ? result : null;
      } catch {
        merged[formula.name] = null;
      }
    }

    resolvedByGroup[groupTag] = merged;
  }

  const out: Record<string, Record<string, number | null>> = {};
  for (const name of measureNames) {
    out[name] = {};
    for (const groupTag of groupTags) {
      out[name][groupTag] = resolvedByGroup[groupTag]?.[name] ?? null;
    }
  }
  return out;
}

export interface ResolvedGroupedResult {
  bucketKeys: string[];
  bucketLabels: string[];
  series: Record<string, (number | string | boolean | null)[]>;
}

export function resolveRegistryColumnsGrouped(
  columnNames: string[],
  rows: Record<string, unknown>[],
  registry: Pick<MeasureRegistryState, "extendedColumns">,
  datasetId: string,
  opts: {
    timeField?: string;
    entityFields: string[];
    interval?: bucket;
  },
): ResolvedGroupedResult {
  const { timeField = "date", entityFields, interval = "day" } = opts;

  if (rows.length === 0) {
    return { bucketKeys: [], bucketLabels: [], series: {} };
  }

  if (entityFields.length === 0) {
    return resolveRegistryColumnsAsTimeSeries(columnNames, rows, registry, datasetId, interval);
  }

  const allColsForDataset = registry.extendedColumns.filter((c) => c.datasetId === datasetId);
  const extendedColsForDataset = collectWithDependencies(columnNames, allColsForDataset);
  const extendedNames = new Set(extendedColsForDataset.map((c) => c.name));
  const rawFields = columnNames.filter((name) => !extendedNames.has(name));

  const enrichedRows = materialiseExtendedColumns(rows, extendedColsForDataset, datasetId, timeField);

  const datasetEntityLevels = getDatasetEntityLevels(datasetId);

  const hierarchyLevels = getEntityHierarchy(datasetId);
  const coveredRawFields = new Set<string>(
    entityFields.flatMap((ef) => {
      if (datasetEntityLevels.includes(ef)) return [ef];
      const level = hierarchyLevels.find((l) => l.displayField === ef);
      return level ? [level.field] : [];
    }),
  );

  const collapseFields = datasetEntityLevels.filter((f) => !coveredRawFields.has(f));

  const displayFieldFallback = new Map<string, string>(
    hierarchyLevels
      .filter((l) => l.displayField)
      .map((l) => [l.displayField!, l.field]),
  );

  const resolveEntityValue = (row: Record<string, unknown>, f: string): string => {
    const val = row[f];
    if (val != null && String(val).trim() !== "" && String(val) !== "undefined") return String(val);
    const fallbackField = displayFieldFallback.get(f);
    if (fallbackField) {
      const fb = row[fallbackField];
      if (fb != null) return String(fb);
    }
    return "—";
  };

  const sortedEnrichedRows = [...enrichedRows].sort((a, b) =>
    String(a[timeField] ?? "").localeCompare(String(b[timeField] ?? "")),
  );

  const bucketMap = new Map<string, Record<string, unknown>[]>();

  for (const row of sortedEnrichedRows) {
    const rawDate = String(row[timeField] ?? "");
    const timeKey = getBucketKey(rawDate, interval);
    if (!timeKey) continue;
    const entityParts = entityFields.map((f) => resolveEntityValue(row, f));
    const key = [timeKey, ...entityParts].join("\x00");
    if (!bucketMap.has(key)) bucketMap.set(key, []);
    bucketMap.get(key)!.push(row);
  }

  const bucketKeys = Array.from(bucketMap.keys()).sort();

  const bucketLabels = bucketKeys.map((key) => {
    const [timeKey, ...entityParts] = key.split("\x00");
    const formattedDate = formatBucketDate(timeKey, interval);
    return entityParts.length > 0
      ? `${formattedDate} — ${entityParts.join(" — ")}`
      : formattedDate;
  });

  const series: Record<string, (number | string | boolean | null)[]> = {};

  for (const field of rawFields) {
    const entityAgg = getEntityAgg(field);
    const temporalAgg = getTemporalAgg(field);

    series[field] = bucketKeys.map((key) => {
      const bucketRows = bucketMap.get(key) ?? [];
      if (bucketRows.length === 0) return null;

      if (collapseFields.length === 0) {
        const rawValues = bucketRows.map((r) => r[field]);
        return aggregateRawValues(rawValues, temporalAgg);
      }

      const byDateEntity = new Map<string, unknown[]>();
      for (const row of bucketRows) {
        const dk = String(row[timeField] ?? "—");
        const ek = collapseFields.map((f) => String(row[f] ?? "")).join("\x00");
        const compositeKey = `${dk}\x00${ek}`;
        if (!byDateEntity.has(compositeKey)) byDateEntity.set(compositeKey, []);
        byDateEntity.get(compositeKey)!.push(row[field]);
      }
      const entityCollapsed = new Map<string, unknown[]>();
      for (const [compositeKey, vals] of Array.from(byDateEntity)) {
        const dateKey = compositeKey.split("\x00")[0];
        const collapsed = aggregateRawValues(vals, entityAgg);
        if (!entityCollapsed.has(dateKey)) entityCollapsed.set(dateKey, []);
        entityCollapsed.get(dateKey)!.push(collapsed);
      }

      const dailyValues = Array.from(entityCollapsed.values()).map((vals) =>
        aggregateRawValues(vals, temporalAgg),
      );
      return dailyValues.length > 0 ? aggregateRawValues(dailyValues, temporalAgg) : null;
    });
  }

  const entityComboKey = (row: Record<string, unknown>) =>
    entityFields.map((f) => String(row[f] ?? "—")).join("\x00");

  const rowsByEntityCombo = new Map<string, Record<string, unknown>[]>();
  for (const row of rows) {
    const key = entityComboKey(row);
    if (!rowsByEntityCombo.has(key)) rowsByEntityCombo.set(key, []);
    rowsByEntityCombo.get(key)!.push(row);
  }

  const perEntityMaterialisation = new Map<string, BucketedColumnMaterialisation>();
  for (const [combo, comboRows] of Array.from(rowsByEntityCombo)) {
    perEntityMaterialisation.set(
      combo,
      materialiseColumnsPerBucket(comboRows, extendedColsForDataset, interval, timeField, datasetId),
    );
  }

  for (const col of extendedColsForDataset) {
    series[col.name] = bucketKeys.map((key) => {
      const [timeKey, ...entityParts] = key.split("\x00");
      const comboKey = entityParts.join("\x00");
      const mat = perEntityMaterialisation.get(comboKey);
      if (!mat) return null;
      const idx = mat.bucketKeys.indexOf(timeKey);
      if (idx < 0) return null;
      const val = mat.columnSeries.get(col.name)?.[idx];
      return val ?? null;
    });
  }

  return { bucketKeys, bucketLabels, series };
}

export function resolveRegistryColumnsAsTimeSeries(
  columnNames: string[],
  rows: Record<string, unknown>[],
  registry: Pick<MeasureRegistryState, "extendedColumns">,
  datasetId: string,
  interval: bucket,
): ResolvedDatasetResult {
  const allColsForDataset = registry.extendedColumns.filter((c) => c.datasetId === datasetId);

  const needed = collectWithDependencies(columnNames, allColsForDataset);
  const extendedNames = new Set(needed.map((c) => c.name));
  const rawFields = columnNames.filter((name) => !extendedNames.has(name));

  return resolveDatasetWithColumns(rows, rawFields, needed, interval, "date", datasetId);
}
