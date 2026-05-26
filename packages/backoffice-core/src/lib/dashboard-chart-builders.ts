import { ChartQuery } from "./chart-query";
import { TableColumnDef } from "../types/widget-extras";
import { Measure } from "./measure";

const SENTINEL_AGG = { entityAggregation: "sum", temporalAggregation: "sum", footerAggregation: "blank" } as const;

const FA = { entityAggregation: "sum", temporalAggregation: "sum", footerAggregation: "sum" } as const;

const SA_MARGIN = { entityAggregation: "sum", temporalAggregation: "max", footerAggregation: "max" } as const;

export const DEFAULT_TABLE_COLUMNS: TableColumnDef[] = [
  { key: "date",     label: "Date",    expression: "date",     format: "number",   isCustom: false, ...SENTINEL_AGG },
  { key: "nickname", label: "Account", expression: "nickname", format: "number",   isCustom: false, ...SENTINEL_AGG },
  { key: "netPL",    label: "Net P&L", expression: "netPL",    format: "currency", isCustom: false, ...FA },
  { key: "margin",   label: "Margin",  expression: "abs(margin)", format: "currency", isCustom: false, ...SA_MARGIN },
  { key: "volume",   label: "Volume",  expression: "volume",   format: "number",   isCustom: false, ...FA },
  { key: "charges",  label: "Charges", expression: "abs(charges)", format: "currency", isCustom: false, ...FA },
];

export const DEFAULT_PRODUCTWISE_TABLE_COLUMNS: TableColumnDef[] = [
  { key: "date", label: "Date", expression: "date", format: "number", isCustom: false, ...SENTINEL_AGG },
  { key: "netPL", label: "Net P&L", expression: "netPL", format: "currency", isCustom: false, ...FA },
  { key: "grossPL", label: "Gross P&L", expression: "grossPL", format: "currency", isCustom: false, ...FA },
  { key: "volume", label: "Volume", expression: "volume", format: "number", isCustom: false, ...FA },
  { key: "roundTurn", label: "Round Turn", expression: "roundTurn", format: "number", isCustom: false, ...FA },
];

export const DEFAULT_PRODUCTWISE_DATE_INSTRUMENT_COLUMNS: TableColumnDef[] = [
  { key: "date", label: "Date", expression: "date", format: "number", isCustom: false, ...SENTINEL_AGG },
  { key: "instrument", label: "Instrument", expression: "instrument", format: "number", isCustom: false, ...SENTINEL_AGG },
  { key: "netPL", label: "Net P&L", expression: "netPL", format: "currency", isCustom: false, ...FA },
  { key: "grossPL", label: "Gross P&L", expression: "grossPL", format: "currency", isCustom: false, ...FA },
  { key: "volume", label: "Volume", expression: "volume", format: "number", isCustom: false, ...FA },
];

export const DEFAULT_PRODUCTWISE_DATE_ASSET_COLUMNS: TableColumnDef[] = [
  { key: "date", label: "Date", expression: "date", format: "number", isCustom: false, ...SENTINEL_AGG },
  { key: "asset", label: "Asset", expression: "asset", format: "number", isCustom: false, ...SENTINEL_AGG },
  { key: "netPL", label: "Net P&L", expression: "netPL", format: "currency", isCustom: false, ...FA },
  { key: "grossPL", label: "Gross P&L", expression: "grossPL", format: "currency", isCustom: false, ...FA },
  { key: "volume", label: "Volume", expression: "volume", format: "number", isCustom: false, ...FA },
];

export const DEFAULT_PRODUCTWISE_INSTRUMENT_COLUMNS: TableColumnDef[] = [
  { key: "instrument", label: "Instrument", expression: "instrument", format: "number", isCustom: false, ...SENTINEL_AGG },
  { key: "netPL", label: "Net P&L", expression: "netPL", format: "currency", isCustom: false, ...FA },
  { key: "grossPL", label: "Gross P&L", expression: "grossPL", format: "currency", isCustom: false, ...FA },
  { key: "volume", label: "Volume", expression: "volume", format: "number", isCustom: false, ...FA },
  { key: "roundTurn", label: "Round Turn", expression: "roundTurn", format: "number", isCustom: false, ...FA },
];

export const DEFAULT_PRODUCTWISE_ASSET_COLUMNS: TableColumnDef[] = [
  { key: "asset", label: "Asset Class", expression: "asset", format: "number", isCustom: false, ...SENTINEL_AGG },
  { key: "netPL", label: "Net P&L", expression: "netPL", format: "currency", isCustom: false, ...FA },
  { key: "grossPL", label: "Gross P&L", expression: "grossPL", format: "currency", isCustom: false, ...FA },
  { key: "volume", label: "Volume", expression: "volume", format: "number", isCustom: false, ...FA },
  { key: "roundTurn", label: "Round Turn", expression: "roundTurn", format: "number", isCustom: false, ...FA },
];

