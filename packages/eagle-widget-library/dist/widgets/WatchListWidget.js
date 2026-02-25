import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState, useRef } from "react";
import { TrendingUp, Plus, X } from "lucide-react";
import { SparkLineChart } from '@mui/x-charts/SparkLineChart';
import { LiveChartModal } from "../components/LiveChartModal";
import { WidgetContainer } from "../components/WidgetContainer";
import { useParameterDefaults } from "../hooks/useParameterDefaults";
const WatchListWidget = ({ apiUrl = "http://localhost:8080/api/data", historicalDataUrl = "http://localhost:8080/api/data", wsUrl = "ws://localhost:8080/api/ws", parameters, title = "Watchlist", darkMode = false, onGroupedParametersChange, groupedParametersValues, }) => {
    const [watchList, setWatchList] = useState([]);
    const [symbols, setSymbols] = useState([]);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newSymbol, setNewSymbol] = useState("");
    const [selectedSymbol, setSelectedSymbol] = useState(null);
    const wsRef = useRef(null);
    const storeRef = useRef(new Map());
    const defaultParams = useParameterDefaults(parameters);
    const [currentParams, setCurrentParams] = useState(defaultParams);
    const handleParametersChange = (values) => {
        setCurrentParams(values);
    };
    // WebSocket Connection
    useEffect(() => {
        if (!wsUrl)
            return;
        console.log("wsUrl", wsUrl);
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;
        ws.onopen = () => {
            ws.send(JSON.stringify({
                type: "subscribe",
                symbols,
            }));
        };
        ws.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);
                if (msg.type === "snapshot") {
                    storeRef.current.set(msg.symbol, {
                        symbol: msg.symbol,
                        name: msg.name,
                        price: msg.price,
                        changePercent: msg.changePercent,
                        sparkLine: (msg.sparkLine || []),
                        lastSeq: msg.seq ?? 0,
                    });
                    return;
                }
                if (msg.type === "tick") {
                    const item = storeRef.current.get(msg.symbol);
                    if (!item)
                        return;
                    if (msg.seq <= item.lastSeq)
                        return;
                    item.lastSeq = msg.seq;
                    item.price = msg.price;
                    item.sparkLine.push(msg.price);
                    if (item.sparkLine.length > 30)
                        item.sparkLine.shift();
                }
            }
            catch (error) {
                console.error("WS Parse Error", error);
            }
        };
        return () => {
            ws.close();
            wsRef.current = null;
        };
    }, [wsUrl]);
    useEffect(() => {
        const id = setInterval(() => {
            const next = [];
            storeRef.current.forEach((s) => {
                next.push({
                    symbol: s.symbol,
                    name: s.name,
                    price: Number(s.price.toFixed(2)),
                    changePercent: s.changePercent,
                    data: s.sparkLine,
                });
            });
            setWatchList(next);
        }, 100);
        return () => {
            clearInterval(id);
        };
    }, []);
    const handleAddSymbol = () => {
        if (!newSymbol)
            return;
        setSymbols(prev => [...prev, newSymbol]);
        console.log("ws", wsRef.current);
        if (wsRef.current) {
            console.log("sending subscribe request");
            wsRef.current.send(JSON.stringify({
                type: "subscribe",
                symbols: [newSymbol],
            }));
        }
        setNewSymbol("");
        setShowAddForm(false);
    };
    const handleRemoveSymbol = (symbolToRemove) => {
        storeRef.current.delete(symbolToRemove);
        if (wsRef.current) {
            wsRef.current.send(JSON.stringify({
                type: "unsubscribe",
                symbols: [symbolToRemove],
            }));
        }
        setSymbols(prev => prev.filter(s => s !== symbolToRemove));
    };
    // Derived selected item for the modal to get live updates
    const selectedItem = watchList.find(i => i.symbol === selectedSymbol);
    const getSymbolStore = (symbol) => {
        return storeRef.current.get(symbol);
    };
    return (_jsx(WidgetContainer, { parameters: parameters, onParametersChange: handleParametersChange, darkMode: darkMode, onGroupedParametersChange: onGroupedParametersChange, groupedParametersValues: groupedParametersValues, children: _jsxs("div", { className: "flex drag-handle flex-col h-full p-4 font-sans relative", children: [_jsxs("div", { className: "flex justify-between items-center mb-4 px-1", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(TrendingUp, { className: `w-5 h-5 ${darkMode ? 'text-green-400' : 'text-green-600'}` }), _jsx("h2", { className: `font-semibold text-lg ${darkMode ? 'text-gray-100' : 'text-slate-800'}`, children: "Watchlist movers" })] }), _jsx("button", { onClick: () => setShowAddForm(!showAddForm), className: `p-1.5 rounded-lg transition-colors ${showAddForm
                                ? (darkMode ? 'bg-blue-900/50 text-blue-400' : 'bg-blue-100 text-blue-600')
                                : (darkMode ? 'hover:bg-gray-800 text-gray-400 hover:text-gray-200' : 'hover:bg-white/50 text-slate-600 hover:text-slate-900')}`, children: _jsx(Plus, { className: `w-5 h-5 transition-transform duration-200 ${showAddForm ? 'rotate-45' : ''}` }) })] }), showAddForm && (_jsx("div", { className: "mb-3 animate-in slide-in-from-top-2 duration-200", children: _jsxs("div", { className: `flex gap-2 p-1.5 rounded-xl border transition-all ${darkMode
                            ? 'bg-gray-800 border-gray-700 focus-within:border-blue-500'
                            : 'bg-white/60 border-white/50 focus-within:bg-white focus-within:shadow-sm focus-within:border-blue-200'}`, children: [_jsx("input", { autoFocus: true, type: "text", value: newSymbol, onChange: (e) => setNewSymbol(e.target.value), onKeyDown: (e) => {
                                    if (e.key === 'Enter')
                                        handleAddSymbol();
                                    if (e.key === 'Escape')
                                        setShowAddForm(false);
                                }, placeholder: "Add symbol (e.g. TSLA)...", className: `flex-1 px-2 py-1 bg-transparent text-sm focus:outline-none font-medium ${darkMode ? 'text-gray-200 placeholder:text-gray-500' : 'text-slate-700 placeholder:text-slate-400'}` }), _jsx("button", { onClick: handleAddSymbol, className: "px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm", children: "Add" })] }) })), _jsx("div", { className: "flex flex-col gap-3 overflow-y-auto pr-1 flex-1", children: watchList.map((item) => {
                        const isPositive = item.changePercent >= 0;
                        return (_jsxs("div", { onClick: () => setSelectedSymbol(item.symbol), className: `p-3 rounded-xl shadow-sm border transition-all cursor-pointer group flex items-center justify-between ${darkMode
                                ? 'bg-gray-800 border-gray-700 hover:bg-gray-750 hover:shadow-md'
                                : 'bg-white/80 backdrop-blur-sm border-white/50 hover:shadow-md'}`, children: [_jsxs("div", { className: "flex flex-col min-w-[100px]", children: [_jsx("span", { className: `font-bold text-base ${darkMode ? 'text-gray-100' : 'text-slate-800'}`, children: item.symbol }), _jsx("span", { className: `text-xs truncate max-w-[120px] ${darkMode ? 'text-gray-400' : 'text-slate-500'}`, children: item.name })] }), _jsx("div", { className: "flex-1 flex justify-end px-2", children: _jsx(SparkLineChart, { data: item.data.slice(-30), color: isPositive ? (darkMode ? '#4ade80' : 'green') : (darkMode ? '#f87171' : 'red'), width: 100, height: 50, showTooltip: true, showHighlight: true }) }), _jsxs("div", { className: "flex flex-col items-end min-w-[80px]", children: [_jsxs("span", { className: `text-sm font-semibold ${isPositive
                                                ? (darkMode ? 'text-green-400' : 'text-green-600')
                                                : (darkMode ? 'text-red-400' : 'text-red-600')}`, children: [isPositive ? "+" : "", Number(item.changePercent).toFixed(2), "%"] }), _jsx("span", { className: `font-medium ${darkMode ? 'text-gray-200' : 'text-slate-700'}`, children: item.price })] }), _jsx("button", { onClick: (e) => {
                                        e.stopPropagation();
                                        handleRemoveSymbol(item.symbol);
                                    }, className: `opacity-0 group-hover:opacity-100 ml-2 p-1.5 rounded-lg transition-all ${darkMode
                                        ? 'hover:bg-red-900/30 text-gray-500 hover:text-red-400'
                                        : 'hover:bg-red-50 text-slate-400 hover:text-red-500'}`, children: _jsx(X, { className: "w-4 h-4" }) })] }, item.symbol));
                    }) }), _jsx(LiveChartModal, { isOpen: !!selectedSymbol, onClose: () => setSelectedSymbol(null), symbol: selectedSymbol || "", historicalDataUrl: historicalDataUrl, darkMode: darkMode })] }) }));
};
export default WatchListWidget;
export const WatchListWidgetDef = {
    component: WatchListWidget,
};
