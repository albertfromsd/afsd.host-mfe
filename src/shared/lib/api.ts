import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';

const DEFAULT_TIMEOUT_MS = 15_000;

export type ApiError = {
  status: number | null;
  message: string;
  cause?: unknown;
};

export function isApiError(value: unknown): value is ApiError {
  return typeof value === 'object' && value !== null && 'status' in value && 'message' in value;
}

export type CreateApiClientOptions = {
  baseURL?: string;
  timeoutMs?: number;
  getAuthToken?: () => string | null | undefined;
};

export function createApiClient(options: CreateApiClientOptions = {}): AxiosInstance {
  const { baseURL, timeoutMs = DEFAULT_TIMEOUT_MS, getAuthToken } = options;

  const client = axios.create({
    baseURL,
    timeout: timeoutMs,
    headers: { 'Content-Type': 'application/json' },
  });

  client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token = getAuthToken?.();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      const normalized: ApiError = {
        status: error.response?.status ?? null,
        message:
          (error.response?.data as { message?: string } | undefined)?.message ??
          error.message ??
          'Network error',
        cause: error,
      };
      return Promise.reject(normalized);
    },
  );

  return client;
}

export const api = createApiClient({
  baseURL: process.env.PUBLIC_API_BASE_URL,
});
