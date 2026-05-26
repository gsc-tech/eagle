/**
 * Widget V2 Adapter — ported to backoffice-core.
 *
 * Bridges a V2 WidgetConfig to ChartItemConfig[] consumed by chart renderers.
 * No UI dependencies — pure data transformation.
 *
 * productWiseData is optional (productwise datasets are out of scope for
 * the Financial View integration). Pass {} when not needed.
 */

import { useGroupsStore } from "../store/groupsStore";
import { useGroupColorStore } from "../store/groupColorStore";
import { GROUP_LABELS, type GroupId } from "../store/groups";
import {
  DATASET_REGISTRY,
  getEntityAgg,
  getTemporalAgg,
  getFooterAgg,
  getPrimaryHierarchy,
  getEntityHierarchy,
  getEntityAxes,
  getFieldMeta,
} from "./field-registry";
import { fieldToLabel } from "./utils";
import type { CellMetaSpec } from "../types/widget-extras";
import {
  resolveRegistryColumnsAsTimeSeries,
  resolveRegistryColumnsGrouped,
  resolveRegistryMeasureForGroups,
  resolveRegistryMeasuresForKpi,
  materialiseExtendedColumns,
  type DistributionSlice,
} from "./measure-registry-executor";
import type {
  WidgetConfig,
  ChartItemConfig,
  MeasureRef,
  LeaderboardData,
  LeaderboardColumnDef,
  LeaderboardRow,
  PieTableData,
} from "../types/chart-types";
import type { MeasureRegistryState } from "../store/measure-store";
import type { FinancialSlice } from "../store/financialDataStore";
import { encodeGroupColKey } from "./table-utils";
import type { KpiRow, TableColumnDef, TableRow } from "../types/widget-extras";
import { getBucketKey, type bucket } from "./temporal-utils";

// ─── Minimal productwise slice type (out-of-scope datasets) ──────────────────

export type ProductWiseSlice = {
  dailyProductWiseStatement?: any[][] | any[];
  availableProducts?: Array<Record<string, string[]>>;
};

// ─── Color palette (single-group, multi-column) ───────────────────────────────

const PALETTE = [
  "--chart-1", "--chart-2", "--chart-3", "--chart-4",
  "--chart-5", "--chart-6", "--chart-7", "--chart-8",
] as const;

// ─── Dataset helpers ──────────────────────────────────────────────────────────

function resolveSource(datasetId: string, registry: MeasureRegistryState): "financial" | "productwise" {
  const base = registry.baseDatasets.find((d) => d.id === datasetId);
  if (base) return base.source;
  const derived = registry.derivedDatasets.find((d) => d.id === datasetId);
  if (derived) {
    const parent = registry.baseDatasets.find((d) => d.id === derived.sourceDatasetId);
    return parent?.source ?? "financial";
  }
  return "financial";
}

function resolveInterval(datasetId: string, registry: MeasureRegistryState): bucket {
  const derived = registry.derivedDatasets.find((d) => d.id === datasetId);
  return (derived?.granularity ?? "day") as bucket;
}

function getRows(
  datasetId: string,
  groupId: GroupId,
  financialData: Record<GroupId, FinancialSlice>,
  productWiseData: Record<GroupId, ProductWiseSlice>,
  registry: MeasureRegistryState,
): Record<string, unknown>[] {
  if (datasetId === "stats") {
    const stats = financialData[groupId]?.overallStatistics;
    return stats ? [stats as Record<string, unknown>] : [];
  }
  const source = resolveSource(datasetId, registry);
  if (source === "productwise") {
    const stmt = productWiseData[groupId]?.dailyProductWiseStatement ?? [];
    return (Array.isArray(stmt[0]) ? (stmt as unknown[][]).flat() : stmt) as Record<string, unknown>[];
  }
  const slice = financialData[groupId];
  if (!slice) return [];
  return slice.dailyData as Record<string, unknown>[];
}

function getFilteredRows(
  widget: WidgetConfig,
  datasetId: string,
  groupId: GroupId,
  financialData: Record<GroupId, FinancialSlice>,
  productWiseData: Record<GroupId, ProductWiseSlice>,
  registry: MeasureRegistryState,
): Record<string, unknown>[] {
  const rows = getRows(datasetId, groupId, financialData, productWiseData, registry);
  const source = resolveSource(datasetId, registry);
  if (source !== "productwise") return rows;

  const useGlobal = widget.useGlobalProductFilter !== false;
  const effectiveFilter = useGlobal
    ? useGroupsStore.getState().groupContexts[groupId]?.productFilter
    : widget.productFilter;

  if (!effectiveFilter || effectiveFilter.length === 0) return rows;

  const hierarchy = getPrimaryHierarchy(datasetId);
  const leafField = hierarchy?.leafField ?? "instrument";

  const available = new Set(rows.map((r) => String(r[leafField] ?? "")));
  const validFilter = effectiveFilter.filter((v) => available.has(v));
  if (validFilter.length === 0) return rows;

  return rows.filter((row) => validFilter.includes(String(row[leafField] ?? "")));
}

// ─── Label helpers ────────────────────────────────────────────────────────────

function colLabel(fieldKey: string, datasetId: string, registry: MeasureRegistryState): string {
  const ext = registry.extendedColumns.find((c) => c.name === fieldKey && c.datasetId === datasetId);
  if (ext) return ext.label ?? ext.name;
  const baseId = datasetId.split(":")[0];
  const field = DATASET_REGISTRY[baseId]?.fields[fieldKey];
  if (field) return field.label ?? fieldToLabel(field.key);
  return fieldToLabel(fieldKey);
}

function measureLabel(ref: MeasureRef, datasetId: string, registry: MeasureRegistryState): string {
  switch (ref.kind) {
    case "column": return colLabel(ref.name, datasetId, registry);
    case "scalar": {
      const s = registry.scalars.find((sc) => sc.name === ref.name);
      return s?.label ?? s?.name ?? ref.name;
    }
    case "formula": {
      const f = registry.formulas.find((fo) => fo.name === ref.name);
      return f?.label ?? f?.name ?? ref.name;
    }
  }
}

