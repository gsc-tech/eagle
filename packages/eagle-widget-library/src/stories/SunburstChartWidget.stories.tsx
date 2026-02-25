import type { Meta, StoryObj } from "@storybook/react";
import { SunburstChartWidget } from "../widgets/SunburstChartWidget";
import { mockSunburstData, mockSimpleSunburstData } from "./mocks/mockWidgetData";
import { useEffect, useId, useRef } from "react";
import { WidgetContainer } from "../components/WidgetContainer";
import type { BaseWidgetProps } from "../types";

interface SunburstChartStoryProps extends BaseWidgetProps {
    dummyData: any;
    valueField?: string;
    categoryField?: string;
    childField?: string;
}

const SunburstChartStoryWrapper: React.FC<SunburstChartStoryProps> = ({
    parameters = [],
    fetchMode = 'manual',
    dummyData,
    valueField = "value",
    categoryField = "name",
    childField = "children",
}) => {
    const chartId = useId();
    const rootRef = useRef<any>(null);
    const chartRef = useRef<any>(null);
    const seriesRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (rootRef.current) {
            rootRef.current.dispose();
            rootRef.current = null;
        }

        let disposed = false;

        const initChart = async () => {
            const container = containerRef.current;
            if (!container || disposed) return;

            try {
                const am5 = await import("@amcharts/amcharts5");
                const am5hierarchy = await import("@amcharts/amcharts5/hierarchy");
                const Animated = (await import("@amcharts/amcharts5/themes/Animated")).default;

                const root = am5.Root.new(chartId);
                rootRef.current = root;

                root.setThemes([Animated.new(root)]);

                const chartContainer = root.container.children.push(
                    am5.Container.new(root, {
                        width: am5.percent(100),
                        height: am5.percent(100),
                        layout: root.verticalLayout
                    })
                );

                const series = chartContainer.children.push(
                    am5hierarchy.Sunburst.new(root, {
                        singleBranchOnly: true,
                        downDepth: 1,
                        initialDepth: 10,
                        topDepth: 1,
                        innerRadius: am5.percent(10),
                        valueField: valueField,
                        categoryField: categoryField,
                        childDataField: childField,
                    })
                );

                chartRef.current = series;
                seriesRef.current = series;

                series.slices.template.set("tooltipText", "{category}: {value}");

                series.labels.template.setAll({
                    fontSize: 12,
                    text: "{category}",
                });

                if (dummyData && Array.isArray(dummyData)) {
                    series.data.setAll(dummyData);
                } else if (dummyData && typeof dummyData === 'object') {
                    series.data.setAll([dummyData]);
                }

                series.appear(1000, 100);
            } catch (error) {
                console.error("Failed to initialize Sunburst chart: ", error);
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
    }, [chartId, valueField, categoryField, childField, dummyData]);

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

const meta: Meta<typeof SunburstChartStoryWrapper> = {
    title: "Widgets/SunburstChartWidget",
    component: SunburstChartStoryWrapper,
    args: {
        fetchMode: "manual",
        parameters: [],
        dummyData: mockSunburstData,
        valueField: "value",
        categoryField: "name",
        childField: "children",
    },
    parameters: {
        layout: 'padded',
    },
};

export default meta;

type Story = StoryObj<typeof SunburstChartStoryWrapper>;

export const Default: Story = {
    args: {
        dummyData: mockSunburstData,
    },
};

export const SimpleHierarchy: Story = {
    args: {
        dummyData: mockSimpleSunburstData,
    },
};

export const EmptyChart: Story = {
    args: {
        dummyData: null,
    },
};
