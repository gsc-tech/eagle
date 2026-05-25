/**
 * Thin HTTP client for the Falcon middleware backend.
 *
 * Call `falconApiClient.init({ baseUrl, getToken })` once from the app root
 * (after Firebase Auth is ready). Pass `import.meta.env.VITE_FALCON_MIDDLEWARE_BACKEND`
 * as `baseUrl` — reading it in the app avoids Vite type-augmentation requirements
 * inside the pure-TS widget library package.
 */

let _baseUrl = "";
let _getToken: (() => Promise<string>) | null = null;

async function authHeaders(): Promise<Record<string, string>> {
    if (!_getToken) return {};
    try {
        const token = await _getToken();
        return token ? { Authorization: `Bearer ${token}` } : {};
    } catch (err) {
        console.error("[falconApiClient] Failed to get auth token — request will be unauthenticated", err);
        return {};
    }
}

async function request<T>(method: string, path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(await authHeaders()),
    };

    const res = await fetch(`${_baseUrl}${path}`, {
        method,
        headers,
        signal,
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });

    if (!res.ok) {
        const text = await res.text().catch(() => res.statusText);
        throw new Error(`[falconApiClient] ${method} ${path} → ${res.status}: ${text}`);
    }

    if (res.status === 204) return undefined as T;

    return res.json() as Promise<T>;
}

export const falconApiClient = {
    /**
     * Register the base URL and Firebase token getter.
     * Call once from the app root.
     *
     * @param baseUrl   Value of `import.meta.env.VITE_FALCON_MIDDLEWARE_BACKEND`
     * @param getToken  Function that returns a current Firebase ID token
     */
    init(baseUrl: string, getToken: () => Promise<string>): void {
        _baseUrl = baseUrl ?? "";
        _getToken = getToken;
    },

    get<T>(path: string, options?: { signal?: AbortSignal }): Promise<T> {
        return request<T>("GET", path, undefined, options?.signal);
    },

    post<T>(path: string, body: unknown, options?: { signal?: AbortSignal }): Promise<T> {
        return request<T>("POST", path, body, options?.signal);
    },

    put<T>(path: string, body: unknown, options?: { signal?: AbortSignal }): Promise<T> {
        return request<T>("PUT", path, body, options?.signal);
    },

    delete<T>(path: string, options?: { signal?: AbortSignal; body?: unknown }): Promise<T> {
        return request<T>("DELETE", path, options?.body, options?.signal);
    },
};