function scalarFormat(scalarName: string, registry: MeasureRegistryState): KpiRow["format"] {
  const scalar = registry.scalars.find((s) => s.name === scalarName);
  if (!scalar) return "number";
  const ext = registry.extendedColumns.find((c) => c.name === scalar.field && c.datasetId === scalar.datasetId);
  if (ext?.valueType === "currency") return "currency";
  if (ext?.valueType === "percent") return "percent";
  const baseId = scalar.datasetId.split(":")[0];
  const field = DATASET_REGISTRY[baseId]?.fields[scalar.field];
  if (field?.valueType === "currency") return "currency";
  if (field?.valueType === "percent") return "percent";
  return "number";
}

const KPI_DIRECTIONAL_FIELDS = new Set(["traderClosingBalance", "accountClosingBalance"]);

function scalarDirectional(scalarName: string, registry: MeasureRegistryState, kpiOverride = false): boolean {
  const scalar = registry.scalars.find((s) => s.name === scalarName);
  if (!scalar) return false;
  if (kpiOverride && KPI_DIRECTIONAL_FIELDS.has(scalar.field)) return true;
  const baseId = scalar.datasetId.split(":")[0];
  const field = DATASET_REGISTRY[baseId]?.fields[scalar.field];
  return field?.directional ?? false;
}

function colFormat(fieldKey: string, datasetId: string, registry: MeasureRegistryState): TableColumnDef["format"] {
  const ext = registry.extendedColumns.find((c) => c.name === fieldKey && c.datasetId === datasetId);
  if (ext?.valueType === "currency") return "currency";
  if (ext?.valueType === "percent") return "percent";
  if (ext?.valueType === "text" || ext?.valueType === "boolean") return "text";
  const baseId = datasetId.split(":")[0];
  const field = DATASET_REGISTRY[baseId]?.fields[fieldKey];
  if (field?.valueType === "currency") return "currency";
  if (field?.valueType === "percent") return "percent";
  if (field?.valueType === "text" || field?.valueType === "boolean") return "text";
  return "number";
}

function colCellMeta(
  fieldKey: string,
  datasetId: string,
  registry: MeasureRegistryState,
): CellMetaSpec | undefined {
  const ext = registry.extendedColumns.find((c) => c.name === fieldKey && c.datasetId === datasetId);
  const fieldMeta = DATASET_REGISTRY[datasetId.split(":")[0]]?.fields[fieldKey];
  const vt = ext?.valueType ?? fieldMeta?.valueType;
  const formatter = fieldMeta?.tooltipFormatter;
  if (formatter) return { kind: "format", formatter };
  if (vt === "text" || vt === "boolean") return { kind: "truncate" };
  return undefined;
}

function applyRanking(
  slices: DistributionSlice[],
  topN?: number,
  sortDir?: "asc" | "desc",
): DistributionSlice[] {
  const ordered = sortDir === "asc" ? [...slices].reverse() : slices;
  return topN ? ordered.slice(0, topN) : ordered;
}

// ─── Time-series path ─────────────────────────────────────────────────────────

function buildTimeSeries(
  widget: WidgetConfig,
  activeGroups: GroupId[],
  groupColorTokens: Record<GroupId, string>,
  financialData: Record<GroupId, FinancialSlice>,
  productWiseData: Record<GroupId, ProductWiseSlice>,
  registry: MeasureRegistryState,
): ChartItemConfig[] {
  const { datasetId = "financial", measures = [], vizType = "line", viewMode = "merged", showLabels } = widget;
  const columnNames = measures.filter((m) => m.kind === "column").map((m) => m.name);
  if (columnNames.length === 0) return [];

  const interval = resolveInterval(datasetId, registry);
  const multiGroup = activeGroups.length > 1;
  const type = vizType === "bar" || vizType === "signed-bar" ? vizType : vizType === "area" ? "area" : "line";

  type Resolved = ReturnType<typeof resolveRegistryColumnsAsTimeSeries>;
  const resolvedByGroup: Record<GroupId, Resolved> = {} as Record<GroupId, Resolved>;
  for (const groupId of activeGroups) {
    const rows = getFilteredRows(widget, datasetId, groupId, financialData, productWiseData, registry);
    resolvedByGroup[groupId] = resolveRegistryColumnsAsTimeSeries(
      columnNames,
      rows,
      { extendedColumns: registry.extendedColumns },
      datasetId,
      interval,
    );
  }

  if (multiGroup && viewMode === "juxtaposed") {
    return activeGroups.map((groupId) => {
      const resolved = resolvedByGroup[groupId];
      const { bucketKeys, bucketLabels } = resolved ?? { bucketKeys: [], bucketLabels: [] };
      const data = bucketKeys.map((_, i) => {
        const row: Record<string, unknown> = { date: bucketLabels[i] };
        for (const col of columnNames) {
          row[col] = resolved?.series[col]?.[i] ?? null;
        }
        return row;
      });
      const groupToken = groupColorTokens[groupId];
      const series = columnNames.map((col) => ({
        key: col,
        label: colLabel(col, datasetId, registry),
        color: `var(${groupToken})`,
      }));
      return {
        id: `${widget.id}_${groupId}`,
        type,
        title: GROUP_LABELS[groupId],
        data,
        xAxis: "date",
        chartConfig: {
          showGrid: true, showXAxis: true, showYAxis: true,
          showLegend: series.length > 1, showLabels: showLabels !== false, series,
        },
      };
    });
  }

  const first = resolvedByGroup[activeGroups[0]];
  const { bucketKeys, bucketLabels } = first ?? { bucketKeys: [], bucketLabels: [] };
  const data = bucketKeys.map((_, i) => {
    const row: Record<string, unknown> = { date: bucketLabels[i] };
    for (const groupId of activeGroups) {
      const resolved = resolvedByGroup[groupId];
      for (const col of columnNames) {
        const key = multiGroup ? `Group${groupId}_${col}` : col;
        row[key] = resolved?.series[col]?.[i] ?? null;
      }
    }
    return row;
  });

  const series: { key: string; label: string; color: string }[] = [];
  for (let gi = 0; gi < activeGroups.length; gi++) {
    const groupId = activeGroups[gi];
    for (let ci = 0; ci < columnNames.length; ci++) {
      const col = columnNames[ci];
      const key = multiGroup ? `Group${groupId}_${col}` : col;
      const label = multiGroup
        ? `${colLabel(col, datasetId, registry)} · ${GROUP_LABELS[groupId]}`
        : colLabel(col, datasetId, registry);
      const colorToken = multiGroup
        ? groupColorTokens[groupId]
        : PALETTE[(gi * columnNames.length + ci) % PALETTE.length];
      const colorOverride = !multiGroup ? widget.measureColors?.[col] : undefined;
      series.push({ key, label, color: colorOverride ?? `var(${colorToken})` });
    }
  }

  return [{
    id: widget.id, type, data, xAxis: "date",
    chartConfig: {
      showGrid: true, showXAxis: true, showYAxis: true,
      showLegend: series.length > 1, showLabels: showLabels !== false, series,
    },
  }];
}

