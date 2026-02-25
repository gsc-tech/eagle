"use client"

import { useState } from "react";
import type { BaseWidgetProps, ParameterValues } from "../types";
import { useParameterDefaults } from "../hooks/useParameterDefaults";
import { WidgetContainer } from "../components/WidgetContainer";
import { useRealtimeWidgetData, type WebSocketMessage } from "../hooks/useRealtimeWidgetData";
import { ArrowLeft, ArrowRight } from "lucide-react";

export interface MarketDepthWidgetProps extends BaseWidgetProps {
    wsUrl?: string;
}

interface L1MarketData {
    bestBid: number | null;
    bestBidSize: number | null;
    bestAsk: number | null;
    bestAskSize: number | null;
    timestamp?: number;
}

export const MarketDepthWidget: React.FC<MarketDepthWidgetProps & { darkMode?: boolean }> = ({
    wsUrl = "",
    title,
    parameters,
    darkMode = false,
    groupedParametersValues,
    onGroupedParametersChange,
}) => {
    const [l1Data, setL1Data] = useState<L1MarketData>({
        bestBid: null,
        bestBidSize: null,
        bestAsk: null,
        bestAskSize: null,
    });

    const defaultParams = useParameterDefaults(parameters);
    const [currentParams, setCurrentParams] = useState<ParameterValues>(defaultParams);

    const { isConnected } = useRealtimeWidgetData({
        wsUrl: wsUrl as string,
        currentParams: currentParams,
        messageParser: (message: WebSocketMessage) => {
            if (message.type === 'update' && message.data) {
                // Parse L1 data from WebSocket message
                // Expected format: { bid, bidSize, ask, askSize }

                let parsedData: L1MarketData = {
                    bestBid: null,
                    bestBidSize: null,
                    bestAsk: null,
                    bestAskSize: null,
                    timestamp: Date.now(),
                };

                const data = message.data;

                parsedData.bestBid = Number(data.bid);
                parsedData.bestBidSize = Number(data.bidSize || 0);
                parsedData.bestAsk = Number(data.ask);
                parsedData.bestAskSize = Number(data.askSize || 0);

                return parsedData;
            }
            return null;
        },
        onUpdate: (data: L1MarketData) => {
            if (data) {
                setL1Data(data);
            }
        },
    });

    const handleParametersChange = (values: ParameterValues) => {
        setCurrentParams(values);
    };

    const formatNumber = (num: number | null, decimals: number = 2): string => {
        if (num === null || num === undefined) return '-';
        return num.toLocaleString(undefined, {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
        });
    };

    const calculateSpread = (): number | null => {
        if (l1Data.bestAsk !== null && l1Data.bestBid !== null) {
            return l1Data.bestAsk - l1Data.bestBid;
        }
        return null;
    };

    const calculateSpreadPercentage = (): number | null => {
        const spread = calculateSpread();
        if (spread !== null && l1Data.bestBid !== null && l1Data.bestBid > 0) {
            return (spread / l1Data.bestBid) * 100;
        }
        return null;
    };

    const spread = calculateSpread();
    const spreadPercentage = calculateSpreadPercentage();

    return (
        <WidgetContainer
            title={title}
            parameters={parameters}
            onParametersChange={handleParametersChange}
            darkMode={darkMode}
            groupedParametersValues={groupedParametersValues}
            onGroupedParametersChange={onGroupedParametersChange}
        >
            <div className={`flex items-center h-full w-full px-2 py-1 ${darkMode ? 'bg-gray-900' : 'bg-white'}`}>
                <div className="flex items-center w-full gap-2">

                    {/* Connection Indicator */}
                    <div
                        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 animate-pulse ${isConnected ? 'bg-chart-up' : 'bg-chart-down'}`}
                        title={isConnected ? 'Connected' : 'Disconnected'}
                    />

                    {/* Best Bid */}
                    <div className={`flex-1 flex items-center justify-between px-3 py-1.5 rounded-lg border relative overflow-hidden group ${darkMode
                        ? 'bg-bid/10 border-bid/20'
                        : 'bg-bid/10 border-bid/20'
                        }`}>
                        <div className="absolute inset-y-0 left-0 w-1 bg-bid opacity-50 group-hover:opacity-100 transition-opacity" />
                        <div className="flex flex-col">
                            <span className={`text-[10px] uppercase font-semibold tracking-wider ${darkMode ? 'text-gray-400' : 'text-text-secondary'}`}>Bid</span>
                            <span className="font-mono font-bold text-bid text-base leading-none">
                                {formatNumber(l1Data.bestBid, 2)}
                            </span>
                        </div>
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${darkMode ? 'text-gray-300 bg-gray-800/50' : 'text-text-secondary bg-white/50'}`}>
                            Vol: {formatNumber(l1Data.bestBidSize, 0)}
                        </span>
                    </div>

                    {/* Spread */}
                    <div className="flex flex-col items-center justify-center px-2 min-w-[60px]">
                        <div className="flex items-center gap-1 mb-0.5">
                            <ArrowLeft size={10} className="text-bid" />
                            <span className={`text-[10px] font-bold ${darkMode ? 'text-gray-500' : 'text-text-muted'}`}>SPREAD</span>
                            <ArrowRight size={10} className="text-ask" />
                        </div>
                        <span className={`font-mono text-xs font-bold ${darkMode ? 'text-gray-200' : 'text-text-primary'}`}>
                            {formatNumber(spread, 2)}
                        </span>
                        {spreadPercentage !== null && (
                            <span className={`text-[9px] font-mono ${darkMode ? 'text-gray-400' : 'text-text-secondary'}`}>
                                ({formatNumber(spreadPercentage, 3)}%)
                            </span>
                        )}
                    </div>

                    {/* Best Ask */}
                    <div className={`flex-1 flex items-center justify-between px-3 py-1.5 rounded-lg border relative overflow-hidden group ${darkMode
                        ? 'bg-ask/10 border-ask/20'
                        : 'bg-ask/10 border-ask/20'
                        }`}>
                        <div className="absolute inset-y-0 right-0 w-1 bg-ask opacity-50 group-hover:opacity-100 transition-opacity" />
                        <div className="flex flex-col">
                            <span className={`text-[10px] uppercase font-semibold tracking-wider ${darkMode ? 'text-gray-400' : 'text-text-secondary'}`}>Ask</span>
                            <span className="font-mono font-bold text-ask text-base leading-none">
                                {formatNumber(l1Data.bestAsk, 2)}
                            </span>
                        </div>
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${darkMode ? 'text-gray-300 bg-gray-800/50' : 'text-text-secondary bg-white/50'}`}>
                            Vol: {formatNumber(l1Data.bestAskSize, 0)}
                        </span>
                    </div>
                </div>
            </div>
        </WidgetContainer>
    );
};


export const MarketDepthWidgetDef = {
    component: MarketDepthWidget,
}