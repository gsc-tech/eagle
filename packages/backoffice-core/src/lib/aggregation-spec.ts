export type PredicateOp = ">" | "<" | ">=" | "<=" | "==" | "!=";

export interface RowPredicate {
  field: string;
  op: PredicateOp;
  value: number;
}

export type AggregationSpec =
  | {
      kind: "field";
      field: string;
      aggregation?: "sum" | "mean" | "max" | "min" | "count";
    }
  | {
      kind: "count-all";
    }
  | {
      kind: "count-where";
      field: string;
      predicate: RowPredicate;
    }
  | {
      kind: "ratio";
      numerator: AggregationSpec;
      denominator: AggregationSpec;
      scale?: number;
    };

export function evaluateAggregationSpec(rows: Record<string, unknown>[], spec: AggregationSpec): number | null {
  if (rows.length === 0) return null;

  switch (spec.kind) {
    case "field": {
      const values = rows.map((r) => Number(r[spec.field]) || 0);
      const agg = spec.aggregation ?? "sum";
      switch (agg) {
        case "sum":   return values.reduce((a, b) => a + b, 0);
        case "mean":  return values.reduce((a, b) => a + b, 0) / values.length;
        case "max":   return Math.max(...values);
        case "min":   return Math.min(...values);
        case "count": return rows.length;
      }
    }

    case "count-all": {
      return rows.length;
    }

    case "count-where": {
      return rows.filter((r) => satisfiesPredicate(r, spec.predicate)).length;
    }

    case "ratio": {
      const num = evaluateAggregationSpec(rows, spec.numerator);
      const den = evaluateAggregationSpec(rows, spec.denominator);
      if (num === null || den === null || den === 0) return null;
      const result = num / den;
      return spec.scale !== undefined ? result * spec.scale : result;
    }
  }
}

function satisfiesPredicate(row: Record<string, unknown>, pred: RowPredicate): boolean {
  const val = Number(row[pred.field]);
  if (!isFinite(val)) return false;
  switch (pred.op) {
    case ">":  return val > pred.value;
    case "<":  return val < pred.value;
    case ">=": return val >= pred.value;
    case "<=": return val <= pred.value;
    case "==": return val === pred.value;
    case "!=": return val !== pred.value;
  }
}

export const WIN_PCT_SPEC: AggregationSpec = {
  kind: "ratio",
  numerator: {
    kind: "count-where",
    field: "netPL",
    predicate: { field: "netPL", op: ">", value: 0 },
  },
  denominator: { kind: "count-all" },
  scale: 100,
};

export const PROFIT_DAYS_SPEC: AggregationSpec = {
  kind: "ratio",
  numerator: {
    kind: "count-where",
    field: "netPLExclRebatesAndCharges",
    predicate: { field: "netPLExclRebatesAndCharges", op: ">", value: 0 },
  },
  denominator: { kind: "count-all" },
  scale: 100,
};

export function describeSpec(spec: AggregationSpec): string {
  switch (spec.kind) {
    case "field":
      return `${spec.aggregation ?? "sum"}(${spec.field})`;
    case "count-all":
      return "count(*)";
    case "count-where":
      return `count(${spec.field} ${spec.predicate.op} ${spec.predicate.value})`;
    case "ratio": {
      const numDesc = describeSpec(spec.numerator);
      const denDesc = describeSpec(spec.denominator);
      const scale = spec.scale !== undefined && spec.scale !== 1 ? ` × ${spec.scale}` : "";
      return `${numDesc} / ${denDesc}${scale}`;
    }
  }
}