// ─── Data-table path ──────────────────────────────────────────────────────────

const SENTINEL_AGG = {
  entityAggregation: "sum" as const,
  temporalAggregation: "sum" as const,
  footerAggregation: "blank" as const,
};

function parseRowDimension(rowDimension: string | undefined, datasetId: string): {
  timeField: string;
  entityFields: string[];
  tableGroupBy: string;
} {
  if (rowDimension) {
    if (rowDimension === "time") return { timeField: "date", entityFields: [], tableGroupBy: "date" };
    if (rowDimension.startsWith("time+entity:")) {
      const fieldsStr = rowDimension.slice(12);
      const entityFields = fieldsStr.split(",").filter(Boolean);
      const tableGroupBy = entityFields.length > 0 ? `date-${entityFields.join("-")}` : "date";
      return { timeField: "date", entityFields, tableGroupBy };
    }
    return { timeField: "date", entityFields: [], tableGroupBy: "date" };
  }
  const baseId = datasetId.split(":")[0];
  const axes = getEntityAxes(baseId);
  const entityFields = axes
    .map((ax) => {
      const finest = ax.levels[ax.levels.length - 1];
      return finest ? (finest.displayField ?? finest.field) : "";
    })
    .filter(Boolean);
  if (entityFields.length === 0) return { timeField: "date", entityFields: [], tableGroupBy: "date" };
  return { timeField: "date", entityFields, tableGroupBy: `date-${entityFields.join("-")}` };
}

function sentinelColDef(fieldKey: string, datasetId: string, cellMeta?: CellMetaSpec): TableColumnDef {
  const baseId = datasetId.split(":")[0];
  const meta = DATASET_REGISTRY[baseId]?.fields[fieldKey];
  const granularitySuffix = datasetId.split(":")[1];
  const dateGranularity: TableColumnDef["dateGranularity"] | undefined =
    fieldKey === "date"
      ? granularitySuffix === "weekly"  ? "week"
      : granularitySuffix === "monthly" ? "month"
      : granularitySuffix === "yearly"  ? "year"
      : "day"
      : undefined;
  return {
    key: fieldKey,
    label: meta?.label ?? fieldKey,
    expression: fieldKey,
    format: meta?.valueType === "text" || meta?.valueType === "boolean" ? "text" : "number",
    isCustom: false,
    ...SENTINEL_AGG,
    ...(dateGranularity ? { dateGranularity } : {}),
    ...(cellMeta ? { cellMeta } : {}),
  };
}

function resolveAxisFields(datasetId: string, axisLevels?: Record<string, string>): string[] {
  const axes = getEntityAxes(datasetId);
  return axes.map((axis) => {
    const stored = axisLevels?.[axis.id];
    if (stored) return stored;
    const finest = axis.levels[axis.levels.length - 1];
    return finest ? (finest.displayField ?? finest.field) : "";
  }).filter(Boolean);
}

function buildMandatoryDimColDefs(
  _timeField: string,
  activeEntityFields: string[],
  datasetId: string,
  axisLevels?: Record<string, string>,
): TableColumnDef[] {
  const baseId = datasetId.split(":")[0];
  const sentinelMeta = (field: string): CellMetaSpec | undefined => {
    const vt = DATASET_REGISTRY[baseId]?.fields[field]?.valueType;
    if (vt !== "text") return undefined;
    if (field === "instrument" && baseId === "productwise") {
      return activeEntityFields.includes(field)
        ? { kind: "lookup", lookupKey: "product" }
        : { kind: "truncate" };
    }
    return { kind: "truncate" };
  };
  const axisFields = resolveAxisFields(baseId, axisLevels);
  return [
    sentinelColDef("date", datasetId),
    ...axisFields.map((field) => sentinelColDef(field, datasetId, sentinelMeta(field))),
  ];
}

function computeAxisStringsByBucket(
  rawRows: Record<string, unknown>[],
  interval: bucket,
  datasetId: string,
  axisLevels?: Record<string, string>,
): Map<string, Map<string, string>> {
  const baseId = datasetId.split(":")[0];
  const axisFields = resolveAxisFields(baseId, axisLevels);
  const hierarchyLevels = getEntityHierarchy(baseId);
  const displayFieldFallback = new Map<string, string>(
    hierarchyLevels
      .filter((l) => l.displayField)
      .map((l) => [l.displayField!, l.field]),
  );
  const resolveVal = (row: Record<string, unknown>, field: string): string => {
    const v = row[field];
    if (v != null && String(v).trim() !== "" && String(v) !== "undefined") return String(v);
    const fb = displayFieldFallback.get(field);
    return fb && row[fb] != null ? String(row[fb]) : "";
  };
  const result = new Map<string, Map<string, string>>();
  for (const field of axisFields) {
    const bucketSets = new Map<string, Set<string>>();
    for (const row of rawRows) {
      const rawDate = String(row["date"] ?? "");
      const key = getBucketKey(rawDate, interval);
      if (!key) continue;
      const val = resolveVal(row, field);
      if (!val) continue;
      if (!bucketSets.has(key)) bucketSets.set(key, new Set());
      bucketSets.get(key)!.add(val);
    }
    const fieldMap = new Map<string, string>();
    bucketSets.forEach((vals, k) => {
      fieldMap.set(k, Array.from(vals).sort().join(", "));
    });
    result.set(field, fieldMap);
  }
  return result;
}

