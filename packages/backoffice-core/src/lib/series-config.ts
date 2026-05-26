import { SeriesTransform, BucketAgg, Bucket } from "../types/chart-types";

export const COMPUTED_FIELD = "_computed";

export const FIELD_MATH_FUNCTIONS = [
  { name: "abs", label: "Absolute", description: "Absolute value", params: 1 },
  { name: "log10", label: "Log10", description: "Base-10 logarithm", params: 1 },
  { name: "log", label: "Ln", description: "Natural logarithm", params: 1 },
  { name: "sqrt", label: "Sqrt", description: "Square root", params: 1 },
  { name: "round", label: "Round", description: "Round to nearest integer", params: 1 },
  { name: "ceil", label: "Ceil", description: "Round up", params: 1 },
  { name: "floor", label: "Floor", description: "Round down", params: 1 },
  { name: "max", label: "Max", description: "Maximum of two values", params: 2 },
  { name: "min", label: "Min", description: "Minimum of two values", params: 2 },
  { name: "pow", label: "Power", description: "Raise to exponent", params: 2 },
] as const;

export function buildSeriesExpression(config: {
  transform: SeriesTransform;
  windowSize?: number;
  riskFreeRate?: number;
}): string {
  const { transform, windowSize = 7, riskFreeRate = 0 } = config;

  switch (transform) {
    case "none":
      return COMPUTED_FIELD;
    case "cumulative":
      return `cumsum(${COMPUTED_FIELD})`;
    case "rolling_mean":
      return `movingAvg(${COMPUTED_FIELD}, ${windowSize})`;
    case "rolling_sum":
      return `movingSum(${COMPUTED_FIELD}, ${windowSize})`;
    case "rolling_min":
      return `movingMin(${COMPUTED_FIELD}, ${windowSize})`;
    case "rolling_max":
      return `movingMax(${COMPUTED_FIELD}, ${windowSize})`;
    case "rolling_median":
      return `movingMedian(${COMPUTED_FIELD}, ${windowSize})`;
    case "sharpe":
      return riskFreeRate > 0
        ? `sharpeRatio(${COMPUTED_FIELD}, ${windowSize}, ${riskFreeRate})`
        : `sharpeRatio(${COMPUTED_FIELD}, ${windowSize})`;
    case "expanding_sharpe":
      return riskFreeRate > 0
        ? `expandingSharpeRatio(${COMPUTED_FIELD}, ${riskFreeRate})`
        : `expandingSharpeRatio(${COMPUTED_FIELD})`;
    case "drawdown":
      return `drawdownPct(cumsum(${COMPUTED_FIELD}))`;
    case "drawdown_abs":
      return `drawdownAbs(cumsum(${COMPUTED_FIELD}))`;
    case "expanding_max":
      return `expandingMax(${COMPUTED_FIELD})`;
    default:
      return COMPUTED_FIELD;
  }
}

export function buildSeriesLabel(config: {
  field?: string;
  bucket: Bucket;
  bucketAgg: BucketAgg;
  transform: SeriesTransform;
  windowSize?: number;
}): string {
  const { field, bucket, bucketAgg, transform, windowSize } = config;

  const interval = bucket ? capitalize(bucket) : "";

  const bucketPrefix =
    bucket === "day"
      ? "Daily"
      : bucket === "week"
        ? "Weekly"
        : bucket === "month"
          ? "Monthly"
          : bucket === "year"
            ? "Yearly"
            : "";

  const aggLabel =
    bucketAgg === "sum"
      ? "Sum"
      : bucketAgg === "mean"
        ? "Avg"
        : bucketAgg === "count"
          ? "Count"
          : bucketAgg === "min"
            ? "Min"
            : bucketAgg === "max"
              ? "Max"
              : "Median";

  const fieldLabel = field
    ? field
        .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
        .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
        .replace(/^./, (c) => c.toUpperCase())
    : "";

  const prefix = [bucketPrefix].filter(Boolean).join(" ");

  switch (transform) {
    case "none":
      return `${prefix} ${aggLabel} of ${fieldLabel}`.trim();
    case "cumulative":
      return `${prefix} Cumul. ${aggLabel} of ${fieldLabel}`.trim();
    case "rolling_mean":
      return `${windowSize}-${interval || "P"} Rolling Mean of ${fieldLabel}`;
    case "rolling_sum":
      return `${windowSize}-${interval || "P"} Rolling Sum of ${fieldLabel}`;
    case "rolling_min":
      return `${windowSize}-${interval || "P"} Rolling Min of ${fieldLabel}`;
    case "rolling_max":
      return `${windowSize}-${interval || "P"} Rolling Max of ${fieldLabel}`;
    case "rolling_median":
      return `${windowSize}-${interval || "P"} Rolling Median of ${fieldLabel}`;
    case "sharpe":
      return `${windowSize}-${interval || "P"} Moving Sharpe Ann. (${fieldLabel})`;
    case "expanding_sharpe":
      return `Expanding Sharpe Ann. (${fieldLabel})`;
    case "drawdown":
      return `Drawdown % (${fieldLabel})`;
    case "drawdown_abs":
      return `Drawdown (${fieldLabel})`;
    case "expanding_max":
      return `All-Time High (${fieldLabel})`;
    default:
      return fieldLabel;
  }
}

export function buildProductwiseTitle(config: {
  field: string;
  groupBy?: string;
  dimension: string;
  bucket?: string;
}): string {
  const { field, groupBy, dimension, bucket } = config;

  const fieldLabel = field
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/^./, (c) => c.toUpperCase());

  const groupLabel = groupBy === "asset" ? "Asset Class" : "Instrument";

  const bucketLabel =
    bucket === "week"
      ? "Weekly"
      : bucket === "month"
        ? "Monthly"
        : bucket === "year"
          ? "Yearly"
          : "Daily";

  if (dimension === "time") {
    return `${fieldLabel} by ${groupLabel} · ${bucketLabel}`;
  }

  return `${fieldLabel} by ${groupLabel}`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
