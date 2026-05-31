import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import Constants from "expo-constants";

const API_BASE = Constants.expoConfig?.extra?.apiUrl || "http://localhost:5001/api";
const TOKEN_KEY = "smarthealth_token";

async function getToken(): Promise<string | null> {
  if (Platform.OS === "web") {
    return localStorage.getItem(TOKEN_KEY);
  }
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.setItem(TOKEN_KEY, token);
    return;
  }
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function removeToken(): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.removeItem(TOKEN_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const { headers: customHeaders, ...restOptions } = options || {};
  const normalizedHeaders = new Headers(customHeaders);

  if (!normalizedHeaders.has("Content-Type") && !(restOptions.body instanceof FormData)) {
    normalizedHeaders.set("Content-Type", "application/json");
  }

  const token = await getToken();
  if (token && !normalizedHeaders.has("Authorization")) {
    normalizedHeaders.set("Authorization", `Bearer ${token}`);
  }

  const url = `${API_BASE}${endpoint}`;
  const res = await fetch(url, { ...restOptions, headers: normalizedHeaders });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || `HTTP ${res.status}`);
  }

  if (res.status === 204 || res.headers.get("Content-Length") === "0") {
    return undefined as T;
  }

  return res.json();
}

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint),

  post: <T>(endpoint: string, body: unknown) =>
    request<T>(endpoint, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  put: <T>(endpoint: string, body: unknown) =>
    request<T>(endpoint, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  patch: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, {
      method: "PATCH",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(endpoint: string) =>
    request<T>(endpoint, { method: "DELETE" }),

  upload: <T>(endpoint: string, formData: FormData): Promise<T> =>
    new Promise(async (resolve, reject) => {
      const token = await getToken();
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${API_BASE}${endpoint}`);
      if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.responseText));
          } catch {
            resolve(undefined as T);
          }
        } else {
          try {
            const err = JSON.parse(xhr.responseText);
            reject(new Error(err.error || `HTTP ${xhr.status}`));
          } catch {
            reject(new Error(`HTTP ${xhr.status}`));
          }
        }
      };
      xhr.onerror = () => reject(new Error("Network error"));
      xhr.send(formData);
    }),

};