function buildDimRow(
  bucketKey: string,
  entityFields: string[],
  axisFields: string[],
  axisStringsByBucket: Map<string, Map<string, string>>,
): TableRow {
  const row: TableRow = {};
  const parts = bucketKey.split("\x00");
  const isoDate = parts[0];
  row["date"] = isoDate;
  row._sortKey_date = isoDate;
  axisFields.forEach((field) => {
    const entityIdx = entityFields.indexOf(field);
    if (entityIdx >= 0) {
      row[field] = parts[entityIdx + 1] ?? "";
    } else {
      row[field] = axisStringsByBucket.get(field)?.get(isoDate) ?? axisStringsByBucket.get(field)?.get(bucketKey) ?? "";
    }
  });
  return row;
}

function buildTable(
  widget: WidgetConfig,
  activeGroups: GroupId[],
  groupColorTokens: Record<GroupId, string>,
  financialData: Record<GroupId, FinancialSlice>,
  productWiseData: Record<GroupId, ProductWiseSlice>,
  registry: MeasureRegistryState,
): ChartItemConfig[] {
  const { datasetId = "financial", measures = [], viewMode = "merged", rowDimension, axisLevels, footerAggOverrides = {} } = widget;
  const columnNames = measures.filter((m) => m.kind === "column").map((m) => m.name);
  if (columnNames.length === 0) return [];

  const interval = resolveInterval(datasetId, registry);
  const multiGroup = activeGroups.length > 1;
  const baseId = datasetId.split(":")[0];
  const { timeField, entityFields, tableGroupBy } = parseRowDimension(rowDimension, datasetId);
  const axisFields = resolveAxisFields(baseId, axisLevels);
  const dimColDefs = buildMandatoryDimColDefs(timeField, entityFields, datasetId, axisLevels);

  const metricColDefs: TableColumnDef[] = columnNames.map((col) => {
    const extCol = registry.extendedColumns.find((c) => c.name === col && c.datasetId === datasetId);
    const entityAgg = extCol?.entityAggregation ?? getEntityAgg(col);
    const temporalAgg = extCol?.temporalAggregation ?? getTemporalAgg(col);
    const footerAgg = (footerAggOverrides[col] ?? (extCol ? (extCol.temporalAggregation ?? "sum") : getFooterAgg(col))) as TableColumnDef["footerAggregation"];
    const meta = colCellMeta(col, datasetId, registry);
    const fieldMeta = getFieldMeta(col);
    return {
      key: col,
      label: colLabel(col, datasetId, registry),
      expression: col,
      format: colFormat(col, datasetId, registry),
      directional: fieldMeta?.directional,
      isCustom: false,
      entityAggregation: entityAgg,
      temporalAggregation: temporalAgg,
      footerAggregation: footerAgg,
      ...(meta ? { cellMeta: meta } : {}),
    };
  });

  type Resolved = ReturnType<typeof resolveRegistryColumnsGrouped>;
  const resolvedByGroup: Record<GroupId, Resolved> = {} as Record<GroupId, Resolved>;
  const axisStringsByGroup: Record<GroupId, Map<string, Map<string, string>>> = {} as Record<GroupId, Map<string, Map<string, string>>>;
  const gapColsSet = new Set<string>();

  for (const groupId of activeGroups) {
    const rows = getFilteredRows(widget, datasetId, groupId, financialData, productWiseData, registry);
    resolvedByGroup[groupId] = resolveRegistryColumnsGrouped(
      columnNames, rows, { extendedColumns: registry.extendedColumns }, datasetId,
      { timeField, entityFields, interval },
    );
    axisStringsByGroup[groupId] = computeAxisStringsByBucket(rows, interval, datasetId, axisLevels);
    for (const col of columnNames) {
      if (!gapColsSet.has(col)) {
        const hasGap = rows.some((r) => {
          const v = r[col];
          return v === null || v === undefined || (typeof v === "number" && !Number.isFinite(v));
        });
        if (hasGap) gapColsSet.add(col);
      }
    }
  }

  const tableColumnGaps = gapColsSet.size > 0 ? Array.from(gapColsSet) : undefined;

  if (!multiGroup || viewMode === "juxtaposed") {
    const tableColumnDefs: TableColumnDef[] = [...dimColDefs, ...metricColDefs];
    return activeGroups.map((groupId) => {
      const { bucketKeys, series } = resolvedByGroup[groupId];
      const tableRows: TableRow[] = bucketKeys.map((key) => {
        const row: TableRow = buildDimRow(key, entityFields, axisFields, axisStringsByGroup[groupId]);
        for (const col of columnNames) {
          const idx = resolvedByGroup[groupId].bucketKeys.indexOf(key);
          row[col] = series[col]?.[idx] ?? null;
        }
        return row;
      });
      return {
        id: multiGroup ? `${widget.id}_${groupId}` : widget.id,
        type: "data-table",
        title: multiGroup ? GROUP_LABELS[groupId] : undefined,
        data: [],
        tableRows,
        tableColumnDefs,
        tableColumnGaps,
        tableViewMode: multiGroup ? "juxtaposed" : "merged",
        tableGroupBy,
        chartConfig: { series: [], showLegend: false },
      };
    });
  }

  const mergedColDefs: TableColumnDef[] = [
    ...dimColDefs,
    ...columnNames.flatMap((col) => {
      const extCol = registry.extendedColumns.find((c) => c.name === col && c.datasetId === datasetId);
      const entityAgg = extCol?.entityAggregation ?? getEntityAgg(col);
      const temporalAgg = extCol?.temporalAggregation ?? getTemporalAgg(col);
      const meta = colCellMeta(col, datasetId, registry);
      const fieldMeta = getFieldMeta(col);
      return activeGroups.map((groupId) => {
        const mergedKey = encodeGroupColKey(col, groupId);
        const footerAgg = (footerAggOverrides[mergedKey] ?? footerAggOverrides[col] ?? (extCol ? (extCol.temporalAggregation ?? "sum") : getFooterAgg(col))) as TableColumnDef["footerAggregation"];
        return {
          key: mergedKey, label: colLabel(col, datasetId, registry), expression: col,
          format: colFormat(col, datasetId, registry), directional: fieldMeta?.directional,
          isCustom: false, entityAggregation: entityAgg, temporalAggregation: temporalAgg,
          footerAggregation: footerAgg, ...(meta ? { cellMeta: meta } : {}),
        };
      });
    }),
  ];

  const allBucketKeys = Array.from(
    new Set(activeGroups.flatMap((g) => resolvedByGroup[g].bucketKeys)),
  ).sort();

  const mergedAxisStrings = new Map<string, Map<string, string>>();
  for (const groupId of activeGroups) {
    axisStringsByGroup[groupId]?.forEach((fieldMap, field) => {
      if (!mergedAxisStrings.has(field)) mergedAxisStrings.set(field, new Map());
      fieldMap.forEach((v, k) => {
        if (!mergedAxisStrings.get(field)!.has(k)) mergedAxisStrings.get(field)!.set(k, v);
      });
    });
  }

  const mergedRows: TableRow[] = allBucketKeys.map((bKey) => {
    const row: TableRow = buildDimRow(bKey, entityFields, axisFields, mergedAxisStrings);
    for (const groupId of activeGroups) {
      const { bucketKeys, series } = resolvedByGroup[groupId];
      const idx = bucketKeys.indexOf(bKey);
      for (const col of columnNames) {
        row[encodeGroupColKey(col, groupId)] = idx >= 0 ? (series[col]?.[idx] ?? null) : null;
      }
    }
    return row;
  });

  return [{
    id: widget.id, type: "data-table", data: [], tableRows: mergedRows,
    tableColumnDefs: mergedColDefs, tableColumnGaps, tableViewMode: "merged", tableGroupBy,
    chartConfig: { series: [], showLegend: false },
  }];
}

