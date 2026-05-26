import { BucketAgg, SeriesTransform } from "../types/chart-types";

export type FieldValueType = "number" | "currency" | "percent" | "text" | "boolean" | "date";

export type FieldAggregation =
  | BucketAgg
  | "first"
  | "last"
  | "blank"
  | "concat"
  | "count_distinct"
  | "mode"
  | "and"
  | "or";

export const NUMERIC_AGGREGATIONS = new Set<FieldAggregation>([
  "sum",
  "mean",
  "count",
  "min",
  "max",
  "median",
  "first",
  "last",
]);

export const VALID_AGGS_BY_VALUE_TYPE: Record<FieldValueType, FieldAggregation[]> = {
  number: ["sum", "mean", "min", "max", "count", "count_distinct", "median", "first", "last"],
  currency: ["sum", "mean", "min", "max", "count", "median", "first", "last"],
  percent: ["mean", "min", "max", "median", "first", "last"],
  text: ["concat", "count", "count_distinct", "first", "last", "mode"],
  boolean: ["and", "or", "count", "first", "last"],
  date: ["first", "last", "count"],
};

export type MeasureKind =
  | "fully-additive"
  | "semi-additive"
  | "non-additive"
  | "dimension";

export interface FieldMeta {
  key: string;
  label: string;
  kind: MeasureKind;
  valueType?: FieldValueType;
  entityAggregation?: FieldAggregation;
  allowedEntityAggregations?: FieldAggregation[];
  temporalAggregation?: FieldAggregation;
  allowedTemporalAggregations?: FieldAggregation[];
  footerAggregation?: FieldAggregation;
  allowedTransforms?: SeriesTransform[];
  postTransformFooterAgg?: Partial<Record<SeriesTransform, FieldAggregation>>;
  unit?: "currency" | "percent" | "ratio" | "count" | "volume";
  description?: string;
  directional?: boolean;
  roles?: ("admin" | "user")[];
  tooltipFormatter?: string;
}

const STANDARD_POST_TRANSFORM_FOOTER: Partial<Record<SeriesTransform, FieldAggregation>> = {
  cumulative: "last",
  rolling_mean: "mean",
  rolling_sum: "last",
  rolling_min: "min",
  rolling_max: "max",
  rolling_median: "last",
  sharpe: "last",
  drawdown: "last",
  none: undefined,
};

const FULLY_ADDITIVE_TRANSFORMS: SeriesTransform[] = [
  "none",
  "cumulative",
  "rolling_mean",
  "rolling_sum",
  "rolling_min",
  "rolling_max",
  "rolling_median",
  "sharpe",
  "drawdown",
];

const SEMI_ADDITIVE_TRANSFORMS: SeriesTransform[] = [
  "none",
  "rolling_mean",
  "rolling_max",
  "rolling_min",
  "rolling_median",
];

const NON_ADDITIVE_TRANSFORMS: SeriesTransform[] = [
  "none",
  "rolling_mean",
  "rolling_median",
];

