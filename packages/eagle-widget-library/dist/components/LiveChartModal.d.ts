import React from 'react';
interface LiveChartModalProps {
    isOpen: boolean;
    onClose: () => void;
    symbol: string;
    historicalDataUrl?: string;
    darkMode?: boolean;
}
export declare const LiveChartModal: React.FC<LiveChartModalProps>;
export {};