// ─── KPI path ─────────────────────────────────────────────────────────────────

function buildKpi(
  widget: WidgetConfig,
  activeGroups: GroupId[],
  financialData: Record<GroupId, FinancialSlice>,
  productWiseData: Record<GroupId, ProductWiseSlice>,
  registry: MeasureRegistryState,
): ChartItemConfig[] {
  const { measures = [] } = widget;
  if (measures.length === 0) return [];
  const measureNames = measures.map((m) => m.name);
  const allDatasetIds = Array.from(new Set(registry.scalars.map((s) => s.datasetId)));
  const rowsByDatasetGroup: Record<string, Record<string, unknown>[]> = {};
  for (const dsId of allDatasetIds) {
    for (const groupId of activeGroups) {
      rowsByDatasetGroup[`${dsId}:::Group${groupId}`] = getRows(dsId, groupId, financialData, productWiseData, registry);
    }
  }
  const resolvedByMeasure = resolveRegistryMeasuresForKpi(measureNames, rowsByDatasetGroup, registry);
  const kpiRows: KpiRow[] = measures.map((ref) => ({
    label: measureLabel(ref, "financial", registry),
    format: ref.kind === "scalar" ? scalarFormat(ref.name, registry) : "number",
    directional: ref.kind === "scalar" ? scalarDirectional(ref.name, registry, true) : false,
    groupValues: activeGroups.map((groupId) => ({
      groupId,
      groupLabel: GROUP_LABELS[groupId],
      value: resolvedByMeasure[ref.name]?.[`Group${groupId}`] ?? null,
    })),
  }));
  return [{ id: widget.id, type: "kpi-card", data: [], kpiRows, chartConfig: { series: [], showLegend: false } }];
}

// ─── Gauge donut path ─────────────────────────────────────────────────────────

function buildGaugeDonut(
  widget: WidgetConfig,
  activeGroups: GroupId[],
  groupColorTokens: Record<GroupId, string>,
  financialData: Record<GroupId, FinancialSlice>,
  productWiseData: Record<GroupId, ProductWiseSlice>,
  registry: MeasureRegistryState,
): ChartItemConfig[] {
  const { measures = [], maxValue = 100 } = widget;
  if (measures.length === 0) return [];
  const firstMeasure = measures[0];
  const allDatasetIds = Array.from(new Set(registry.scalars.map((s) => s.datasetId)));
  const rowsByDatasetGroup: Record<string, Record<string, unknown>[]> = {};
  for (const dsId of allDatasetIds) {
    for (const groupId of activeGroups) {
      rowsByDatasetGroup[`${dsId}:::Group${groupId}`] = getRows(dsId, groupId, financialData, productWiseData, registry);
    }
  }
  const resolved = resolveRegistryMeasuresForKpi([firstMeasure.name], rowsByDatasetGroup, registry);
  const valuesByGroup = resolved[firstMeasure.name] ?? {};
  return activeGroups.map((groupId) => {
    const rawValue = valuesByGroup[`Group${groupId}`] ?? 0;
    const overflow = rawValue > maxValue;
    const filled = overflow ? maxValue : rawValue;
    const remainder = maxValue - filled;
    const colorToken = groupColorTokens[groupId];
    return {
      id: `${widget.id}_${groupId}`,
      type: "donut" as const,
      title: activeGroups.length > 1 ? GROUP_LABELS[groupId] : undefined,
      data: [{ name: "filled", value: filled }, { name: "remainder", value: remainder }],
      gaugeOverflow: overflow ? { value: rawValue, maxValue } : undefined,
      chartConfig: {
        showLegend: false,
        series: [
          { key: "filled", label: measureLabel(firstMeasure, "financial", registry), color: `var(${colorToken})` },
          { key: "remainder", label: "Remainder", color: "var(--muted)" },
        ],
      },
    };
  });
}

// ─── Distribution path ────────────────────────────────────────────────────────

