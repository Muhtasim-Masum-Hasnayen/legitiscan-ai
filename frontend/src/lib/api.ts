import type {
  FeedbackInput, ScanDetail, ScanList, SystemStatus, TokenResponse, User, Verdict,
} from "./types";

export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/$/, "");

const TOKEN_KEY = "legitiscan.token";
const GUEST_KEY = "legitiscan.guest";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const hasWindow = () => typeof window !== "undefined";
function safeGet(key: string): string | null {
  try { return hasWindow() ? window.localStorage.getItem(key) : null; } catch { return null; }
}
function safeSet(key: string, value: string): void {
  try { if (hasWindow()) window.localStorage.setItem(key, value); } catch { /* storage blocked */ }
}
function safeRemove(key: string): void {
  try { if (hasWindow()) window.localStorage.removeItem(key); } catch { /* ignore */ }
}

let memoryToken: string | null = null;
export const tokenStore = {
  get: (): string | null => safeGet(TOKEN_KEY) ?? memoryToken,
  set: (t: string): void => { memoryToken = t; safeSet(TOKEN_KEY, t); },
  clear: (): void => { memoryToken = null; safeRemove(TOKEN_KEY); },
};

let memoryGuestId: string | null = null;
/** Anonymous browser identity; matches the backend rule ^[A-Za-z0-9_-]{16,64}$. */
export function getGuestId(): string {
  if (!hasWindow()) return "";
  const existing = safeGet(GUEST_KEY) ?? memoryGuestId;
  if (existing && /^[A-Za-z0-9_-]{16,64}$/.test(existing)) return existing;
  const bytes = new Uint8Array(16);
  window.crypto.getRandomValues(bytes);
  const id = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  memoryGuestId = id;
  safeSet(GUEST_KEY, id);
  return id;
}

function formatDetail(detail: unknown): string {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((d) => (d && typeof d === "object" && "msg" in d ? String((d as { msg: unknown }).msg) : ""))
      .filter(Boolean)
      .join(" ");
  }
  return "";
}

async function rawRequest(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const token = tokenStore.get();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  headers.set("X-Guest-Id", getGuestId());
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...init, headers });
  } catch {
    throw new ApiError("Cannot reach the LegitiScan server. Check your connection and try again.", 0);
  }
  if (!res.ok) {
    let message = "";
    try { message = formatDetail((await res.json())?.detail); } catch { /* non-JSON body */ }
    if (!message) message = res.status === 429 ? "Too many requests. Please wait a minute." : `Request failed (${res.status}).`;
    throw new ApiError(message, res.status);
  }
  return res;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await rawRequest(path, init);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

const post = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const api = {
  systemStatus: () => request<SystemStatus>("/api/system/status"),

  createScan(files: File[], brand?: string, productName?: string): Promise<ScanDetail> {
    const form = new FormData();
    files.forEach((f) => form.append("files", f, f.name));
    if (brand?.trim()) form.append("brand", brand.trim());
    if (productName?.trim()) form.append("product_name", productName.trim());
    return request<ScanDetail>("/api/scans", { method: "POST", body: form });
  },
  listScans(page = 1, pageSize = 10, verdict?: Verdict): Promise<ScanList> {
    const q = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
    if (verdict) q.set("verdict", verdict);
    return request<ScanList>(`/api/scans?${q.toString()}`);
  },
  getScan: (id: string) => request<ScanDetail>(`/api/scans/${encodeURIComponent(id)}`),
  deleteScan: (id: string) => request<void>(`/api/scans/${encodeURIComponent(id)}`, { method: "DELETE" }),
  /** <img> cannot send auth headers, so images are fetched as blobs. */
  async scanImageBlob(id: string, position: number): Promise<Blob> {
    return (await rawRequest(`/api/scans/${encodeURIComponent(id)}/images/${position}`)).blob();
  },

  register: (email: string, password: string, name?: string) =>
    request<TokenResponse>("/api/auth/register", post({ email, password, name: name?.trim() || null })),
  login: (email: string, password: string) => request<TokenResponse>("/api/auth/login", post({ email, password })),
  me: () => request<User>("/api/auth/me"),

  sendFeedback: (input: FeedbackInput) =>
    request<{ id: number }>("/api/feedback", post({
      category: input.category,
      rating: input.rating ?? null,
      message: input.message,
      email: input.email || null,
      scan_id: input.scan_id || null,
    })),
};
