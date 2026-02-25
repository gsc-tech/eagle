import type { Meta, StoryObj } from "@storybook/react";
import React, { useEffect, useId, useRef } from "react";
import { WidgetContainer } from "../components/WidgetContainer";
import { BaseWidgetProps } from "../types";
import * as am5 from "@amcharts/amcharts5";
import * as am5map from "@amcharts/amcharts5/map";
import am5geodata_worldLow from "@amcharts/amcharts5-geodata/worldLow";
import am5geodata_continentsLow from "@amcharts/amcharts5-geodata/continentsLow";
import Animated from "@amcharts/amcharts5/themes/Animated";

// Define the interface for the story props
// This should match the AmWorldMapWidgetProps but with dummyData instead of API hooks
interface AmWorldMapStoryProps extends BaseWidgetProps {
    dummyData: any[]; // Array of { id: string, value: number, name?: string }
    countryIdField?: string;
    valueField?: string;
    nameField?: string;
    projection?: "geoMercator" | "geoOrthographic" | "geoEqualEarth";
    geoDataType?: "world" | "continents";
    heatmapColors?: {
        min: string;
        max: string;
    };
    defaultCountryColor?: string;
    hoverColor?: string;
    heatLegend?: boolean;
    heatLegendPosition?: "top" | "bottom" | "left" | "right";
    valueFormat?: string;
    zoomable?: boolean;
    pannable?: boolean;
    rotatable?: boolean;
    homeButtonEnabled?: boolean;
    tooltipEnabled?: boolean;
    tooltipTemplate?: string;
    darkMode?: boolean;
    showCountryBorders?: boolean;
    borderColor?: string;
    borderWidth?: number;
    initialZoomLevel?: number;
    centerCoordinates?: { latitude: number; longitude: number };
    excludeAntarctica?: boolean;
}

