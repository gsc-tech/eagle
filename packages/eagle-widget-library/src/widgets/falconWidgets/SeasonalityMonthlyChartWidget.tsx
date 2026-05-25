import {
  SeasonalityChartWidget,
  type SeasonalityChartWidgetProps,
} from "./SeasonalityChartWidget";

export type SeasonalityMonthlyChartWidgetProps = Omit<SeasonalityChartWidgetProps, "type">;

export function SeasonalityMonthlyChartWidget(props: SeasonalityMonthlyChartWidgetProps) {
  return <SeasonalityChartWidget {...props} type="monthly" />;
}

export const SeasonalityMonthlyChartWidgetDef = {
  component: SeasonalityMonthlyChartWidget,
  category: "Seasonality",
} as const;