const FINANCIAL_FIELDS: Record<string, FieldMeta> = {
  netPL: {
    key: "netPL",
    label: "Net P&L",
    kind: "fully-additive",
    valueType: "currency",
    directional: true,
    entityAggregation: "sum",
    allowedEntityAggregations: ["sum"],
    temporalAggregation: "sum",
    allowedTemporalAggregations: ["sum", "mean"],
    footerAggregation: "sum",
    allowedTransforms: FULLY_ADDITIVE_TRANSFORMS,
    postTransformFooterAgg: STANDARD_POST_TRANSFORM_FOOTER,
    unit: "currency",
    description: "Net profit and loss including all costs",
  },

  netPLExclRebatesAndCharges: {
    key: "netPLExclRebatesAndCharges",
    label: "Net P&L (Ex. R&C)",
    kind: "fully-additive",
    valueType: "currency",
    directional: true,
    entityAggregation: "sum",
    allowedEntityAggregations: ["sum"],
    temporalAggregation: "sum",
    allowedTemporalAggregations: ["sum", "mean"],
    footerAggregation: "sum",
    allowedTransforms: FULLY_ADDITIVE_TRANSFORMS,
    postTransformFooterAgg: STANDARD_POST_TRANSFORM_FOOTER,
    unit: "currency",
    description: "Net P&L excluding rebates and charges",
  },

  grossPL: {
    key: "grossPL",
    label: "Gross P&L",
    kind: "fully-additive",
    valueType: "currency",
    directional: true,
    entityAggregation: "sum",
    allowedEntityAggregations: ["sum"],
    temporalAggregation: "sum",
    allowedTemporalAggregations: ["sum", "mean"],
    footerAggregation: "sum",
    allowedTransforms: FULLY_ADDITIVE_TRANSFORMS,
    postTransformFooterAgg: STANDARD_POST_TRANSFORM_FOOTER,
    unit: "currency",
    description: "Gross profit and loss before costs",
  },

  transCost: {
    key: "transCost",
    label: "Trans Cost",
    kind: "fully-additive",
    valueType: "currency",
    entityAggregation: "sum",
    allowedEntityAggregations: ["sum"],
    temporalAggregation: "sum",
    allowedTemporalAggregations: ["sum", "mean"],
    footerAggregation: "sum",
    allowedTransforms: FULLY_ADDITIVE_TRANSFORMS,
    postTransformFooterAgg: STANDARD_POST_TRANSFORM_FOOTER,
    unit: "currency",
    description: "Total transaction costs (commissions + fees)",
  },

  charges: {
    key: "charges",
    label: "Charges",
    kind: "fully-additive",
    valueType: "currency",
    entityAggregation: "sum",
    allowedEntityAggregations: ["sum"],
    temporalAggregation: "sum",
    allowedTemporalAggregations: ["sum", "mean"],
    footerAggregation: "sum",
    allowedTransforms: FULLY_ADDITIVE_TRANSFORMS,
    postTransformFooterAgg: STANDARD_POST_TRANSFORM_FOOTER,
    unit: "currency",
    description: "Exchange and clearing charges",
  },

  rebates: {
    key: "rebates",
    label: "Rebates",
    kind: "fully-additive",
    valueType: "currency",
    entityAggregation: "sum",
    allowedEntityAggregations: ["sum"],
    temporalAggregation: "sum",
    allowedTemporalAggregations: ["sum", "mean"],
    footerAggregation: "sum",
    allowedTransforms: FULLY_ADDITIVE_TRANSFORMS,
    postTransformFooterAgg: STANDARD_POST_TRANSFORM_FOOTER,
    unit: "currency",
    description: "Liquidity rebates received",
  },

  volume: {
    key: "volume",
    label: "Volume",
    kind: "fully-additive",
    valueType: "number",
    entityAggregation: "sum",
    allowedEntityAggregations: ["sum"],
    temporalAggregation: "sum",
    allowedTemporalAggregations: ["sum", "mean"],
    footerAggregation: "sum",
    allowedTransforms: FULLY_ADDITIVE_TRANSFORMS,
    postTransformFooterAgg: STANDARD_POST_TRANSFORM_FOOTER,
    unit: "volume",
    description: "Total trading volume",
  },

  buyQty: {
    key: "buyQty",
    label: "Buy Qty",
    kind: "fully-additive",
    valueType: "number",
    entityAggregation: "sum",
    allowedEntityAggregations: ["sum"],
    temporalAggregation: "sum",
    allowedTemporalAggregations: ["sum", "mean"],
    footerAggregation: "sum",
    allowedTransforms: FULLY_ADDITIVE_TRANSFORMS,
    postTransformFooterAgg: STANDARD_POST_TRANSFORM_FOOTER,
    unit: "volume",
    description: "Total buy quantity",
  },

  sellQty: {
    key: "sellQty",
    label: "Sell Qty",
    kind: "fully-additive",
    valueType: "number",
    entityAggregation: "sum",
    allowedEntityAggregations: ["sum"],
    temporalAggregation: "sum",
    allowedTemporalAggregations: ["sum", "mean"],
    footerAggregation: "sum",
    allowedTransforms: FULLY_ADDITIVE_TRANSFORMS,
    postTransformFooterAgg: STANDARD_POST_TRANSFORM_FOOTER,
    unit: "volume",
    description: "Total sell quantity",
  },

  roundTurn: {
    key: "roundTurn",
    label: "Round Turns",
    kind: "fully-additive",
    valueType: "number",
    entityAggregation: "sum",
    allowedEntityAggregations: ["sum"],
    temporalAggregation: "sum",
    allowedTemporalAggregations: ["sum", "mean"],
    footerAggregation: "sum",
    allowedTransforms: FULLY_ADDITIVE_TRANSFORMS,
    postTransformFooterAgg: STANDARD_POST_TRANSFORM_FOOTER,
    unit: "count",
    description: "Number of completed round-trip trades",
    roles: ["admin"],
  },

  margin: {
    key: "margin",
    label: "Margin",
    kind: "semi-additive",
    valueType: "currency",
    entityAggregation: "sum",
    allowedEntityAggregations: ["sum", "max"],
    temporalAggregation: "max",
    allowedTemporalAggregations: ["max", "mean", "min"],
    footerAggregation: "max",
    allowedTransforms: SEMI_ADDITIVE_TRANSFORMS,
    postTransformFooterAgg: STANDARD_POST_TRANSFORM_FOOTER,
    unit: "currency",
    description: "Margin / capital at risk. Peak exposure within each time bucket.",
  },

  accountClosingBalance: {
    key: "accountClosingBalance",
    label: "Account Closing Balance",
    kind: "semi-additive",
    valueType: "currency",
    entityAggregation: "sum",
    allowedEntityAggregations: ["sum"],
    temporalAggregation: "last",
    allowedTemporalAggregations: ["last", "mean", "max", "min"],
    footerAggregation: "last",
    allowedTransforms: SEMI_ADDITIVE_TRANSFORMS,
    postTransformFooterAgg: STANDARD_POST_TRANSFORM_FOOTER,
    unit: "currency",
    description: "Account balance at the end of the trading day",
    roles: ["admin"],
  },

  accountOpeningBalance: {
    key: "accountOpeningBalance",
    label: "Account Opening Balance",
    kind: "semi-additive",
    valueType: "currency",
    entityAggregation: "sum",
    allowedEntityAggregations: ["sum"],
    temporalAggregation: "last",
    allowedTemporalAggregations: ["last", "mean", "max", "min"],
    footerAggregation: "last",
    allowedTransforms: SEMI_ADDITIVE_TRANSFORMS,
    postTransformFooterAgg: STANDARD_POST_TRANSFORM_FOOTER,
    unit: "currency",
    description: "Account balance at the start of the trading day",
    roles: ["admin"],
  },

  traderOpeningBalance: {
    key: "traderOpeningBalance",
    label: "Opening Bal.",
    kind: "semi-additive",
    valueType: "currency",
    entityAggregation: "sum",
    allowedEntityAggregations: ["sum"],
    temporalAggregation: "first",
    allowedTemporalAggregations: ["first", "last", "mean", "max", "min"],
    footerAggregation: "last",
    allowedTransforms: SEMI_ADDITIVE_TRANSFORMS,
    postTransformFooterAgg: STANDARD_POST_TRANSFORM_FOOTER,
    unit: "currency",
    description: "Trader-level balance at the start of the trading day",
  },

  traderClosingBalance: {
    key: "traderClosingBalance",
    label: "Closing Bal.",
    kind: "semi-additive",
    valueType: "currency",
    entityAggregation: "sum",
    allowedEntityAggregations: ["sum"],
    temporalAggregation: "last",
    allowedTemporalAggregations: ["last", "mean", "max", "min"],
    footerAggregation: "last",
    allowedTransforms: SEMI_ADDITIVE_TRANSFORMS,
    postTransformFooterAgg: STANDARD_POST_TRANSFORM_FOOTER,
    unit: "currency",
    description: "Trader-level balance at the end of the trading day",
  },

  isAdjusted: {
    key: "isAdjusted",
    label: "Is Adjusted",
    kind: "non-additive",
    valueType: "boolean",
    entityAggregation: "and",
    allowedEntityAggregations: ["and", "or"],
    temporalAggregation: "and",
    allowedTemporalAggregations: ["and", "or", "count"],
    footerAggregation: "and",
    description: "Whether this record has been manually adjusted",
    roles: ["admin"],
  },

  date: {
    key: "date",
    label: "Date",
    kind: "dimension",
    valueType: "date",
    description: "Trade date — used for time-based grouping only",
  },

  accountId: {
    key: "accountId",
    label: "Account ID",
    kind: "dimension",
    valueType: "text",
    description: "Trading account identifier",
  },

  nickname: {
    key: "nickname",
    label: "Account",
    kind: "dimension",
    valueType: "text",
    description: "Human-readable account display name",
  },

  clearingCorp: {
    key: "clearingCorp",
    label: "Clearing Corp",
    kind: "dimension",
    valueType: "text",
    description: "Clearing corporation or prime broker",
  },

  notes: {
    key: "notes",
    label: "Notes",
    kind: "non-additive",
    valueType: "text",
    entityAggregation: "concat",
    allowedEntityAggregations: ["concat", "first", "last"],
    temporalAggregation: "concat",
    allowedTemporalAggregations: ["concat", "first", "last"],
    footerAggregation: "concat",
    description: "Free-text notes attached to this trading day",
    tooltipFormatter: "pipe-lines",
  },
};

