import type { ScalarConfig, FormulaConfig, ExtendedColumnConfig } from "../store/measure-store";

export const DEFAULT_SCALARS: ScalarConfig[] = [

  // ── Financial: core P&L ───────────────────────────────────────────────────
  {
    name: "totalNetPL",
    label: "Net P&L",
    datasetId: "financial",
    field: "netPL",
    aggregation: "sum",
  },
  {
    name: "totalNetPLExcl",
    label: "Net P&L (Excl. Rebates)",
    datasetId: "financial",
    field: "netPLExclRebatesAndCharges",
    aggregation: "sum",
  },
  {
    name: "totalVolume",
    label: "Total Volume",
    datasetId: "financial",
    field: "volume",
    aggregation: "sum",
  },
  {
    name: "latestClosingBalance",
    label: "Closing Balance",
    datasetId: "financial",
    field: "traderClosingBalance",
    aggregation: "last",
  },

  // ── Financial: day counts ─────────────────────────────────────────────────
  {
    name: "totalDays",
    label: "Total Trading Days",
    datasetId: "financial",
    field: "date",
    aggregation: "count",
    filter: { kind: "all" },
  },
  {
    name: "winDays",
    label: "Winning Days",
    datasetId: "financial",
    field: "date",
    aggregation: "count",
    filter: { kind: "where", field: "netPLExclRebatesAndCharges", op: ">", value: 0 },
  },

  // ── Financial: daily win/loss averages ────────────────────────────────────
  {
    name: "avgWinDay",
    label: "Avg Win Day",
    datasetId: "financial",
    field: "netPLExclRebatesAndCharges",
    aggregation: "mean",
    filter: { kind: "where", field: "netPLExclRebatesAndCharges", op: ">", value: 0 },
  },
  {
    name: "avgLossDay",
    label: "Avg Loss Day",
    datasetId: "financial",
    field: "netPLExclRebatesAndCharges",
    aggregation: "mean",
    filter: { kind: "where", field: "netPLExclRebatesAndCharges", op: "<", value: 0 },
  },

  // ── Financial: weekly win/loss averages ───────────────────────────────────
  {
    name: "avgWinWeek",
    label: "Avg Win Week",
    datasetId: "financial:weekly",
    field: "netPLExclRebatesAndCharges",
    aggregation: "mean",
    filter: { kind: "where", field: "netPLExclRebatesAndCharges", op: ">", value: 0 },
  },
  {
    name: "avgLossWeek",
    label: "Avg Loss Week",
    datasetId: "financial:weekly",
    field: "netPLExclRebatesAndCharges",
    aggregation: "mean",
    filter: { kind: "where", field: "netPLExclRebatesAndCharges", op: "<", value: 0 },
  },

  // ── Productwise: core P&L + volume ────────────────────────────────────────
  {
    name: "productNetPL",
    label: "Net P&L",
    datasetId: "productwise",
    field: "netPL",
    aggregation: "sum",
  },
  {
    name: "pw_totalNetPL",
    label: "Net P&L",
    datasetId: "productwise",
    field: "netPL",
    aggregation: "sum",
  },
  {
    name: "pw_totalVolume",
    label: "Total Volume",
    datasetId: "productwise",
    field: "volume",
    aggregation: "sum",
  },
  {
    name: "pw_totalBuyQty",
    label: "Buy Qty",
    datasetId: "productwise",
    field: "buyQty",
    aggregation: "sum",
  },
  {
    name: "pw_totalSellQty",
    label: "Sell Qty",
    datasetId: "productwise",
    field: "sellQty",
    aggregation: "sum",
  },

  // ── Productwise: day counts ───────────────────────────────────────────────
  {
    name: "pw_totalDays",
    label: "Total Trading Days",
    datasetId: "productwise",
    field: "date",
    aggregation: "count",
    filter: { kind: "all" },
  },
  {
    name: "pw_winDays",
    label: "Winning Days",
    datasetId: "productwise",
    field: "date",
    aggregation: "count",
    filter: { kind: "where", field: "netPL", op: ">", value: 0 },
  },
  {
    name: "pw_lossDays",
    label: "Losing Days",
    datasetId: "productwise",
    field: "date",
    aggregation: "count",
    filter: { kind: "where", field: "netPL", op: "<", value: 0 },
  },

  // ── Productwise: daily win/loss averages ──────────────────────────────────
  {
    name: "pw_avgWinDay",
    label: "Avg Win Day",
    datasetId: "productwise",
    field: "netPL",
    aggregation: "mean",
    filter: { kind: "where", field: "netPL", op: ">", value: 0 },
  },
  {
    name: "pw_avgLossDay",
    label: "Avg Loss Day",
    datasetId: "productwise",
    field: "netPL",
    aggregation: "mean",
    filter: { kind: "where", field: "netPL", op: "<", value: 0 },
  },

  // ── Productwise: weekly win/loss averages ─────────────────────────────────
  {
    name: "pw_avgWinWeek",
    label: "Avg Win Week",
    datasetId: "productwise:weekly",
    field: "netPL",
    aggregation: "mean",
    filter: { kind: "where", field: "netPL", op: ">", value: 0 },
  },
  {
    name: "pw_avgLossWeek",
    label: "Avg Loss Week",
    datasetId: "productwise:weekly",
    field: "netPL",
    aggregation: "mean",
    filter: { kind: "where", field: "netPL", op: "<", value: 0 },
  },
];

