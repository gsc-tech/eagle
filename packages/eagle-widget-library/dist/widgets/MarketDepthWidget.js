"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useParameterDefaults } from "../hooks/useParameterDefaults";
import { WidgetContainer } from "../components/WidgetContainer";
import { useRealtimeWidgetData } from "../hooks/useRealtimeWidgetData";
import { ArrowLeft, ArrowRight } from "lucide-react";
export const MarketDepthWidget = ({ wsUrl = "", title, parameters, darkMode = false, groupedParametersValues, onGroupedParametersChange, }) => {
    const [l1Data, setL1Data] = useState({
        bestBid: null,
        bestBidSize: null,
        bestAsk: null,
        bestAskSize: null,
    });
    const defaultParams = useParameterDefaults(parameters);
    const [currentParams, setCurrentParams] = useState(defaultParams);
    const { isConnected } = useRealtimeWidgetData({
        wsUrl: wsUrl,
        currentParams: currentParams,
        messageParser: (message) => {
            if (message.type === 'update' && message.data) {
                // Parse L1 data from WebSocket message
                // Expected format: { bid, bidSize, ask, askSize }
                let parsedData = {
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
        onUpdate: (data) => {
            if (data) {
                setL1Data(data);
            }
        },
    });
    const handleParametersChange = (values) => {
        setCurrentParams(values);
    };
    const formatNumber = (num, decimals = 2) => {
        if (num === null || num === undefined)
            return '-';
        return num.toLocaleString(undefined, {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
        });
    };
    const calculateSpread = () => {
        if (l1Data.bestAsk !== null && l1Data.bestBid !== null) {
            return l1Data.bestAsk - l1Data.bestBid;
        }
        return null;
    };
    const calculateSpreadPercentage = () => {
        const spread = calculateSpread();
        if (spread !== null && l1Data.bestBid !== null && l1Data.bestBid > 0) {
            return (spread / l1Data.bestBid) * 100;
        }
        return null;
    };
    const spread = calculateSpread();
    const spreadPercentage = calculateSpreadPercentage();
    return (_jsx(WidgetContainer, { title: title, parameters: parameters, onParametersChange: handleParametersChange, darkMode: darkMode, groupedParametersValues: groupedParametersValues, onGroupedParametersChange: onGroupedParametersChange, children: _jsx("div", { className: `flex items-center h-full w-full px-2 py-1 ${darkMode ? 'bg-gray-900' : 'bg-white'}`, children: _jsxs("div", { className: "flex items-center w-full gap-2", children: [_jsx("div", { className: `w-1.5 h-1.5 rounded-full flex-shrink-0 animate-pulse ${isConnected ? 'bg-chart-up' : 'bg-chart-down'}`, title: isConnected ? 'Connected' : 'Disconnected' }), _jsxs("div", { className: `flex-1 flex items-center justify-between px-3 py-1.5 rounded-lg border relative overflow-hidden group ${darkMode
                            ? 'bg-bid/10 border-bid/20'
                            : 'bg-bid/10 border-bid/20'}`, children: [_jsx("div", { className: "absolute inset-y-0 left-0 w-1 bg-bid opacity-50 group-hover:opacity-100 transition-opacity" }), _jsxs("div", { className: "flex flex-col", children: [_jsx("span", { className: `text-[10px] uppercase font-semibold tracking-wider ${darkMode ? 'text-gray-400' : 'text-text-secondary'}`, children: "Bid" }), _jsx("span", { className: "font-mono font-bold text-bid text-base leading-none", children: formatNumber(l1Data.bestBid, 2) })] }), _jsxs("span", { className: `text-[10px] font-mono px-1.5 py-0.5 rounded ${darkMode ? 'text-gray-300 bg-gray-800/50' : 'text-text-secondary bg-white/50'}`, children: ["Vol: ", formatNumber(l1Data.bestBidSize, 0)] })] }), _jsxs("div", { className: "flex flex-col items-center justify-center px-2 min-w-[60px]", children: [_jsxs("div", { className: "flex items-center gap-1 mb-0.5", children: [_jsx(ArrowLeft, { size: 10, className: "text-bid" }), _jsx("span", { className: `text-[10px] font-bold ${darkMode ? 'text-gray-500' : 'text-text-muted'}`, children: "SPREAD" }), _jsx(ArrowRight, { size: 10, className: "text-ask" })] }), _jsx("span", { className: `font-mono text-xs font-bold ${darkMode ? 'text-gray-200' : 'text-text-primary'}`, children: formatNumber(spread, 2) }), spreadPercentage !== null && (_jsxs("span", { className: `text-[9px] font-mono ${darkMode ? 'text-gray-400' : 'text-text-secondary'}`, children: ["(", formatNumber(spreadPercentage, 3), "%)"] }))] }), _jsxs("div", { className: `flex-1 flex items-center justify-between px-3 py-1.5 rounded-lg border relative overflow-hidden group ${darkMode
                            ? 'bg-ask/10 border-ask/20'
                            : 'bg-ask/10 border-ask/20'}`, children: [_jsx("div", { className: "absolute inset-y-0 right-0 w-1 bg-ask opacity-50 group-hover:opacity-100 transition-opacity" }), _jsxs("div", { className: "flex flex-col", children: [_jsx("span", { className: `text-[10px] uppercase font-semibold tracking-wider ${darkMode ? 'text-gray-400' : 'text-text-secondary'}`, children: "Ask" }), _jsx("span", { className: "font-mono font-bold text-ask text-base leading-none", children: formatNumber(l1Data.bestAsk, 2) })] }), _jsxs("span", { className: `text-[10px] font-mono px-1.5 py-0.5 rounded ${darkMode ? 'text-gray-300 bg-gray-800/50' : 'text-text-secondary bg-white/50'}`, children: ["Vol: ", formatNumber(l1Data.bestAskSize, 0)] })] })] }) }) }));
};
export const MarketDepthWidgetDef = {
    component: MarketDepthWidget,
};