const STATS_FIELDS: Record<string, FieldMeta> = {
  winPercentage: {
    key: "winPercentage",
    label: "Win %",
    kind: "non-additive",
    valueType: "percent",
    entityAggregation: "mean",
    allowedEntityAggregations: ["mean"],
    temporalAggregation: "mean",
    allowedTemporalAggregations: ["mean"],
    footerAggregation: "mean",
    allowedTransforms: NON_ADDITIVE_TRANSFORMS,
    postTransformFooterAgg: STANDARD_POST_TRANSFORM_FOOTER,
    unit: "percent",
    description: "Percentage of winning days/weeks",
  },

  profitFactorDay: {
    key: "profitFactorDay",
    label: "Profit Factor (Day)",
    kind: "non-additive",
    valueType: "number",
    entityAggregation: "mean",
    allowedEntityAggregations: ["mean"],
    temporalAggregation: "mean",
    allowedTemporalAggregations: ["mean"],
    footerAggregation: "mean",
    allowedTransforms: NON_ADDITIVE_TRANSFORMS,
    postTransformFooterAgg: STANDARD_POST_TRANSFORM_FOOTER,
    unit: "ratio",
    description: "Ratio of gross profit to gross loss (daily)",
  },

  profitFactorWeek: {
    key: "profitFactorWeek",
    label: "Profit Factor (Week)",
    kind: "non-additive",
    valueType: "number",
    entityAggregation: "mean",
    allowedEntityAggregations: ["mean"],
    temporalAggregation: "mean",
    allowedTemporalAggregations: ["mean"],
    footerAggregation: "mean",
    allowedTransforms: NON_ADDITIVE_TRANSFORMS,
    postTransformFooterAgg: STANDARD_POST_TRANSFORM_FOOTER,
    unit: "ratio",
    description: "Ratio of gross profit to gross loss (weekly)",
  },

  avgWinDay: {
    key: "avgWinDay",
    label: "Avg Win Day",
    kind: "non-additive",
    valueType: "currency",
    directional: true,
    entityAggregation: "mean",
    allowedEntityAggregations: ["mean"],
    temporalAggregation: "mean",
    allowedTemporalAggregations: ["mean"],
    footerAggregation: "mean",
    allowedTransforms: NON_ADDITIVE_TRANSFORMS,
    postTransformFooterAgg: STANDARD_POST_TRANSFORM_FOOTER,
    unit: "currency",
    description: "Average P&L on winning days",
  },

  avgLossDay: {
    key: "avgLossDay",
    label: "Avg Loss Day",
    kind: "non-additive",
    valueType: "currency",
    directional: true,
    entityAggregation: "mean",
    allowedEntityAggregations: ["mean"],
    temporalAggregation: "mean",
    allowedTemporalAggregations: ["mean"],
    footerAggregation: "mean",
    allowedTransforms: NON_ADDITIVE_TRANSFORMS,
    postTransformFooterAgg: STANDARD_POST_TRANSFORM_FOOTER,
    unit: "currency",
    description: "Average P&L on losing days",
  },

  avgWinWeek: {
    key: "avgWinWeek",
    label: "Avg Win Week",
    kind: "non-additive",
    valueType: "currency",
    directional: true,
    entityAggregation: "mean",
    allowedEntityAggregations: ["mean"],
    temporalAggregation: "mean",
    allowedTemporalAggregations: ["mean"],
    footerAggregation: "mean",
    allowedTransforms: NON_ADDITIVE_TRANSFORMS,
    postTransformFooterAgg: STANDARD_POST_TRANSFORM_FOOTER,
    unit: "currency",
    description: "Average P&L on winning weeks",
  },

  avgLossWeek: {
    key: "avgLossWeek",
    label: "Avg Loss Week",
    kind: "non-additive",
    valueType: "currency",
    directional: true,
    entityAggregation: "mean",
    allowedEntityAggregations: ["mean"],
    temporalAggregation: "mean",
    allowedTemporalAggregations: ["mean"],
    footerAggregation: "mean",
    allowedTransforms: NON_ADDITIVE_TRANSFORMS,
    postTransformFooterAgg: STANDARD_POST_TRANSFORM_FOOTER,
    unit: "currency",
    description: "Average P&L on losing weeks",
  },
};

