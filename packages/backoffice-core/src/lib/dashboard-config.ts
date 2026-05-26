import { WidgetType } from "../types/chart-types";
import {
  AreaChart as AreaIcon,
  LineChart as LineIcon,
  PieChart as PieIcon,
  BarChart as BarIcon,
  CircleDot,
  Tally4,
  Gauge,
  Table2,
  CalendarRange,
  TrendingUp,
  LayoutList,
} from "lucide-react";

export interface WidgetDefinition {
  type: WidgetType;
  label: string;
  icon: any;
  defaultTitle: string;
  defaultSize: { w: number; h: number };
}

export const WIDGET_DEFINITIONS: Record<WidgetType, WidgetDefinition> = {
  area: {
    type: "area",
    label: "Area Chart",
    icon: AreaIcon,
    defaultTitle: "Traffic Overview",
    defaultSize: { w: 6, h: 3 },
  },
  line: {
    type: "line",
    label: "Line Chart",
    icon: LineIcon,
    defaultTitle: "Sales Performance",
    defaultSize: { w: 6, h: 3 },
  },
  pie: {
    type: "pie",
    label: "Pie Chart",
    icon: PieIcon,
    defaultTitle: "Category Distribution",
    defaultSize: { w: 4, h: 3 },
  },
  donut: {
    type: "donut",
    label: "Donut Chart",
    icon: CircleDot,
    defaultTitle: "Market Share",
    defaultSize: { w: 4, h: 3 },
  },
  multi: {
    type: "multi",
    label: "Multi Chart Widget",
    icon: Tally4,
    defaultTitle: "Composite Analysis",
    defaultSize: { w: 8, h: 3 },
  },
  bar: {
    type: "bar",
    label: "Bar Chart",
    icon: BarIcon,
    defaultTitle: "Metric Comparison",
    defaultSize: { w: 6, h: 3 },
  },
  "signed-bar": {
    type: "signed-bar",
    label: "Signed Bar Chart",
    icon: BarIcon,
    defaultTitle: "P&L by Period",
    defaultSize: { w: 8, h: 3 },
  },
  "kpi-card": {
    type: "kpi-card",
    label: "KPI Card",
    icon: Gauge,
    defaultTitle: "Key Metrics",
    defaultSize: { w: 8, h: 2 },
  },
  "data-table": {
    type: "data-table",
    label: "Data Table",
    icon: Table2,
    defaultTitle: "Data Table",
    defaultSize: { w: 8, h: 4 },
  },
  heatmap: {
    type: "heatmap",
    label: "Heatmap",
    icon: CalendarRange,
    defaultTitle: "Metric Calendar",
    defaultSize: { w: 12, h: 3 },
  },
  "winner-loser": {
    type: "winner-loser",
    label: "Winners & Losers",
    icon: TrendingUp,
    defaultTitle: "Winners & Losers",
    defaultSize: { w: 8, h: 4 },
  },
  leaderboard: {
    type: "leaderboard",
    label: "Leaderboard",
    icon: LayoutList,
    defaultTitle: "Leaderboard",
    defaultSize: { w: 12, h: 10 },
  },
  "pie-table": {
    type: "pie-table",
    label: "Pie + Table",
    icon: PieIcon,
    defaultTitle: "Distribution & Breakdown",
    defaultSize: { w: 8, h: 8 },
  },
};
