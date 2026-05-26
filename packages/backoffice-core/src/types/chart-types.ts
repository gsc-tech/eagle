import type { KpiRow, TableColumnDef, TableRow } from "./widget-extras";

export type WidgetType =
  | "area"
  | "line"
  | "pie"
  | "donut"
  | "multi"
  | "bar"
  | "signed-bar"
  | "kpi-card"
  | "data-table"
  | "heatmap"
  | "winner-loser"
  | "leaderboard"
  | "pie-table";

export type Bucket = "day" | "week" | "month" | "year";

export type BucketAgg = "sum" | "mean" | "count" | "min" | "max" | "median";

export type SeriesTransform =
  | "none"
  | "cumulative"
  | "rolling_mean"
  | "rolling_sum"
  | "rolling_min"
  | "rolling_max"
  | "rolling_median"
  | "sharpe"
  | "expanding_sharpe"
  | "drawdown"
  | "drawdown_abs"
  | "expanding_max";

export interface LeaderboardColumnDef {
  name: string;
  label: string;
  format: "currency" | "percent" | "number";
  directional?: boolean;
}

export interface LeaderboardRow {
  label: string;
  scalars: Record<string, number | null>;
  streak?: (boolean | null)[];
}

export interface LeaderboardData {
  columnDefs: LeaderboardColumnDef[];
  rows: LeaderboardRow[];
  streakN?: number;
  streakLabel?: string;
}

export interface PieTableData {
  pieSlices: { label: string; value: number }[];
  columnDefs: LeaderboardColumnDef[];
  rows: (LeaderboardRow & { parentLabel: string })[];
}

export interface ChartItemConfig {
  id: string;
  type: WidgetType;
  title?: string;
  data: any[];
  datasetId?: string;
  field?: string;
  bucket?: Bucket;
  bucketAgg?: BucketAgg;
  transform?: SeriesTransform;
  windowSize?: number;
  riskFreeRate?: number;
  xAxis?: string;
  groupBy?: string;
  valueFormat?: "number" | "percent";
  cellColors?: string[];
  groupColorToken?: string;
  viewMode?: "merged" | "juxtaposed";
  chartConfig: {
    showLegend?: boolean;
    showGrid?: boolean;
    showXAxis?: boolean;
    showYAxis?: boolean;
    showLabels?: boolean;
    layout?: "vertical" | "horizontal";
    series: {
      key: string;
      label: string;
      color: string;
    }[];
  };
  gaugeOverflow?: { value: number; maxValue: number };
  winnerLoserData?: {
    winners: { name: string; value: number }[];
    losers: { name: string; value: number }[];
  };
  leaderboardData?: LeaderboardData;
  pieTableData?: PieTableData;
  kpiRows?: KpiRow[];
  tableColumnDefs?: TableColumnDef[];
  tableRows?: TableRow[];
  tableColumnGaps?: string[];
  tableViewMode?: "merged" | "juxtaposed";
  tableGroupBy?: string;
}

export interface MeasureRef {
  kind: "column" | "scalar" | "formula";
  name: string;
}

export type VizTypeV2 =
  | "line"
  | "area"
  | "bar"
  | "signed-bar"
  | "bar-h"
  | "pie"
  | "donut"
  | "kpi-card"
  | "data-table"
  | "heatmap"
  | "winner-loser"
  | "leaderboard"
  | "pie-table";

export interface WidgetConfig {
  id: string;
  title: string;
  description?: string;
  w: number;
  h: number;
  x: number;
  y: number;
  kpiColumns?: number;
  kpiAutoColumns?: boolean;
  kpiHideColumnPicker?: boolean;
  version?: "v2";
  vizType?: VizTypeV2;
  datasetId?: string;
  measures?: MeasureRef[];
  groupByDimension?: string;
  rowDimension?: string;
  axisLevels?: Record<string, string>;
  topN?: number;
  sortDir?: "asc" | "desc";
  viewMode?: "merged" | "juxtaposed";
  maxValue?: number;
  productFilter?: string[];
  useGlobalProductFilter?: boolean;
  heatmapColorMode?: "pnl" | "group";
  heatmapMeasure?: MeasureRef;
  showLabels?: boolean;
  defaultTopN?: number;
  showGroupByToggle?: boolean;
  showProductFilter?: boolean;
  footerAggOverrides?: Record<string, string>;
  measureColors?: Record<string, string>;
  autoTitle?: boolean;
  pieMeasure?: MeasureRef;
  tableColumns?: MeasureRef[];
  childDimension?: string;
  streakMeasure?: string;
  streakCondition?: { op: ">" | "<" | ">=" | "<=" | "="; value: number };
  streakN?: number;
  streakBucket?: "day" | "week" | "month";
}

export interface BreakpointLayoutItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
}
