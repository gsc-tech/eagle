export declare function mergeRefs<T>(...refs: Array<React.Ref<T> | any | undefined>): (value: T | null) => void;
export declare const layoutFields: {
    spanRow: {
        label: string;
        type: string;
        min: number;
    };
    spanCol: {
        label: string;
        type: string;
        min: number;
    };
};
export declare const apiFields: {
    apiUrl: {
        label: string;
        type: string;
    };
};
export declare const titleFields: {
    title: {
        label: string;
        type: string;
    };
};
export declare const commonWidgetFields: {
    title: {
        label: string;
        type: string;
    };
    apiUrl: {
        label: string;
        type: string;
    };
    spanRow: {
        label: string;
        type: string;
        min: number;
    };
    spanCol: {
        label: string;
        type: string;
        min: number;
    };
};
export declare const defaultLayoutProps: {
    spanRow: number;
    spanCol: number;
};
export declare const defaultApiProps: {
    apiUrl: string;
};
export declare const defaultTitleProps: {
    title: string;
};
export declare const commonDefaultWidgetProps: {
    title: string;
    apiUrl: string;
    spanRow: number;
    spanCol: number;
};
