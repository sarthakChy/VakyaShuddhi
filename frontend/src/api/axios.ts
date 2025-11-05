// src/api/axios.ts
import axios from "axios";
import type { InternalAxiosRequestConfig, AxiosError } from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Important: sends httpOnly cookies
});

// Store reference to auth functions (will be set by AuthProvider)
let getAccessTokenFn: (() => string | null) | null = null;
let refreshAccessTokenFn: (() => Promise<string | null>) | null = null;

// Refresh token state management
let isRefreshing = false;
let failedRequestsQueue: Array<{
  resolve: (token: string | null) => void;
  reject: (error: any) => void;
}> = [];

// Process queued requests after token refresh
const processQueue = (error: any = null, token: string | null = null) => {
  failedRequestsQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve(token);
    }
  });
  failedRequestsQueue = [];
};

// Function to set auth functions from context
export const setAuthFunctions = (
  getToken: () => string | null,
  refreshToken: () => Promise<string | null>
) => {
  getAccessTokenFn = getToken;
  refreshAccessTokenFn = refreshToken;
};

// Request interceptor - add access token to requests
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Skip adding token for auth endpoints
    const isAuthEndpoint = 
      config.url?.includes("/auth/login") ||
      config.url?.includes("/auth/refresh") ||
      config.url?.includes("/auth/logout");

    if (isAuthEndpoint) {
      return config;
    }

    // Add access token to other requests
    const token = getAccessTokenFn?.();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle token expiration
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Skip refresh logic for auth endpoints
    const isAuthEndpoint = 
      originalRequest?.url?.includes("/auth/login") ||
      originalRequest?.url?.includes("/auth/refresh") ||
      originalRequest?.url?.includes("/auth/logout");

    if (isAuthEndpoint) {
      return Promise.reject(error);
    }

    // Handle 401 Unauthorized
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedRequestsQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (token && originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Try to refresh access token
        const newToken = await refreshAccessTokenFn?.();

        if (newToken) {
          // Update original request with new token
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
          }

          // Process queued requests
          processQueue(null, newToken);
          isRefreshing = false;

          // Retry the original request
          return api(originalRequest);
        } else {
          // No token received, clear queue and redirect
          processQueue(new Error("Token refresh failed"), null);
          isRefreshing = false;
          window.location.href = "/login";
          return Promise.reject(error);
        }
      } catch (refreshError) {
        // Refresh failed, clear queue and redirect
        processQueue(refreshError, null);
        isRefreshing = false;
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export const authApi = {
  login: (firebaseToken: string) =>
    api.post("/auth/login", new URLSearchParams({ firebase_token: firebaseToken }), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    }),
  refresh: () => api.post("/auth/refresh"),
  logout: () => api.post("/auth/logout"),
  me: () => api.get("/auth/me"),
};

export default api;