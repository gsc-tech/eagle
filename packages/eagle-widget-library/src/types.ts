export type ParameterType = 'text' | 'number' | 'date' | 'select' | 'multiselect' | 'checkbox';

export interface ParameterDefinition {
    name: string;
    label: string;
    type: ParameterType;
    defaultValue?: any;
    options?: { label: string; value: any }[]; // For select type
    optionsApiUrl?: string;                   // Optional URL to fetch options dynamically
    required?: boolean;
    placeholder?: string;
    groupId?: string;
}

export interface ParameterValues {
    [key: string]: any;
}

// Defines a single event subscription: listen for `eventType` and run `action`.
// Currently supports 'refetch'; extend the union as new actions are needed.
export interface WidgetEventSubscription {
    eventType: string;
    action: 'refetch';
}

export interface BaseWidgetProps {
    id?: string;
    apiUrl?: string;
    title?: string;
    parameters?: ParameterDefinition[];
    darkMode?: boolean;
    groupedParametersValues?: Record<string, string>;
    onGroupedParametersChange?: (values: Record<string, any>) => void;
    sheetDependency?: SheetDependencyConfig;
    initialWidgetState?: any;
    onWidgetStateChange?: (state: any) => void;
    isTokenRequired?: boolean;
    getFirebaseToken?: () => Promise<string>;
    // Cross-widget event subscriptions. When a subscribed event fires, the
    // widget performs the specified action (e.g. refetch its data).
    eventSubscriptions?: WidgetEventSubscription[];
}

export interface NormalizationConfig {
    endpointUrl: string;
    method?: 'POST' | 'GET';
    headers?: Record<string, string>;
}

export interface SheetDependencyConfig {
    isDependent: boolean;
    workbookId: string;
    sheetNames?: string[];
    ranges?: string[];
    parsingStrategy: {
        format?: 'grid' | 'records' | 'series';
        normalizationEndpoint?: NormalizationConfig;
    };
}
