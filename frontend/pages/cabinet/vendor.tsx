import { useEffect, useState } from "react";
import Link from "next/link";

type Me = { user: { role: string; email: string }; organization: { name: string } };
type Quote = { id: string; status: string; amount_cents: number };
type Deal = { id: string; status: string };
type Paged<T> = { items: T[]; total: number };

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export default function VendorCabinetPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [quotes, setQuotes] = useState<Paged<Quote>>({ items: [], total: 0 });
  const [deals, setDeals] = useState<Paged<Deal>>({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [meRes, qRes, dRes] = await Promise.all([
          fetch(`${API_BASE}/auth/me`, { credentials: "include" }),
          fetch(`${API_BASE}/quotes?page=1&page_size=5`, { credentials: "include" }),
          fetch(`${API_BASE}/deals?page=1&page_size=5`, { credentials: "include" })
        ]);
        if (!meRes.ok) return window.location.replace("/login");
        const meData = (await meRes.json()) as Me;
        if (meData.user.role !== "VENDOR") return window.location.replace("/login");
        if (!qRes.ok || !dRes.ok) throw new Error("Failed to load vendor data");
        if (!active) return;
        setMe(meData);
        setQuotes((await qRes.json()) as Paged<Quote>);
        setDeals((await dRes.json()) as Paged<Deal>);
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

  return (
    <main style={{ minHeight: "100vh", padding: 20, background: "#030712", color: "#f8fafc" }}>
      <div style={{ margin: "0 auto", maxWidth: 1050 }}>
        <header style={{ border: "1px solid #334155", borderRadius: 16, padding: 18, background: "linear-gradient(120deg, rgba(2,132,199,0.25), rgba(2,6,23,0.45))" }}>
          <h1 style={{ margin: 0, fontSize: 30 }}>Vendor Cabinet</h1>
          <p style={{ margin: "8px 0 0", color: "#cbd5e1" }}>{me ? `${me.user.email} - ${me.organization.name}` : "Loading..."}</p>
          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            <Link href="/marketplace/requests" style={btnGhost}>Browse Requests</Link>
            <Link href="/marketplace/deals" style={btnGhost}>Deals</Link>
            <Link href="/profile" style={btnGhost}>Profile</Link>
          </div>
        </header>
        {loading ? <p style={{ marginTop: 16 }}>Loading cabinet...</p> : null}
        {error ? <p style={{ marginTop: 16, color: "#f87171" }}>{error}</p> : null}
        {!loading && !error ? (
          <section style={{ display: "grid", gap: 12, marginTop: 12, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
            <Panel title={`Quotes (${quotes.total})`}>
              {quotes.items.map((q) => (
                <Item key={q.id} title={`$${(q.amount_cents / 100).toLocaleString()}`} subtitle={q.status} />
              ))}
            </Panel>
            <Panel title={`Deals (${deals.total})`}>
              {deals.items.map((d) => (
                <Item key={d.id} title={`Deal ${d.id.slice(0, 8)}`} subtitle={d.status} />
              ))}
            </Panel>
          </section>
        ) : null}
      </div>
    </main>
  );
}

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