const PRODUCTWISE_FIELDS: Record<string, FieldMeta> = {
  netPL: {
    key: "netPL",
    label: "Net P&L (Ex. R&C)",
    kind: "fully-additive",
    valueType: "currency",
    directional: true,
    entityAggregation: "sum",
    allowedEntityAggregations: ["sum"],
    temporalAggregation: "sum",
    allowedTemporalAggregations: ["sum", "mean"],
    footerAggregation: "sum",
    allowedTransforms: FULLY_ADDITIVE_TRANSFORMS,
    postTransformFooterAgg: STANDARD_POST_TRANSFORM_FOOTER,
    unit: "currency",
    description: "Net P&L for this product (excluding rebates and charges)",
  },

  grossPL: {
    key: "grossPL",
    label: "Gross P&L",
    kind: "fully-additive",
    valueType: "currency",
    directional: true,
    entityAggregation: "sum",
    allowedEntityAggregations: ["sum"],
    temporalAggregation: "sum",
    allowedTemporalAggregations: ["sum", "mean"],
    footerAggregation: "sum",
    allowedTransforms: FULLY_ADDITIVE_TRANSFORMS,
    postTransformFooterAgg: STANDARD_POST_TRANSFORM_FOOTER,
    unit: "currency",
    description: "Gross P&L for this product",
  },

  transCost: {
    key: "transCost",
    label: "Transaction Cost",
    kind: "fully-additive",
    valueType: "currency",
    entityAggregation: "sum",
    allowedEntityAggregations: ["sum"],
    temporalAggregation: "sum",
    allowedTemporalAggregations: ["sum", "mean"],
    footerAggregation: "sum",
    allowedTransforms: FULLY_ADDITIVE_TRANSFORMS,
    postTransformFooterAgg: STANDARD_POST_TRANSFORM_FOOTER,
    unit: "currency",
    description: "Transaction costs for this product",
  },

  charges: {
    key: "charges",
    label: "Charges",
    kind: "fully-additive",
    valueType: "currency",
    entityAggregation: "sum",
    allowedEntityAggregations: ["sum"],
    temporalAggregation: "sum",
    allowedTemporalAggregations: ["sum", "mean"],
    footerAggregation: "sum",
    allowedTransforms: FULLY_ADDITIVE_TRANSFORMS,
    postTransformFooterAgg: STANDARD_POST_TRANSFORM_FOOTER,
    unit: "currency",
    description: "Charges for this product",
  },

  volume: {
    key: "volume",
    label: "Volume",
    kind: "fully-additive",
    valueType: "number",
    entityAggregation: "sum",
    allowedEntityAggregations: ["sum"],
    temporalAggregation: "sum",
    allowedTemporalAggregations: ["sum", "mean"],
    footerAggregation: "sum",
    allowedTransforms: FULLY_ADDITIVE_TRANSFORMS,
    postTransformFooterAgg: STANDARD_POST_TRANSFORM_FOOTER,
    unit: "volume",
    description: "Trading volume for this product",
  },

  buyQty: {
    key: "buyQty",
    label: "Buy Qty",
    kind: "fully-additive",
    valueType: "number",
    entityAggregation: "sum",
    allowedEntityAggregations: ["sum"],
    temporalAggregation: "sum",
    allowedTemporalAggregations: ["sum", "mean"],
    footerAggregation: "sum",
    allowedTransforms: FULLY_ADDITIVE_TRANSFORMS,
    postTransformFooterAgg: STANDARD_POST_TRANSFORM_FOOTER,
    unit: "volume",
    description: "Buy quantity for this product",
  },

  sellQty: {
    key: "sellQty",
    label: "Sell Qty",
    kind: "fully-additive",
    valueType: "number",
    entityAggregation: "sum",
    allowedEntityAggregations: ["sum"],
    temporalAggregation: "sum",
    allowedTemporalAggregations: ["sum", "mean"],
    footerAggregation: "sum",
    allowedTransforms: FULLY_ADDITIVE_TRANSFORMS,
    postTransformFooterAgg: STANDARD_POST_TRANSFORM_FOOTER,
    unit: "volume",
    description: "Sell quantity for this product",
  },

  roundTurn: {
    key: "roundTurn",
    label: "Round Turns",
    kind: "fully-additive",
    valueType: "number",
    entityAggregation: "sum",
    allowedEntityAggregations: ["sum"],
    temporalAggregation: "sum",
    allowedTemporalAggregations: ["sum", "mean"],
    footerAggregation: "sum",
    allowedTransforms: FULLY_ADDITIVE_TRANSFORMS,
    postTransformFooterAgg: STANDARD_POST_TRANSFORM_FOOTER,
    unit: "count",
    description: "Round turns for this product",
    roles: ["admin"],
  },

  date: {
    key: "date",
    label: "Date",
    kind: "dimension",
    valueType: "date",
    description: "Trade date",
  },

  accountId: {
    key: "accountId",
    label: "Account ID",
    kind: "dimension",
    valueType: "text",
    description: "Trading account identifier",
  },

  nickname: {
    key: "nickname",
    label: "Account Name",
    kind: "dimension",
    valueType: "text",
    description: "Human-readable account display name",
  },

  instrument: {
    key: "instrument",
    label: "Instrument",
    kind: "dimension",
    valueType: "text",
    description: "Instrument / product code",
  },

  asset: {
    key: "asset",
    label: "Asset Class",
    kind: "dimension",
    valueType: "text",
    description: "Asset class grouping",
  },

  exchange: {
    key: "exchange",
    label: "Exchange",
    kind: "dimension",
    valueType: "text",
    description: "Exchange on which the instrument trades",
  },

  subExchange: {
    key: "subExchange",
    label: "Sub-Exchange",
    kind: "dimension",
    valueType: "text",
    description: "Sub-exchange or trading venue",
  },

  dateInstrument: {
    key: "dateInstrument",
    label: "Date Instrument",
    kind: "dimension",
    valueType: "text",
    description: "Composite date-instrument key (e.g. '2025-03-03 RB')",
  },

  currency: {
    key: "currency",
    label: "Currency",
    kind: "dimension",
    valueType: "text",
    description: "Trading currency for this product",
  },
};

