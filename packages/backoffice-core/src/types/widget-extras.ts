import { FieldAggregation } from "../lib/field-registry";
import { SeriesTransform } from "./chart-types";
import { AggregationSpec } from "../lib/aggregation-spec";

export type CellMetaSpec =
  | { kind: "truncate" }
  | { kind: "lookup"; lookupKey: string }
  | { kind: "format"; formatter: string };

export interface KpiRow {
  label: string;
  groupValues: { groupId: string; groupLabel: string; value: number | null }[];
  format: "currency" | "percent" | "number";
  directional?: boolean;
}

export interface TableColumnDef {
  key: string;
  label: string;
  expression: string;
  entityAggregation: FieldAggregation;
  temporalAggregation: FieldAggregation;
  footerAggregation: FieldAggregation;
  aggregationSpec?: AggregationSpec;
  postAggExpression?: string;
  format: "currency" | "percent" | "number" | "text";
  directional?: boolean;
  isCustom: boolean;
  cellMeta?: CellMetaSpec;
  transform?: SeriesTransform;
  windowSize?: number;
  dateGranularity?: "day" | "week" | "month" | "year";
}

export interface ResolvedTableColumn {
  key: string;
  label: string;
  format: "currency" | "percent" | "number" | "text";
  directional?: boolean;
  isCustom: boolean;
}

export type TableRow = Record<string, string | number | boolean | null>;
