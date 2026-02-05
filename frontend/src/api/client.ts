import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { jwtDecode } from 'jwt-decode';

interface JwtPayload {
  exp: number;
  sub: string;
  email: string;
}

// Token refresh threshold (refresh when less than 5 minutes remaining)
const REFRESH_THRESHOLD_MS = 5 * 60 * 1000;

const client = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
});

let accessToken: string | null = null;
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];
let refreshTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleTokenRefresh(token: string) {
  // Clear any existing timer
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }

  try {
    const decoded = jwtDecode<JwtPayload>(token);
    const expiresAt = decoded.exp * 1000; // Convert to ms
    const now = Date.now();
    const timeUntilRefresh = expiresAt - now - REFRESH_THRESHOLD_MS;

    if (timeUntilRefresh > 0) {
      refreshTimer = setTimeout(async () => {
        try {
          await refresh();
        } catch {
          // Refresh failed, user will be logged out on next 401
        }
      }, timeUntilRefresh);
    }
  } catch {
    // Invalid token, don't schedule refresh
  }
}

export function setAccessToken(token: string | null) {
  accessToken = token;
  if (token) {
    scheduleTokenRefresh(token);
  } else if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
}

export function getAccessToken() {
  return accessToken;
}

function subscribeTokenRefresh(callback: (token: string) => void) {
  refreshSubscribers.push(callback);
}

function onTokenRefreshed(token: string) {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
}

// Request interceptor - add Authorization header
client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (accessToken && config.headers) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Response interceptor - handle 401 with token refresh
client.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const isRefreshRequest = originalRequest.url?.includes('/auth/refresh');

    // Only attempt refresh on 401, if not already retrying, and not on refresh endpoint
    if (error.response?.status === 401 && !originalRequest._retry && !isRefreshRequest) {
      // If already refreshing, queue this request
      if (isRefreshing) {
        return new Promise((resolve) => {
          subscribeTokenRefresh((token: string) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            resolve(client(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const response = await client.post('/auth/refresh');
        const newToken = response.data.access_token;
        setAccessToken(newToken);
        onTokenRefreshed(newToken);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
        }
        return client(originalRequest);
      } catch (refreshError) {
        // Refresh failed - clear token and reject
        setAccessToken(null);
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// Auth API functions
export interface User {
  id: string;
  email: string;
}

export interface AuthResponse {
  user: User;
  access_token: string;
}

export async function login(email: string, password: string): Promise<{ user: User }> {
  const response = await client.post<AuthResponse>('/auth/login', { email, password });
  const { user, access_token } = response.data;
  setAccessToken(access_token);
  return { user };
}

export async function logout(): Promise<void> {
  try {
    await client.post('/auth/logout');
  } finally {
    setAccessToken(null);
  }
}

export async function refresh(): Promise<{ user: User }> {
  const response = await client.post<AuthResponse>('/auth/refresh');
  const { user, access_token } = response.data;
  setAccessToken(access_token);
  return { user };
}

export default client;