export interface DimensionHierarchy {
  id: string;
  label: string;
  levels: string[];
  filterRoot: string;
  leafField: string;
  groupByLabels?: Record<string, string>;
}

export interface EntityHierarchyLevel {
  field: string;
  label: string;
  isRawKey: boolean;
  displayField?: string;
}

export interface EntityAxis {
  id: string;
  label?: string;
  levels: EntityHierarchyLevel[];
}

export interface DatasetMeta {
  id: string;
  label: string;
  granularity: {
    time: "day" | null;
    entityKey: string | null;
    entityLevels: string[];
  };
  entityAxes?: EntityAxis[];
  fields: Record<string, FieldMeta>;
  dimensionHierarchies?: DimensionHierarchy[];
}

export const DATASET_REGISTRY: Record<string, DatasetMeta> = {
  financial: {
    id: "financial",
    label: "Financial",
    granularity: {
      time: "day",
      entityKey: "accountId",
      entityLevels: ["accountId"],
    },
    fields: FINANCIAL_FIELDS,
    entityAxes: [
      {
        id: "account",
        label: "Account",
        levels: [
          { field: "clearingCorp", label: "Clearing Corp", isRawKey: true },
          { field: "accountId", label: "Account", isRawKey: true, displayField: "nickname" },
        ],
      },
    ],
  },

  productwise: {
    id: "productwise",
    label: "Product Wise",
    granularity: {
      time: "day",
      entityKey: "instrument",
      entityLevels: ["accountId", "instrument"],
    },
    fields: PRODUCTWISE_FIELDS,
    entityAxes: [
      {
        id: "account",
        label: "Account",
        levels: [
          { field: "clearingCorp", label: "Clearing Corp", isRawKey: true },
          { field: "accountId", label: "Account", isRawKey: true, displayField: "nickname" },
        ],
      },
      {
        id: "product",
        label: "Product",
        levels: [
          { field: "asset", label: "Asset", isRawKey: false },
          { field: "instrument", label: "Instrument", isRawKey: true },
        ],
      },
    ],
    dimensionHierarchies: [
      {
        id: "asset-instrument",
        label: "Asset Class → Instrument",
        levels: ["asset", "instrument"],
        filterRoot: "asset",
        leafField: "instrument",
        groupByLabels: {
          instrument: "Instrument",
          asset: "Asset",
        },
      },
    ],
  },

  stats: {
    id: "stats",
    label: "Statistics",
    granularity: {
      time: null,
      entityKey: null,
      entityLevels: [],
    },
    fields: STATS_FIELDS,
  },
};

