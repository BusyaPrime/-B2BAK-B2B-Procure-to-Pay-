import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Paged<T> = { items: T[]; total: number };
type Req = { id: string; title: string; status: string };
type Deal = { id: string; status: string };

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [requests, setRequests] = useState<Paged<Req>>({ items: [], total: 0 });
  const [deals, setDeals] = useState<Paged<Deal>>({ items: [], total: 0 });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let active = true;
    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const [meRes, reqRes, dealRes] = await Promise.all([
          fetch(`${API_BASE}/auth/me`, { credentials: "include" }),
          fetch(`${API_BASE}/requests?page=1&page_size=5`, { credentials: "include" }),
          fetch(`${API_BASE}/deals?page=1&page_size=5`, { credentials: "include" })
        ]);
        if (!meRes.ok) {
          window.location.replace("/login");
          return;
        }
        if (!reqRes.ok || !dealRes.ok) {
          throw new Error("Failed to load dashboard data");
        }
        const reqData = (await reqRes.json()) as Paged<Req>;
        const dealData = (await dealRes.json()) as Paged<Deal>;
        if (!active) return;
        setRequests(reqData);
        setDeals(dealData);
      } catch (e: unknown) {
        if (!active) return;
        setError(e instanceof Error ? e.message : "Unknown dashboard error");
      } finally {
        if (active) setLoading(false);
      }
    };
    void run();
    return () => {
      active = false;
    };
  }, []);

  const conversion = useMemo(() => {
    if (!requests.total) return 0;
    return Math.round((deals.total / requests.total) * 100);
  }, [requests.total, deals.total]);

  const createQuickRequest = async () => {
    if (creating) return;
    setCreating(true);
    setError("");
    try {
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 21);
      const response = await fetch(`${API_BASE}/requests`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "New Purchase Request",
          description: "Need supplier proposals for a new procurement request.",
          budget_cents: 1500000,
          currency: "USD",
          deadline_date: deadline.toISOString().slice(0, 10),
          tags: ["new", "procurement"]
        })
      });
      if (!response.ok) {
        throw new Error("Failed to create request");
      }
      window.location.href = "/marketplace/requests";
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create request");
    } finally {
      setCreating(false);
    }
  };

  return (
    <main style={{ minHeight: "100vh", padding: 20, background: "#020617", color: "#f8fafc" }}>
      <div style={{ margin: "0 auto", maxWidth: 1100 }}>
        <div
          style={{
            marginBottom: 18,
            padding: 18,
            borderRadius: 16,
            border: "1px solid rgba(148,163,184,0.35)",
            background: "linear-gradient(120deg, rgba(124,58,237,0.18), rgba(2,6,23,0.4))"
          }}
        >
          <h1 style={{ margin: 0, fontSize: 30 }}>B2BAK Dashboard</h1>
          <p style={{ margin: "8px 0 0", color: "#cbd5e1" }}>Live workspace (stable route).</p>
          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={createQuickRequest}
              disabled={creating}
              style={{ height: 36, padding: "0 12px", borderRadius: 8, border: 0, background: "#7c3aed", color: "#fff", cursor: "pointer", fontWeight: 600 }}
            >
              {creating ? "Creating..." : "Create Request"}
            </button>
            <Link href="/cabinet/new-request" style={{ height: 36, padding: "8px 12px", borderRadius: 8, border: "1px solid #475569", color: "#cbd5e1", textDecoration: "none" }}>
              Open New Request Form
            </Link>
            <Link href="/marketplace/requests" style={{ height: 36, padding: "8px 12px", borderRadius: 8, border: "1px solid #475569", color: "#cbd5e1", textDecoration: "none" }}>
              Requests
            </Link>
            <Link href="/marketplace/deals" style={{ height: 36, padding: "8px 12px", borderRadius: 8, border: "1px solid #475569", color: "#cbd5e1", textDecoration: "none" }}>
              Deals
            </Link>
            <Link href="/cabinet/buyer" style={{ height: 36, padding: "8px 12px", borderRadius: 8, border: "1px solid #475569", color: "#93c5fd", textDecoration: "none" }}>
              Buyer Cabinet
            </Link>
            <Link href="/profile" style={{ height: 36, padding: "8px 12px", borderRadius: 8, border: "1px solid #475569", color: "#f8fafc", textDecoration: "none" }}>
              Profile Settings
            </Link>
          </div>
        </div>

        {loading ? <p>Loading dashboard...</p> : null}
        {error ? <p style={{ color: "#f87171" }}>{error}</p> : null}

        {!loading && !error ? (
          <>
            <section style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(3, minmax(0, 1fr))", marginBottom: 14 }}>
              <StatCard label="Total Requests" value={String(requests.total)} />
              <StatCard label="Active Deals" value={String(deals.total)} />
              <StatCard label="Conversion" value={`${conversion}%`} />
            </section>
            <section style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
              <Panel title="Recent Requests">
                {requests.items.length === 0 ? (
                  <p style={{ color: "#94a3b8" }}>No requests yet.</p>
                ) : (
                  requests.items.map((r) => (
                    <Row key={r.id} title={r.title} subtitle={r.status} />
                  ))
                )}
              </Panel>
              <Panel title="Recent Deals">
                {deals.items.length === 0 ? (
                  <p style={{ color: "#94a3b8" }}>No deals yet.</p>
                ) : (
                  deals.items.map((d) => (
                    <Row key={d.id} title={`Deal ${d.id.slice(0, 8)}`} subtitle={d.status} />
                  ))
                )}
              </Panel>
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ border: "1px solid #334155", borderRadius: 12, padding: 14, background: "rgba(15,23,42,0.75)" }}>
      <p style={{ margin: 0, color: "#94a3b8", fontSize: 13 }}>{label}</p>
      <p style={{ margin: "8px 0 0", fontSize: 28, fontWeight: 700 }}>{value}</p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ border: "1px solid #334155", borderRadius: 12, padding: 14, background: "rgba(15,23,42,0.75)" }}>
      <h2 style={{ marginTop: 0, marginBottom: 10, fontSize: 18 }}>{title}</h2>
      {children}
    </div>
  );
}

function Row({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div style={{ border: "1px solid #334155", borderRadius: 10, padding: 10, marginBottom: 8 }}>
      <p style={{ margin: 0, fontWeight: 600 }}>{title}</p>
      <p style={{ margin: "4px 0 0", fontSize: 12, color: "#94a3b8" }}>{subtitle}</p>
    </div>
  );
}