const WorldMapStoryWrapper: React.FC<AmWorldMapStoryProps> = ({
    parameters = [],
    dummyData,
    countryIdField = "id",
    valueField = "value",
    nameField,
    projection = "geoMercator",
    geoDataType = "world",
    heatmapColors = {
        min: "#d3a29f",
        max: "#6f0600"
    },
    defaultCountryColor = "#d9cec8",
    hoverColor = "#f3d191",
    heatLegend = true,
    heatLegendPosition = "bottom",
    valueFormat = "#,###",
    zoomable = true,
    pannable = true,
    rotatable = false,
    homeButtonEnabled = true,
    tooltipEnabled = true,
    tooltipTemplate = "{name}: {value}",
    darkMode = false,
    showCountryBorders = true,
    borderColor = "#ffffff",
    borderWidth = 1,
    initialZoomLevel = 1,
    centerCoordinates,
    excludeAntarctica = true,
    onGroupedParametersChange,
    groupedParametersValues,
}) => {
    const chartId = useId();
    const containerRef = useRef<HTMLDivElement | null>(null);
    const rootRef = useRef<am5.Root | null>(null);
    const chartRef = useRef<am5map.MapChart | null>(null);
    const polygonSeriesRef = useRef<am5map.MapPolygonSeries | null>(null);

    // Initial Chart Setup
    useEffect(() => {
        let disposed = false;

        const initChart = () => {
            const container = containerRef.current;
            if (!container || disposed) return;

            if (rootRef.current) {
                rootRef.current.dispose();
            }

            try {
                const root = am5.Root.new(chartId);
                rootRef.current = root;
                root.setThemes([Animated.new(root)]);

                // Set number formatter
                root.numberFormatter.setAll({
                    numberFormat: valueFormat,
                });

                let projectionFunction: any;
                switch (projection) {
                    case "geoEqualEarth":
                        projectionFunction = am5map.geoEqualEarth();
                        break;
                    case "geoOrthographic":
                        projectionFunction = am5map.geoOrthographic();
                        break;
                    default:
                        projectionFunction = am5map.geoMercator();
                        break;
                }

                // Create map chart
                const chart = root.container.children.push(
                    am5map.MapChart.new(root, {
                        panX: pannable ? "translateX" : "none",
                        panY: pannable ? "translateY" : "none",
                        projection: projectionFunction,
                    })
                );
                chartRef.current = chart;

                // Set initial zoom and center
                if (initialZoomLevel && initialZoomLevel !== 1) {
                    // Slight delay to ensure chart is ready
                    setTimeout(() => {
                        chart.set("zoomLevel", initialZoomLevel);
                    }, 100);
                }

                if (centerCoordinates) {
                    chart.set("rotationX", -centerCoordinates.longitude);
                    chart.set("rotationY", -centerCoordinates.latitude);
                }

                // Create polygon series (countries)
                const geodata = geoDataType === "continents" ? am5geodata_continentsLow : am5geodata_worldLow;

                const polygonSeries = chart.series.push(
                    am5map.MapPolygonSeries.new(root, {
                        geoJSON: geodata,
                        valueField: "value",
                        idField: "id",
                        calculateAggregates: true,
                    })
                );

                if (excludeAntarctica) {
                    polygonSeries.set("exclude", ["AQ"]);
                }

                polygonSeriesRef.current = polygonSeries;

                // Configure polygon appearance
                polygonSeries.mapPolygons.template.setAll({
                    tooltipText: tooltipEnabled ? tooltipTemplate : undefined,
                    fill: am5.color(defaultCountryColor),
                    stroke: am5.color(showCountryBorders ? borderColor : defaultCountryColor),
                    strokeWidth: borderWidth,
                });

                // Set up hover state
                polygonSeries.mapPolygons.template.states.create("hover", {
                    fill: am5.color(hoverColor),
                });


                // Set up heat rules for color gradient
                polygonSeries.set("heatRules", [{
                    target: polygonSeries.mapPolygons.template,
                    dataField: "value",
                    min: am5.color(heatmapColors.min),
                    max: am5.color(heatmapColors.max),
                    key: "fill"
                }]);

                // Add heat legend
                if (heatLegend) {
                    const legend = chart.children.push(
                        am5.HeatLegend.new(root, {
                            orientation: "horizontal",
                            startColor: am5.color(heatmapColors.min),
                            endColor: am5.color(heatmapColors.max),
                            startText: "Lowest",
                            endText: "Highest",
                            centerX: am5.percent(50),
                            x: am5.percent(50),
                            y: am5.percent(90),
                            dy: -20,
                            startOpacity: 1,
                            endOpacity: 1,
                            paddingRight: 20,
                            paddingTop: 20,
                            paddingBottom: 20
                        })
                    );

                    if (darkMode) {
                        legend.startLabel.setAll({ fill: am5.color(0xffffff) });
                        legend.endLabel.setAll({ fill: am5.color(0xffffff) });
                    }

                    legend.startLabel.setAll({
                        fontSize: 12,
                        fill: am5.color(heatmapColors.min)
                    })

                    legend.endLabel.setAll({
                        fontSize: 12,
                        fill: am5.color(heatmapColors.max)
                    })

                    polygonSeries.events.on("datavalidated", () => {
                        legend.set("startValue", polygonSeries.getPrivate("valueLow"));
                        legend.set("endValue", polygonSeries.getPrivate("valueHigh"));
                    });
                }

                // Add zoom controls
                if (zoomable) {
                    chart.set("zoomControl", am5map.ZoomControl.new(root, {}));
                }

                // Add home button
                if (homeButtonEnabled) {
                    const homeButton = chart.children.push(
                        am5.Button.new(root, {
                            paddingTop: 10,
                            paddingBottom: 10,
                            x: am5.percent(100),
                            centerX: am5.percent(100),
                            y: 0,
                            dx: -20,
                            dy: 20,
                            icon: am5.Graphics.new(root, {
                                svgPath: "M16,8 L14,8 L14,16 L10,16 L10,10 L6,10 L6,16 L2,16 L2,8 L0,8 L8,0 L16,8 Z M16,8",
                                fill: am5.color(darkMode ? 0xffffff : 0x000000)
                            })
                        })
                    );

                    homeButton.events.on("click", () => {
                        chart.goHome();
                    });
                }

                // Enable rotation for orthographic projection
                if (rotatable && projection === "geoOrthographic") {
                    chart.set("rotationX", 0);
                    chart.set("rotationY", 0);
                }

                // Initial data load
                if (dummyData && Array.isArray(dummyData)) {
                    let formattedData = dummyData.map((item: any) => {
                        return {
                            id: item[countryIdField],
                            value: item[valueField],
                            name: nameField ? item[nameField] : undefined
                        };
                    });
                    polygonSeries.data.setAll(formattedData);
                }

                chart.appear(1000, 100);

            } catch (error) {
                console.error("Failed to initialize map chart:", error);
            }
        };

        initChart();

        return () => {
            disposed = true;
            if (rootRef.current) {
                rootRef.current.dispose();
                rootRef.current = null;
            }
        };
    }, [
        chartId,
        projection,
        geoDataType,
        heatmapColors,
        defaultCountryColor,
        hoverColor,
        heatLegend,
        heatLegendPosition,
        valueFormat,
        zoomable,
        pannable,
        rotatable,
        homeButtonEnabled,
        tooltipEnabled,
        tooltipTemplate,
        darkMode,
        showCountryBorders,
        borderColor,
        borderWidth,
        initialZoomLevel,
        centerCoordinates,
        // We include simple values in dependency array, avoiding deep object comparisons if possible
        // but for stories simplified deps are often fine as we remount usually
    ]);

    // Effect to update data if dummyData changes without remounting the whole chart
    useEffect(() => {
        if (polygonSeriesRef.current && dummyData && Array.isArray(dummyData)) {
            const formattedData = dummyData.map((item: any) => {
                return {
                    id: item[countryIdField],
                    value: item[valueField],
                    name: nameField ? item[nameField] : undefined
                };
            });
            polygonSeriesRef.current.data.setAll(formattedData);
        }
    }, [dummyData, countryIdField, valueField, nameField]);


    return (
        <WidgetContainer
            parameters={parameters}
            onParametersChange={() => { }}
            darkMode={darkMode}
            onGroupedParametersChange={onGroupedParametersChange}
            groupedParametersValues={groupedParametersValues}
        >
            <div
                id={chartId}
                ref={containerRef}
                className="w-full h-full"
                style={{ minHeight: "500px" }}
            />
        </WidgetContainer>
    );
};

