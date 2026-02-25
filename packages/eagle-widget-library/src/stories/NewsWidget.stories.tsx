import type { Meta, StoryObj } from "@storybook/react";
import { NewsWidget } from "../widgets/NewsWidget";
import { mockNewsData, mockLargeNewsData } from "./mocks/mockWidgetData";
import { AnimatePresence, motion } from "framer-motion";
import { useState, useMemo } from "react";
import { WidgetContainer } from "../components/WidgetContainer";
import type { BaseWidgetProps } from "../types";

interface NewsStoryProps extends BaseWidgetProps {
    dummyData: any[];
}

const NewsStoryWrapper: React.FC<NewsStoryProps> = ({
    parameters = [],
    fetchMode = 'manual',
    dummyData,
}) => {
    const formatTime = (timestamp: number) => {
        const diff = Date.now() - timestamp;
        const minutes = Math.floor(diff / 60000);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        return new Date(timestamp).toLocaleDateString();
    };

    const getCategoryColor = (category: string) => {
        switch (category) {
            case "Crypto": return "#F7931A";
            case "Stocks": return "#2962FF";
            case "Macro": return "#00897B";
            case "Commodities": return "#8D6E63";
            default: return "#78909C";
        }
    };

    return (
        <WidgetContainer
            parameters={parameters}
            onParametersChange={() => { }}
            fetchMode={fetchMode}
        >
            <div className="overflow-y-auto p-0 h-full">
                <AnimatePresence>
                    {dummyData.map((item, index) => (
                        <motion.div
                            key={item.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="p-4 border-b border-gray-100 cursor-pointer transition-colors hover:bg-gray-50"
                        >
                            <div className="flex justify-between items-center mb-2">
                                <span
                                    className="text-[10px] font-semibold px-2 py-0.5 rounded-xl uppercase"
                                    style={{
                                        backgroundColor: `${getCategoryColor(item.category)}20`,
                                        color: getCategoryColor(item.category)
                                    }}
                                >
                                    {item.category}
                                </span>
                                <span className="text-[11px] text-gray-500 flex items-center">
                                    🕐 {formatTime(item.timestamp)}
                                </span>
                            </div>
                            <h3 className="text-sm font-semibold text-gray-900 m-0 mb-1 leading-snug">
                                {item.headline}
                            </h3>
                            <p className="text-xs text-gray-600 m-0 mb-2 leading-relaxed">
                                {item.summary}
                            </p>
                            <a
                                href={item.url}
                                className="text-[11px] text-blue-600 no-underline flex items-center font-medium"
                            >
                                Read more ↗
                            </a>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </WidgetContainer>
    );
};

const meta: Meta<typeof NewsStoryWrapper> = {
    title: "Widgets/NewsWidget",
    component: NewsStoryWrapper,
    args: {
        fetchMode: "manual",
        parameters: [],
        dummyData: mockNewsData,
    },
    parameters: {
        layout: 'padded',
    },
};

export default meta;

type Story = StoryObj<typeof NewsStoryWrapper>;

export const Default: Story = {
    args: {
        dummyData: mockNewsData,
    },
};

export const LargeNewsFeed: Story = {
    args: {
        dummyData: mockLargeNewsData,
    },
};

export const StocksOnly: Story = {
    args: {
        dummyData: mockNewsData.filter(n => n.category === "Stocks"),
    },
};

export const CryptoOnly: Story = {
    args: {
        dummyData: mockNewsData.filter(n => n.category === "Crypto"),
    },
};

export const EmptyNews: Story = {
    args: {
        dummyData: [],
    },
};
