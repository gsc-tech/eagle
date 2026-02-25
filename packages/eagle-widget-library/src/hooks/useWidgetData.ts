import { useState, useEffect } from 'react';
import type { ParameterValues } from '../types';

interface UseWidgetDataOptions {
    pollInterval?: number;
    parameters?: ParameterValues;
}

export function useWidgetData<T = any>(
    apiUrl: string,
    options?: UseWidgetDataOptions
) {
    const { pollInterval, parameters } = options || {};
    const [data, setData] = useState<T[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        let mounted = true;
        let intervalId: any;

        const fetchData = async () => {
            try {
                // Build URL with parameters
                let url = apiUrl;
                if (parameters && Object.keys(parameters).length > 0) {
                    const queryParams = new URLSearchParams();
                    console.log(parameters);
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
                    console.log(queryParams.toString());
                    const queryString = queryParams.toString();
                    if (queryString) {
                        url = `${apiUrl}${apiUrl.includes('?') ? '&' : '?'}${queryString}`;
                    }
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
    }, [apiUrl, pollInterval, JSON.stringify(parameters)]);

    return { data, loading, error };
}
