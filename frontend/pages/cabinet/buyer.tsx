import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";

type Me = { user: { role: string; email: string }; organization: { name: string } };
type RequestItem = { id: string; title: string; status: string };
type DealItem = { id: string; status: string };
type Paged<T> = { items: T[]; total: number };

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export default function BuyerCabinetPage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [requests, setRequests] = useState<Paged<RequestItem>>({ items: [], total: 0 });
  const [deals, setDeals] = useState<Paged<DealItem>>({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  const load = async () => {
    const [meRes, reqRes, dealsRes] = await Promise.all([
      fetch(`${API_BASE}/auth/me`, { credentials: "include" }),
      fetch(`${API_BASE}/requests?page=1&page_size=5`, { credentials: "include" }),
      fetch(`${API_BASE}/deals?page=1&page_size=5`, { credentials: "include" })
    ]);
    if (!meRes.ok) {
      window.location.replace("/login");
      return;
    }
    const meData = (await meRes.json()) as Me;
    if (meData.user.role !== "BUYER") {
      window.location.replace("/login");
      return;
    }
    if (!reqRes.ok || !dealsRes.ok) throw new Error("Failed to load buyer data");
    setMe(meData);
    setRequests((await reqRes.json()) as Paged<RequestItem>);
    setDeals((await dealsRes.json()) as Paged<DealItem>);
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await load();
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
  }, []);

  const conversion = useMemo(() => {
    if (!requests.total) return 0;
    return Math.round((deals.total / requests.total) * 100);
  }, [requests.total, deals.total]);

  const createRequest = async () => {
    if (creating) return;
    setCreating(true);
    setError("");
    try {
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 14);
      const response = await fetch(`${API_BASE}/requests`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Purchase Request ${Date.now().toString().slice(-6)}`,
          description: "Need vendor proposals for procurement workflow.",
          budget_cents: 2400000,
          currency: "USD",
          deadline_date: deadline.toISOString().slice(0, 10),
          tags: ["buyer", "new-order"]
        })
      });
      if (!response.ok) throw new Error("Request creation failed");
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Create request failed");
    } finally {
      setCreating(false);
    }
  };

  return (
    <main style={{ minHeight: "100vh", padding: 20, background: "#030712", color: "#f8fafc" }}>
      <div style={{ margin: "0 auto", maxWidth: 1150 }}>
        <header style={{ border: "1px solid #334155", borderRadius: 16, padding: 18, background: "linear-gradient(120deg, rgba(76,29,149,0.35), rgba(2,6,23,0.45))" }}>
          <h1 style={{ margin: 0, fontSize: 30 }}>Buyer Cabinet</h1>
          <p style={{ margin: "8px 0 0", color: "#cbd5e1" }}>{me ? `${me.user.email} - ${me.organization.name}` : "Loading..."}</p>
          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            <button type="button" onClick={createRequest} disabled={creating} style={btnPrimary}>
              {creating ? "Creating..." : "Create Request"}
            </button>
            <Link href="/cabinet/new-request" style={btnGhost}>Precise Request Form</Link>
            <Link href="/marketplace/requests" style={btnGhost}>Requests List</Link>
            <Link href="/marketplace/deals" style={btnGhost}>Deals</Link>
            <Link href="/profile" style={btnGhost}>Profile</Link>
          </div>
        </header>

        {loading ? <p style={{ marginTop: 16 }}>Loading cabinet...</p> : null}
        {error ? <p style={{ marginTop: 16, color: "#f87171" }}>{error}</p> : null}

        {!loading && !error ? (
          <>
            <section style={{ display: "grid", gap: 12, marginTop: 14, gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
              <Metric label="Requests" value={String(requests.total)} />
              <Metric label="Deals" value={String(deals.total)} />
              <Metric label="Conversion" value={`${conversion}%`} />
            </section>
            <section style={{ display: "grid", gap: 12, marginTop: 12, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
              <Panel title="Latest Requests">
                {requests.items.map((r) => (
                  <Item key={r.id} title={r.title} subtitle={r.status} />
                ))}
              </Panel>
              <Panel title="Latest Deals">
                {deals.items.map((d) => (
                  <Item key={d.id} title={`Deal ${d.id.slice(0, 8)}`} subtitle={d.status} />
                ))}
              </Panel>
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}

const btnPrimary: React.CSSProperties = {
  height: 38,
  padding: "0 12px",
  borderRadius: 9,
  border: 0,
  background: "linear-gradient(90deg, #7c3aed, #2563eb)",
  color: "#fff",
  cursor: "pointer",
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center"
};

const btnGhost: React.CSSProperties = {
  height: 38,
  padding: "0 12px",
  borderRadius: 9,
  border: "1px solid #475569",
  color: "#cbd5e1",
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center"
};

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ border: "1px solid #334155", borderRadius: 12, padding: 14, background: "rgba(15,23,42,0.7)" }}>
      <p style={{ margin: 0, color: "#94a3b8", fontSize: 13 }}>{label}</p>
      <p style={{ margin: "6px 0 0", fontSize: 28, fontWeight: 700 }}>{value}</p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ border: "1px solid #334155", borderRadius: 12, padding: 14, background: "rgba(15,23,42,0.7)" }}>
      <h2 style={{ marginTop: 0, marginBottom: 10, fontSize: 18 }}>{title}</h2>
      {children}
    </div>
  );
}

function Item({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div style={{ border: "1px solid #334155", borderRadius: 10, padding: 10, marginBottom: 8 }}>
      <p style={{ margin: 0, fontWeight: 600 }}>{title}</p>
      <p style={{ margin: "4px 0 0", fontSize: 12, color: "#94a3b8" }}>{subtitle}</p>
    </div>
  );
}
