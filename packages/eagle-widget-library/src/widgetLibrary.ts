import type { WidgetDefinition } from "./types";
import { AmCandlestickChartWidgetDef } from "./widgets/AmCandlestickChartWidget";
import { BarChartWidgetDef } from "./widgets/BarChartWidget";
import { DataTableWidgetDef } from "./widgets/DataTableWidget";
import { LineChartWidgetDef } from "./widgets/LineChartWidget";
import { MarketDepthWidgetDef } from "./widgets/MarketDepthWidget";
import { NewsWidgetDef } from "./widgets/NewsWidget";
import { TextWidgetDef } from "./widgets/TextWidget";
import { TvCandlestickChartWidgetDef } from "./widgets/TvCandlestickChartWidget";
import { TvLineChartWidgetDef } from "./widgets/TvLineChartWidget";
import { RealtimeDataTableWidgetDef } from "./widgets/RealtimeDataTableWidget";
import { TvLiveLineChartWidgetDef } from "./widgets/TvLiveLineChartWidget";
import { TvLiveCandlestickChartWidgetDef } from "./widgets/TvLiveCandlestickChartWidget";
import { LiveBarChartWidgetDef } from "./widgets/LiveBarChartWidget";
import { HorizontalBarChartWidgetDef } from "./widgets/HorizontalBarChartWidget";
import { HeatMapWidgetDef } from "./widgets/HeatMapWidget";
import { MetricWidgetDef } from "./widgets/MetricWidget";
import { PieChartWidgetDef } from "./widgets/PieChartWidget";
import { SunburstChartWidgetDef } from "./widgets/SunburstChartWidget";
import { AreaChartWidgetDef } from "./widgets/AreaChartWidget";
import { EconomicCalendarWidgetDef } from "./widgets/EconomicCalendarWidget";
import { AmBarChartWidgetDef } from "./widgets/AmBarChartWidget";
import { ScatterPlotWidgetDef } from "./widgets/ScatterPlotWidget";
import { PdfViewerWidgetDef } from "./widgets/PdfViewerWidget";
import { WorldMapWidgetDef } from "./widgets/WorldMapWidget";
import { WatchListWidgetDef } from "./widgets/WatchListWidget";
import { SheetWidgetDef } from "./widgets/SheetWidget";
import { CartesianHeatmapWidgetDef } from "./widgets/CartesianHeatmapWidget";
import { ExpiryCalendarWidgetDef } from "./widgets/ExpiryCalendarWidget";
import { TraderLimitsRequestWidgetDef } from "./widgets/TraderLimitsRequestWidget";
import { TraderLimitRequestsViewWidgetDef } from "./widgets/TraderLimitRequestsViewWidget";
import { TraderLimitsApprovalWidgetDef } from "./widgets/TraderLimitsApprovalWidget";
import { TraderLimitsApprovalStagesViewWidgetDef } from "./widgets/TraderLimitsApprovalStagesViewWidget";
import { SeasonalityExpressionBuilderWidgetDef } from "./widgets/falconWidgets/SeasonalityExpressionBuilderWidget";
import { SeasonalityStackedChartWidgetDef } from "./widgets/falconWidgets/SeasonalityStackedChartWidget";
import { SeasonalityMonthlyChartWidgetDef } from "./widgets/falconWidgets/SeasonalityMonthlyChartWidget";
import { SeasonalityAverageChartWidgetDef } from "./widgets/falconWidgets/SeasonalityAverageChartWidget";
import { SeasonalityHeatmapWidgetDef } from "./widgets/falconWidgets/SeasonalityHeatmapWidget";
import { SeasonalityStackedChartWithBuilderWidgetDef } from "./widgets/falconWidgets/SeasonalityStackedChartWithBuilderWidget";
import { SeasonalityMonthlyChartWithBuilderWidgetDef } from "./widgets/falconWidgets/SeasonalityMonthlyChartWithBuilderWidget";
import { SeasonalityAverageChartWithBuilderWidgetDef } from "./widgets/falconWidgets/SeasonalityAverageChartWithBuilderWidget";
import { SeasonalityHeatmapWithBuilderWidgetDef } from "./widgets/falconWidgets/SeasonalityHeatmapWithBuilderWidget";
import { SeasonalityWatchlistWidgetDef } from "./widgets/falconWidgets/SeasonalityWatchlistWidget";
import { SeasonalityAlertsWidgetDef } from "./widgets/falconWidgets/SeasonalityAlertsWidget";

