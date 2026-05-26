/**
 * BackOffice Financial View template dashboard.
 *
 * Layout (12-col grid, 60 px row height):
 *   Row 0–1   : Topbar — full-width filter bar
 *   Row 2–3   : Key Metrics — 6 KPI cards (Net P&L, Volume, P&L/Vol, Closing Bal, Win Days, Total Days)
 *   Row 4–8   : PnL Heatmap (w:3) | Cumulative P&L area (w:6) | Win % (w:3, top) + PF Day (w:3, bottom)
 *   Row 9–12  : Monthly P&L signed bar (w:4) | Volume bar (w:5)
 *   Row 13–20 : Statement tabs — Daily/Weekly/Monthly (w:9) | Statistics KPI panel (w:3)
 *   Row 20–24 : 15D Rolling Sharpe (w:4) | 15D Rolling Mean P&L (w:4) | Quick Note (w:4)
 */

import type { DashboardRecord } from "@/services/dashboardsApi";

export const BACKOFFICE_PRESET_ID = "__bo-financial-view__";

export const backofficePresetDashboard: DashboardRecord = {
  dashboardID: BACKOFFICE_PRESET_ID,
  name: "BackOffice (Template)",
  publishedLayout: {
    tabs: [
      {
        id: "bo-tab-main",
        title: "Financial View",
        layout: [

          // ── Row 0–1: Filter bar ─────────────────────────────────────────────
          {
            i: "bo-topbar",
            x: 0, y: 0, w: 12, h: 2,
            minW: 4, minH: 1,
            widget: {
              componentName: "BackOfficeTopbarWidget",
              name: "Filter Bar",
              defaultProps: { isTokenRequired: true },
            },
          },

          // ── Row 2–3: Key Metrics (6 KPI cards in one row) ──────────────────
          {
            i: "bo-key-metrics",
            x: 0, y: 2, w: 12, h: 2,
            minW: 6, minH: 2,
            widget: {
              componentName: "FinancialAnalysisWidget",
              name: "Key Metrics",
              defaultProps: {
                widgetConfig: {
                  id: "bo-key-metrics",
                  title: "Key Metrics",
                  version: "v2",
                  vizType: "kpi-card",
                  datasetId: "financial",
                  kpiColumns: 6,
                  kpiAutoColumns: false,
                  kpiHideColumnPicker: true,
                  w: 12, h: 2, x: 0, y: 2,
                  measures: [
                    { kind: "scalar",  name: "totalNetPLExcl" },
                    { kind: "scalar",  name: "totalVolume" },
                    { kind: "formula", name: "pnlVolumeRatio" },
                    { kind: "scalar",  name: "latestClosingBalance" },
                    { kind: "scalar",  name: "winDays" },
                    { kind: "scalar",  name: "totalDays" },
                  ],
                },
              },
            },
          },

          // ── Row 4–8: PnL Heatmap (left) ────────────────────────────────────
          {
            i: "bo-pnl-heatmap",
            x: 0, y: 4, w: 3, h: 5,
            minW: 2, minH: 3,
            widget: {
              componentName: "FinancialAnalysisWidget",
              name: "Net P&L (Ex. R&C)",
              defaultProps: {
                widgetConfig: {
                  id: "bo-pnl-heatmap",
                  title: "Net P&L (Ex. R&C)",
                  version: "v2",
                  vizType: "heatmap",
                  datasetId: "financial",
                  w: 3, h: 5, x: 0, y: 4,
                  measures: [
                    { kind: "column", name: "netPLExclRebatesAndCharges" },
                  ],
                },
              },
            },
          },

          // ── Row 4–8: Cumulative Net P&L area chart (center) ────────────────
          {
            i: "bo-cumulative-pnl",
            x: 3, y: 4, w: 6, h: 5,
            minW: 3, minH: 3,
            widget: {
              componentName: "FinancialAnalysisWidget",
              name: "Cumulative Net P&L (Excl.)",
              defaultProps: {
                widgetConfig: {
                  id: "bo-cumulative-pnl",
                  title: "Cumulative Net P&L (Excl.)",
                  version: "v2",
                  vizType: "area",
                  datasetId: "financial",
                  w: 6, h: 5, x: 3, y: 4,
                  measures: [
                    { kind: "column", name: "cumulativeNetPLExcl" },
                  ],
                },
              },
            },
          },

          // ── Row 4–6: Win % (top-right) ──────────────────────────────────────
          {
            i: "bo-win-pct",
            x: 9, y: 4, w: 3, h: 2,
            minW: 2, minH: 2,
            widget: {
              componentName: "FinancialAnalysisWidget",
              name: "Win %",
              defaultProps: {
                widgetConfig: {
                  id: "bo-win-pct",
                  title: "Win %",
                  version: "v2",
                  vizType: "donut",
                  datasetId: "financial",
                  maxValue: 100,
                  w: 3, h: 2, x: 9, y: 4,
                  measures: [
                    { kind: "formula", name: "winPct" },
                  ],
                },
              },
            },
          },

          // ── Row 6–9: Profit Factor Day (bottom-right) ───────────────────────
          {
            i: "bo-pf-day",
            x: 9, y: 6, w: 3, h: 3,
            minW: 2, minH: 2,
            widget: {
              componentName: "FinancialAnalysisWidget",
              name: "Profit Factor (Day)",
              defaultProps: {
                widgetConfig: {
                  id: "bo-pf-day",
                  title: "Profit Factor (Day)",
                  version: "v2",
                  vizType: "donut",
                  datasetId: "financial",
                  maxValue: 2,
                  w: 3, h: 3, x: 9, y: 6,
                  measures: [
                    { kind: "formula", name: "profitFactorDay" },
                  ],
                },
              },
            },
          },

          // ── Row 9–12: Monthly P&L signed bar (left) ────────────────────────
          {
            i: "bo-monthly-pnl",
            x: 0, y: 9, w: 4, h: 4,
            minW: 2, minH: 3,
            widget: {
              componentName: "FinancialAnalysisWidget",
              name: "Net P&L | Monthly",
              defaultProps: {
                widgetConfig: {
                  id: "bo-monthly-pnl",
                  title: "Net P&L | Monthly",
                  version: "v2",
                  vizType: "signed-bar",
                  datasetId: "financial:monthly",
                  w: 4, h: 4, x: 0, y: 9,
                  measures: [
                    { kind: "column", name: "netPL" },
                  ],
                },
              },
            },
          },

          // ── Row 9–12: Volume bar (center) ───────────────────────────────────
          {
            i: "bo-volume-bar",
            x: 4, y: 9, w: 8, h: 4,
            minW: 3, minH: 3,
            widget: {
              componentName: "FinancialAnalysisWidget",
              name: "Volume",
              defaultProps: {
                widgetConfig: {
                  id: "bo-volume-bar",
                  title: "Volume",
                  version: "v2",
                  vizType: "bar",
                  datasetId: "financial",
                  w: 8, h: 4, x: 4, y: 9,
                  measures: [
                    { kind: "column", name: "volume" },
                  ],
                  measureColors: { volume: "#3b82f6" },
                  showLabels: false,
                },
              },
            },
          },

          // ── Row 13–20: Statement tabs — Daily/Weekly/Monthly (left) ────────
          // Single widget with a tab strip matching BackOffice's FinancialMainContent.
          // Each tab runs the full v2 data-table pipeline (group-by toggle, Edit
          // Charts, Measures popover) over the appropriate granularity dataset.
          {
            i: "bo-statement-tabs",
            x: 0, y: 13, w: 9, h: 7,
            minW: 4, minH: 3,
            widget: {
              componentName: "StatementTabsContainerWidget",
              name: "Statement",
              defaultProps: { defaultTab: "daily" },
            },
          },

          // ── Row 13–20: Statistics KPI panel (right) ─────────────────────────
          {
            i: "bo-statistics",
            x: 9, y: 13, w: 3, h: 7,
            minW: 2, minH: 4,
            widget: {
              componentName: "FinancialAnalysisWidget",
              name: "Statistics",
              defaultProps: {
                widgetConfig: {
                  id: "bo-statistics",
                  title: "Statistics",
                  version: "v2",
                  vizType: "kpi-card",
                  datasetId: "financial",
                  kpiColumns: 1,
                  kpiAutoColumns: false,
                  kpiHideColumnPicker: true,
                  w: 3, h: 7, x: 9, y: 13,
                  measures: [
                    { kind: "scalar",  name: "avgWinDay" },
                    { kind: "scalar",  name: "avgLossDay" },
                    { kind: "scalar",  name: "avgWinWeek" },
                    { kind: "scalar",  name: "avgLossWeek" },
                    { kind: "formula", name: "profitFactorDay" },
                    { kind: "formula", name: "profitFactorWeek" },
                  ],
                },
              },
            },
          },

          // ── Row 20–24: 15D Rolling Sharpe (left) ────────────────────────────
          {
            i: "bo-rolling-sharpe",
            x: 0, y: 20, w: 4, h: 4,
            minW: 2, minH: 3,
            widget: {
              componentName: "FinancialAnalysisWidget",
              name: "15D Rolling Sharpe (Excl.)",
              defaultProps: {
                widgetConfig: {
                  id: "bo-rolling-sharpe",
                  title: "15D Rolling Sharpe (Excl.)",
                  version: "v2",
                  vizType: "line",
                  datasetId: "financial",
                  w: 4, h: 4, x: 0, y: 20,
                  measures: [
                    { kind: "column", name: "sharpe15NetPLExcl" },
                  ],
                },
              },
            },
          },

          // ── Row 20–24: 15D Rolling Mean P&L (center) ────────────────────────
          {
            i: "bo-rolling-mean",
            x: 4, y: 20, w: 4, h: 4,
            minW: 2, minH: 3,
            widget: {
              componentName: "FinancialAnalysisWidget",
              name: "15D Rolling Mean P&L (Excl.)",
              defaultProps: {
                widgetConfig: {
                  id: "bo-rolling-mean",
                  title: "15D Rolling Mean P&L (Excl.)",
                  version: "v2",
                  vizType: "line",
                  datasetId: "financial",
                  w: 4, h: 4, x: 4, y: 20,
                  measures: [
                    { kind: "column", name: "rolling15dNetPLExcl" },
                  ],
                },
              },
            },
          },

          // ── Row 20–24: Quick Note (right) ───────────────────────────────────
          {
            i: "bo-quick-note",
            x: 8, y: 20, w: 4, h: 4,
            minW: 2, minH: 2,
            widget: {
              componentName: "TextWidget",
              name: "Quick Note",
              defaultProps: {
                storageKey: "bo-quick-note",
                placeholder: "Write a quick note…",
                showToolbar: true,
              },
            },
          },

        ],
      },
    ],
  },
};
