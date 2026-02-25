import type { Meta, StoryObj } from "@storybook/react";
import { HeatMapWidget } from "../widgets/HeatMapWidget";
import { mockHeatMapData, mockHeatMapDataShort } from "./mocks/mockWidgetData";
import { useEffect, useMemo, useRef, useState } from "react";
import { WidgetContainer } from "../components/WidgetContainer";
import type { BaseWidgetProps } from "../types";
import * as CalHeatmapModule from 'cal-heatmap';
import 'cal-heatmap/cal-heatmap.css';

const CalHeatmap = (CalHeatmapModule as any).default || CalHeatmapModule;

interface HeatMapStoryProps extends BaseWidgetProps {
    dummyData: any[];
    range?: number;
    domainType?: 'year' | 'month' | 'week' | 'day' | 'hour';
    subDomainType?: 'year' | 'month' | 'week' | 'day' | 'hour' | 'minute';
    domainSort?: 'asc' | 'desc';
    startDate?: Date | string;
    colorScheme?: string;
    dateField?: string;
    valueField?: string;
}

const HeatMapStoryWrapper: React.FC<HeatMapStoryProps> = ({
    parameters = [],
    fetchMode = 'manual',
    dummyData,
    range = 12,
    domainType = 'month',
    subDomainType = 'day',
    domainSort = 'asc',
    startDate,
    colorScheme = 'Greens',
    dateField = 'date',
    valueField = 'value',
}) => {
    const heatMapRef = useRef<HTMLDivElement>(null);
    const calInstanceRef = useRef<any>(null);

    const processedData = useMemo(() => {
        if (!dummyData || !Array.isArray(dummyData)) return [];

        return dummyData.map((item: any) => {
            const date = new Date(item[dateField]);

            return {
                date: date.getTime(),
                value: Number(item[valueField] || 0),
            };
        });
    }, [dummyData, dateField, valueField]);

    useEffect(() => {
        if (!heatMapRef.current || processedData.length === 0) return;
        const minDate = Math.min(...processedData.map(d => d.date));
        const maxValue = Math.max(...processedData.map(d => d.value), 1);

        if (calInstanceRef.current) {
            calInstanceRef.current.destroy();
            calInstanceRef.current = null;
        }

        const cal = new CalHeatmap();
        calInstanceRef.current = cal;

        cal.paint({
            itemSelector: '#heatmap-container',
            range: range,
            domain: {
                type: domainType,
                sort: domainSort,
            },
            subDomain: {
                type: subDomainType,
            },
            date: {
                start: startDate ? new Date(startDate) : new Date(minDate),
            },
            data: {
                source: processedData,
                x: 'date',
                y: 'value',
            },
            scale: {
                color: {
                    scheme: colorScheme,
                    type: 'linear',
                    domain: [0, maxValue],
                }
            }
        });

        return () => {
            if (calInstanceRef.current) {
                calInstanceRef.current.destroy();
                calInstanceRef.current = null;
            }
        };
    }, [processedData, range, domainType, subDomainType, domainSort, startDate, colorScheme]);

    return (
        <WidgetContainer
            parameters={parameters}
            onParametersChange={() => { }}
            fetchMode={fetchMode}
        >
            <div className="w-full h-full overflow-auto p-4">
                {processedData.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-500">
                        No data available
                    </div>
                ) : (
                    <div id="heatmap-container" ref={heatMapRef} className="w-full h-full" />
                )}
            </div>
        </WidgetContainer>
    );
};

const meta: Meta<typeof HeatMapStoryWrapper> = {
    title: "Widgets/HeatMapWidget",
    component: HeatMapStoryWrapper,
    args: {
        fetchMode: "manual",
        parameters: [],
        dummyData: mockHeatMapData,
        range: 12,
        domainType: 'month',
        subDomainType: 'day',
        domainSort: 'asc',
        colorScheme: 'Greens',
        dateField: 'date',
        valueField: 'value',
    },
    parameters: {
        layout: 'padded',
    },
};

export default meta;

type Story = StoryObj<typeof HeatMapStoryWrapper>;

export const Default: Story = {
    args: {
        dummyData: mockHeatMapData,
    },
};

export const ShortPeriod: Story = {
    args: {
        dummyData: mockHeatMapDataShort,
        range: 3,
    },
};

export const BluesColorScheme: Story = {
    args: {
        dummyData: mockHeatMapData,
        colorScheme: 'Blues',
    },
};

export const RedsColorScheme: Story = {
    args: {
        dummyData: mockHeatMapData,
        colorScheme: 'Reds',
    },
};

export const WeeklyView: Story = {
    args: {
        dummyData: mockHeatMapDataShort,
        domainType: 'week',
        subDomainType: 'day',
        range: 12,
    },
};

export const EmptyHeatMap: Story = {
    args: {
        dummyData: [],
    },
};
