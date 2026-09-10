const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

interface RequestOptions extends Omit<RequestInit, "method" | "body"> {
  token?: string | null;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  opts: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((opts.headers as Record<string, string>) ?? {}),
  };

  if (opts.token) {
    headers["Authorization"] = `Bearer ${opts.token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const detail =
      (data as { detail?: string } | null)?.detail ?? `Error ${res.status}`;
    throw new ApiError(res.status, detail);
  }

  return data as T;
}

export const api = {
  get: <T>(path: string, opts?: RequestOptions) =>
    request<T>("GET", path, undefined, opts),

  post: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>("POST", path, body, opts),

  put: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>("PUT", path, body, opts),

  delete: <T>(path: string, opts?: RequestOptions) =>
    request<T>("DELETE", path, undefined, opts),
};
