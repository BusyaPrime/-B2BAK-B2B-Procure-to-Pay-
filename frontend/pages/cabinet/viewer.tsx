import { useEffect, useState } from "react";
import Link from "next/link";

type Me = { user: { role: string; email: string }; organization: { name: string } };
type Deal = { id: string; status: string; created_at: string };
type Paged<T> = { items: T[]; total: number };

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export default function ViewerCabinetPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [deals, setDeals] = useState<Paged<Deal>>({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [meRes, dRes] = await Promise.all([
          fetch(`${API_BASE}/auth/me`, { credentials: "include" }),
          fetch(`${API_BASE}/deals?page=1&page_size=8`, { credentials: "include" })
        ]);
        if (!meRes.ok) return window.location.replace("/login");
        const meData = (await meRes.json()) as Me;
        if (meData.user.role !== "VIEWER") return window.location.replace("/login");
        if (!dRes.ok) throw new Error("Failed to load viewer data");
        if (!active) return;
        setMe(meData);
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
      <div style={{ margin: "0 auto", maxWidth: 980 }}>
        <header style={{ border: "1px solid #334155", borderRadius: 16, padding: 18, background: "linear-gradient(120deg, rgba(16,185,129,0.18), rgba(2,6,23,0.45))" }}>
          <h1 style={{ margin: 0, fontSize: 30 }}>Viewer Cabinet</h1>
          <p style={{ margin: "8px 0 0", color: "#cbd5e1" }}>{me ? `${me.user.email} - ${me.organization.name}` : "Loading..."}</p>
          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            <Link href="/marketplace/deals" style={btnGhost}>Deals</Link>
            <Link href="/marketplace/requests" style={btnGhost}>Requests</Link>
            <Link href="/profile" style={btnGhost}>Profile</Link>
          </div>
        </header>
        {loading ? <p style={{ marginTop: 16 }}>Loading cabinet...</p> : null}
        {error ? <p style={{ marginTop: 16, color: "#f87171" }}>{error}</p> : null}
        {!loading && !error ? (
          <div style={{ border: "1px solid #334155", borderRadius: 12, padding: 14, background: "rgba(15,23,42,0.7)", marginTop: 12 }}>
            <h2 style={{ marginTop: 0, marginBottom: 10, fontSize: 18 }}>Observed Deals ({deals.total})</h2>
            {deals.items.map((d) => (
              <div key={d.id} style={{ border: "1px solid #334155", borderRadius: 10, padding: 10, marginBottom: 8 }}>
                <p style={{ margin: 0, fontWeight: 600 }}>Deal {d.id.slice(0, 8)}</p>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "#94a3b8" }}>{d.status} - {new Date(d.created_at).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
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
