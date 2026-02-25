import type { Meta, StoryObj } from "@storybook/react";
import { MarketDepthWidget } from "../widgets/MarketDepthWidget";
import { mockMarketDepthData, mockMarketDepthDataWide, mockMarketDepthDataTight } from "./mocks/mockWidgetData";
import { useState } from "react";
import { WidgetContainer } from "../components/WidgetContainer";
import type { BaseWidgetProps } from "../types";

interface L1MarketData {
    bestBid: number | null;
    bestBidSize: number | null;
    bestAsk: number | null;
    bestAskSize: number | null;
    timestamp?: number;
}

interface MarketDepthStoryProps extends BaseWidgetProps {
    dummyData: L1MarketData;
}

const MarketDepthStoryWrapper: React.FC<MarketDepthStoryProps> = ({
    parameters = [],
    fetchMode = 'manual',
    dummyData,
}) => {
    const [l1Data] = useState<L1MarketData>(dummyData);

    const formatNumber = (num: number | null, decimals: number = 2): string => {
        if (num === null || num === undefined) return '-';
        if (decimals === 0) return Math.round(num).toLocaleString(); // Handle volume
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
    const isConnected = true; // Always connected in storybook

    // Helper for icons (simulating lucide-react usage in story wrapper if imports missing, 
    // but better to rely on simple spans or SVG if icons not imported. 
    // The previous file didn't import icons. I will add imports in a separate step if needed or just use text indicators if cleaner,
    // but the task is to consistency. The original widget uses lucide-react. 
    // I can assume imports are available as it is in the same repo project.)

    return (
        <WidgetContainer
            parameters={parameters}
            onParametersChange={() => { }}
            fetchMode={fetchMode}
        >
            <div className="flex items-center h-full w-full px-2 py-1 bg-white">
                <div className="flex items-center w-full gap-2">

                    {/* Connection Indicator */}
                    <div
                        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 animate-pulse ${isConnected ? 'bg-chart-up' : 'bg-chart-down'}`}
                        title={isConnected ? 'Connected' : 'Disconnected'}
                    />

                    {/* Best Bid */}
                    <div className="flex-1 flex items-center justify-between px-3 py-1.5 rounded-lg bg-bid/10 border border-bid/20 relative overflow-hidden group">
                        <div className="absolute inset-y-0 left-0 w-1 bg-bid opacity-50 group-hover:opacity-100 transition-opacity" />
                        <div className="flex flex-col">
                            <span className="text-[10px] uppercase text-text-secondary font-semibold tracking-wider">Bid</span>
                            <span className="font-mono font-bold text-bid text-base leading-none">
                                {formatNumber(l1Data.bestBid, 2)}
                            </span>
                        </div>
                        <span className="text-[10px] font-mono text-text-secondary bg-white/50 px-1.5 py-0.5 rounded">
                            Vol: {formatNumber(l1Data.bestBidSize, 0)}
                        </span>
                    </div>

                    {/* Spread */}
                    <div className="flex flex-col items-center justify-center px-2 min-w-[60px]">
                        <div className="flex items-center gap-1 mb-0.5">
                            {/* Simple text arrows if icons missing, or SVGs */}
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-bid"><path d="m12 19-7-7 7-7" /><path d="M19 12H5" /></svg>
                            <span className="text-[10px] font-bold text-text-muted">SPREAD</span>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ask"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
                        </div>
                        <span className="font-mono text-xs font-bold text-text-primary">
                            {formatNumber(spread, 2)}
                        </span>
                        {spreadPercentage !== null && (
                            <span className="text-[9px] text-text-secondary font-mono">
                                ({formatNumber(spreadPercentage, 3)}%)
                            </span>
                        )}
                    </div>

                    {/* Best Ask */}
                    <div className="flex-1 flex items-center justify-between px-3 py-1.5 rounded-lg bg-ask/10 border border-ask/20 relative overflow-hidden group">
                        <div className="absolute inset-y-0 right-0 w-1 bg-ask opacity-50 group-hover:opacity-100 transition-opacity" />
                        <div className="flex flex-col">
                            <span className="text-[10px] uppercase text-text-secondary font-semibold tracking-wider">Ask</span>
                            <span className="font-mono font-bold text-ask text-base leading-none">
                                {formatNumber(l1Data.bestAsk, 2)}
                            </span>
                        </div>
                        <span className="text-[10px] font-mono text-text-secondary bg-white/50 px-1.5 py-0.5 rounded">
                            Vol: {formatNumber(l1Data.bestAskSize, 0)}
                        </span>
                    </div>
                </div>
            </div>
        </WidgetContainer>
    );
};

const meta: Meta<typeof MarketDepthStoryWrapper> = {
    title: "Widgets/MarketDepthWidget",
    component: MarketDepthStoryWrapper,
    args: {
        fetchMode: "manual",
        parameters: [],
        dummyData: mockMarketDepthData,
    },
    parameters: {
        layout: 'padded',
    },
};

export default meta;

type Story = StoryObj<typeof MarketDepthStoryWrapper>;

export const Default: Story = {
    args: {
        dummyData: mockMarketDepthData,
    },
};

export const WideSpread: Story = {
    args: {
        dummyData: mockMarketDepthDataWide,
    },
};

export const TightSpread: Story = {
    args: {
        dummyData: mockMarketDepthDataTight,
    },
};

export const NoData: Story = {
    args: {
        dummyData: {
            bestBid: null,
            bestBidSize: null,
            bestAsk: null,
            bestAskSize: null,
        },
    },
};
