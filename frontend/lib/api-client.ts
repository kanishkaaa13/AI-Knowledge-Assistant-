import axios from "axios";
import type { InternalAxiosRequestConfig } from "axios";

import { env } from "@/lib/env";

type RetryableAxiosRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

function readCookie(name: string) {
  if (typeof document === "undefined") {
    return undefined;
  }

  const match = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${name}=`));
  return match?.split("=")[1];
}

export const apiClient = axios.create({
  baseURL: env.NEXT_PUBLIC_API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json"
  }
});

let isRefreshing = false;
let refreshPromise: Promise<void> | null = null;

apiClient.interceptors.request.use((config) => {
  const method = (config.method ?? "get").toLowerCase();
  if (!["post", "put", "patch", "delete"].includes(method)) {
    return config;
  }

  const isRefresh = config.url?.includes("/auth/refresh");
  const csrfToken = readCookie(isRefresh ? "csrf_refresh_token" : "csrf_access_token");
  if (csrfToken) {
    config.headers.set("X-CSRF-Token", decodeURIComponent(csrfToken));
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as RetryableAxiosRequestConfig | undefined;
    const isUnauthorized = error.response?.status === 401;
    const isAuthRefreshRequest = originalRequest?.url?.includes("/auth/refresh");

    if (!isUnauthorized || !originalRequest || originalRequest._retry || isAuthRefreshRequest) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      if (!isRefreshing) {
        isRefreshing = true;
        refreshPromise = apiClient.post("/auth/refresh").then(() => undefined);
      }

      await refreshPromise;
      return apiClient(originalRequest);
    } catch (refreshError) {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("auth:expired"));
      }
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  }
);