export const FIELD_REGISTRY: Record<string, FieldMeta> = {
  ...PRODUCTWISE_FIELDS,
  ...STATS_FIELDS,
  ...FINANCIAL_FIELDS,
};

export function getFieldMeta(fieldKey: string): FieldMeta | undefined {
  return FIELD_REGISTRY[fieldKey];
}

export function getTemporalAgg(fieldKey: string, override?: FieldAggregation): FieldAggregation {
  if (override) return override;
  return FIELD_REGISTRY[fieldKey]?.temporalAggregation ?? "sum";
}

export function getEntityAgg(fieldKey: string, override?: FieldAggregation): FieldAggregation {
  if (override) return override;
  return FIELD_REGISTRY[fieldKey]?.entityAggregation ?? "sum";
}

export function getFooterAgg(
  fieldKey: string,
  transform?: SeriesTransform,
  override?: FieldAggregation,
): FieldAggregation {
  if (override) return override;

  const meta = FIELD_REGISTRY[fieldKey];
  if (!meta) return "sum";

  if (transform && transform !== "none") {
    const postAgg = meta.postTransformFooterAgg?.[transform];
    if (postAgg !== undefined) return postAgg;
  }

  return meta.footerAggregation ?? "sum";
}

export function getDatasetHierarchies(datasetId: string): DimensionHierarchy[] {
  const baseId = datasetId.split(":")[0];
  return DATASET_REGISTRY[baseId]?.dimensionHierarchies ?? [];
}