function buildDistribution(
  widget: WidgetConfig,
  activeGroups: GroupId[],
  groupColorTokens: Record<GroupId, string>,
  financialData: Record<GroupId, FinancialSlice>,
  productWiseData: Record<GroupId, ProductWiseSlice>,
  registry: MeasureRegistryState,
): ChartItemConfig[] {
  const { datasetId = "financial", measures = [], vizType = "pie", groupByDimension, topN, sortDir, viewMode = "merged" } = widget;
  if (measures.length === 0) return [];
  const firstMeasure = measures[0];
  const rowsByGroup: Record<string, Record<string, unknown>[]> = {};
  for (const groupId of activeGroups) {
    rowsByGroup[`Group${groupId}`] = getFilteredRows(widget, datasetId, groupId, financialData, productWiseData, registry);
  }
  let slicesByGroup: Record<string, DistributionSlice[]> = {};

  if ((firstMeasure.kind === "scalar" || firstMeasure.kind === "formula") && groupByDimension) {
    slicesByGroup = resolveRegistryMeasureForGroups(firstMeasure.name, groupByDimension, rowsByGroup, registry);
  } else if (firstMeasure.kind === "formula") {
    const allDatasetIds = Array.from(new Set(registry.scalars.map((s) => s.datasetId)));
    const rowsByDatasetGroup: Record<string, Record<string, unknown>[]> = {};
    for (const dsId of allDatasetIds) {
      for (const groupId of activeGroups) {
        rowsByDatasetGroup[`${dsId}:::Group${groupId}`] = getRows(dsId, groupId, financialData, productWiseData, registry);
      }
    }
    const resolved = resolveRegistryMeasuresForKpi([firstMeasure.name], rowsByDatasetGroup, registry);
    const valuesByGroup = resolved[firstMeasure.name] ?? {};
    for (const groupId of activeGroups) {
      const tag = `Group${groupId}`;
      slicesByGroup[tag] = [{ label: GROUP_LABELS[groupId], value: valuesByGroup[tag] ?? null }];
    }
  } else {
    return [];
  }

  for (const tag of Object.keys(slicesByGroup)) {
    slicesByGroup[tag] = applyRanking(slicesByGroup[tag], topN, sortDir);
  }

  const multiGroup = activeGroups.length > 1;
  const type = vizType === "bar-h" ? "bar" : vizType;
  const label = measureLabel(firstMeasure, datasetId, registry);
  const isBarH = vizType === "bar-h";

  if (!multiGroup || viewMode === "juxtaposed") {
    return activeGroups.map((groupId) => {
      const slices = slicesByGroup[`Group${groupId}`] ?? [];
      const data = slices.map((s) => ({ name: s.label, value: s.value ?? 0 }));
      return {
        id: multiGroup ? `${widget.id}_${groupId}` : widget.id,
        type: type as ChartItemConfig["type"],
        title: multiGroup ? GROUP_LABELS[groupId] : undefined,
        data, xAxis: "name",
        chartConfig: {
          showGrid: true, showXAxis: true, showYAxis: true, showLabels: true, showLegend: false,
          layout: isBarH ? "vertical" : undefined,
          series: [{ key: "value", label, color: `var(${groupColorTokens[groupId]})` }],
        },
      };
    });
  }

  const allLabels = Array.from(
    new Set(Object.values(slicesByGroup).flatMap((slices) => slices.map((s) => s.label))),
  );
  const data = allLabels.map((lbl) => {
    const row: Record<string, unknown> = { name: lbl };
    for (const groupId of activeGroups) {
      row[`Group${groupId}`] = slicesByGroup[`Group${groupId}`]?.find((s) => s.label === lbl)?.value ?? 0;
    }
    return row;
  });
  const series = activeGroups.map((groupId) => ({
    key: `Group${groupId}`, label: GROUP_LABELS[groupId], color: `var(${groupColorTokens[groupId]})`,
  }));
  return [{
    id: widget.id, type: type as ChartItemConfig["type"], data, xAxis: "name",
    chartConfig: {
      showGrid: true, showXAxis: true, showYAxis: true, showLabels: true, showLegend: true,
      layout: isBarH ? "vertical" : undefined, series,
    },
  }];
}

// ─── Winner-loser path ────────────────────────────────────────────────────────

function buildWinnerLoser(
  widget: WidgetConfig,
  activeGroups: GroupId[],
  financialData: Record<GroupId, FinancialSlice>,
  productWiseData: Record<GroupId, ProductWiseSlice>,
  registry: MeasureRegistryState,
): ChartItemConfig[] {
  const { datasetId = "financial", measures = [], groupByDimension } = widget;
  if (measures.length === 0 || !groupByDimension) return [];
  const firstMeasure = measures[0];
  if (firstMeasure.kind !== "scalar" && firstMeasure.kind !== "formula") return [];
  const rowsByGroup: Record<string, Record<string, unknown>[]> = {};
  for (const groupId of activeGroups) {
    rowsByGroup[`Group${groupId}`] = getFilteredRows(widget, datasetId, groupId, financialData, productWiseData, registry);
  }
  const slicesByGroup = resolveRegistryMeasureForGroups(firstMeasure.name, groupByDimension, rowsByGroup, registry);
  return activeGroups.map((groupId) => {
    const slices = slicesByGroup[`Group${groupId}`] ?? [];
    const winners = slices.filter((s) => (s.value ?? 0) >= 0).sort((a, b) => (b.value ?? 0) - (a.value ?? 0)).map((s) => ({ name: s.label, value: s.value ?? 0 }));
    const losers = slices.filter((s) => (s.value ?? 0) < 0).sort((a, b) => (a.value ?? 0) - (b.value ?? 0)).map((s) => ({ name: s.label, value: s.value ?? 0 }));
    return {
      id: activeGroups.length > 1 ? `${widget.id}_${groupId}` : widget.id,
      type: "winner-loser" as const, data: [],
      winnerLoserData: { winners, losers },
      chartConfig: { series: [] },
    };
  });
}

// ─── Leaderboard path ─────────────────────────────────────────────────────────

