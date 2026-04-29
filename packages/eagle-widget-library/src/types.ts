export type ConnectorType = "marex" | "excel";
export type ConnectorStatus = "idle" | "connecting" | "connected" | "error" | "failed";

export type ParameterType = 'text' | 'number' | 'date' | 'select' | 'multiselect' | 'checkbox';

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

/** Declares a data input slot a widget can accept (e.g. "marex positions"). */
export interface DataSlotDefinition {
    id: string;
    label: string;
    /**
     * Explicit list of selectable options. When provided, WidgetContainer renders
     * these instead of deriving them from the ConnectorsContext. The selected value
     * is stored verbatim in DataBinding.sourceId.
     */
    options?: { label: string; value: string }[];
    /** Fallback: filter connectors by this type when options is not provided. */
    sourceType?: string;
}

/** Maps a slot to a selected value (null = use aggregated / all). */
export interface DataBinding {
    slotId: string;
    sourceId: string | null;
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

/** A configured data connector (one entry per account/source). */
export interface ConnectorRecord {
    id: string;
    type: ConnectorType;
    name: string;
    accountId: string;
}