export function getPrimaryHierarchy(datasetId: string): DimensionHierarchy | null {
  return getDatasetHierarchies(datasetId)[0] ?? null;
}

export function getFieldValueType(fieldKey: string): FieldValueType {
  return FIELD_REGISTRY[fieldKey]?.valueType ?? "number";
}

export function getDatasetEntityKey(datasetId: string): string | null {
  return DATASET_REGISTRY[datasetId]?.granularity.entityKey ?? null;
}

export function getDatasetEntityLevels(datasetId: string): string[] {
  const baseId = datasetId.split(":")[0];
  return DATASET_REGISTRY[baseId]?.granularity.entityLevels ?? [];
}

export function getDimensionFields(datasetId: string): { key: string; label: string }[] {
  const base = datasetId.split(":")[0];
  const meta = DATASET_REGISTRY[base];
  if (!meta) return [];
  return Object.values(meta.fields)
    .filter((f) => f.kind === "dimension" && f.key !== "date")
    .map((f) => ({ key: f.key, label: f.label ?? f.key }));
}

export function isDimension(fieldKey: string): boolean {
  return FIELD_REGISTRY[fieldKey]?.kind === "dimension";
}

export function getDatasetFields(datasetId: string, isAdmin: boolean): Record<string, FieldMeta> {
  const base = datasetId.split(":")[0];
  const fields = DATASET_REGISTRY[base]?.fields ?? {};
  if (isAdmin) return fields;
  return Object.fromEntries(
    Object.entries(fields).filter(([, meta]) => {
      if (!meta.roles) return true;
      return meta.roles.includes("user");
    }),
  );
}

