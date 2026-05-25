export type ConnectorType = "marex" | "excel";
export type ConnectorStatus = "idle" | "connecting" | "connected" | "error" | "failed";


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

/** Declares a data input slot a widget can accept (e.g. "marex positions"). */
export interface DataSlotDefinition {
    id: string;
    label: string;
    options?: { label: string; value: string }[];
    sourceType?: string;
}

/** Maps a slot to a selected value (null = use aggregated / all). */
export interface DataBinding {
    slotId: string;
    sourceId: string | null;
}

import type { WidgetEventType } from "./store/widgetEventBus";

export interface WidgetEventSubscription {
    eventType: WidgetEventType;
    action: 'refetch';
}

/** Payload for programmatically adding a widget to a user-editable dashboard tab. */
export interface AddWidgetTarget {
    dashboardId: string;
    tabId: string;
    widget: {
        componentName: string;
        defaultProps: Record<string, unknown>;
        /** Preferred grid size — host uses findBestFitPosition to place it. */
        suggestedSize?: { w: number; h: number };
    };
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
    eventSubscriptions?: WidgetEventSubscription[];
    /** Injected by the host to bypass API fetching with local data (e.g. CSV). */
    staticData?: any[];
    /**
     * Injected by WidgetRenderer only on user-editable dashboards.
     * Allows a widget to spawn another widget on any dashboard tab at runtime.
     * Not injected for operator-published (read-only) dashboards.
     */
    addWidgetToDashboard?: (target: AddWidgetTarget) => Promise<void>;
    /**
     * Identifies the dashboard tab this widget lives on.
     * Injected alongside addWidgetToDashboard so widgets can target the
     * correct tab when spawning new widgets.
     */
    widgetTarget?: { dashboardId: string; tabId: string };
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

/**
 * Declares which host-managed resources a widget always needs injected,
 * regardless of per-instance backend configuration.
 *
 * The host (WidgetRenderer) reads these flags and injects the matching props
 * generically — no widget-name branching required.
 *
 * Note: `getFirebaseToken` is NOT listed here — it is a per-instance concern
 * configured via `defaultProps.isTokenRequired` in the dev console, not a
 * widget-level contract.
 */
export interface WidgetHostBindings {
    /** Widget needs the host to inject a persisted workbook snapshot and an onSave callback. */
    needsWorkbookSnapshot?: boolean;
}

/** Typed registry entry for every widget in the library. */
export interface WidgetDefinition<TProps extends BaseWidgetProps = BaseWidgetProps> {
    component: React.ComponentType<TProps>;
    hostBindings?: WidgetHostBindings;
    /** Display category in the widget tray. Defaults to "General" when omitted. */
    category?: string;
}
