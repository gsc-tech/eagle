import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, LineSeries, Time } from 'lightweight-charts';
import { X } from 'lucide-react';

interface LiveChartModalProps {
    isOpen: boolean;
    onClose: () => void;
    symbol: string;
    historicalDataUrl?: string;
    darkMode?: boolean;
}

// const generateDummyData = () => {
//     const data = [];
//     let price = 100;
//     const now = new Date();
//     for (let i = 0; i < 100; i++) {
//         price = price + (Math.random() - 0.5) * 5;
//         const date = new Date(now.getTime() - (100 - i) * 60000 * 60 * 24); // Daily points roughly
//         data.push({
//             time: date.toISOString().split('T')[0],
//             value: Number(price.toFixed(2))
//         });
//     }
//     return data;
// };

interface LineData {
    time: Time;
    value: number;
}

export const LiveChartModal: React.FC<LiveChartModalProps> = ({ isOpen, onClose, symbol, historicalDataUrl, darkMode = false }) => {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<any>(null);
    const seriesRef = useRef<any>(null);
    const [data, setData] = useState<LineData[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            const response = await fetch(`${historicalDataUrl}?symbol=${symbol}`);
            const data = await response.json();
            const fomattedData = data.map((item: any) => ({
                time: new Date(item.date).getTime() / 1000 as Time,
                value: item.value
            }));
            setData(fomattedData);
        };
        fetchData();
    }, [historicalDataUrl, symbol]);

    useEffect(() => {
        if (!isOpen || !chartContainerRef.current) return;

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
            if (entries.length === 0 || !entries[0].target) return;
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

    if (!isOpen) return null;

    return (
        <div className={`absolute inset-0 z-50 flex flex-col rounded-2xl overflow-hidden animate-in fade-in duration-200 ${darkMode ? 'bg-[#111827]' : 'bg-white'}`}>
            {/* Header */}
            <div className={`flex items-center justify-between p-3 border-b shrink-0 ${darkMode ? 'border-gray-800 bg-gray-900/50' : 'border-slate-100 bg-slate-50/50'}`}>
                <div className="min-w-0">
                    <h2 className={`text-base font-bold truncate ${darkMode ? 'text-gray-100' : 'text-slate-800'}`}>{symbol}</h2>
                    <span className={`text-xs hidden sm:block ${darkMode ? 'text-gray-400' : 'text-slate-500'}`}>Historical Price Action</span>
                </div>
                <button
                    onClick={onClose}
                    className={`p-1.5 rounded-lg transition-colors ${darkMode ? 'hover:bg-gray-800 text-gray-400 hover:text-gray-200' : 'hover:bg-slate-200/50 text-slate-500 hover:text-slate-800'}`}
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Chart Container */}
            <div className={`flex-1 w-full min-h-0 relative p-2 ${darkMode ? 'bg-[#111827]' : 'bg-white'}`}>
                <div
                    ref={chartContainerRef}
                    className="w-full h-full"
                />
            </div>
        </div>
    );
};
