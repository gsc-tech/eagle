import { math } from "./expression-engine";
import { getEntityAgg, getTemporalAgg, FieldAggregation } from "./field-registry";
import { BucketAgg, SeriesTransform } from "../types/chart-types";
import { expressionEngine } from "./expression-engine";
import { buildSeriesExpression, COMPUTED_FIELD } from "./series-config";
import dayjs from "dayjs";
import { bucket as BucketInterval, formatBucketDate } from "./temporal-utils";

export type Aggregation = "sum" | "mean" | "min" | "max" | "count" | "median" | "first" | "last";

export type PredicateOp = ">" | "<" | ">=" | "<=" | "==" | "!=";

export type RowFilter =
  | { kind: "all" }
  | { kind: "where"; field: string; op: PredicateOp; value: number };

export interface ColumnMeasure {
  kind: "column";
  name: string;
  label?: string;
  expression: string;
  visible?: boolean;
}

export interface ScalarMeasure {
  kind: "scalar";
  name: string;
  label?: string;
  field: string;
  aggregation: Aggregation;
  filter?: RowFilter;
  postTransform?: string;
  visible?: boolean;
}

export interface FormulaMeasure {
  kind: "formula";
  name: string;
  label?: string;
  expression: string;
  visible?: boolean;
}

export interface SeriesMeasure {
  kind: "series";
  name: string;
  label?: string;
  source: string;
  transform: SeriesTransform;
  window?: number;
  riskFreeRate?: number;
  visible?: boolean;
}

export type Measure = ColumnMeasure | ScalarMeasure | FormulaMeasure | SeriesMeasure;

export class MeasureCycleError extends Error {
  constructor(public cycle: string[]) {
    super(`Circular dependency in measures: ${cycle.join(" → ")}`);
    this.name = "MeasureCycleError";
  }
}

function getMeasureDeps(m: Measure, measures: Measure[]): string[] {
  const allNames    = new Set(measures.map((mm) => mm.name));
  const columnNames = new Set(measures.filter((mm) => mm.kind === "column").map((mm) => mm.name));

  switch (m.kind) {
    case "column":
      return [];
    case "scalar": {
      const deps: string[] = [];
      if (columnNames.has(m.field)) deps.push(m.field);
      if (m.filter?.kind === "where" && columnNames.has(m.filter.field)) {
        deps.push(m.filter.field);
      }
      return deps;
    }
    case "formula":
      return extractIdentifiers(m.expression).filter((id) => allNames.has(id) && id !== m.name);
    case "series":
      return allNames.has(m.source) && m.source !== m.name ? [m.source] : [];
  }
}

function extractIdentifiers(expr: string): string[] {
  try {
    const node = math.parse(expr);
    const names: string[] = [];
    node.traverse((n: { type: string; name?: string }) => {
      if (n.type === "SymbolNode" && n.name) names.push(n.name);
    });
    return Array.from(new Set(names));
  } catch {
    return Array.from(new Set(expr.match(/\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g) ?? []));
  }
}

export function topoSort(measures: Measure[]): Measure[] {
  const inDegree = new Map<string, number>();
  const dependents = new Map<string, string[]>();

  for (const m of measures) {
    inDegree.set(m.name, 0);
    dependents.set(m.name, []);
  }

  for (const m of measures) {
    const deps = getMeasureDeps(m, measures);
    inDegree.set(m.name, deps.length);
    for (const dep of deps) {
      dependents.get(dep)!.push(m.name);
    }
  }

  const queue = measures.filter((m) => inDegree.get(m.name) === 0).map((m) => m.name);
  const order: string[] = [];

  while (queue.length > 0) {
    const name = queue.shift()!;
    order.push(name);
    for (const dep of dependents.get(name) ?? []) {
      const deg = inDegree.get(dep)! - 1;
      inDegree.set(dep, deg);
      if (deg === 0) queue.push(dep);
    }
  }

  if (order.length !== measures.length) {
    const remaining = measures.filter((m) => !order.includes(m.name)).map((m) => m.name);
    throw new MeasureCycleError(remaining);
  }

  const map = new Map(measures.map((m) => [m.name, m]));
  return order.map((n) => map.get(n)!);
}

function aggregateValues(values: number[], agg: Aggregation): number | null {
  if (values.length === 0) return null;
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
  }
}

