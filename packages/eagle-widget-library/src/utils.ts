
export function mergeRefs<T>(...refs: Array<React.Ref<T> | any | undefined>) {
    return (value: T | null) => {
        refs.forEach((ref) => {
            if (!ref) return;
            if (typeof ref === "function") {
                try {
                    ref(value);
                } catch { }
            } else {
                try {
                    (ref as React.MutableRefObject<T | null>).current = value;
                } catch { }
            }
        });
    };
}

export const layoutFields = {
    spanRow: {
        label: "Rows Span",
        type: "number",
        min: 1
    },
    spanCol: {
        label: "Columns Span",
        type: "number",
        min: 1
    }
};

export const apiFields = {
    apiUrl: {
        label: "API URL",
        type: "text"
    }
};

export const titleFields = {
    title: {
        label: "Title",
        type: "text"
    }
};

export const commonWidgetFields = {
    ...layoutFields,
    ...apiFields,
    ...titleFields
};

export const defaultLayoutProps = {
    spanRow: 4,
    spanCol: 6
};

export const defaultApiProps = {
    apiUrl: "http://localhost:8080/api/data"
};

export const defaultTitleProps = {
    title: ""
};

export const commonDefaultWidgetProps = {
    ...defaultLayoutProps,
    ...defaultApiProps,
    ...defaultTitleProps
};