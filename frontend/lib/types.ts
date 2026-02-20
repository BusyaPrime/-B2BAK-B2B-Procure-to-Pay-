export type Role = "ORG_OWNER" | "ADMIN" | "BUYER" | "VENDOR" | "VIEWER";
export type RequestStatus = "DRAFT" | "PUBLISHED" | "QUOTING" | "SHORTLIST" | "AWARDED" | "CLOSED";
export type QuoteStatus = "SUBMITTED" | "UPDATED" | "WITHDRAWN" | "ACCEPTED" | "REJECTED";
export type DealStatus = "NEGOTIATION" | "CONTRACT" | "INVOICED" | "PAID" | "ARCHIVED";
export type InvoiceStatus = "DRAFT" | "SENT" | "PAID" | "VOID";

export type Organization = {
  id: string;
  name: string;
};

export type User = {
  id: string;
  org_id: string;
  email: string;
  role: Role;
  display_name?: string | null;
  avatar_url?: string | null;
  theme_preference?: "dark" | "light";
  locale?: "en" | "ru";
};

export type RequestItem = {
  id: string;
  title: string;
  description: string;
  budget_cents: number;
  currency: string;
  deadline_date: string;
  tags: string[];
  status: RequestStatus;
  created_at: string;
  updated_at: string;
  buyer_org_id: string;
};

export type QuoteItem = {
  id: string;
  request_id: string;
  vendor_org_id: string;
  amount_cents: number;
  timeline_days: number;
  terms: string;
  status: QuoteStatus;
  created_at: string;
  updated_at: string;
};

export type DealItem = {
  id: string;
  buyer_org_id: string;
  vendor_org_id: string;
  request_id: string;
  winning_quote_id: string | null;
  status: DealStatus;
  created_at: string;
  updated_at: string;
};

export type InvoiceItem = {
  id: string;
  deal_id: string;
  amount_cents: number;
  currency: string;
  status: InvoiceStatus;
  issued_at: string | null;
  paid_at: string | null;
};