export const DEFAULT_EXTENDED_COLUMNS: ExtendedColumnConfig[] = [
  {
    name: "cumulativeNetPLExcl",
    label: "Cumulative Net P&L (Excl.)",
    datasetId: "financial",
    expression: "netPLExclRebatesAndCharges",
    valueType: "currency",
    entityAggregation: "sum",
    temporalAggregation: "sum",
    transform: "cumulative",
  },
  {
    name: "rolling15dNetPLExcl",
    label: "15d Rolling Mean P&L (Excl.)",
    datasetId: "financial",
    expression: "netPLExclRebatesAndCharges",
    valueType: "currency",
    entityAggregation: "sum",
    temporalAggregation: "sum",
    transform: "rolling_mean",
    window: 15,
  },
  {
    name: "sharpe15NetPLExcl",
    label: "15d Rolling Sharpe (Excl.)",
    datasetId: "financial",
    expression: "netPLExclRebatesAndCharges",
    valueType: "number",
    entityAggregation: "sum",
    temporalAggregation: "sum",
    transform: "sharpe",
    window: 15,
  },
  {
    name: "pw_cumulativeNetPL",
    label: "Cumulative Net P&L",
    datasetId: "productwise",
    expression: "netPL",
    valueType: "currency",
    entityAggregation: "sum",
    temporalAggregation: "sum",
    transform: "cumulative",
  },
];

export const DEFAULT_FORMULAS: FormulaConfig[] = [

  // ── Financial ─────────────────────────────────────────────────────────────
  {
    name: "winPct",
    label: "Win %",
    expression: "(winDays / totalDays) * 100",
  },
  {
    name: "profitFactorDay",
    label: "Profit Factor (Day)",
    expression: "avgWinDay / abs(avgLossDay)",
  },
  {
    name: "profitFactorWeek",
    label: "Profit Factor (Week)",
    expression: "avgWinWeek / abs(avgLossWeek)",
  },
  {
    name: "pnlVolumeRatio",
    label: "P&L / Volume",
    expression: "totalNetPLExcl / totalVolume",
  },

  // ── Productwise ───────────────────────────────────────────────────────────
  {
    name: "pw_winPct",
    label: "Win %",
    expression: "(pw_winDays / pw_totalDays) * 100",
  },
  {
    name: "pw_profitFactorDay",
    label: "Profit Factor (Day)",
    expression: "pw_avgWinDay / abs(pw_avgLossDay)",
  },
  {
    name: "pw_profitFactorWeek",
    label: "Profit Factor (Week)",
    expression: "pw_avgWinWeek / abs(pw_avgLossWeek)",
  },
];
