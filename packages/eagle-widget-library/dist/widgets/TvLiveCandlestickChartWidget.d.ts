import React from "react";
import type { BaseWidgetProps } from "../types";
/**
 * TvLiveCandlestickChartWidget - A real-time candlestick chart widget using TradingView's Lightweight Charts
 *
 * This widget combines REST API for initial data and WebSocket for real-time updates.
 *
 * Data Flow:
 * 1. Initial load: Fetches historical data via REST API (apiUrl)
 * 2. Real-time updates: Receives live data via WebSocket (wsUrl)
 *
 * Parameter Change Flow:
 * When parameters change, the following sequence occurs:
 * 1. Unsubscribe from previous WebSocket subscription (if exists)
 * 2. Fetch new initial data via REST API (automatic via useWidgetData)
 * 3. Subscribe to WebSocket with new parameters
 *
 * WebSocket Message Format:
 * - Subscribe: { type: 'subscribe', params: { ...parameterValues } }
 * - Unsubscribe: { type: 'unsubscribe', params: { ...parameterValues } }
 * - Update: { type: 'update', data: { date: string|number|Date, open: number, high: number, low: number, close: number } }
 */
export interface TvLiveCandlestickChartWidgetProps extends BaseWidgetProps {
    upColor?: string;
    downColor?: string;
    wickUpColor?: string;
    wickDownColor?: string;
    borderVisible?: boolean;
    wsUrl?: string;
    timeFormat?: 'date' | 'time' | 'datetime';
}
declare const TvLiveCandlestickChartWidget: React.FC<TvLiveCandlestickChartWidgetProps & {
    darkMode?: boolean;
}>;
export default TvLiveCandlestickChartWidget;
export declare const TvLiveCandlestickChartWidgetDef: {
    component: React.FC<TvLiveCandlestickChartWidgetProps & {
        darkMode?: boolean;
    }>;
};
