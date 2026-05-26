import axios, { AxiosInstance } from "axios";
import type { GroupId } from "../store/groups";
import { useFinancialDataStore, useDeepAnalysisFinancialDataStore } from "../store/financialDataStore";
import { useLoadingStatusStore } from "../store/loadingStatusStore";

let _client: AxiosInstance | null = null;

export interface BackOfficeApiClientOptions {
  baseUrl: string;
  getFirebaseToken: () => Promise<string | null>;
}

export function init(options: BackOfficeApiClientOptions): void {
  _client = axios.create({
    baseURL: options.baseUrl,
    headers: {
      "Content-Type": "application/json",
    },
  });

  _client.interceptors.request.use(async (config) => {
    try {
      const token = await options.getFirebaseToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // proceed without token; server will respond 401 if required
    }
    return config;
  });

  _client.interceptors.response.use(
    (res) => res,
    (err) => Promise.reject(err),
  );
}

export function getClient(): AxiosInstance {
  if (!_client) {
    throw new Error(
      "backOfficeApiClient has not been initialised. Call init({ baseUrl, getFirebaseToken }) before making requests.",
    );
  }
  return _client;
}

// ── Statement fetch params ─────────────────────────────────────────────────

export interface AccountRef {
  accountId: string;
  clearingCorp: string;
  nickname: string;
}

export interface TimeInput {
  year: string[];
  month: string[];
  week: string[];
  /** Single-day query: "YYYY-MM-DD" */
  day?: string;
  /** Date range start: "YYYY-MM-DD" */
  fromDate?: string;
  /** Date range end: "YYYY-MM-DD" */
  toDate?: string;
}

export interface StatementParams {
  accounts: AccountRef[];
  timeInput: TimeInput;
}

// ── Fetch helpers ──────────────────────────────────────────────────────────

/**
 * Fetch financial statements and populate `useFinancialDataStore`.
 * Filter state comes from the calling app (eagle-end-user-panel stores).
 */
export async function fetchFinancialStatements(
  params: StatementParams,
  signal?: AbortSignal,
): Promise<void> {
  const client = getClient();
  useLoadingStatusStore.getState().setLoading(true);
  try {
    const { data } = await client.post(
      "/statement/financial",
      { data: { ...params, returnCached: true } },
      { signal },
    );
    useFinancialDataStore.getState().setFinancialData(data);
  } finally {
    useLoadingStatusStore.getState().setLoading(false);
  }
}

/**
 * Fetch financial statements for one Deep Analysis group and populate
 * the per-group slice in `useDeepAnalysisFinancialDataStore`.
 */
export async function fetchDeepAnalysisStatements(
  group: GroupId,
  params: StatementParams,
  signal?: AbortSignal,
): Promise<void> {
  const client = getClient();
  useLoadingStatusStore.getState().setLoading(true);
  try {
    const { data } = await client.post(
      "/statement/financial",
      { data: { ...params, returnCached: true } },
      { signal },
    );
    useDeepAnalysisFinancialDataStore.getState().setFinancialData(group, data);
  } finally {
    useLoadingStatusStore.getState().setLoading(false);
  }
}

/**
 * Fetch product-wise statements. Returns raw response data — caller decides
 * which store to populate (product-wise store is app-managed).
 */
export async function fetchProductwiseStatements(
  params: StatementParams,
  signal?: AbortSignal,
): Promise<any> {
  const client = getClient();
  useLoadingStatusStore.getState().setLoading(true);
  try {
    const { data } = await client.post(
      "/statement/productwise",
      { data: { ...params, returnCached: true } },
      { signal },
    );
    return data;
  } finally {
    useLoadingStatusStore.getState().setLoading(false);
  }
}