export const widgetLibrary: Record<string, WidgetDefinition> = {
    AmBarChartWidget: AmBarChartWidgetDef,
    AmCandlestickChartWidget: AmCandlestickChartWidgetDef,
    AreaChartWidget: AreaChartWidgetDef,
    BarChartWidget: BarChartWidgetDef,
    DataTableWidget: DataTableWidgetDef,
    EconomicCalendarWidget: EconomicCalendarWidgetDef,
    HeatMapWidget: HeatMapWidgetDef,
    HorizontalBarChartWidget: HorizontalBarChartWidgetDef,
    LineChartWidget: LineChartWidgetDef,
    LiveBarChartWidget: LiveBarChartWidgetDef,
    MarketDepthWidget: MarketDepthWidgetDef,
    MetricWidget: MetricWidgetDef,
    NewsWidget: NewsWidgetDef,
    PieChartWidget: PieChartWidgetDef,
    RealtimeDataTableWidget: RealtimeDataTableWidgetDef,
    ScatterPlotWidget: ScatterPlotWidgetDef,
    SunburstChartWidget: SunburstChartWidgetDef,
    TextWidget: TextWidgetDef,
    TvCandlestickChartWidget: TvCandlestickChartWidgetDef,
    TvLineChartWidget: TvLineChartWidgetDef,
    TvLiveCandlestickChartWidget: TvLiveCandlestickChartWidgetDef,
    TvLiveLineChartWidget: TvLiveLineChartWidgetDef,
    PdfViewerWidget: PdfViewerWidgetDef,
    WorldMapWidget: WorldMapWidgetDef,
    WatchListWidget: WatchListWidgetDef,
    SheetWidget: SheetWidgetDef,
    CartesianHeatmapWidget: CartesianHeatmapWidgetDef,
    ExpiryCalendarWidget: ExpiryCalendarWidgetDef,
    TraderLimitsRequestWidget: TraderLimitsRequestWidgetDef,
    TraderLimitRequestsViewWidget: TraderLimitRequestsViewWidgetDef,
    TraderLimitsApprovalWidget: TraderLimitsApprovalWidgetDef,
    TraderLimitsApprovalStagesViewWidget: TraderLimitsApprovalStagesViewWidgetDef,
    // ── Seasonality category ─────────────────────────────────────────────────
    SeasonalityExpressionBuilderWidget: SeasonalityExpressionBuilderWidgetDef,
    SeasonalityStackedChartWidget: SeasonalityStackedChartWidgetDef,
    SeasonalityMonthlyChartWidget: SeasonalityMonthlyChartWidgetDef,
    SeasonalityAverageChartWidget: SeasonalityAverageChartWidgetDef,
    SeasonalityHeatmapWidget: SeasonalityHeatmapWidgetDef,
    SeasonalityStackedChartWithBuilderWidget: SeasonalityStackedChartWithBuilderWidgetDef,
    SeasonalityMonthlyChartWithBuilderWidget: SeasonalityMonthlyChartWithBuilderWidgetDef,
    SeasonalityAverageChartWithBuilderWidget: SeasonalityAverageChartWithBuilderWidgetDef,
    SeasonalityHeatmapWithBuilderWidget: SeasonalityHeatmapWithBuilderWidgetDef,
    SeasonalityWatchlistWidget: SeasonalityWatchlistWidgetDef,
    SeasonalityAlertsWidget: SeasonalityAlertsWidgetDef,
}
