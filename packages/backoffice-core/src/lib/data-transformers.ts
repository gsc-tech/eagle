import { expressionEngine } from "./expression-engine";
import { buildSeriesExpression, COMPUTED_FIELD } from "./series-config";
import { math } from "./expression-engine";
import dayjs from "dayjs";
import { bucket, formatBucketDate } from "./temporal-utils";
import { BucketAgg } from "../types/chart-types";
import { FieldAggregation } from "./field-registry";
import { AggregationSpec, evaluateAggregationSpec } from "./aggregation-spec";

export function evaluateFieldPerRow(data: any[], fieldExpr: string): any[] {
  if (!fieldExpr) return data;

  const isSimpleField = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(fieldExpr);

  if (isSimpleField) {
    return data.map((row) => ({
      ...row,
      [COMPUTED_FIELD]: Number(row[fieldExpr]) || 0,
    }));
  }

  try {
    const node = math.parse(fieldExpr);
    const compiled = node.compile();

    return data.map((row) => {
      try {
        const scope: Record<string, any> = {};
        Object.keys(row).forEach((k) => {
          if (typeof row[k] === "number") scope[k] = row[k];
        });
        const result = compiled.evaluate(scope);
        const val = typeof result === "number" && isFinite(result) ? result : 0;
        return { ...row, [COMPUTED_FIELD]: val };
      } catch {
        return { ...row, [COMPUTED_FIELD]: 0 };
      }
    });
  } catch {
    return data.map((row) => ({
      ...row,
      [COMPUTED_FIELD]: Number(row[fieldExpr]) || 0,
    }));
  }
}

export function evaluatePreAggExpression(data: any[], baseField: string, preAggExpr: string): any[] {
  if (!preAggExpr) return data;
  try {
    const node = math.parse(preAggExpr);
    const compiled = node.compile();
    return data.map((row) => {
      try {
        const scope: Record<string, any> = { _field: Number(row[baseField]) || 0 };
        Object.keys(row).forEach((k) => {
          if (typeof row[k] === "number") scope[k] = row[k];
        });
        const result = compiled.evaluate(scope);
        const val = typeof result === "number" && isFinite(result) ? result : 0;
        return { ...row, [COMPUTED_FIELD]: val };
      } catch {
        return { ...row, [COMPUTED_FIELD]: 0 };
      }
    });
  } catch {
    return data;
  }
}

export function evaluatePostAggExpression(value: number, postAggExpr: string): number {
  if (!postAggExpr) return value;
  try {
    const node = math.parse(postAggExpr);
    const compiled = node.compile();
    const result = compiled.evaluate({ _computed: value });
    return typeof result === "number" && isFinite(result) ? result : value;
  } catch {
    return value;
  }
}

export function aggregateBucket(rows: any[], bucketAgg: BucketAgg): any {
  if (rows.length === 0) return { [COMPUTED_FIELD]: 0 };

  const values = rows.map((r) => Number(r[COMPUTED_FIELD]) || 0);
  let computedValue: number;

  switch (bucketAgg) {
    case "count":
      computedValue = rows.length;
      break;
    case "mean":
      computedValue = values.reduce((a, b) => a + b, 0) / values.length;
      break;
    case "min":
      computedValue = Math.min(...values);
      break;
    case "max":
      computedValue = Math.max(...values);
      break;
    case "median": {
      const sorted = [...values].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      computedValue = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
      break;
    }
    case "sum":
    default:
      computedValue = values.reduce((a, b) => a + b, 0);
      break;
  }

  const rep: any = { ...rows[0] };
  rep[COMPUTED_FIELD] = computedValue;
  return rep;
}

function toMidPipelineAgg(agg: FieldAggregation): BucketAgg {
  switch (agg) {
    case "sum":    return "sum";
    case "mean":   return "mean";
    case "count":  return "count";
    case "min":    return "min";
    case "max":    return "max";
    case "median": return "median";
    case "first":          return "sum";
    case "last":           return "sum";
    case "blank":          return "sum";
    case "concat":         return "count";
    case "mode":           return "count";
    case "and":            return "count";
    case "or":             return "count";
    case "count_distinct": return "count";
  }
}

export function applyEntityAggregation(
  data: any[],
  dateKey: string,
  entityAgg: FieldAggregation,
  groupByKey?: string,
): any[] {
  const agg = toMidPipelineAgg(entityAgg);

  const groups: Record<string, any[]> = {};
  data.forEach((row) => {
    const datePart = String(row[dateKey] ?? "");
    const groupPart = groupByKey ? String(row[groupByKey] ?? "") : "";
    const k = groupPart ? `${datePart}\x00${groupPart}` : datePart;
    if (!groups[k]) groups[k] = [];
    groups[k].push(row);
  });

  return Object.values(groups).map((rows) => aggregateBucket(rows, agg));
}