function satisfiesPredicate(value: number, op: PredicateOp, threshold: number): boolean {
  switch (op) {
    case ">":  return value > threshold;
    case "<":  return value < threshold;
    case ">=": return value >= threshold;
    case "<=": return value <= threshold;
    case "==": return value === threshold;
    case "!=": return value !== threshold;
  }
}

function applyPostTransform(value: number, expr: string): number {
  try {
    const node = math.parse(expr);
    const result = node.compile().evaluate({ x: value });
    return typeof result === "number" && isFinite(result) ? result : value;
  } catch {
    return value;
  }
}

function materialiseColumnMeasures(
  rows: Record<string, unknown>[],
  columnMeasures: ColumnMeasure[],
): Record<string, unknown>[] {
  if (columnMeasures.length === 0) return rows;

  const compiled = columnMeasures.map((cm) => {
    try {
      return { name: cm.name, fn: math.parse(cm.expression).compile() };
    } catch {
      return { name: cm.name, fn: null };
    }
  });

  return rows.map((row) => {
    const extended: Record<string, unknown> = { ...row };
    for (const { name, fn } of compiled) {
      if (!fn) { extended[name] = 0; continue; }
      try {
        const scope: Record<string, number> = {};
        for (const [k, v] of Object.entries(extended)) {
          if (typeof v === "number") scope[k] = v;
        }
        const result = fn.evaluate(scope);
        extended[name] = typeof result === "number" && isFinite(result) ? result : 0;
      } catch {
        extended[name] = 0;
      }
    }
    return extended;
  });
}

function evaluateScalar(
  m: ScalarMeasure,
  rows: Record<string, unknown>[],
): number | null {
  let filtered = rows;
  if (m.filter && m.filter.kind === "where") {
    const { field, op, value: threshold } = m.filter;
    filtered = rows.filter((row) => {
      const val = Number(row[field]);
      return isFinite(val) && satisfiesPredicate(val, op, threshold);
    });
  }

  const values = filtered.map((row) => {
    const v = Number(row[m.field]);
    return isFinite(v) ? v : 0;
  });

  const raw = aggregateValues(values, m.aggregation);
  if (raw === null) return null;

  return m.postTransform ? applyPostTransform(raw, m.postTransform) : raw;
}

export function executeMeasuresForKpi(
  measures: Measure[],
  rows: Record<string, unknown>[],
): Record<string, number | null> {
  const results: Record<string, number | null> = {};

  const columnMeasures = measures.filter((m): m is ColumnMeasure => m.kind === "column");
  const enrichedRows = materialiseColumnMeasures(rows, columnMeasures);

  const scalarMeasures = topoSort(
    measures.filter((m): m is ScalarMeasure => m.kind === "scalar"),
  ) as ScalarMeasure[];

  for (const m of scalarMeasures) {
    results[m.name] = evaluateScalar(m, enrichedRows);
  }

  const formulaMeasures = topoSort(
    measures.filter((m): m is FormulaMeasure => m.kind === "formula"),
  ) as FormulaMeasure[];

  for (const m of formulaMeasures) {
    const scope: Record<string, number> = {};
    for (const [name, val] of Object.entries(results)) {
      scope[name] = val ?? 0;
    }
    try {
      const result = math.parse(m.expression).compile().evaluate(scope);
      results[m.name] = typeof result === "number" && isFinite(result) ? result : null;
    } catch {
      results[m.name] = null;
    }
  }

  const seriesMeasures = topoSort(
    measures.filter((m): m is SeriesMeasure => m.kind === "series"),
  ) as SeriesMeasure[];

  const seriesArrays: Record<string, number[]> = {};

  for (const m of seriesMeasures) {
    const sourceArray: number[] =
      seriesArrays[m.source] ??
      (results[m.source] !== undefined && results[m.source] !== null
        ? [results[m.source] as number]
        : [0]);

    const syntheticRows = sourceArray.map((v) => ({ [COMPUTED_FIELD]: v }));
    const expr = buildSeriesExpression({
      transform: m.transform,
      windowSize: m.window ?? 7,
      riskFreeRate: m.riskFreeRate ?? 0,
    });

    const transformed = expressionEngine.evaluateSeries(expr, syntheticRows);
    seriesArrays[m.name] = transformed;

    const last = [...transformed].reverse().find((v) => v !== null && isFinite(v)) ?? null;
    results[m.name] = last;
  }

  return results;
}

export type BucketedScalars = Map<string, Record<string, number | null>>;

