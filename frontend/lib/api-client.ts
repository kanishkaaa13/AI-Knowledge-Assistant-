import axios from "axios";
import type { InternalAxiosRequestConfig } from "axios";

import { env } from "@/lib/env";

type RetryableAxiosRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

export const apiClient = axios.create({
  baseURL: env.NEXT_PUBLIC_API_BASE_URL,
  withCredentials: true, // always send httpOnly cookies
  headers: {
    "Content-Type": "application/json"
  }
});

let isRefreshing = false;
let refreshPromise: Promise<void> | null = null;

// NOTE: No CSRF interceptor — the backend uses httpOnly JWT cookies only.
// It does NOT set csrf_access_token / csrf_refresh_token cookies.

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as RetryableAxiosRequestConfig | undefined;
    const isUnauthorized = error.response?.status === 401;
    const isAuthRequest =
      originalRequest?.url?.includes("/auth/login") ||
      originalRequest?.url?.includes("/auth/register") ||
      originalRequest?.url?.includes("/auth/refresh") ||
      originalRequest?.url?.includes("/auth/logout");

    if (!isUnauthorized || !originalRequest || originalRequest._retry || isAuthRequest) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      if (!isRefreshing) {
        isRefreshing = true;
        refreshPromise = apiClient
          .post("/auth/refresh")
          .then(() => undefined)
          .finally(() => {
            isRefreshing = false;
            refreshPromise = null;
          });
      }

      await refreshPromise;
      return apiClient(originalRequest);
    } catch (refreshError) {
      isRefreshing = false;
      refreshPromise = null;
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("auth:expired"));
      }
      return Promise.reject(refreshError);
    }
  }
);
