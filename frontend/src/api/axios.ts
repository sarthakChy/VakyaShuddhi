// src/api/axios.ts
import axios from "axios";
import type { InternalAxiosRequestConfig } from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Important: sends httpOnly cookies
});

// Store reference to auth functions (will be set by AuthProvider)
let getAccessTokenFn: (() => string | null) | null = null;
let refreshAccessTokenFn: (() => Promise<string | null>) | null = null;

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
  async (error) => {
    const originalRequest = error.config;

    // If access token expired (401) and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Try to refresh access token using refresh token
        const newToken = await refreshAccessTokenFn?.();

        if (newToken) {
          // Update the failed request with new token
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          
          // Retry the original request
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, redirect to login
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;