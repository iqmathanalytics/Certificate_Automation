import { getAuthToken, redirectToLogin } from "@/lib/auth";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: unknown,
  ) {
    super(message);
  }
}

function handleAuthFailure(path: string, status: number) {
  if (status !== 401) return;
  // Don't bounce the login request itself
  if (path.includes("/api/auth/login")) return;
  redirectToLogin();
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  const token = getAuthToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, { cache: "no-store", ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    handleAuthFailure(path, res.status);
    const payload = data as { error?: string; detail?: string };
    const message = payload.detail
      ? `${payload.error ?? "Request failed"}: ${payload.detail}`
      : (payload.error ?? res.statusText);
    throw new ApiError(message, res.status, data);
  }
  return data as T;
}

export async function apiForm<T>(path: string, form: FormData, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  const token = getAuthToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    cache: "no-store",
    ...options,
    method: options.method ?? "POST",
    headers,
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    handleAuthFailure(path, res.status);
    const payload = data as { error?: string; detail?: string; details?: string[] };
    const message = payload.details?.length
      ? payload.details.join(" ")
      : payload.detail
        ? `${payload.error ?? "Request failed"}: ${payload.detail}`
        : (payload.error ?? res.statusText);
    throw new ApiError(message, res.status, data);
  }
  return data as T;
}

export const apiBase = API_URL;
