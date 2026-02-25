import React from "react";
import type { BaseWidgetProps } from "../types";
export interface AmWorldMapWidgetProps extends BaseWidgetProps {
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
    excludeAntarctica?: boolean;
    initialZoomLevel?: number;
    centerCoordinates?: {
        latitude: number;
        longitude: number;
    };
}
export declare const WorldMapWidget: React.FC<AmWorldMapWidgetProps>;
export declare const WorldMapWidgetDef: {
    component: React.FC<AmWorldMapWidgetProps>;
};
