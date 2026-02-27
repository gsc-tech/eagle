import { createElement } from "react";
import type { BackendWidgetConfig, PuckConfig, WidgetLibrary } from "./types";
import { FullPageGrid } from "@/pages/dashboard-builder";

type generatePuckConfigReturn = {
  config: PuckConfig,
  widgetNameToComponentNameMap: Record<string, string>
}

export function generatePuckConfig(
    WidgetLibrary: WidgetLibrary,
    backendConfigs: BackendWidgetConfig[],
) : generatePuckConfigReturn {
    const components: Record<string, any> = {
      // Full-page grid container (always included)
      FullPageGrid: {
        label: "Dashboard Grid",
        fields: {
          columns: {
            type: "number",
            label: "Grid Columns",
            min: 12,
            max: 48
          },
          rowHeight: {
            type: "number",
            label: "Row Height (px)",
            min: 20,
            max: 100
          },
          gap: {
            type: "number",
            label: "Gap (px)",
            min: 4,
            max: 32
          },
          children: {
            type: "slot",
          }
        },
        defaultProps: {
          columns: 24,  // Fine-grained grid (24 columns)
          rowHeight: 40, // Small cells for flexibility
          gap: 8
        },
        render: FullPageGrid
      }
    };

    const widgetNameToComponentNameMap : Record<string, string> = {};

    for (let widget of backendConfigs) {
        const libraryEntry = WidgetLibrary[widget.componentName]

        if (!libraryEntry) {
            console.error("unable to find the component of the given name", widget.componentName)
            //  TODO: handle it in better manner later
            const config = {
              components: components
            }
            return { config, widgetNameToComponentNameMap };
        }

        const {component, fields, defaultProps} = libraryEntry

        const mergedProps = {
            ...defaultProps,
            ...widget.defaultProps,
        }

        components[widget.name] = {
            fields: fields,
            defaultProps: mergedProps,
            inline: true,
            render: (props: any) => createElement(component, props),
        };

        widgetNameToComponentNameMap[widget.name] = widget.componentName;
    }

    const config = {
      components: components
    }

    return {
      config,
      widgetNameToComponentNameMap
    }
}