export function getEntityAxes(datasetId: string): EntityAxis[] {
  const baseId = datasetId.split(":")[0];
  return DATASET_REGISTRY[baseId]?.entityAxes ?? [];
}

export function getEntityHierarchy(datasetId: string): EntityHierarchyLevel[] {
  return getEntityAxes(datasetId).flatMap((ax) => ax.levels);
}

export interface DimensionToggleOption {
  entityFields: string[];
  label: string;
}

export function getAxisToggleOptions(datasetId: string): { axis: EntityAxis; options: DimensionToggleOption[] }[] {
  const axes = getEntityAxes(datasetId);
  return axes.map((axis) => ({
    axis,
    options: [
      { entityFields: [], label: "—" },
      ...axis.levels.map((level) => ({
        entityFields: [level.displayField ?? level.field],
        label: level.label,
      })),
    ],
  }));
}

export function getDimensionToggleOptions(datasetId: string): DimensionToggleOption[] {
  const axes = getEntityAxes(datasetId);
  if (axes.length === 0) return [{ entityFields: [], label: "Time" }];
  const options: DimensionToggleOption[] = [{ entityFields: [], label: "Time" }];
  for (const axis of axes) {
    for (const level of axis.levels) {
      options.push({
        entityFields: [level.displayField ?? level.field],
        label: `Time × ${level.label}`,
      });
    }
  }
  return options;
}

export function getAIFieldContext(): Record<
  string,
  {
    label: string;
    kind: MeasureKind;
    temporalAgg: FieldAggregation;
    allowedTransforms: SeriesTransform[];
  }
> {
  return Object.fromEntries(
    Object.entries(FIELD_REGISTRY)
      .filter(([, meta]) => meta.kind !== "dimension")
      .map(([key, meta]) => [
        key,
        {
          label: meta.label,
          kind: meta.kind,
          temporalAgg: meta.temporalAggregation ?? "sum",
          allowedTransforms: meta.allowedTransforms ?? [],
        },
      ]),
  );
}
