import type { BaseWidgetProps, ParameterValues } from "../types";
import { useEffect, useState, useRef } from "react";
import { TrendingUp, Plus, X } from "lucide-react";
import { SparkLineChart } from '@mui/x-charts/SparkLineChart';
import { LiveChartModal } from "../components/LiveChartModal";
import { WidgetContainer } from "../components/WidgetContainer";
import { useParameterDefaults } from "../hooks/useParameterDefaults";


export interface WatchListWidgetProps extends BaseWidgetProps {
    historicalDataUrl?: string;
    wsUrl?: string;
}

interface WatchListItem {
    symbol: string;
    name: string;
    price: number;
    changePercent: number;
    data: number[];
}

interface SymbolStoreItem {
    symbol: string
    name: string
    price: number
    changePercent: number
    sparkLine: number[]
    lastSeq: number
}


const WatchListWidget: React.FC<WatchListWidgetProps> = ({
    apiUrl = "http://localhost:8080/api/data",
    historicalDataUrl = "http://localhost:8080/api/data",
    wsUrl = "ws://localhost:8080/api/ws",
    parameters,
    title = "Watchlist",
    darkMode = false,
    onGroupedParametersChange,
    groupedParametersValues,
    initialWidgetState,
    onWidgetStateChange,
}) => {
    const [watchList, setWatchList] = useState<WatchListItem[]>([]);
    const [symbols, setSymbols] = useState<string[]>(() => initialWidgetState?.symbols || []);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newSymbol, setNewSymbol] = useState("");
    const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const storeRef = useRef<Map<string, SymbolStoreItem>>(new Map());

    const defaultParams = useParameterDefaults(parameters);
    const [currentParams, setCurrentParams] = useState<ParameterValues>(() => {
        return initialWidgetState?.parameters || defaultParams;
    });

    useEffect(() => {
        if (onWidgetStateChange) {
            onWidgetStateChange({ parameters: currentParams, symbols });
        }
    }, [currentParams, symbols, onWidgetStateChange]);

    const handleParametersChange = (values: ParameterValues) => {
        setCurrentParams(values);
    };

    useEffect(() => {
        if (!wsUrl) return;

        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
            ws.send(JSON.stringify({ type: "subscribe", symbols }));
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
                    if (!item) return;
                    if (msg.seq <= item.lastSeq) return;
                    item.lastSeq = msg.seq;
                    item.price = msg.price;
                    item.sparkLine.push(msg.price);
                    if (item.sparkLine.length > 30) item.sparkLine.shift();
                }
            } catch (error) {
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
            const next: WatchListItem[] = [];
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
        return () => clearInterval(id);
    }, []);

    const handleAddSymbol = () => {
        if (!newSymbol) return;
        setSymbols(prev => [...prev, newSymbol]);
        if (wsRef.current) {
            wsRef.current.send(JSON.stringify({ type: "subscribe", symbols: [newSymbol] }));
        }
        setNewSymbol("");
        setShowAddForm(false);
    };

    const handleRemoveSymbol = (symbolToRemove: string) => {
        storeRef.current.delete(symbolToRemove);
        if (wsRef.current) {
            wsRef.current.send(JSON.stringify({ type: "unsubscribe", symbols: [symbolToRemove] }));
        }
        setSymbols(prev => prev.filter(s => s !== symbolToRemove));
    };

    return (
        <WidgetContainer
            parameters={parameters}
            onParametersChange={handleParametersChange}
            darkMode={darkMode}
            initialParameterValues={currentParams}
            onGroupedParametersChange={onGroupedParametersChange}
            groupedParametersValues={groupedParametersValues}
        >
            <div className="flex drag-handle flex-col h-full p-4 font-sans relative">
                {/* Header */}
                <div className="flex justify-between items-center mb-4 px-1">
                    <div className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                        <h2 className="font-semibold text-lg text-slate-800 dark:text-[#f5f5f5]">Watchlist movers</h2>
                    </div>
                    <button
                        onClick={() => setShowAddForm(!showAddForm)}
                        className={`p-1.5 rounded-lg transition-colors ${showAddForm
                            ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400'
                            : 'text-slate-600 dark:text-[#909090] hover:bg-white/50 dark:hover:bg-[#222222] hover:text-slate-900 dark:hover:text-[#f0f0f0]'}`}
                    >
                        <Plus className={`w-5 h-5 transition-transform duration-200 ${showAddForm ? 'rotate-45' : ''}`} />
                    </button>
                </div>

                {/* Inline Add Symbol Form */}
                {showAddForm && (
                    <div className="mb-3 animate-in slide-in-from-top-2 duration-200">
                        <div className="flex gap-2 p-1.5 rounded-xl border transition-all bg-white/60 dark:bg-[#1a1a1a] border-white/50 dark:border-[#2e2e2e] focus-within:bg-white dark:focus-within:bg-[#1a1a1a] focus-within:shadow-sm focus-within:border-blue-200 dark:focus-within:border-blue-500">
                            <input
                                autoFocus
                                type="text"
                                value={newSymbol}
                                onChange={(e) => setNewSymbol(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleAddSymbol();
                                    if (e.key === 'Escape') setShowAddForm(false);
                                }}
                                placeholder="Add symbol (e.g. TSLA)..."
                                className="flex-1 px-2 py-1 bg-transparent text-sm focus:outline-none font-medium text-slate-700 dark:text-[#f0f0f0] placeholder:text-slate-400 dark:placeholder:text-[#606060]"
                            />
                            <button
                                onClick={handleAddSymbol}
                                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm"
                            >
                                Add
                            </button>
                        </div>
                    </div>
                )}

                {/* List */}
                <div className="flex flex-col gap-3 overflow-y-auto pr-1 flex-1">
                    {watchList.map((item) => {
                        const isPositive = item.changePercent >= 0;
                        return (
                            <div
                                key={item.symbol}
                                onClick={() => setSelectedSymbol(item.symbol)}
                                className="p-3 rounded-xl shadow-sm border transition-all cursor-pointer group flex items-center justify-between bg-white/80 dark:bg-[#1a1a1a] backdrop-blur-sm border-white/50 dark:border-[#2e2e2e] hover:shadow-md dark:hover:bg-[#2e2e2e]/80"
                            >
                                {/* Symbol & Name */}
                                <div className="flex flex-col min-w-[100px]">
                                    <span className="font-bold text-base text-slate-800 dark:text-[#f5f5f5]">{item.symbol}</span>
                                    <span className="text-xs truncate max-w-[120px] text-slate-500 dark:text-[#909090]">{item.name}</span>
                                </div>

                                {/* Sparkline */}
                                <div className="flex-1 flex justify-end px-2">
                                    <SparkLineChart
                                        data={item.data.slice(-30)}
                                        color={isPositive ? (darkMode ? '#4ade80' : 'green') : (darkMode ? '#f87171' : 'red')}
                                        width={100}
                                        height={50}
                                        showTooltip={true}
                                        showHighlight={true}
                                    />
                                </div>

                                {/* Price & Change */}
                                <div className="flex flex-col items-end min-w-[80px]">
                                    <span className={`text-sm font-semibold ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                        {isPositive ? "+" : ""}{Number(item.changePercent).toFixed(2)}%
                                    </span>
                                    <span className="font-medium text-slate-700 dark:text-[#f0f0f0]">{item.price}</span>
                                </div>

                                {/* Remove Button */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemoveSymbol(item.symbol);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 ml-2 p-1.5 rounded-lg transition-all text-slate-400 dark:text-[#606060] hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-500 dark:hover:text-red-400"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        );
                    })}
                </div>
                <LiveChartModal
                    isOpen={!!selectedSymbol}
                    onClose={() => setSelectedSymbol(null)}
                    symbol={selectedSymbol || ""}
                    historicalDataUrl={historicalDataUrl}
                    darkMode={darkMode}
                />
            </div>
        </WidgetContainer>
    );
};

export default WatchListWidget;


export const WatchListWidgetDef = {
    component: WatchListWidget,
}