function applyAggregationSpec(
  data: any[],
  spec: AggregationSpec,
  xAxisKey: string,
  interval: bucket,
  groupByKey?: string,
): any[] {
  const bucketMap: Record<string, Record<string, any[]>> = {};

  data.forEach((row) => {
    const k = dayjs(String(row[xAxisKey] ?? "")).isValid()
      ? dayjs(String(row[xAxisKey])).startOf(interval).format("YYYY-MM-DD")
      : String(row[xAxisKey] ?? "");
    const g = groupByKey ? String(row[groupByKey] ?? "Unknown") : "value";
    if (!bucketMap[k]) bucketMap[k] = {};
    if (!bucketMap[k][g]) bucketMap[k][g] = [];
    bucketMap[k][g].push(row);
  });

  const result: any[] = [];
  for (const [dateKey, groups] of Object.entries(bucketMap)) {
    for (const [group, rows] of Object.entries(groups)) {
      const val = evaluateAggregationSpec(rows as Record<string, unknown>[], spec);
      const syntheticRow: any = {
        [xAxisKey]: dateKey,
        [COMPUTED_FIELD]: val ?? 0,
      };
      if (groupByKey) syntheticRow[groupByKey] = group;
      result.push(syntheticRow);
    }
  }

  return result;
}

export interface TransformConfig {
  field?: string;
  bucketAgg?: BucketAgg;
  entityAggregation?: FieldAggregation;
  temporalAggregation?: FieldAggregation;
  entityKey?: string;
  preAggExpression?: string;
  postAggExpression?: string;
  aggregationSpec?: AggregationSpec;
  transform?: string;
  windowSize?: number;
  riskFreeRate?: number;
  xAxisKey: string;
  groupByKey?: string;
  bucket?: bucket;
  skipGapFill?: boolean;
}

export const transformDynamicSeries = (rawData: any[], config: TransformConfig) => {
  const flatData = Array.isArray(rawData[0]) ? (rawData as any[][]).flat() : rawData;
  if (flatData.length === 0) return { data: [], seriesKeys: [] };

  const seriesExpr = buildSeriesExpression({
    transform: (config.transform as any) || "none",
    windowSize: config.windowSize,
    riskFreeRate: config.riskFreeRate,
  });

  if (config.aggregationSpec) {
    const interval = config.bucket || "day";
    const sampleVal = flatData[0]?.[config.xAxisKey];
    const isTemporal = sampleVal && dayjs(sampleVal).isValid() && !isNaN(dayjs(sampleVal).valueOf());

    const specRows = applyAggregationSpec(
      flatData,
      config.aggregationSpec,
      config.xAxisKey,
      interval,
      config.groupByKey,
    );

    if (isTemporal) {
      return transformTemporal(
        specRows,
        config.xAxisKey,
        seriesExpr,
        "sum",
        interval,
        config.groupByKey,
        config.skipGapFill,
        config.postAggExpression,
      );
    } else {
      return transformCategorical(specRows, config.xAxisKey, seriesExpr, "sum", config.groupByKey, config.postAggExpression);
    }
  }

  let withComputed: any[];
  if (config.preAggExpression) {
    withComputed = evaluatePreAggExpression(flatData, config.field || "netPL", config.preAggExpression);
  } else {
    withComputed = evaluateFieldPerRow(flatData, config.field || "netPL");
  }

  const entityAgg: FieldAggregation = config.entityAggregation ?? "sum";
  const afterEntityAgg =
    config.entityKey
      ? applyEntityAggregation(withComputed, config.xAxisKey, entityAgg, config.groupByKey)
      : withComputed;

  const temporalAgg: BucketAgg = toMidPipelineAgg(config.temporalAggregation ?? config.bucketAgg ?? "sum");

  const sampleVal = afterEntityAgg[0]?.[config.xAxisKey];
  const isTemporal = sampleVal && dayjs(sampleVal).isValid() && !isNaN(dayjs(sampleVal).valueOf());

  if (isTemporal) {
    return transformTemporal(
      afterEntityAgg,
      config.xAxisKey,
      seriesExpr,
      temporalAgg,
      config.bucket || "day",
      config.groupByKey,
      config.skipGapFill,
      config.postAggExpression,
    );
  } else {
    return transformCategorical(afterEntityAgg, config.xAxisKey, seriesExpr, temporalAgg, config.groupByKey, config.postAggExpression);
  }
};

