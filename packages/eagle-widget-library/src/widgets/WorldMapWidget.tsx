"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import type { BaseWidgetProps, ParameterValues } from "../types";
import { useWidgetData } from "../hooks/useWidgetData";
import { useParameterDefaults } from "../hooks/useParameterDefaults";
import { WidgetContainer } from "../components/WidgetContainer";
import * as am5 from "@amcharts/amcharts5";
import * as am5map from "@amcharts/amcharts5/map";
import am5geodata_worldLow from "@amcharts/amcharts5-geodata/worldLow";
import am5geodata_continentsLow from "@amcharts/amcharts5-geodata/continentsLow";
import Animated from "@amcharts/amcharts5/themes/Animated";

export interface AmWorldMapWidgetProps extends BaseWidgetProps {
    countryIdField?: string; // Field in data that contains country ISO code (e.g., "US", "GB")
    valueField?: string; // Field in data that contains the numeric value for heatmap
    nameField?: string; // Optional field for country name override

    // Map Configuration
    projection?: "geoMercator" | "geoOrthographic" | "geoEqualEarth";
    geoDataType?: "world" | "continents"; // Type of geodata to use

    // Visual Configuration
    heatmapColors?: {
        min: string; // Color for minimum value
        max: string; // Color for maximum value
    };
    defaultCountryColor?: string; // Color for countries without data
    hoverColor?: string; // Color when hovering over country

    // Heatmap Settings
    heatLegend?: boolean; // Show heat legend
    heatLegendPosition?: "top" | "bottom" | "left" | "right";
    valueFormat?: string; // Format string for values (e.g., "#,###.00")

    // Interactivity
    zoomable?: boolean; // Allow zoom
    pannable?: boolean; // Allow panning
    rotatable?: boolean; // Allow rotation (for orthographic projection)
    homeButtonEnabled?: boolean; // Show home button to reset zoom

    // Tooltip
    tooltipEnabled?: boolean;
    tooltipTemplate?: string; // Template string, e.g., "{name}: {value}"

    // Appearance
    darkMode?: boolean;
    showCountryBorders?: boolean;
    borderColor?: string;
    borderWidth?: number;

    // Advanced
    excludeAntarctica?: boolean;
    initialZoomLevel?: number; // Initial zoom level (1 = default)
    centerCoordinates?: { latitude: number; longitude: number }; // Center map on coordinates
}

export const WorldMapWidget: React.FC<AmWorldMapWidgetProps> = ({
    apiUrl = "http://localhost:8080/api/data",
    title,
    parameters,
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
    onGroupedParametersChange,
    groupedParametersValues,
    excludeAntarctica = true,
}) => {
    const chartId = useId();
    const containerRef = useRef<HTMLDivElement | null>(null);
    const rootRef = useRef<am5.Root | null>(null);
    const chartRef = useRef<am5map.MapChart | null>(null);
    const polygonSeriesRef = useRef<am5map.MapPolygonSeries | null>(null);

    const defaultParams = useParameterDefaults(parameters);
    const [currentParams, setCurrentParams] = useState<ParameterValues>(defaultParams);

    const { data: rawData } = useWidgetData(apiUrl as string, {
        parameters: currentParams,
    });

    const handleParametersChange = (values: ParameterValues) => {
        setCurrentParams(values);
    };

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
                    chart.set("zoomLevel", initialZoomLevel);
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
                    const heatLegend = chart.children.push(
                        am5.HeatLegend.new(root, {
                            orientation: "horizontal",
                            startColor: am5.color(heatmapColors.min),
                            endColor: am5.color(heatmapColors.max),
                            startText: "Lowest",
                            endText: "Highest",
                            centerX: am5.percent(50),
                            x: am5.percent(50),
                            y: am5.percent(90),
                            dy: -20, // ⬅ pull it up into view
                            startOpacity: 1,
                            endOpacity: 1,
                            paddingRight: 20,
                            paddingTop: 20,
                            paddingBottom: 20
                        })
                    );


                    if (darkMode) {
                        heatLegend.startLabel.setAll({
                            fill: am5.color(0xffffff)
                        });
                        heatLegend.endLabel.setAll({
                            fill: am5.color(0xffffff)
                        });
                    }

                    heatLegend.startLabel.setAll({
                        fontSize: 12,
                        fill: am5.color(heatmapColors.min)
                    })

                    heatLegend.endLabel.setAll({
                        fontSize: 12,
                        fill: am5.color(heatmapColors.max)
                    })

                    // heatLegend.set("target", polygonSeries);
                    polygonSeries.events.on("datavalidated", () => {
                        heatLegend.set("startValue", polygonSeries.getPrivate("valueLow"));
                        heatLegend.set("endValue", polygonSeries.getPrivate("valueHigh"));
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

                if (rawData && Array.isArray(rawData)) {
                    let formattedData = rawData.map((item: any) => {
                        return {
                            id: item[countryIdField],
                            value: item[valueField]
                        };
                    });
                    polygonSeries.data.setAll(formattedData);
                }

                // Animate chart appearance
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
    ]);

    // Update data
    useEffect(() => {
        if (polygonSeriesRef.current && rawData && Array.isArray(rawData)) {
            var formattedData = [];

            formattedData = rawData.map((item: any) => {
                const id = item[countryIdField];
                const value = item[valueField];
                const name = nameField ? item[nameField] : undefined;
                if (id) {
                    return { id, value, name };
                }
            });

            polygonSeriesRef.current.data.setAll(formattedData);
        }
    }, [rawData, countryIdField, valueField, nameField]);

    return (
        <WidgetContainer
            title={title}
            parameters={parameters}
            onParametersChange={handleParametersChange}
            darkMode={darkMode}
            onGroupedParametersChange={onGroupedParametersChange}
            groupedParametersValues={groupedParametersValues}
        >
            <div
                id={chartId}
                ref={containerRef}
                className="w-full h-full"
                style={{ minHeight: "400px" }}
            />
        </WidgetContainer>
    );
};

export const WorldMapWidgetDef = {
    component: WorldMapWidget,
};