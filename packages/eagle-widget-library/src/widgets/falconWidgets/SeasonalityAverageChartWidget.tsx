import {
  SeasonalityChartWidget,
  type SeasonalityChartWidgetProps,
} from "./SeasonalityChartWidget";

export type SeasonalityAverageChartWidgetProps = Omit<SeasonalityChartWidgetProps, "type">;

export function SeasonalityAverageChartWidget(props: SeasonalityAverageChartWidgetProps) {
  return <SeasonalityChartWidget {...props} type="average" />;
}

export const SeasonalityAverageChartWidgetDef = {
  component: SeasonalityAverageChartWidget,
  category: "Seasonality",
} as const;