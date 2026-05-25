import {
  SeasonalityChartWithBuilderWidget,
  type SeasonalityChartWithBuilderWidgetProps,
} from "./SeasonalityChartWithBuilderWidget";

export type SeasonalityHeatmapWithBuilderWidgetProps = Omit<
  SeasonalityChartWithBuilderWidgetProps,
  "chartType"
>;

export function SeasonalityHeatmapWithBuilderWidget(
  props: SeasonalityHeatmapWithBuilderWidgetProps,
) {
  return <SeasonalityChartWithBuilderWidget {...props} chartType="heatmap" />;
}

export const SeasonalityHeatmapWithBuilderWidgetDef = {
  component: SeasonalityHeatmapWithBuilderWidget,
  category: "Seasonality",
} as const;
