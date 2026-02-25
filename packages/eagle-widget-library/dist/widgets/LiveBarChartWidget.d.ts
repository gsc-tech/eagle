import type { BaseWidgetProps } from "../types";
/**
 * TvLiveBarChartWidget - A real-time bar/histogram chart widget using TradingView's Lightweight Charts
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
 * - Update: { type: 'update', data: { time/date: string|number|Date, value: number, color?: string, open?: number, close?: number } }
 */
export interface LiveBarChartWidgetProps extends BaseWidgetProps {
    upColor?: string;
    downColor?: string;
    backgroundColor?: string;
    textColor?: string;
    valueField?: string;
    colorMode?: "static" | "price-based" | "custom";
    staticColor?: string;
    showYAxis?: boolean;
    wsUrl?: string;
    timeFormat?: 'date' | 'time' | 'datetime';
}
export declare const LiveBarChartWidget: React.FC<LiveBarChartWidgetProps & {
    darkMode?: boolean;
}>;
export declare const LiveBarChartWidgetDef: {
    component: import("react").FC<LiveBarChartWidgetProps & {
        darkMode?: boolean;
    }>;
};
