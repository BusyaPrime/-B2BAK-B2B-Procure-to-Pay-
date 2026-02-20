import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { CSSProperties } from "react";

type Me = { user: { role: string } };
type Deal = { id: string; status: string; request_id: string; winning_quote_id: string | null };
type Paged<T> = { items: T[]; total: number };

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export default function MarketplaceDealsPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [deals, setDeals] = useState<Paged<Deal>>({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [confirmPaidId, setConfirmPaidId] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const load = useCallback(async (targetPage: number) => {
    const [meRes, dealsRes] = await Promise.all([
      fetch(`${API_BASE}/auth/me`, { credentials: "include" }),
      fetch(`${API_BASE}/deals?page=${targetPage}&page_size=${pageSize}`, { credentials: "include" })
    ]);
    if (!meRes.ok) return window.location.replace("/login");
    if (!dealsRes.ok) throw new Error("Failed to load deals");
    setMe((await meRes.json()) as Me);
    setDeals((await dealsRes.json()) as Paged<Deal>);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await load(page);
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
  }, [load, page]);

  const canBuyerAct = me ? ["BUYER", "ADMIN", "ORG_OWNER"].includes(me.user.role) : false;

  const action = async (dealId: string, type: "invoice" | "paid") => {
    if (busyId) return;
    setBusyId(dealId);
    setError("");
    try {
      const endpoint = type === "invoice" ? `/deals/${dealId}/create-invoice` : `/deals/${dealId}/mark-paid`;
      const r = await fetch(`${API_BASE}${endpoint}`, { method: "POST", credentials: "include" });
      if (!r.ok) throw new Error(type === "invoice" ? "Create invoice failed" : "Mark paid failed");
      await load(page);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusyId("");
    }
  };

  return (
    <main style={{ minHeight: "100vh", padding: 20, background: "#030712", color: "#f8fafc" }}>
      <div style={{ margin: "0 auto", maxWidth: 1050 }}>
        <header style={{ border: "1px solid #334155", borderRadius: 16, padding: 18, background: "linear-gradient(120deg, rgba(14,165,233,0.20), rgba(2,6,23,0.45))" }}>
          <h1 style={{ margin: 0, fontSize: 30 }}>Marketplace Deals</h1>
          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            <Link href="/marketplace/requests" style={btnGhost}>Requests</Link>
            <Link href="/login" style={btnGhost}>Switch Account</Link>
          </div>
        </header>
        {loading ? <p style={{ marginTop: 12 }}>Loading deals...</p> : null}
        {error ? <p style={{ marginTop: 12, color: "#f87171" }}>{error}</p> : null}
        {!loading ? (
          <section style={{ marginTop: 12, display: "grid", gap: 10 }}>
            {deals.items.length === 0 ? <p style={{ color: "#94a3b8" }}>No deals yet.</p> : null}
            {deals.items.map((d) => (
              <div key={d.id} style={{ border: "1px solid #334155", borderRadius: 12, padding: 12, background: "rgba(15,23,42,0.72)" }}>
                <p style={{ margin: 0, fontWeight: 700 }}>Deal {d.id.slice(0, 8)} - {d.status}</p>
                <p style={{ margin: "6px 0 0", color: "#94a3b8", fontSize: 12 }}>Request: {d.request_id.slice(0, 8)} | Quote: {d.winning_quote_id ? d.winning_quote_id.slice(0, 8) : "none"}</p>
                {canBuyerAct ? (
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <button style={btnPrimary} onClick={() => action(d.id, "invoice")} disabled={!!busyId}>
                      {busyId === d.id ? "Working..." : "Create Invoice"}
                    </button>
                    <button style={btnGhostButton} onClick={() => setConfirmPaidId(d.id)} disabled={!!busyId}>
                      Mark Paid
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
          </section>
        ) : null}
        {deals.total > pageSize ? (
          <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button style={btnGhostButton} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</button>
            <span style={{ alignSelf: "center", fontSize: 13, color: "#cbd5e1" }}>
              {page} / {Math.ceil(deals.total / pageSize)}
            </span>
            <button style={btnGhostButton} disabled={page >= Math.ceil(deals.total / pageSize)} onClick={() => setPage((p) => p + 1)}>Next</button>
          </div>
        ) : null}
      </div>
      {confirmPaidId ? (
        <div style={dialogBackdrop}>
          <div style={dialogCard}>
            <h3 style={{ marginTop: 0 }}>Confirm payment</h3>
            <p style={{ color: "#cbd5e1" }}>Mark this deal as paid?</p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button style={btnGhostButton} onClick={() => setConfirmPaidId("")}>Cancel</button>
              <button
                style={btnPrimary}
                onClick={() => {
                  const dealId = confirmPaidId;
                  setConfirmPaidId("");
                  void action(dealId, "paid");
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

const btnPrimary: CSSProperties = {
  height: 36,
  padding: "0 12px",
  borderRadius: 8,
  border: 0,
  background: "linear-gradient(90deg,#7c3aed,#2563eb)",
  color: "#fff",
  cursor: "pointer"
};
const btnGhostButton: CSSProperties = {
  height: 36,
  padding: "0 12px",
  borderRadius: 8,
  border: "1px solid #475569",
  background: "transparent",
  color: "#cbd5e1",
  cursor: "pointer"
};
const btnGhost: CSSProperties = {
  height: 38,
  padding: "0 12px",
  borderRadius: 9,
  border: "1px solid #475569",
  color: "#cbd5e1",
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center"
};
const dialogBackdrop: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(2,6,23,0.6)",
  display: "grid",
  placeItems: "center",
  zIndex: 50
};
const dialogCard: CSSProperties = {
  width: "min(420px, calc(100vw - 32px))",
  border: "1px solid #334155",
  borderRadius: 12,
  background: "#020617",
  padding: 14
};