export function buildPnLQueries(): ChartQuery[] {
  return [
    {
      dataset: "financial",
      metric: "netPLExclRebatesAndCharges",
      chart: "area",
      dimension: "time",
      bucket: "day",
      bucketAgg: "sum",
      transform: "cumulative",
      showLegend: true,
      showGrid: true,
      showXAxis: true,
      showYAxis: true,
    },
  ];
}

export function buildMarginQueries(): ChartQuery[] {
  return [
    {
      dataset: "financial",
      metric: "abs(margin)",
      chart: "line",
      dimension: "time",
      bucket: "day",
      bucketAgg: "sum",
      transform: "none",
      showLegend: true,
      showGrid: true,
      showXAxis: true,
      showYAxis: true,
    },
  ];
}

export function buildWinDonutQueries(): ChartQuery[] {
  return [
    {
      dataset: "stats",
      metric: "winPercentage",
      chart: "donut",
      dimension: "per-group-stat",
      showLegend: false,
    },
  ];
}

export function buildAvgProfitQueries(): ChartQuery[] {
  return [
    {
      dataset: "stats",
      metric: "avgWin",
      metrics: ["avgWinDay", "avgWinWeek"],
      chart: "bar",
      dimension: "cross-group-stat",
      showLegend: true,
      showGrid: true,
      showXAxis: true,
      showYAxis: true,
    },
  ];
}

export function buildAvgLossQueries(): ChartQuery[] {
  return [
    {
      dataset: "stats",
      metric: "avgLoss",
      metrics: ["avgLossDay", "avgLossWeek"],
      chart: "bar",
      dimension: "cross-group-stat",
      showLegend: true,
      showGrid: true,
      showXAxis: true,
      showYAxis: true,
    },
  ];
}

export function buildProductNetPLQueries(): ChartQuery[] {
  return [
    {
      dataset: "productwise",
      metric: "netPL",
      chart: "bar",
      dimension: "ranked",
      topN: 10,
      showLegend: true,
      showGrid: true,
      showXAxis: true,
      showYAxis: true,
      layout: "vertical",
      viewMode: "juxtaposed",
    },
  ];
}

export function buildProfitFactorQueries(): ChartQuery[] {
  return [
    {
      dataset: "stats",
      metric: "profitFactor",
      metrics: ["profitFactorDay", "profitFactorWeek"],
      chart: "bar",
      dimension: "cross-group-stat",
      showLegend: true,
      showGrid: true,
      showXAxis: true,
      showYAxis: true,
      layout: "vertical",
    },
  ];
}

export function buildKpiQueries(): ChartQuery[] {
  return [
    { dataset: "financial", metric: "netPL", chart: "kpi-card", dimension: "kpi", kpiFormat: "currency" },
    {
      dataset: "financial",
      metric: "netPLExclRebatesAndCharges",
      chart: "kpi-card",
      dimension: "kpi",
      kpiFormat: "currency",
    },
    { dataset: "financial", metric: "margin", chart: "kpi-card", dimension: "kpi", kpiFormat: "currency" },
    { dataset: "financial", metric: "volume", chart: "kpi-card", dimension: "kpi", kpiFormat: "number" },
    { dataset: "stats", metric: "winPercentage", chart: "kpi-card", dimension: "kpi", kpiFormat: "percent" },
    { dataset: "stats", metric: "profitFactorDay", chart: "kpi-card", dimension: "kpi", kpiFormat: "number" },
  ];
}

export function buildSummaryTableQueries(): ChartQuery[] {
  return [
    {
      dataset: "financial",
      metric: "netPL",
      chart: "table",
      dimension: "tabular",
      tableBucket: "day",
      tableViewMode: "merged",
      tableColumns: DEFAULT_TABLE_COLUMNS,
    },
  ];
}

export function buildHeatmapQueries(): ChartQuery[] {
  return [
    {
      dataset: "financial",
      metric: "netPLExclRebatesAndCharges",
      chart: "heatmap",
      dimension: "time",
      heatmapMetric: "netPLExclRebatesAndCharges",
      heatmapScaleType: "symlog",
      heatmapColorMode: "pnl",
    },
  ];
}

export function buildPLVolumeRatioKpiQueries(): ChartQuery[] {
  const measures: Measure[] = [
    {
      kind: "scalar",
      name: "netPL",
      label: "Net P&L (sum)",
      field: "netPL",
      aggregation: "sum",
      visible: false,
    },
    {
      kind: "scalar",
      name: "volume",
      label: "Volume (sum)",
      field: "volume",
      aggregation: "sum",
      visible: false,
    },
    {
      kind: "formula",
      name: "ratio",
      label: "P&L / Volume",
      expression: "netPL / volume",
      visible: true,
    },
  ];

  return [
    {
      dataset: "financial",
      metric: "netPL",
      chart: "kpi-card",
      dimension: "kpi",
      kpiFormat: "number",
      title: "P&L / Volume",
      measures,
    },
  ];
}
