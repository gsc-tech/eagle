import { useState, useEffect } from 'react';
import type { ParameterValues } from '../types';

interface UseWidgetDataOptions {
    pollInterval?: number;
    parameters?: ParameterValues;
    isTokenRequired?: boolean;
    getFirebaseToken?: () => Promise<string>;
}

export function useWidgetData<T = any>(
    apiUrl: string,
    options?: UseWidgetDataOptions
) {
    const { pollInterval, parameters, isTokenRequired, getFirebaseToken } = options || {};
    const [data, setData] = useState<T[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        let mounted = true;
        let intervalId: any;

        const fetchData = async () => {
            try {
                // Fetch token if required
                let token: string | undefined;
                console.log("token required ?", isTokenRequired);
                if (isTokenRequired && getFirebaseToken) {
                    console.log("function to get token", getFirebaseToken);
                    try {
                        token = await getFirebaseToken();
                        console.log("token", token);
                    } catch (tokenErr) {
                        console.error("Failed to fetch Firebase token:", tokenErr);
                    }
                }

                // Build URL with parameters
                let url = apiUrl;
                const queryParams = new URLSearchParams();

                if (parameters && Object.keys(parameters).length > 0) {
                    Object.entries(parameters).forEach(([key, value]) => {
                        if (value !== null && value !== undefined && value !== '') {
                            if (Array.isArray(value)) {
                                for (const item of value) {
                                    queryParams.append(key, String(item));
                                }
                            } else {
                                queryParams.append(key, String(value));
                            }
                        }
                    });
                }

                // Append token if fetched
                if (token) {
                    queryParams.append('token', token);
                }

                const queryString = queryParams.toString();
                if (queryString) {
                    url = `${apiUrl}${apiUrl.includes('?') ? '&' : '?'}${queryString}`;
                }

                const res = await fetch(url);
                if (!res.ok) throw new Error(`HTTP error! ${res.status}`);
                const jsonData = await res.json();

                if (mounted) {
                    if (Array.isArray(jsonData)) {
                        setData(jsonData);
                    } else if (jsonData?.data && Array.isArray(jsonData.data)) {
                        setData(jsonData.data);
                    } else {
                        setData([jsonData] as any);
                    }
                    setLoading(false);
                    setError(null);
                }
            } catch (err) {
                if (mounted) {
                    console.error("Failed to fetch widget data:", err);
                    setError(err instanceof Error ? err : new Error('Unknown error'));
                    setLoading(false);
                }
            }
        };

        fetchData();

        if (pollInterval) {
            intervalId = setInterval(fetchData, pollInterval);
        }

        return () => {
            mounted = false;
            if (intervalId) clearInterval(intervalId);
        };
    }, [apiUrl, pollInterval, JSON.stringify(parameters), isTokenRequired, getFirebaseToken]);

    return { data, loading, error };
}
