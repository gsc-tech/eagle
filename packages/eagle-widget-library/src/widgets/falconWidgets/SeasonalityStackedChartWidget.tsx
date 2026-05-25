import {
  SeasonalityChartWidget,
  type SeasonalityChartWidgetProps,
} from "./SeasonalityChartWidget";

export type SeasonalityStackedChartWidgetProps = Omit<SeasonalityChartWidgetProps, "type">;

export function SeasonalityStackedChartWidget(props: SeasonalityStackedChartWidgetProps) {
  return <SeasonalityChartWidget {...props} type="stacked" />;
}

export const SeasonalityStackedChartWidgetDef = {
  component: SeasonalityStackedChartWidget,
  category: "Seasonality",
} as const;