import { createElement } from "react";


export function extractTypes(obj: any, result: Record<string, any>, map: Record<string, string>, widgetLibrary: any) {
    if (!obj) return result

    if (obj.type) {
        if (obj.type != 'FullPageGrid') {
            const key: string = map[obj.type]
            console.log(key)
            // Only proceed if key exists in map and widgetLibrary
            if (key && widgetLibrary[key]) {
                const { component } = widgetLibrary[key];
                result[obj.type] = {
                    render: (props: any) => createElement(component, props)
                }
            }
        }
    }

    if (Array.isArray(obj)) {
        for (const item of obj) {
            extractTypes(item, result, map, widgetLibrary);
        }
    }

    if (typeof obj === "object") {
        for (const key in obj) {
            extractTypes(obj[key], result, map, widgetLibrary);
        }
    }

    return result;
}