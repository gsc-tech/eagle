export type ChartQuery = {
  dataset: "financial" | "stats" | "productwise";
  aggregationSpec?: import("./aggregation-spec").AggregationSpec;
  metric?: string;
  chart: "line" | "area" | "bar" | "pie" | "donut" | "kpi-card" | "table" | "heatmap";
  dimension: "time" | "category" | "distribution" | "per-group-stat" | "cross-group-stat" | "ranked" | "product-bar"
           | "kpi"
           | "tabular"
           | "heatmap";
  measures?: import("./measure").Measure[];
  registryMeasures?: string[];
  registryDataset?: string;
  registryColumns?: string[];
  registryScalar?: string;
  registryDistribution?: string;
  metrics?: string[];
  topN?: number;
  viewMode?: "merged" | "juxtaposed";
  sortMetric?: string;
  sortDir?: "asc" | "desc";
  productFilter?: string[];
  bucket?: "day" | "week" | "month" | "year";
  bucketAgg?: string;
  transform?: string;
  windowSize?: number;
  riskFreeRate?: number;
  groupBy?: string;
  title?: string;
  showLegend?: boolean;
  showGrid?: boolean;
  showXAxis?: boolean;
  showYAxis?: boolean;
  showLabels?: boolean;
  layout?: "vertical" | "horizontal";
  heatmapMetric?: string;
  heatmapScaleType?: "symlog" | "linear" | "sqrt" | "quantile";
  heatmapColorMode?: "group" | "pnl";
  kpiFormat?: "currency" | "percent" | "number";
  tableColumns?: import("../types/widget-extras").TableColumnDef[];
  tableViewMode?: "merged" | "juxtaposed";
  tableBucket?: "day" | "week" | "month" | "year";
  tableGroupBy?: "date" | "instrument" | "asset" | "date-instrument" | "date-asset" | "date-account";
};
