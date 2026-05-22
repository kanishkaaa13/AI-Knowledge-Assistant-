import axios from "axios";
import type { InternalAxiosRequestConfig } from "axios";

import { env } from "@/lib/env";

type RetryableAxiosRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

export const apiClient = axios.create({
  baseURL: env.NEXT_PUBLIC_API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json"
  }
});

let isRefreshing = false;
let refreshPromise: Promise<void> | null = null;

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
