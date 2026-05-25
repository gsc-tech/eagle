import {
  SeasonalityChartWithBuilderWidget,
  type SeasonalityChartWithBuilderWidgetProps,
} from "./SeasonalityChartWithBuilderWidget";

export type SeasonalityStackedChartWithBuilderWidgetProps = Omit<
  SeasonalityChartWithBuilderWidgetProps,
  "chartType"
>;

export function SeasonalityStackedChartWithBuilderWidget(
  props: SeasonalityStackedChartWithBuilderWidgetProps,
) {
  return <SeasonalityChartWithBuilderWidget {...props} chartType="stacked" />;
}

export const SeasonalityStackedChartWithBuilderWidgetDef = {
  component: SeasonalityStackedChartWithBuilderWidget,
  category: "Seasonality",
} as const;
