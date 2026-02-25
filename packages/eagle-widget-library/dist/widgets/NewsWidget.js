"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { AnimatePresence, motion } from "framer-motion";
import { Clock, ExternalLink } from "lucide-react";
import { useState } from "react";
import { useWidgetData } from "../hooks/useWidgetData";
import { useParameterDefaults } from "../hooks/useParameterDefaults";
import { WidgetContainer } from "../components/WidgetContainer";
export const NewsWidget = ({ apiUrl = "http://localhost:8080/api/data", title, parameters, darkMode = false, groupedParametersValues, onGroupedParametersChange, }) => {
    const defaultParams = useParameterDefaults(parameters);
    const [currentParams, setCurrentParams] = useState(defaultParams);
    const { data: news } = useWidgetData(apiUrl, {
        pollInterval: 1000,
        parameters: currentParams,
    });
    const handleParametersChange = (values) => {
        setCurrentParams(values);
    };
    const formatTime = (timestamp) => {
        const diff = Date.now() - timestamp;
        const minutes = Math.floor(diff / 60000);
        if (minutes < 60)
            return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24)
            return `${hours}h ago`;
        return new Date(timestamp).toLocaleDateString();
    };
    const getCategoryColor = (category) => {
        switch (category) {
            case "Crypto": return "#F7931A";
            case "Stocks": return "#2962FF";
            case "Macro": return "#00897B";
            case "Commodities": return "#8D6E63";
            default: return "#78909C";
        }
    };
    return (_jsx(WidgetContainer, { title: title, parameters: parameters, onParametersChange: handleParametersChange, darkMode: darkMode, onGroupedParametersChange: onGroupedParametersChange, groupedParametersValues: groupedParametersValues, children: _jsx("div", { className: "overflow-y-auto p-0 h-full", children: _jsx(AnimatePresence, { children: news.map((item, index) => (_jsxs(motion.div, { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { delay: index * 0.1 }, className: `p-4 border-b cursor-pointer transition-colors ${darkMode
                        ? 'border-gray-800 hover:bg-gray-800'
                        : 'border-gray-100 hover:bg-bg-light'}`, children: [_jsxs("div", { className: "flex justify-between items-center mb-2", children: [_jsx("span", { className: "text-[10px] font-semibold px-2 py-0.5 rounded-xl uppercase", style: {
                                        backgroundColor: `${getCategoryColor(item.category)}20`,
                                        color: getCategoryColor(item.category)
                                    }, children: item.category }), _jsxs("span", { className: `text-[11px] flex items-center ${darkMode ? 'text-gray-400' : 'text-text-secondary'}`, children: [_jsx(Clock, { size: 12, className: "mr-1" }), formatTime(item.timestamp)] })] }), _jsx("h3", { className: `text-sm font-semibold m-0 mb-1 leading-snug ${darkMode ? 'text-gray-100' : 'text-text-primary'}`, children: item.headline }), _jsx("p", { className: `text-xs m-0 mb-2 leading-relaxed ${darkMode ? 'text-gray-400' : 'text-text-muted'}`, children: item.summary }), _jsxs("a", { href: item.url, className: `text-[11px] ${darkMode ? 'text-blue-400' : 'text-blue-600'} no-underline flex items-center font-medium`, children: ["Read more ", _jsx(ExternalLink, { size: 12, className: "ml-1" })] })] }, item.id))) }) }) }));
};
export const NewsWidgetDef = {
    component: NewsWidget,
};