export function executeMeasuresPerBucket(
  measures: Measure[],
  rows: Record<string, unknown>[],
  xAxisKey: string,
  entityKey?: string,
  bucketInterval: BucketInterval = "day",
): BucketedScalars {
  const columnMeasures = measures.filter((m): m is ColumnMeasure => m.kind === "column");
  const enrichedRows = materialiseColumnMeasures(rows, columnMeasures);

  const bucketMap = new Map<string, Record<string, unknown>[]>();

  for (const row of enrichedRows) {
    const rawDate = String(row[xAxisKey] ?? "");
    const key = dayjs(rawDate).isValid()
      ? dayjs(rawDate).startOf(bucketInterval).format("YYYY-MM-DD")
      : rawDate;
    if (!bucketMap.has(key)) bucketMap.set(key, []);
    bucketMap.get(key)!.push(row);
  }

  const scalarMeasures = topoSort(
    measures.filter((m): m is ScalarMeasure => m.kind === "scalar"),
  ) as ScalarMeasure[];

  const formulaMeasures = topoSort(
    measures.filter((m): m is FormulaMeasure => m.kind === "formula"),
  ) as FormulaMeasure[];

  const sortedKeys = Array.from(bucketMap.keys()).sort();

  const result: BucketedScalars = new Map();

  for (const key of sortedKeys) {
    const bucketRows = bucketMap.get(key)!;
    const bucketResults: Record<string, number | null> = {};

    for (const m of scalarMeasures) {
      bucketResults[m.name] = evaluateScalar(m, bucketRows);
    }

    for (const m of formulaMeasures) {
      const scope: Record<string, number> = {};
      for (const [name, val] of Object.entries(bucketResults)) {
        scope[name] = val ?? 0;
      }
      try {
        const res = math.parse(m.expression).compile().evaluate(scope);
        bucketResults[m.name] = typeof res === "number" && isFinite(res) ? res : null;
      } catch {
        bucketResults[m.name] = null;
      }
    }

    result.set(key, bucketResults);
  }

  return result;
}

export function applySeriesTransforms(
  measures: Measure[],
  bucketed: BucketedScalars,
): { bucketKeys: string[]; series: Record<string, (number | null)[]> } {
  const bucketKeys = Array.from(bucketed.keys());
  const n = bucketKeys.length;

  const series: Record<string, (number | null)[]> = {};

  const scalarMeasures = measures.filter(
    (m): m is ScalarMeasure | FormulaMeasure => m.kind === "scalar" || m.kind === "formula",
  );
  for (const m of scalarMeasures) {
    series[m.name] = bucketKeys.map((k) => bucketed.get(k)?.[m.name] ?? null);
  }

  const seriesMeasures = topoSort(
    measures.filter((m): m is SeriesMeasure => m.kind === "series"),
  ) as SeriesMeasure[];

  for (const m of seriesMeasures) {
    const sourceArray = series[m.source] ?? new Array(n).fill(null);

    const syntheticRows = sourceArray.map((v) => ({
      [COMPUTED_FIELD]: v ?? 0,
    }));

    const expr = buildSeriesExpression({
      transform: m.transform,
      windowSize: m.window ?? 7,
      riskFreeRate: m.riskFreeRate ?? 0,
    });

    const transformed = expressionEngine.evaluateSeries(expr, syntheticRows);
    series[m.name] = transformed.map((v) => (isFinite(v) ? v : null));
  }

  return { bucketKeys, series };
}

export function describeMeasure(m: Measure): string {
  switch (m.kind) {
    case "column":
      return m.expression;
    case "scalar": {
      const filterStr =
        !m.filter || m.filter.kind === "all"
          ? ""
          : ` where ${m.filter.field} ${m.filter.op} ${m.filter.value}`;
      const postStr = m.postTransform ? ` → ${m.postTransform}` : "";
      return `${m.aggregation}(${m.field}${filterStr})${postStr}`;
    }
    case "formula":
      return m.expression;
    case "series":
      return `${m.transform}(${m.source}${m.window ? `, ${m.window}` : ""})`;
  }
}

export const MEASURE_KIND_BADGES: Record<Measure["kind"], { label: string; className: string }> = {
  column:  { label: "column",  className: "bg-sky-500/10 text-sky-400 border-sky-500/20" },
  scalar:  { label: "scalar",  className: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  formula: { label: "formula", className: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  series:  { label: "series",  className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
};
