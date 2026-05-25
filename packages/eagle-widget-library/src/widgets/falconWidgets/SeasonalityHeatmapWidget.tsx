import {
  SeasonalityChartWidget,
  type SeasonalityChartWidgetProps,
} from "./SeasonalityChartWidget";

export type SeasonalityHeatmapWidgetProps = Omit<SeasonalityChartWidgetProps, "type">;

export function SeasonalityHeatmapWidget(props: SeasonalityHeatmapWidgetProps) {
  return <SeasonalityChartWidget {...props} type="heatmap" />;
}

export const SeasonalityHeatmapWidgetDef = {
  component: SeasonalityHeatmapWidget,
  category: "Seasonality",
} as const;