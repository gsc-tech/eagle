import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import type { ParameterValues } from "../types";

const STABLE_EMPTY: never[] = [];

interface UseWidgetDataOptions {
    pollInterval?: number;
    parameters?: ParameterValues;
    isTokenRequired?: boolean;
    getFirebaseToken?: () => Promise<string>;
    staticData?: any[];
}

async function fetchWidgetData<T>(
    apiUrl: string,
    parameters: ParameterValues | undefined,
    isTokenRequired: boolean | undefined,
    getFirebaseToken: (() => Promise<string>) | undefined,
    signal: AbortSignal
): Promise<T[]> {
    let token: string | undefined;
    if (isTokenRequired && getFirebaseToken) {
        try {
            token = await getFirebaseToken();
        } catch {
            // proceed without token
        }
    }

    const queryParams = new URLSearchParams();
    if (parameters) {
        for (const [key, value] of Object.entries(parameters)) {
            if (value !== null && value !== undefined && value !== "") {
                if (Array.isArray(value)) {
                    for (const item of value) queryParams.append(key, String(item));
                } else {
                    queryParams.append(key, String(value));
                }
            }
        }
    }
    if (token) queryParams.append("token", token);

    const qs = queryParams.toString();
    const url = qs ? `${apiUrl}${apiUrl.includes("?") ? "&" : "?"}${qs}` : apiUrl;

    const res = await fetch(url, { signal });
    if (!res.ok) throw new Error(`HTTP error! ${res.status}`);
    const json = await res.json();

    if (Array.isArray(json)) return json;
    if (json?.data && Array.isArray(json.data)) return json.data;
    return [json] as T[];
}

export function useWidgetData<T = any>(
    apiUrl: string,
    options: UseWidgetDataOptions = {}
) {
    const { pollInterval, parameters, isTokenRequired, getFirebaseToken, staticData } = options;

    const queryClient = useQueryClient();

    // Stable serialization of parameters for the cache key — avoid JSON.stringify in dep arrays
    const paramsKey = parameters ? JSON.stringify(parameters) : null;

    const queryKey = ["widget-data", apiUrl, paramsKey, isTokenRequired];

    const { data, isLoading, error, refetch } = useQuery<T[]>({
        queryKey,
        queryFn: ({ signal }) =>
            fetchWidgetData<T>(apiUrl, parameters, isTokenRequired, getFirebaseToken, signal),
        enabled: staticData === undefined,
        refetchInterval: pollInterval,
        staleTime: pollInterval ? pollInterval / 2 : 30_000,
        retry: 2,
        placeholderData: (prev) => prev,
    });

    // When staticData is provided, bypass the query entirely and return it directly.
    // Use a ref so that switching from static → live doesn't leave stale query data.
    const staticRef = useRef(staticData);
    useEffect(() => {
        staticRef.current = staticData;
        if (staticData !== undefined) {
            // Write into the query cache so any subscribers see the update
            queryClient.setQueryData(queryKey, staticData as T[]);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [staticData]);

    if (staticData !== undefined) {
        return {
            data: staticData as T[],
            loading: false,
            error: null,
            refetch: () => Promise.resolve(),
        };
    }

    return {
        data: data ?? STABLE_EMPTY as T[],
        loading: isLoading,
        error: error as Error | null,
        refetch: () => refetch().then(() => void 0),
    };
}