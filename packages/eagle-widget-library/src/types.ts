export type ParameterType = 'text' | 'number' | 'date' | 'select' | 'checkbox';

export interface ParameterDefinition {
    name: string;
    label: string;
    type: ParameterType;
    defaultValue?: any;
    options?: { label: string; value: any }[]; // For select type
    required?: boolean;
    placeholder?: string;
    groupId?: string;
}

export interface ParameterValues {
    [key: string]: any;
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
    initialParameterValues?: Record<string, string>;
}

export interface DataMappingConfig {
    xAxis?: string;
    yAxis?: string;
    series?: string[];
    [key: string]: any;
}

export interface NormalizationConfig {
    endpointUrl: string;
    method?: 'POST' | 'GET';
    headers?: Record<string, string>;
}

export interface SheetDependencyConfig {
    isDependent: boolean;
    sheetId: string;
    range: string;
    parsingStrategy: {
        useAutoParser: boolean;
        mapping?: DataMappingConfig;
        normalizationEndpoint?: NormalizationConfig;
    };
}