function buildLeaderboard(
  widget: WidgetConfig,
  activeGroups: GroupId[],
  financialData: Record<GroupId, FinancialSlice>,
  productWiseData: Record<GroupId, ProductWiseSlice>,
  registry: MeasureRegistryState,
): ChartItemConfig[] {
  const {
    datasetId = "productwise", measures = [], groupByDimension = "instrument",
    streakMeasure, streakCondition, streakN = 5, streakBucket = "day",
  } = widget;
  if (measures.length === 0) return [];

  return activeGroups.map((groupId) => {
    const rows = getFilteredRows(widget, datasetId, groupId, financialData, productWiseData, registry);
    const groupTag = `Group${groupId}`;
    const slicesByMeasure: Record<string, Record<string, number | null>> = {};
    for (const measure of measures) {
      if (measure.kind !== "scalar" && measure.kind !== "formula") continue;
      const result = resolveRegistryMeasureForGroups(measure.name, groupByDimension, { [groupTag]: rows }, registry);
      const slices = result[groupTag] ?? [];
      slicesByMeasure[measure.name] = Object.fromEntries(slices.map((s) => [s.label, s.value]));
    }
    const allLabels = Array.from(new Set(Object.values(slicesByMeasure).flatMap((m) => Object.keys(m))));
    const columnDefs: LeaderboardColumnDef[] = measures
      .filter((m) => m.kind === "scalar" || m.kind === "formula")
      .map((m) => {
        const label = measureLabel(m, datasetId, registry);
        const isPercent = m.kind === "formula" && (m.name.toLowerCase().includes("pct") || m.name.toLowerCase().includes("percent"));
        const format: LeaderboardColumnDef["format"] = isPercent ? "percent" : m.kind === "scalar" ? scalarFormat(m.name, registry) : "number";
        return { name: m.name, label, format, directional: m.kind === "scalar" ? scalarDirectional(m.name, registry) : false };
      });

    let streakByDimension: Record<string, (boolean | null)[]> = {};
    let streakLabel: string | undefined;

    if (streakMeasure && streakCondition) {
      const bucketDimMap = new Map<string, Map<string, number | null>>();
      const allBucketKeys: string[] = [];
      for (const row of rows) {
        const dateVal = row["date"];
        if (!dateVal) continue;
        const bucketKey = getBucketKey(String(dateVal), streakBucket);
        const dimVal = String(row[groupByDimension] ?? "—");
        const fieldVal = row[streakMeasure];
        const numVal = fieldVal !== undefined && fieldVal !== null ? Number(fieldVal) : null;
        if (!bucketDimMap.has(bucketKey)) { bucketDimMap.set(bucketKey, new Map()); allBucketKeys.push(bucketKey); }
        const dimMap = bucketDimMap.get(bucketKey)!;
        const existing = dimMap.get(dimVal);
        dimMap.set(dimVal, existing != null && numVal != null ? existing + numVal : (numVal ?? existing ?? null));
      }
      const recentKeys = Array.from(new Set(allBucketKeys)).sort().slice(-streakN);
      for (const label of allLabels) {
        streakByDimension[label] = recentKeys.map((bk) => {
          const val = bucketDimMap.get(bk)?.get(label) ?? null;
          if (val === null) return null;
          const { op, value: threshold } = streakCondition;
          switch (op) {
            case ">":  return val > threshold;
            case "<":  return val < threshold;
            case ">=": return val >= threshold;
            case "<=": return val <= threshold;
            case "=":  return val === threshold;
            default:   return null;
          }
        });
      }
      streakLabel = `Last ${streakN} · ${streakBucket === "day" ? "Daily" : streakBucket === "week" ? "Weekly" : "Monthly"}`;
    }

    const firstMeasureName = columnDefs[0]?.name;
    const leaderboardRows: LeaderboardRow[] = allLabels
      .map((label) => ({
        label,
        scalars: Object.fromEntries(measures.map((m) => [m.name, slicesByMeasure[m.name]?.[label] ?? null])),
        streak: streakByDimension[label],
      }))
      .sort((a, b) => {
        const av = firstMeasureName ? (a.scalars[firstMeasureName] ?? null) : null;
        const bv = firstMeasureName ? (b.scalars[firstMeasureName] ?? null) : null;
        if (av === null && bv === null) return 0;
        if (av === null) return 1;
        if (bv === null) return -1;
        return bv - av;
      });

    const leaderboardData: LeaderboardData = { columnDefs, rows: leaderboardRows, streakN: streakMeasure ? streakN : undefined, streakLabel };
    return {
      id: activeGroups.length > 1 ? `${widget.id}_${groupId}` : widget.id,
      type: "leaderboard" as const, data: [], leaderboardData,
      chartConfig: { series: [] },
    };
  });
}

// ─── Heatmap path ─────────────────────────────────────────────────────────────

function buildHeatmap(
  widget: WidgetConfig,
  activeGroups: GroupId[],
  groupColorTokens: Record<GroupId, string>,
  financialData: Record<GroupId, FinancialSlice>,
  registry: MeasureRegistryState,
): ChartItemConfig[] {
  const { measures = [], datasetId = "financial" } = widget;
  const columnMeasures = measures.filter((m) => m.kind === "column");
  const effectiveMeasures =
    columnMeasures.length > 0 ? columnMeasures
    : widget.heatmapMeasure ? [widget.heatmapMeasure]
    : [{ kind: "column" as const, name: "netPLExclRebatesAndCharges" }];

  const multiGroup = activeGroups.length > 1;
  const extendedCols = registry.extendedColumns.filter((c) => c.datasetId === datasetId);

  return effectiveMeasures.flatMap((measureRef) => {
    const metricField = measureRef.name;
    const metricLabel =
      registry.extendedColumns.find((c) => c.name === metricField)?.label ??
      getFieldMeta(metricField)?.label ?? metricField;

    return activeGroups.map((groupId) => {
      const rawRows = (financialData[groupId]?.dailyData ?? []) as Record<string, unknown>[];
      const rows = extendedCols.length > 0 ? materialiseExtendedColumns(rawRows, extendedCols, datasetId) : rawRows;
      const data = rows.map((row) => ({ date: String(row["date"] ?? ""), value: Number(row[metricField] ?? 0) })).filter((r) => !!r.date);
      const id = [widget.id, metricField, multiGroup ? groupId : null].filter(Boolean).join("_");
      return {
        id, type: "heatmap" as const,
        title: multiGroup ? `${metricLabel} · ${GROUP_LABELS[groupId]}` : metricLabel,
        field: metricField, data,
        groupColorToken: groupColorTokens[groupId],
        chartConfig: { series: [], showLegend: false },
      };
    });
  });
}

