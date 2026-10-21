// Thin client for the Node API. The token is the shared ADMIN_TOKEN until real login exists.
export interface Ticket {
  id: string;
  channel: "shopee" | "tiktok" | "manual";
  buyer_ref: string;
  category: string | null;
  priority: "P1" | "P2" | "P3" | null;
  priority_reasons: string[];
  language: string | null;
  needs_human: boolean;
  status: string;
  extracted_order_ref: string | null;
  last_message_at: string;
  preview: string | null;
}

export interface Message {
  sender_type: "buyer" | "seller" | "system";
  message_type: string;
  text: string | null;
  created_at_channel: string;
}

export interface Draft {
  id: string;
  text: string;
  policy_refs: { id: string; topic: string; version: number }[];
  safety_flags: string[];
  model: string;
  cost: string | null;
  latency_ms: number | null;
}

export interface Order {
  channel: string;
  channel_order_id: string;
  sitegiant_order_no: string | null;
  items: { name: string; qty: number; variant?: string }[];
  status: string;
  tracking_no: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  promised_delivery_at: string | null;
}

export interface TicketDetail {
  ticket: Ticket;
  messages: Message[];
  draft: Draft | null;
  order: Order | null;
}

export interface Policy {
  id: string;
  scope: string;
  topic: string;
  text: string;
  version: number;
}

function token(): string {
  try {
    return localStorage.getItem("adminToken") ?? "";
  } catch {
    return "";
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(token() ? { Authorization: `Bearer ${token()}` } : {}) },
  });
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
  return res.json();
}

const post = <T>(path: string, body?: unknown) => call<T>(path, { method: "POST", body: JSON.stringify(body ?? {}) });

export const api = {
  tickets: (status: "open" | "replied") => call<Ticket[]>(`/tickets?status=${status}`),
  ticket: (id: string) => call<TicketDetail>(`/tickets/${id}`),
  retriage: (id: string) => post(`/tickets/${id}/retriage`),
  close: (id: string) => post(`/tickets/${id}/close`),
  review: (draftId: string, finalText: string, reason?: string) =>
    post<{ editRatio: number; accepted: boolean }>("/reviews", { draftId, finalText, reason }),
  importPaste: (body: { channel: string; buyer: string; text: string }) =>
    post<{ stored: number; duplicates: number; ticketsQueued: number }>("/import/messages", body),
  importJson: (path: "messages" | "orders", rows: unknown[]) => post<Record<string, number>>(`/import/${path}`, rows),
  policies: () => call<Policy[]>("/policies"),
  addPolicy: (p: { scope: string; topic: string; text: string }) => post<Policy>("/policies", p),
  stats: () => call<Record<string, string | number | null>>("/stats"),
};
