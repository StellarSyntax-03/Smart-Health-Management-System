const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";
const TOKEN_KEY = "smarthealth_token";

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const { headers: customHeaders, ...restOptions } = options || {};
  const normalizedHeaders = new Headers(customHeaders);
  if (!normalizedHeaders.has("Content-Type") && !(restOptions.body instanceof FormData)) {
    normalizedHeaders.set("Content-Type", "application/json");
  }

  if (typeof window !== "undefined") {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token && !normalizedHeaders.has("Authorization")) {
      normalizedHeaders.set("Authorization", `Bearer ${token}`);
    }
  }

  const method = restOptions.method || "GET";
  const url = `${API_BASE}${endpoint}`;

  if (process.env.NODE_ENV === "development") {
    console.log(`[API] ${method} ${endpoint}`);
  }

  const res = await fetch(url, {
    ...restOptions,
    headers: normalizedHeaders,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Request failed" }));
    const message = error.error || `HTTP ${res.status}`;
    if (process.env.NODE_ENV === "development") {
      console.error(`[API] ${method} ${endpoint} -> ${res.status}: ${message}`);
    }
    throw new Error(message);
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

  delete: <T>(endpoint: string) =>
    request<T>(endpoint, { method: "DELETE" }),

  upload: <T>(endpoint: string, formData: FormData) =>
    request<T>(endpoint, {
      method: "POST",
      body: formData,
    }),
};
