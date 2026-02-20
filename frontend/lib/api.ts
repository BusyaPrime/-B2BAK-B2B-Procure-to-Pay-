import type { DealItem, InvoiceItem, QuoteItem, RequestItem } from "@/lib/types";

type Paginated<T> = { items: T[]; page: number; page_size: number; total: number };

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
const API_TIMEOUT_MS = 12000;

function normalizeErrorMessage(problem: unknown, fallback: string): string {
  if (!problem || typeof problem !== "object") return fallback;

  const payload = problem as { detail?: unknown; title?: unknown };
  const detail = payload.detail;

  if (typeof detail === "string" && detail.trim().length > 0) return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0] as { msg?: unknown };
    if (first && typeof first === "object" && typeof first.msg === "string") return first.msg;
    return JSON.stringify(detail);
  }
  if (detail && typeof detail === "object") return JSON.stringify(detail);
  if (typeof payload.title === "string" && payload.title.trim().length > 0) return payload.title;

  return fallback;
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {})
      },
      credentials: "include",
      signal: controller.signal
    });
    if (!response.ok) {
      const problem = await response.json().catch(() => null);
      throw new Error(normalizeErrorMessage(problem, `API error ${response.status}`));
    }
    return (await response.json()) as T;
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Request timed out. Please refresh and try again.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export const apiClient = {
  login: (email: string, password: string) =>
    api("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  logout: () => api<{ message: string }>("/auth/logout", { method: "POST" }),
  me: () =>
    api<{
      user: {
        email: string;
        role: string;
        id: string;
        org_id: string;
        display_name?: string | null;
        avatar_url?: string | null;
        theme_preference?: "dark" | "light";
        locale?: "en" | "ru";
      };
      organization: { id: string; name: string };
    }>("/auth/me"),
  profile: () =>
    api<{
      email: string;
      role: string;
      id: string;
      org_id: string;
      display_name?: string | null;
      avatar_url?: string | null;
      theme_preference?: "dark" | "light";
      locale?: "en" | "ru";
      created_at: string;
    }>("/auth/profile"),
  updateProfile: (payload: {
    display_name?: string | null;
    avatar_url?: string | null;
    theme_preference?: "dark" | "light";
    locale?: "en" | "ru";
  }) => api("/auth/profile", { method: "PATCH", body: JSON.stringify(payload) }),
  requests: (params = "") => api<Paginated<RequestItem>>(`/requests${params}`),
  request: (id: string) => api<RequestItem>(`/requests/${id}`),
  createRequest: (payload: Record<string, unknown>) => api<RequestItem>("/requests", { method: "POST", body: JSON.stringify(payload) }),
  patchRequest: (id: string, payload: Record<string, unknown>) => api<RequestItem>(`/requests/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  publishRequest: (id: string) => api<RequestItem>(`/requests/${id}/publish`, { method: "POST", headers: { "Idempotency-Key": `pub-${id}` } }),
  shortlistRequest: (id: string) => api<RequestItem>(`/requests/${id}/shortlist`, { method: "POST" }),
  awardRequest: (id: string, winning_quote_id: string) =>
    api<{ deal_id: string }>(`/requests/${id}/award`, { method: "POST", body: JSON.stringify({ winning_quote_id }) }),
  quotes: (params = "") => api<Paginated<QuoteItem>>(`/quotes${params}`),
  createQuote: (payload: Record<string, unknown>) => api<QuoteItem>("/quotes", { method: "POST", body: JSON.stringify(payload) }),
  patchQuote: (id: string, payload: Record<string, unknown>) => api<QuoteItem>(`/quotes/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  withdrawQuote: (id: string) => api<QuoteItem>(`/quotes/${id}/withdraw`, { method: "POST" }),
  deals: (params = "") => api<Paginated<DealItem>>(`/deals${params}`),
  deal: (id: string) => api<DealItem>(`/deals/${id}`),
  createInvoice: (id: string) => api<InvoiceItem>(`/deals/${id}/create-invoice`, { method: "POST" }),
  markPaid: (id: string) => api<DealItem>(`/deals/${id}/mark-paid`, { method: "POST" }),
  messages: (dealId: string) => api<Array<{ id: string; body: string; sender_user_id: string; created_at: string }>>(`/deals/${dealId}/messages`),
  postMessage: (dealId: string, body: string) =>
    api<{ id: string; body: string; sender_user_id: string; created_at: string }>(`/deals/${dealId}/messages`, { method: "POST", body: JSON.stringify({ body }) }),
  audit: (params = "") => api<Paginated<{ id: string; action: string; entity: string; entity_id: string; created_at: string }>>(`/audit${params}`)
};