// Mock Data
const mockWorldData = [
    { id: "US", value: 100 },
    { id: "CN", value: 90 },
    { id: "IN", value: 80 },
    { id: "DE", value: 70 },
    { id: "BR", value: 60 },
    { id: "AU", value: 50 },
    { id: "FR", value: 45 },
    { id: "IT", value: 40 },
    { id: "GB", value: 35 },
    { id: "RU", value: 30 },
];

const meta: Meta<typeof WorldMapStoryWrapper> = {
    title: "Widgets/WorldMapWidget",
    component: WorldMapStoryWrapper,
    args: {
        parameters: [],
        dummyData: mockWorldData,
        countryIdField: "id",
        valueField: "value",
        projection: "geoMercator",
        heatmapColors: {
            min: "#e0f2f1", // light teal
            max: "#00695c"  // dark teal
        },
        darkMode: false,
        zoomable: true,
    },
    parameters: {
        layout: 'padded',
    },
};

export default meta;

type Story = StoryObj<typeof WorldMapStoryWrapper>;

export const DefaultMercator: Story = {
    args: {
        projection: "geoMercator",
        heatmapColors: {
            min: "#ffcdd2", // light red
            max: "#b71c1c"  // dark red
        }
    }
};

export const OrthographicGlobe: Story = {
    args: {
        projection: "geoOrthographic",
        rotatable: true,
        pannable: true,
        heatmapColors: {
            min: "#bbdefb", // light blue
            max: "#0d47a1"  // dark blue
        },
        // Rotate to show some data
        centerCoordinates: { longitude: -20, latitude: 0 }
    }
};

export const EqualEarth: Story = {
    args: {
        projection: "geoEqualEarth",
        heatmapColors: {
            min: "#dcedc8", // light green
            max: "#33691e"  // dark green
        }
    }
};

export const DarkMode: Story = {
    args: {
        darkMode: true,
        projection: "geoMercator",
        defaultCountryColor: "#4a4a4a",
        borderColor: "#9e9e9e",
        heatmapColors: {
            min: "#5c6bc0",
            max: "#1a237e"
        }
    }
};

export const NoData: Story = {
    args: {
        dummyData: []
    }
};
