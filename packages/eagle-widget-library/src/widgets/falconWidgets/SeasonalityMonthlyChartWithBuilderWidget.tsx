import {
  SeasonalityChartWithBuilderWidget,
  type SeasonalityChartWithBuilderWidgetProps,
} from "./SeasonalityChartWithBuilderWidget";

export type SeasonalityMonthlyChartWithBuilderWidgetProps = Omit<
  SeasonalityChartWithBuilderWidgetProps,
  "chartType"
>;

export function SeasonalityMonthlyChartWithBuilderWidget(
  props: SeasonalityMonthlyChartWithBuilderWidgetProps,
) {
  return <SeasonalityChartWithBuilderWidget {...props} chartType="monthly" />;
}

export const SeasonalityMonthlyChartWithBuilderWidgetDef = {
  component: SeasonalityMonthlyChartWithBuilderWidget,
  category: "Seasonality",
} as const;
