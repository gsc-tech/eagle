import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, LineSeries } from 'lightweight-charts';
import { X } from 'lucide-react';
export const LiveChartModal = ({ isOpen, onClose, symbol, historicalDataUrl, darkMode = false }) => {
    const chartContainerRef = useRef(null);
    const chartRef = useRef(null);
    const seriesRef = useRef(null);
    const [data, setData] = useState([]);
    useEffect(() => {
        const fetchData = async () => {
            const response = await fetch(`${historicalDataUrl}?symbol=${symbol}`);
            const data = await response.json();
            const fomattedData = data.map((item) => ({
                time: new Date(item.date).getTime() / 1000,
                value: item.value
            }));
            setData(fomattedData);
        };
        fetchData();
    }, [historicalDataUrl, symbol]);
    useEffect(() => {
        if (!isOpen || !chartContainerRef.current)
            return;
        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: 'transparent' },
                textColor: darkMode ? '#94a3b8' : '#334155',
            },
            grid: {
                vertLines: { color: darkMode ? 'rgba(148, 163, 184, 0.05)' : 'rgba(197, 203, 206, 0.1)' },
                horzLines: { color: darkMode ? 'rgba(148, 163, 184, 0.05)' : 'rgba(197, 203, 206, 0.1)' },
            },
            width: chartContainerRef.current.clientWidth,
            height: chartContainerRef.current.clientHeight,
            timeScale: {
                borderColor: darkMode ? 'rgba(148, 163, 184, 0.2)' : 'rgba(197, 203, 206, 0.3)',
            },
            rightPriceScale: {
                borderColor: darkMode ? 'rgba(148, 163, 184, 0.2)' : 'rgba(197, 203, 206, 0.3)',
                scaleMargins: {
                    top: 0.1,
                    bottom: 0.1,
                },
            },
        });
        chartRef.current = chart;
        const lineSeries = chart.addSeries(LineSeries, {
            color: '#2563eb', // Blue-600
            lineWidth: 2,
            crosshairMarkerVisible: true,
            lastValueVisible: true,
            priceLineVisible: false,
        });
        seriesRef.current = lineSeries;
        if (data.length > 0) {
            lineSeries.setData(data);
        }
        chart.timeScale().fitContent();
        const resizeObserver = new ResizeObserver((entries) => {
            if (entries.length === 0 || !entries[0].target)
                return;
            const newRect = entries[0].contentRect;
            chart.applyOptions({ width: newRect.width, height: newRect.height });
        });
        resizeObserver.observe(chartContainerRef.current);
        return () => {
            resizeObserver.disconnect();
            chart.remove();
            chartRef.current = null;
        };
    }, [isOpen, symbol, darkMode]);
    useEffect(() => {
        if (data.length > 0 && seriesRef.current) {
            seriesRef.current.setData(data);
        }
    }, [data]);
    if (!isOpen)
        return null;
    return (_jsxs("div", { className: `absolute inset-0 z-50 flex flex-col rounded-2xl overflow-hidden animate-in fade-in duration-200 ${darkMode ? 'bg-[#111827]' : 'bg-white'}`, children: [_jsxs("div", { className: `flex items-center justify-between p-3 border-b shrink-0 ${darkMode ? 'border-gray-800 bg-gray-900/50' : 'border-slate-100 bg-slate-50/50'}`, children: [_jsxs("div", { className: "min-w-0", children: [_jsx("h2", { className: `text-base font-bold truncate ${darkMode ? 'text-gray-100' : 'text-slate-800'}`, children: symbol }), _jsx("span", { className: `text-xs hidden sm:block ${darkMode ? 'text-gray-400' : 'text-slate-500'}`, children: "Historical Price Action" })] }), _jsx("button", { onClick: onClose, className: `p-1.5 rounded-lg transition-colors ${darkMode ? 'hover:bg-gray-800 text-gray-400 hover:text-gray-200' : 'hover:bg-slate-200/50 text-slate-500 hover:text-slate-800'}`, children: _jsx(X, { className: "w-4 h-4" }) })] }), _jsx("div", { className: `flex-1 w-full min-h-0 relative p-2 ${darkMode ? 'bg-[#111827]' : 'bg-white'}`, children: _jsx("div", { ref: chartContainerRef, className: "w-full h-full" }) })] }));
};
