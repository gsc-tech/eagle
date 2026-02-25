import type { ParameterValues } from '../types';
interface UseWidgetDataOptions {
    pollInterval?: number;
    parameters?: ParameterValues;
}
export declare function useWidgetData<T = any>(apiUrl: string, options?: UseWidgetDataOptions): {
    data: T[];
    loading: boolean;
    error: Error | null;
};
export {};