function transformTemporal(
  data: any[],
  xAxisKey: string,
  seriesExpr: string,
  bucketAgg: BucketAgg,
  interval: bucket,
  groupByKey?: string,
  skipGapFill?: boolean,
  postAggExpression?: string,
) {
  const sorted = [...data].sort((a, b) => dayjs(a[xAxisKey]).valueOf() - dayjs(b[xAxisKey]).valueOf());
  const groups = groupByKey ? Array.from(new Set(sorted.map((r) => String(r[groupByKey] || "Unknown")))) : ["value"];

  const startDate = dayjs(sorted[0][xAxisKey]).startOf(interval);
  const endDate = dayjs(sorted[sorted.length - 1][xAxisKey]).endOf(interval);

  const bucketMap: Record<string, Record<string, any[]>> = {};
  sorted.forEach((row) => {
    const k = dayjs(row[xAxisKey]).startOf(interval).format("YYYY-MM-DD");
    const g = groupByKey ? String(row[groupByKey] || "Unknown") : "value";
    if (!bucketMap[k]) bucketMap[k] = {};
    if (!bucketMap[k][g]) bucketMap[k][g] = [];
    bucketMap[k][g].push(row);
  });

  const timelineRows: any[] = [];
  let current = startDate;

  while (current.isBefore(endDate) || current.isSame(endDate)) {
    const k = current.format("YYYY-MM-DD");
    const bucketData = bucketMap[k] || {};

    const resRow: any = {
      name: formatBucketDate(k, interval),
      _originalDate: k,
    };

    groups.forEach((g) => {
      const rows = bucketData[g] || [];
      if (rows.length > 0) {
        const rep = aggregateBucket(rows, bucketAgg);
        if (postAggExpression) {
          rep[COMPUTED_FIELD] = evaluatePostAggExpression(rep[COMPUTED_FIELD], postAggExpression);
        }
        resRow[`_rep_${g}`] = rep;
      } else {
        resRow[`_rep_${g}`] = { [COMPUTED_FIELD]: undefined };
      }
    });

    if (!skipGapFill || Object.keys(bucketData).length > 0) {
      timelineRows.push(resRow);
    }
    current = current.add(1, interval);
  }

  groups.forEach((g) => {
    const groupVector = timelineRows.map((tr) => tr[`_rep_${g}`]);
    const results = expressionEngine.evaluateSeries(seriesExpr, groupVector);
    timelineRows.forEach((tr, i) => {
      tr[g] = results[i] || 0;
    });
  });

  return {
    data: timelineRows.map(({ name, ...rest }) => ({
      name,
      ...Object.fromEntries(groups.map((g) => [g, rest[g]])),
    })),
    seriesKeys: groups,
  };
}

function transformCategorical(
  data: any[],
  xAxisKey: string,
  seriesExpr: string,
  bucketAgg: BucketAgg,
  groupByKey?: string,
  postAggExpression?: string,
) {
  const categoriesMap: Record<string, any[]> = {};
  const seriesKeys = new Set<string>();

  data.forEach((row) => {
    const xVal = String(row[xAxisKey] || "Unknown");
    const gVal = groupByKey ? String(row[groupByKey] || "Unknown") : "value";
    seriesKeys.add(gVal);
    if (!categoriesMap[xVal]) categoriesMap[xVal] = [];
    categoriesMap[xVal].push(row);
  });

  const resultRows = Object.entries(categoriesMap).map(([catName, rows]) => {
    const newRow: any = { name: catName };

    const subGroups: Record<string, any[]> = {};
    rows.forEach((r) => {
      const g = groupByKey ? String(r[groupByKey] || "Unknown") : "value";
      if (!subGroups[g]) subGroups[g] = [];
      subGroups[g].push(r);
    });

    seriesKeys.forEach((g) => {
      const gRows = subGroups[g] || [];
      if (gRows.length === 0) {
        newRow[g] = 0;
        return;
      }

      const rep = aggregateBucket(gRows, bucketAgg);
      if (postAggExpression) {
        rep[COMPUTED_FIELD] = evaluatePostAggExpression(rep[COMPUTED_FIELD], postAggExpression);
      }
      const evalResult = expressionEngine.evaluateSeries(seriesExpr, [rep]);
      newRow[g] = evalResult[0] || 0;
    });

    return newRow;
  });

  return {
    data: resultRows.sort((a, b) => String(a.name).localeCompare(String(b.name))),
    seriesKeys: Array.from(seriesKeys),
  };
}

export const transformPieDynamic = (
  rawData: any[],
  config: {
    field?: string;
    bucketAgg?: BucketAgg;
    groupByKey: string;
  },
) => {
  const flatData = Array.isArray(rawData[0]) ? (rawData as any[][]).flat() : rawData;
  const bucketAgg: BucketAgg = config.bucketAgg || "sum";

  const withComputed = evaluateFieldPerRow(flatData, config.field || "netPL");

  const groupMap: Record<string, any[]> = {};
  withComputed.forEach((row) => {
    const g = String(row[config.groupByKey] || "Unknown");
    if (!groupMap[g]) groupMap[g] = [];
    groupMap[g].push(row);
  });

  return Object.entries(groupMap).map(([name, rows]) => {
    const rep = aggregateBucket(rows, bucketAgg);
    return {
      name,
      value: rep[COMPUTED_FIELD] || 0,
    };
  });
};
