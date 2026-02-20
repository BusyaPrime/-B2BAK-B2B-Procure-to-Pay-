import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties, FormEvent } from "react";

type Me = { user: { id: string; role: string; email: string }; organization: { name: string } };
type RequestItem = {
  id: string;
  title: string;
  description: string;
  status: string;
  budget_cents: number;
  deadline_date: string;
  tags: string[];
};
type NotificationItem = { id: string; payload: { message?: string; href?: string }; read_at: string | null };
type Paged<T> = { items: T[]; total: number; page?: number; page_size?: number };

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export default function MarketplaceRequestsPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [data, setData] = useState<Paged<RequestItem>>({ items: [], total: 0 });
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [treeOpen, setTreeOpen] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("VIEWER");
  const pageSize = 10;

  const load = useCallback(async (targetPage: number, targetSearch: string) => {
    const encodedSearch = targetSearch.trim();
    const [meRes, reqRes, noteRes] = await Promise.all([
      fetch(`${API_BASE}/auth/me`, { credentials: "include" }),
      fetch(`${API_BASE}/requests?page=${targetPage}&page_size=${pageSize}${encodedSearch ? `&search=${encodeURIComponent(encodedSearch)}` : ""}`, { credentials: "include" }),
      fetch(`${API_BASE}/notifications?page=1&page_size=5`, { credentials: "include" }),
    ]);
    if (!meRes.ok) return window.location.replace("/login");
    if (!reqRes.ok) throw new Error("Failed to load requests");
    setMe((await meRes.json()) as Me);
    setData((await reqRes.json()) as Paged<RequestItem>);
    if (noteRes.ok) {
      const noteData = (await noteRes.json()) as Paged<NotificationItem>;
      setNotifications(noteData.items);
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await load(1, "");
      } catch (e: unknown) {
        if (!active) return;
        setError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [load]);

  const canCreate = me ? ["BUYER", "ADMIN", "ORG_OWNER"].includes(me.user.role) : false;
  const pages = useMemo(() => Math.max(1, Math.ceil((data.total || 0) / pageSize)), [data.total]);
  const selectedNode = useMemo(() => data.items[0]?.id ?? "", [data.items]);

  const onSearchSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setPage(1);
    setError("");
    try {
      await load(1, search);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Search failed");
    } finally {
      setLoading(false);
    }
  };

  const emitLintNotification = async () => {
    const requestId = data.items[0]?.id;
    await fetch(`${API_BASE}/notifications/emit-job?kind=lint&success=true${requestId ? `&request_id=${requestId}` : ""}`, {
      method: "POST",
      credentials: "include",
    });
    await load(page, search);
  };

  const submitInvite = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    try {
      const r = await fetch(`${API_BASE}/invites`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      if (!r.ok) {
        throw new Error("Invite create failed");
      }
      setInviteEmail("");
      setInviteRole("VIEWER");
      setInviteOpen(false);
      await load(page, search);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Invite create failed");
    }
  };

  const gotoPage = async (nextPage: number) => {
    if (nextPage < 1 || nextPage > pages) return;
    setPage(nextPage);
    setLoading(true);
    try {
      await load(nextPage, search);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ minHeight: "100vh", padding: 16, background: "#030712", color: "#f8fafc" }}>
      <div style={{ margin: "0 auto", maxWidth: 1240 }}>
        <header style={{ border: "1px solid #334155", borderRadius: 16, padding: 16, background: "linear-gradient(120deg, rgba(124,58,237,0.20), rgba(2,6,23,0.45))" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 28 }}>Marketplace Requests</h1>
              <p style={{ margin: "8px 0 0", color: "#cbd5e1" }}>{me ? `${me.user.email} - ${me.organization.name}` : "Loading..."}</p>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <button style={btnGhostButton} onClick={() => setInviteOpen((v) => !v)}>Invite user</button>
              <button style={btnGhostButton} onClick={emitLintNotification}>Emit lint notification</button>
              <Link href="/marketplace/deals" style={btnGhost}>Deals</Link>
              <Link href="/login" style={btnGhost}>Switch Account</Link>
            </div>
          </div>
          {inviteOpen ? (
            <form onSubmit={(e) => void submitInvite(e)} style={{ marginTop: 12, border: "1px solid #334155", borderRadius: 10, padding: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input required placeholder="email@company.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} style={inputStyle} />
              <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} style={inputStyle}>
                <option value="VIEWER">VIEWER</option>
                <option value="VENDOR">VENDOR</option>
                <option value="BUYER">BUYER</option>
                <option value="ADMIN">ADMIN</option>
              </select>
              <button type="submit" style={btnPrimary}>Send invite</button>
            </form>
          ) : null}
        </header>

        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "280px 1fr", gap: 12 }}>
          <aside style={{ border: "1px solid #334155", borderRadius: 12, padding: 12, background: "rgba(2,6,23,0.66)" }}>
            <button onClick={() => setTreeOpen((v) => !v)} style={{ ...btnGhostButton, width: "100%", justifyContent: "space-between" }}>
              <span>Specs Tree</span>
              <span>{treeOpen ? "-" : "+"}</span>
            </button>
            {treeOpen ? (
              <div style={{ marginTop: 10 }}>
                <p style={{ margin: "0 0 8px", color: "#93c5fd", fontSize: 12 }}>project://marketplace</p>
                {data.items.map((item) => (
                  <Link
                    key={item.id}
                    href={`/marketplace/requests/${item.id}`}
                    style={{
                      display: "block",
                      marginBottom: 6,
                      border: item.id === selectedNode ? "1px solid #7c3aed" : "1px solid #334155",
                      borderRadius: 8,
                      padding: "8px 10px",
                      color: "#e2e8f0",
                      textDecoration: "none",
                      background: item.id === selectedNode ? "rgba(124,58,237,0.15)" : "transparent",
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{item.title}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>{item.status}</div>
                  </Link>
                ))}
              </div>
            ) : null}
            <div style={{ marginTop: 10, borderTop: "1px solid #1e293b", paddingTop: 10 }}>
              <p style={{ margin: "0 0 6px", fontSize: 12, color: "#93c5fd" }}>Notifications</p>
              {notifications.length === 0 ? <p style={{ margin: 0, fontSize: 12, color: "#94a3b8" }}>No notifications</p> : null}
              {notifications.map((note) => (
                <Link key={note.id} href={note.payload.href || "/marketplace/requests"} style={{ display: "block", fontSize: 12, color: note.read_at ? "#94a3b8" : "#e2e8f0", textDecoration: "none", marginBottom: 6 }}>
                  {note.payload.message || "Update"}
                </Link>
              ))}
            </div>
          </aside>

          <section style={{ border: "1px solid #334155", borderRadius: 12, padding: 12, background: "rgba(15,23,42,0.72)" }}>
            <form onSubmit={(e) => void onSearchSubmit(e)} style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search requests..." style={{ ...inputStyle, minWidth: 240 }} />
              <button type="submit" style={btnGhostButton}>Search</button>
              {canCreate ? <Link href="/cabinet/new-request" style={btnPrimary}>Create New Request</Link> : null}
            </form>

            {loading ? <p style={{ margin: 0 }}>Loading requests...</p> : null}
            {error ? <p style={{ margin: "6px 0", color: "#f87171" }}>{error}</p> : null}

            {!loading && !error ? (
              <>
                {data.items.length === 0 ? (
                  <div style={{ border: "1px dashed #334155", borderRadius: 12, padding: 28, textAlign: "center" }}>
                    <p style={{ fontSize: 46, margin: 0 }}>👻</p>
                    <p style={{ margin: "8px 0 0", color: "#cbd5e1" }}>No requests found</p>
                    <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: 13 }}>Try another search or create a new request.</p>
                  </div>
                ) : (
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        <th style={th}>Title</th>
                        <th style={th}>Status</th>
                        <th style={th}>Budget</th>
                        <th style={th}>Deadline</th>
                        <th style={th}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.items.map((r) => (
                        <tr key={r.id}>
                          <td style={td}>{r.title}</td>
                          <td style={td}>{r.status}</td>
                          <td style={td}>${(r.budget_cents / 100).toLocaleString()}</td>
                          <td style={td}>{r.deadline_date}</td>
                          <td style={td}>
                            <Link href={`/marketplace/requests/${r.id}`} style={{ ...btnGhost, height: 30, fontSize: 12 }}>Open</Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center", justifyContent: "flex-end" }}>
                  <button onClick={() => void gotoPage(page - 1)} disabled={page <= 1} style={btnGhostButton} aria-label="Previous page">Prev</button>
                  <span style={{ fontSize: 13, color: "#cbd5e1" }}>Page {page} / {pages}</span>
                  <button onClick={() => void gotoPage(page + 1)} disabled={page >= pages} style={btnGhostButton} aria-label="Next page">Next</button>
                </div>
              </>
            ) : null}
          </section>
        </div>
      </div>
    </main>
  );
}

const btnPrimary: CSSProperties = {
  height: 38,
  padding: "0 12px",
  borderRadius: 9,
  border: 0,
  background: "linear-gradient(90deg,#7c3aed,#2563eb)",
  color: "#fff",
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 600,
  cursor: "pointer",
};

const btnGhost: CSSProperties = {
  height: 38,
  padding: "0 12px",
  borderRadius: 9,
  border: "1px solid #475569",
  color: "#cbd5e1",
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center",
};

const btnGhostButton: CSSProperties = {
  height: 36,
  padding: "0 11px",
  borderRadius: 9,
  border: "1px solid #475569",
  color: "#cbd5e1",
  background: "transparent",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
};

const inputStyle: CSSProperties = {
  borderRadius: 8,
  border: "1px solid #475569",
  background: "#020617",
  color: "#f8fafc",
  padding: "8px 10px",
};

const th: CSSProperties = { textAlign: "left", borderBottom: "1px solid #334155", padding: "8px 6px", color: "#94a3b8", fontSize: 12 };
const td: CSSProperties = { borderBottom: "1px solid #1e293b", padding: "8px 6px", fontSize: 13 };
