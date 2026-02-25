import type { Meta, StoryObj } from "@storybook/react";
import { AmCandlestickChartWidget } from "../widgets/AmCandlestickChartWidget";
import {
    mockCandlestickData,
    mockBullishCandlestickData,
    mockBearishCandlestickData,
    mockShortTermCandlestickData,
    mockLongTermCandlestickData
} from "./mocks/mockWidgetData";
import { useEffect, useId, useRef, useMemo } from "react";
import { WidgetContainer } from "../components/WidgetContainer";
import type { BaseWidgetProps } from "../types";

interface ChartData {
    date: string | number | Date;
    open: number;
    high: number;
    low: number;
    close: number;
}

const AmCandlestickStoryWrapper: React.FC<BaseWidgetProps & { dummyData: ChartData[] }> = ({
    parameters = [],
    fetchMode = 'manual',
    dummyData
}) => {
    const chartId = useId();
    const containerRef = useRef<HTMLDivElement | null>(null);
    const rootRef = useRef<any>(null);
    const seriesRef = useRef<any>(null);

    // Transform data immediately using useMemo
    const data = useMemo(() => {
        if (!dummyData || dummyData.length === 0) return [];
        return dummyData.map((item: any) => ({
            ...item,
            date: new Date(item.date).getTime(),
        }));
    }, [dummyData]);

    useEffect(() => {
        let disposed = false;

        const initChart = async () => {
            const container = containerRef.current;
            if (!container || disposed) return;

            try {
                const am5 = await import("@amcharts/amcharts5");
                const am5xy = await import("@amcharts/amcharts5/xy");
                const Animated = (await import("@amcharts/amcharts5/themes/Animated")).default;

                const root = am5.Root.new(chartId);
                rootRef.current = root;
                root.setThemes([Animated.new(root)]);

                const chart = root.container.children.push(
                    am5xy.XYChart.new(root, {
                        panX: true,
                        panY: true,
                        wheelX: "panX",
                        wheelY: "zoomX",
                    })
                );

                const xAxis = chart.xAxes.push(
                    am5xy.DateAxis.new(root, {
                        baseInterval: { timeUnit: "day", count: 1 },
                        renderer: am5xy.AxisRendererX.new(root, {}),
                    })
                );

                const yAxis = chart.yAxes.push(
                    am5xy.ValueAxis.new(root, {
                        renderer: am5xy.AxisRendererY.new(root, {})
                    })
                );

                const series = chart.series.push(
                    am5xy.CandlestickSeries.new(root, {
                        xAxis,
                        yAxis,
                        valueYField: "close",
                        openValueYField: "open",
                        lowValueYField: "low",
                        highValueYField: "high",
                        valueXField: "date",
                        tooltip: am5.Tooltip.new(root, {
                            labelText: "Open: {openValueY}\nHigh: {highValueY}\nLow: {lowValueY}\nClose: {valueY}"
                        }),
                    })
                );

                seriesRef.current = series;

                if (data && data.length > 0) {
                    series.data.setAll(data);
                }

                chart.appear(1000, 100);
            } catch (error) {
                console.error("Failed to initialize chart: ", error);
            }
        };

        const timeoutId = setTimeout(initChart, 100);

        return () => {
            disposed = true;
            clearTimeout(timeoutId);
            if (rootRef.current) {
                rootRef.current.dispose();
                rootRef.current = null;
            }
        };
    }, [chartId, data]);

    useEffect(() => {
        if (rootRef.current && seriesRef.current && data.length > 0) {
            seriesRef.current.data.setAll(data);
        }
    }, [data]);

    return (
        <WidgetContainer
            parameters={parameters}
            onParametersChange={() => { }}
            fetchMode={fetchMode}
        >
            <div
                ref={containerRef}
                id={chartId}
                className="w-full h-full"
                style={{ minHeight: '400px' }}
            />
        </WidgetContainer>
    );
};

const meta: Meta<typeof AmCandlestickStoryWrapper> = {
    title: "Widgets/AmCandlestickChartWidget",
    component: AmCandlestickStoryWrapper,
    args: {
        fetchMode: "manual",
        parameters: [],
        dummyData: mockCandlestickData,
    },
    parameters: {
        layout: 'padded',
    },
};

export default meta;

type Story = StoryObj<typeof AmCandlestickStoryWrapper>;

export const Default: Story = {
    args: {
        dummyData: mockCandlestickData,
    },
};

export const BullishTrend: Story = {
    args: {
        dummyData: mockBullishCandlestickData,
    },
};

export const BearishTrend: Story = {
    args: {
        dummyData: mockBearishCandlestickData,
    },
};

export const ShortTerm: Story = {
    args: {
        dummyData: mockShortTermCandlestickData,
    },
};

export const LongTerm: Story = {
    args: {
        dummyData: mockLongTermCandlestickData,
    },
};

export const EmptyChart: Story = {
    args: {
        dummyData: [],
    },
};