// ─── Pie-table path ───────────────────────────────────────────────────────────

function buildPieTable(
  widget: WidgetConfig,
  activeGroups: GroupId[],
  financialData: Record<GroupId, FinancialSlice>,
  productWiseData: Record<GroupId, ProductWiseSlice>,
  registry: MeasureRegistryState,
): ChartItemConfig[] {
  const { datasetId = "productwise", pieMeasure, tableColumns = [], groupByDimension = "asset", childDimension = "instrument", topN, sortDir } = widget;
  if (!pieMeasure) return [];
  const groupId = activeGroups[0];
  if (!groupId) return [];
  const rows = getFilteredRows(widget, datasetId, groupId, financialData, productWiseData, registry);
  const groupTag = `Group${groupId}`;
  const pieMeasureName = pieMeasure.name;
  const rawPieSlices = resolveRegistryMeasureForGroups(pieMeasureName, groupByDimension, { [groupTag]: rows }, registry)[groupTag] ?? [];
  const pieSlices = applyRanking(rawPieSlices, topN, sortDir).map((s) => ({ label: s.label, value: s.value ?? 0 }));
  const slicesByMeasure: Record<string, Record<string, number | null>> = {};
  for (const measure of tableColumns) {
    if (measure.kind !== "scalar" && measure.kind !== "formula") continue;
    const result = resolveRegistryMeasureForGroups(measure.name, childDimension, { [groupTag]: rows }, registry);
    slicesByMeasure[measure.name] = Object.fromEntries((result[groupTag] ?? []).map((s) => [s.label, s.value]));
  }
  const childToParent = new Map<string, string>();
  for (const row of rows) {
    const child = String(row[childDimension] ?? "");
    const parent = String(row[groupByDimension] ?? "");
    if (child && parent && !childToParent.has(child)) childToParent.set(child, parent);
  }
  const allChildLabels = Array.from(new Set(Object.values(slicesByMeasure).flatMap((m) => Object.keys(m))));
  const columnDefs: LeaderboardColumnDef[] = tableColumns
    .filter((m) => m.kind === "scalar" || m.kind === "formula")
    .map((m) => {
      const label = measureLabel(m, datasetId, registry);
      const isPercent = m.kind === "formula" && (m.name.toLowerCase().includes("pct") || m.name.toLowerCase().includes("percent"));
      return { name: m.name, label, format: isPercent ? "percent" : m.kind === "scalar" ? scalarFormat(m.name, registry) : "number" as const, directional: m.kind === "scalar" ? scalarDirectional(m.name, registry) : false };
    });
  const firstColName = columnDefs[0]?.name;
  const leaderboardRows = allChildLabels
    .map((label) => ({ label, scalars: Object.fromEntries(tableColumns.map((m) => [m.name, slicesByMeasure[m.name]?.[label] ?? null])), parentLabel: childToParent.get(label) ?? "" }))
    .sort((a, b) => {
      const av = firstColName ? (a.scalars[firstColName] ?? null) : null;
      const bv = firstColName ? (b.scalars[firstColName] ?? null) : null;
      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;
      return bv - av;
    });
  const pieTableData: PieTableData = { pieSlices, columnDefs, rows: leaderboardRows };
  return [{ id: widget.id, type: "pie-table" as ChartItemConfig["type"], data: [], pieTableData, chartConfig: { series: [] } }];
}

// ─── Public entry point ───────────────────────────────────────────────────────

/**
 * Converts a V2 WidgetConfig into ChartItemConfig[] for chart renderers.
 *
 * Pass `activeGroupsOverride: ["A"]` for the Financial View (single-group).
 * Pass `productWiseData: {}` when productwise datasets are not in scope.
 */
export function buildChartsFromV2Config(
  widget: WidgetConfig,
  financialData: Record<GroupId, FinancialSlice>,
  productWiseData: Record<GroupId, ProductWiseSlice>,
  registry: MeasureRegistryState,
  activeGroupsOverride?: GroupId[],
): ChartItemConfig[] {
  const { vizType, measures = [] } = widget;
  const noMeasuresOk = vizType === "heatmap" || vizType === "pie-table";
  if (!vizType || (measures.length === 0 && !noMeasuresOk)) return [];

  const activeGroups = activeGroupsOverride ?? useGroupsStore.getState().activeGroups;
  const groupColorTokens = useGroupColorStore.getState().colors;

  switch (vizType) {
    case "line":
    case "area":
    case "bar":
    case "signed-bar":
      return buildTimeSeries(widget, activeGroups, groupColorTokens, financialData, productWiseData, registry);
    case "data-table":
      return buildTable(widget, activeGroups, groupColorTokens, financialData, productWiseData, registry);
    case "kpi-card":
      return buildKpi(widget, activeGroups, financialData, productWiseData, registry);
    case "bar-h":
    case "pie":
      return buildDistribution(widget, activeGroups, groupColorTokens, financialData, productWiseData, registry);
    case "donut":
      return buildGaugeDonut(widget, activeGroups, groupColorTokens, financialData, productWiseData, registry);
    case "heatmap":
      return buildHeatmap(widget, activeGroups, groupColorTokens, financialData, registry);
    case "winner-loser":
      return buildWinnerLoser(widget, activeGroups, financialData, productWiseData, registry);
    case "leaderboard":
      return buildLeaderboard(widget, activeGroups, financialData, productWiseData, registry);
    case "pie-table":
      return buildPieTable(widget, activeGroups, financialData, productWiseData, registry);
    default:
      return [];
  }
}
