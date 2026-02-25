import type { Meta, StoryObj } from "@storybook/react";
import { ScatterPlotWidget, type ScatterPlotWidgetProps } from "../widgets/ScatterPlotWidget";
import {
    mockScatterPlotData,
    mockScatterPlotWithSize,
    mockScatterPlotCategories,
    mockScatterPlotCategoriesWithSize,
    mockScatterPlotCorrelation,
    mockScatterPlotNoCorrelation
} from "./mocks/mockWidgetData";
import { useEffect, useRef, useState } from "react";
import { WidgetContainer } from "../components/WidgetContainer";

interface ScatterData {
    x: number;
    y: number;
    size?: number;
    category?: string;
    [key: string]: any;
}

// Wrapper component that displays scatter plot without API calls
const ScatterPlotStoryWrapper: React.FC<ScatterPlotWidgetProps & { dummyData: ScatterData[], darkMode?: boolean }> = ({
    parameters = [],
    fetchMode = 'manual',
    dummyData,
    xField = "x",
    yField = "y",
    sizeField = "size",
    categoryField = "category",
    pointColor = "#6366f1",
    pointSize = 10,
    showTrendLine = false,
    enableZoom = true,
    darkMode = false,
}) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const rootRef = useRef<any>(null);
    const chartId = `scatter-chart-${Math.random().toString(36).substr(2, 9)}`;

    useEffect(() => {
        let disposed = false;

        const initChart = async () => {
            const container = containerRef.current;
            if (!container || disposed) return;

            try {
                const am5 = await import("@amcharts/amcharts5");
                const am5xy = await import("@amcharts/amcharts5/xy");
                const Animated = (await import("@amcharts/amcharts5/themes/Animated"))
                    .default;

                const ownerDoc = container.ownerDocument;
                const isInIframe = ownerDoc !== document;
                let originalGetElementById: any = null;
                let originalGetComputedStyle: any = null;
                if (isInIframe) {
                    const iframeWindow = ownerDoc.defaultView;
                    originalGetElementById = document.getElementById.bind(document);
                    document.getElementById = function (id) {
                        const iframeElement = ownerDoc.getElementById(id);
                        return iframeElement || originalGetElementById(id);
                    };
                    originalGetComputedStyle = window.getComputedStyle.bind(window);
                    window.getComputedStyle = function (element, pseudoElt) {
                        if (element && element.ownerDocument === ownerDoc) {
                            return iframeWindow?.getComputedStyle(element, pseudoElt);
                        }
                        return originalGetComputedStyle(element, pseudoElt);
                    };
                }
                try {
                    const root = am5.Root.new(chartId);
                    rootRef.current = root;
                    root.setThemes([Animated.new(root)]);

                    const chart = root.container.children.push(
                        am5xy.XYChart.new(root, {
                            panX: enableZoom,
                            panY: enableZoom,
                            wheelX: enableZoom ? "panX" : "none",
                            wheelY: enableZoom ? "zoomX" : "none",
                            pinchZoomX: enableZoom,
                            pinchZoomY: enableZoom,
                        })
                    );

                    // Cursor
                    const cursor = chart.set("cursor", am5xy.XYCursor.new(root, {
                        behavior: "zoomXY"
                    }));
                    cursor.lineX.set("visible", true);
                    cursor.lineY.set("visible", true);

                    // X-Axis
                    const xRenderer = am5xy.AxisRendererX.new(root, {});
                    if (darkMode) {
                        xRenderer.labels.template.set("fill", am5.color(0xffffff));
                        xRenderer.grid.template.set("stroke", am5.color(0x444444));
                    }

                    const xAxis = chart.xAxes.push(
                        am5xy.ValueAxis.new(root, {
                            renderer: xRenderer,
                            tooltip: am5.Tooltip.new(root, {})
                        })
                    );

                    // Y-Axis
                    const yRenderer = am5xy.AxisRendererY.new(root, {});
                    if (darkMode) {
                        yRenderer.labels.template.set("fill", am5.color(0xffffff));
                        yRenderer.grid.template.set("stroke", am5.color(0x444444));
                    }

                    const yAxis = chart.yAxes.push(
                        am5xy.ValueAxis.new(root, {
                            renderer: yRenderer
                        })
                    );

                    // Create series based on whether we have categories
                    const hasCategories = dummyData && dummyData.length > 0 && dummyData[0][categoryField];

                    if (hasCategories) {
                        // Group data by category
                        const categories = [...new Set(dummyData.map((item: any) => item[categoryField]))];
                        const colors = [
                            "#6366f1", "#ec4899", "#10b981", "#f59e0b",
                            "#8b5cf6", "#14b8a6", "#f43f5e", "#06b6d4"
                        ];

                        categories.forEach((category, index) => {
                            const categoryData = dummyData.filter((item: any) => item[categoryField] === category);
                            const color = colors[index % colors.length];

                            const series = chart.series.push(
                                am5xy.LineSeries.new(root, {
                                    name: String(category),
                                    xAxis: xAxis,
                                    yAxis: yAxis,
                                    valueYField: yField,
                                    valueXField: xField,
                                    tooltip: am5.Tooltip.new(root, {
                                        labelText: `${category}\\n{valueX}: {valueY}`
                                    }),
                                    stroke: am5.color(color),
                                    fill: am5.color(color)
                                })
                            );

                            // Configure bullets (points)
                            // series.strokes.template.set("strokeWidth", 0);
                            series.strokes.template.set("visible", false);

                            series.bullets.push(() => {
                                const bulletCircle = am5.Circle.new(root, {
                                    radius: sizeField && categoryData[0][sizeField] ? undefined : pointSize,
                                    fill: series.get("fill"),
                                    stroke: root.interfaceColors.get("background"),
                                    strokeWidth: 2,
                                    tooltipText: `${category}\\n${xField}: {valueX}\\n${yField}: {valueY}${sizeField ? `\\n${sizeField}: {${sizeField}}` : ''}`
                                });

                                // If size field is provided, make the size dynamic
                                if (sizeField) {
                                    bulletCircle.adapters.add("radius", (radius, target) => {
                                        const dataItem = target.dataItem as any;
                                        if (dataItem && dataItem.dataContext) {
                                            const sizeValue = dataItem.dataContext[sizeField];
                                            return sizeValue ? Math.sqrt(sizeValue) * 2 : pointSize;
                                        }
                                        return pointSize;
                                    });
                                }

                                return am5.Bullet.new(root, {
                                    sprite: bulletCircle
                                });
                            });

                            series.data.setAll(categoryData);
                        });

                        // Add legend
                        const legend = chart.children.push(
                            am5.Legend.new(root, {
                                centerX: am5.p50,
                                x: am5.p50,
                                layout: root.horizontalLayout
                            })
                        );

                        if (darkMode) {
                            legend.labels.template.set("fill", am5.color(0xffffff));
                        }

                        legend.data.setAll(chart.series.values);
                    } else {
                        // Single series without categories
                        const series = chart.series.push(
                            am5xy.LineSeries.new(root, {
                                name: "Data Points",
                                xAxis: xAxis,
                                yAxis: yAxis,
                                valueYField: yField,
                                valueXField: xField,
                                tooltip: am5.Tooltip.new(root, {
                                    labelText: `{valueX}: {valueY}`
                                }),
                                stroke: am5.color(pointColor),
                                fill: am5.color(pointColor)
                            })
                        );

                        // Configure bullets (points)
                        // series.strokes.template.set("strokeWidth", 0);
                        series.strokes.template.set("visible", false);

                        series.bullets.push(() => {
                            const bulletCircle = am5.Circle.new(root, {
                                radius: sizeField ? undefined : pointSize,
                                fill: series.get("fill"),
                                stroke: root.interfaceColors.get("background"),
                                strokeWidth: 2,
                                tooltipText: `${xField}: {valueX}\\n${yField}: {valueY}${sizeField ? `\\n${sizeField}: {${sizeField}}` : ''}`
                            });

                            // If size field is provided, make the size dynamic
                            if (sizeField) {
                                bulletCircle.adapters.add("radius", (radius, target) => {
                                    const dataItem = target.dataItem as any;
                                    if (dataItem && dataItem.dataContext) {
                                        const sizeValue = dataItem.dataContext[sizeField];
                                        return sizeValue ? Math.sqrt(sizeValue) * 2 : pointSize;
                                    }
                                    return pointSize;
                                });
                            }

                            return am5.Bullet.new(root, {
                                sprite: bulletCircle
                            });
                        });

                        if (dummyData && Array.isArray(dummyData)) {
                            series.data.setAll(dummyData);
                        }

                        // Add trend line if enabled
                        if (showTrendLine && dummyData && dummyData.length > 1) {
                            const trendSeries = chart.series.push(
                                am5xy.LineSeries.new(root, {
                                    xAxis: xAxis,
                                    yAxis: yAxis,
                                    valueYField: "trendY",
                                    valueXField: "trendX",
                                    stroke: am5.color(darkMode ? 0xffffff : 0x000000)
                                })
                            );

                            // Set stroke properties on the template
                            trendSeries.strokes.template.setAll({
                                strokeWidth: 2,
                                strokeDasharray: [5, 5]
                            });

                            // Calculate trend line using linear regression
                            const n = dummyData.length;
                            const sumX = dummyData.reduce((sum: number, item: any) => sum + item[xField], 0);
                            const sumY = dummyData.reduce((sum: number, item: any) => sum + item[yField], 0);
                            const sumXY = dummyData.reduce((sum: number, item: any) => sum + (item[xField] * item[yField]), 0);
                            const sumX2 = dummyData.reduce((sum: number, item: any) => sum + (item[xField] * item[xField]), 0);

                            const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
                            const intercept = (sumY - slope * sumX) / n;

                            const minX = Math.min(...dummyData.map((item: any) => item[xField]));
                            const maxX = Math.max(...dummyData.map((item: any) => item[xField]));

                            const trendData = [
                                { trendX: minX, trendY: slope * minX + intercept },
                                { trendX: maxX, trendY: slope * maxX + intercept }
                            ];

                            trendSeries.data.setAll(trendData);
                        }
                    }

                    chart.appear(1000, 100);

                } finally {
                    if (isInIframe && originalGetElementById && originalGetComputedStyle) {
                        document.getElementById = originalGetElementById;
                        window.getComputedStyle = originalGetComputedStyle;
                    }
                }

            } catch (error) {
                console.error("Failed to initialize scatter plot chart:", error);
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
    }, [chartId, dummyData, xField, yField, sizeField, categoryField, pointColor, pointSize, showTrendLine, enableZoom, darkMode]);

    return (
        <WidgetContainer
            parameters={parameters}
            onParametersChange={() => { }}
            fetchMode={fetchMode}
            darkMode={darkMode}
        >
            <div
                id={chartId}
                ref={containerRef}
                className="w-full h-full"
                style={{ minHeight: '400px' }}
            />
        </WidgetContainer>
    );
};

const meta: Meta<typeof ScatterPlotStoryWrapper> = {
    title: "Widgets/ScatterPlotWidget",
    component: ScatterPlotStoryWrapper,
    args: {
        fetchMode: "manual",
        parameters: [],
        dummyData: mockScatterPlotData,
        xField: "x",
        yField: "y",
        sizeField: "size",
        categoryField: "category",
        pointColor: "#6366f1",
        pointSize: 8,
        showTrendLine: false,
        enableZoom: true,
        darkMode: false,
    },
    parameters: {
        layout: 'padded',
    },
};

export default meta;

type Story = StoryObj<typeof ScatterPlotStoryWrapper>;

export const Default: Story = {
    args: {
        dummyData: mockScatterPlotData,
        pointSize: 8,
        showTrendLine: false,
    },
};

export const WithTrendLine: Story = {
    args: {
        dummyData: mockScatterPlotCorrelation,
        pointSize: 8,
        showTrendLine: true,
    },
};

export const BubbleChart: Story = {
    args: {
        dummyData: mockScatterPlotWithSize,
        pointSize: 8,
        sizeField: "size",
    },
};

export const MultipleCategories: Story = {
    args: {
        dummyData: mockScatterPlotCategories,
        categoryField: "category",
        pointSize: 8,
    },
};

export const BubbleChartWithCategories: Story = {
    args: {
        dummyData: mockScatterPlotCategoriesWithSize,
        categoryField: "category",
        sizeField: "size",
        pointSize: 8,
    },
};

export const HighCorrelation: Story = {
    args: {
        dummyData: mockScatterPlotCorrelation,
        pointSize: 8,
        showTrendLine: true,
        pointColor: "#10b981",
    },
};

export const NoCorrelation: Story = {
    args: {
        dummyData: mockScatterPlotNoCorrelation,
        pointSize: 8,
        showTrendLine: true,
        pointColor: "#f59e0b",
    },
};

export const LargeDataset: Story = {
    args: {
        dummyData: Array.from({ length: 200 }, () => ({
            x: Math.round(Math.random() * 100 * 100) / 100,
            y: Math.round(Math.random() * 100 * 100) / 100,
        })),
        pointSize: 5,
        pointColor: "#8b5cf6",
    },
};

export const DarkMode: Story = {
    args: {
        dummyData: mockScatterPlotCategories,
        categoryField: "category",
        pointSize: 8,
        darkMode: true,
    },
};

export const DarkModeWithTrendLine: Story = {
    args: {
        dummyData: mockScatterPlotCorrelation,
        pointSize: 8,
        showTrendLine: true,
        darkMode: true,
    },
};
