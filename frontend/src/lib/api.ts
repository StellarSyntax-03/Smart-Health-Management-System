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

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...restOptions,
    headers: normalizedHeaders,
  });

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

  delete: <T>(endpoint: string) =>
    request<T>(endpoint, { method: "DELETE" }),

  upload: <T>(endpoint: string, formData: FormData) =>
    request<T>(endpoint, {
      method: "POST",
      body: formData,
    }),
};
