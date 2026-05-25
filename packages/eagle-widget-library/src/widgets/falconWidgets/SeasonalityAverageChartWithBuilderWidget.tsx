import {
  SeasonalityChartWithBuilderWidget,
  type SeasonalityChartWithBuilderWidgetProps,
} from "./SeasonalityChartWithBuilderWidget";

export type SeasonalityAverageChartWithBuilderWidgetProps = Omit<
  SeasonalityChartWithBuilderWidgetProps,
  "chartType"
>;

export function SeasonalityAverageChartWithBuilderWidget(
  props: SeasonalityAverageChartWithBuilderWidgetProps,
) {
  return <SeasonalityChartWithBuilderWidget {...props} chartType="average" />;
}

export const SeasonalityAverageChartWithBuilderWidgetDef = {
  component: SeasonalityAverageChartWithBuilderWidget,
  category: "Seasonality",
} as const;
