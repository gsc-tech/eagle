import React from "react";
import type { BaseWidgetProps } from "../types";
/**
 * TvLiveLineChartWidget - A real-time line chart widget using TradingView's Lightweight Charts
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
 * - Update: { type: 'update', data: { date: string|number|Date, value: number } }
 */
export interface TvLiveLineChartWidgetProps extends BaseWidgetProps {
    lineColor?: string;
    lineWidth?: number;
    wsUrl?: string;
    timeFormat?: 'date' | 'time' | 'datetime';
}
declare const TvLiveLineChartWidget: React.FC<TvLiveLineChartWidgetProps & {
    darkMode?: boolean;
}>;
export default TvLiveLineChartWidget;
export declare const TvLiveLineChartWidgetDef: {
    component: React.FC<TvLiveLineChartWidgetProps & {
        darkMode?: boolean;
    }>;
};
