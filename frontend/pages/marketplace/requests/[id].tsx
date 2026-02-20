import { useRouter } from "next/router";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { CSSProperties, ChangeEvent } from "react";

type Me = { user: { role: string; email: string } };
type RequestItem = {
  id: string;
  title: string;
  description: string;
  status: string;
  budget_cents: number;
  deadline_date: string;
  tags: string[];
};
type Quote = { id: string; amount_cents: number; timeline_days: number; terms: string; status: string };
type Paged<T> = { items: T[]; total: number };
type AuditItem = { id: string; action: string; entity: string; entity_id: string; payload: Record<string, unknown>; created_at: string };
type HelperOut = { title: string; suggestions: string[]; disclaimer: string };

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export default function RequestDetailsPage() {
  const router = useRouter();
  const requestId = typeof router.query.id === "string" ? router.query.id : "";

  const [me, setMe] = useState<Me | null>(null);
  const [requestItem, setRequestItem] = useState<RequestItem | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [quoteAmount, setQuoteAmount] = useState("12000");
  const [quoteDays, setQuoteDays] = useState("21");
  const [quoteTerms, setQuoteTerms] = useState("Delivery in milestones with QA and handoff.");
  const [winningQuoteId, setWinningQuoteId] = useState("");
  const [audit, setAudit] = useState<AuditItem[]>([]);
  const [tab, setTab] = useState<"overview" | "revisions" | "reviews" | "artifacts" | "audit">("overview");
  const [helperPrompt, setHelperPrompt] = useState("How can we improve acceptance criteria?");
  const [helperOut, setHelperOut] = useState<HelperOut | null>(null);
  const [compareLeft, setCompareLeft] = useState("");
  const [compareRight, setCompareRight] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [confirmAction, setConfirmAction] = useState<null | "publish" | "shortlist" | "award">(null);

  const canManage = useMemo(() => {
    if (!me) return false;
    return ["BUYER", "ADMIN", "ORG_OWNER"].includes(me.user.role);
  }, [me]);
  const canQuote = useMemo(() => me?.user.role === "VENDOR" || me?.user.role === "ADMIN" || me?.user.role === "ORG_OWNER", [me]);

  const load = useCallback(async () => {
    if (!requestId) return;
    const [meRes, reqRes, quotesRes] = await Promise.all([
      fetch(`${API_BASE}/auth/me`, { credentials: "include" }),
      fetch(`${API_BASE}/requests/${requestId}`, { credentials: "include" }),
      fetch(`${API_BASE}/quotes?request_id=${requestId}&page=1&page_size=50`, { credentials: "include" })
    ]);
    const auditRes = await fetch(`${API_BASE}/audit?page=1&page_size=20&entity=request`, { credentials: "include" });
    if (!meRes.ok) return window.location.replace("/login");
    if (!reqRes.ok) throw new Error("Failed to load request");
    const meData = (await meRes.json()) as Me;
    const reqData = (await reqRes.json()) as RequestItem;
    const quoteData = quotesRes.ok ? ((await quotesRes.json()) as Paged<Quote>) : { items: [], total: 0 };
    const auditData = auditRes.ok ? ((await auditRes.json()) as Paged<AuditItem>) : { items: [], total: 0 };
    setMe(meData);
    setRequestItem(reqData);
    setQuotes(quoteData.items);
    setAudit(auditData.items.filter((a) => a.entity_id === requestId || a.entity === "request"));
    if (!winningQuoteId && quoteData.items.length) setWinningQuoteId(quoteData.items[0].id);
    if (!compareLeft && quoteData.items.length) setCompareLeft(quoteData.items[0].id);
    if (!compareRight && quoteData.items.length > 1) setCompareRight(quoteData.items[1].id);
  }, [compareLeft, compareRight, requestId, winningQuoteId]);

  useEffect(() => {
    let active = true;
    if (!requestId) return;
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
  }, [load, requestId]);

  const action = async (kind: "publish" | "shortlist" | "award" | "quote") => {
    if (!requestItem || busy) return;
    setBusy(true);
    setError("");
    try {
      if (kind === "publish") {
        const r = await fetch(`${API_BASE}/requests/${requestItem.id}/publish`, {
          method: "POST",
          credentials: "include",
          headers: { "Idempotency-Key": `pub-${requestItem.id}` }
        });
        if (!r.ok) throw new Error("Publish failed");
      } else if (kind === "shortlist") {
        const r = await fetch(`${API_BASE}/requests/${requestItem.id}/shortlist`, { method: "POST", credentials: "include" });
        if (!r.ok) throw new Error("Shortlist failed");
      } else if (kind === "award") {
        if (!winningQuoteId) throw new Error("Select winning quote");
        const r = await fetch(`${API_BASE}/requests/${requestItem.id}/award`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ winning_quote_id: winningQuoteId })
        });
        if (!r.ok) throw new Error("Award failed");
      } else if (kind === "quote") {
        const amountCents = Math.round(Number(quoteAmount) * 100);
        const timelineDays = Number(quoteDays);
        if (!Number.isFinite(amountCents) || amountCents <= 0) throw new Error("Invalid quote amount");
        if (!Number.isFinite(timelineDays) || timelineDays <= 0) throw new Error("Invalid timeline days");
        const r = await fetch(`${API_BASE}/quotes`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            request_id: requestItem.id,
            amount_cents: amountCents,
            timeline_days: timelineDays,
            terms: quoteTerms
          })
        });
        if (!r.ok) throw new Error("Submit quote failed");
      }
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(false);
    }
  };

  const runHelper = async () => {
    if (!requestItem) return;
    const r = await fetch(`${API_BASE}/helper/suggest`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ context_type: "request", context_id: requestItem.id, prompt: helperPrompt }),
    });
    if (!r.ok) throw new Error("Suggestion request failed");
    setHelperOut((await r.json()) as HelperOut);
  };

  const onUploadFile = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;
    setUploadedFiles(Array.from(files).map((f) => f.name));
  };

  const leftQuote = quotes.find((q) => q.id === compareLeft) ?? quotes[0] ?? null;
  const rightQuote = quotes.find((q) => q.id === compareRight) ?? quotes[1] ?? quotes[0] ?? null;

  return (
    <main style={{ minHeight: "100vh", padding: 20, background: "#030712", color: "#f8fafc" }}>
      <div style={{ margin: "0 auto", maxWidth: 1050 }}>
        <div style={{ marginBottom: 12 }}>
          <Link href="/marketplace/requests" style={{ color: "#93c5fd", textDecoration: "none" }}>{"<- Back to requests"}</Link>
        </div>
        {loading ? <p>Loading request...</p> : null}
        {error ? <p style={{ color: "#f87171" }}>{error}</p> : null}
        {!loading && requestItem ? (
          <>
            <section style={{ border: "1px solid #334155", borderRadius: 14, padding: 14, background: "rgba(15,23,42,0.72)" }}>
              <h1 style={{ marginTop: 0 }}>{requestItem.title}</h1>
              <p style={{ color: "#cbd5e1", whiteSpace: "pre-wrap" }}>{requestItem.description}</p>
              <p style={{ color: "#94a3b8", fontSize: 13 }}>
                Status: {requestItem.status} | Budget: ${(requestItem.budget_cents / 100).toLocaleString()} | Deadline: {requestItem.deadline_date}
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                {canManage ? (
                  <>
                    <button onClick={() => setConfirmAction("publish")} disabled={busy} style={btnPrimary}>Publish</button>
                    <button onClick={() => setConfirmAction("shortlist")} disabled={busy} style={btnGhost}>Shortlist</button>
                    <select value={winningQuoteId} onChange={(e) => setWinningQuoteId(e.target.value)} style={selectStyle}>
                      <option value="">Select winning quote</option>
                      {quotes.map((q) => (
                        <option key={q.id} value={q.id}>{`$${(q.amount_cents / 100).toLocaleString()} - ${q.status}`}</option>
                      ))}
                    </select>
                    <button onClick={() => setConfirmAction("award")} disabled={busy} style={btnPrimary}>Award Winner</button>
                  </>
                ) : null}
              </div>
            </section>

            <section style={{ marginTop: 12, border: "1px solid #334155", borderRadius: 14, padding: 10, background: "rgba(15,23,42,0.72)" }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                {(["overview", "revisions", "reviews", "artifacts", "audit"] as const).map((tabKey) => (
                  <button key={tabKey} onClick={() => setTab(tabKey)} style={tab === tabKey ? btnPrimary : btnGhost}>
                    {tabKey[0].toUpperCase() + tabKey.slice(1)}
                  </button>
                ))}
              </div>
              {tab === "overview" ? (
                <div>
                  <h2 style={{ marginTop: 0 }}>Quotes ({quotes.length})</h2>
                  {quotes.length === 0 ? <p style={{ color: "#94a3b8" }}>No quotes yet.</p> : null}
                  {quotes.map((q) => (
                    <div key={q.id} style={{ border: "1px solid #334155", borderRadius: 10, padding: 10, marginBottom: 8 }}>
                      <p style={{ margin: 0, fontWeight: 600 }}>${(q.amount_cents / 100).toLocaleString()} - {q.status}</p>
                      <p style={{ margin: "4px 0 0", color: "#cbd5e1", fontSize: 13 }}>{q.timeline_days} days | {q.terms}</p>
                    </div>
                  ))}
                </div>
              ) : null}
              {tab === "revisions" ? (
                <div>
                  <h2 style={{ marginTop: 0 }}>Revision Compare</h2>
                  <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                    <select value={compareLeft} onChange={(e) => setCompareLeft(e.target.value)} style={selectStyle}>
                      <option value="">Left revision</option>
                      {quotes.map((q) => <option key={q.id} value={q.id}>{q.id.slice(0, 8)}</option>)}
                    </select>
                    <select value={compareRight} onChange={(e) => setCompareRight(e.target.value)} style={selectStyle}>
                      <option value="">Right revision</option>
                      {quotes.map((q) => <option key={q.id} value={q.id}>{q.id.slice(0, 8)}</option>)}
                    </select>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <div style={{ border: "1px solid #334155", borderRadius: 8, padding: 10 }}>
                      <strong>Left</strong>
                      <pre style={{ whiteSpace: "pre-wrap", color: "#cbd5e1", fontSize: 12 }}>{leftQuote ? leftQuote.terms : "No data"}</pre>
                    </div>
                    <div style={{ border: "1px solid #334155", borderRadius: 8, padding: 10 }}>
                      <strong>Right</strong>
                      <pre style={{ whiteSpace: "pre-wrap", color: "#cbd5e1", fontSize: 12 }}>{rightQuote ? rightQuote.terms : "No data"}</pre>
                    </div>
                  </div>
                </div>
              ) : null}
              {tab === "reviews" ? (
                <div>
                  <h2 style={{ marginTop: 0 }}>Specification Helper</h2>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input value={helperPrompt} onChange={(e) => setHelperPrompt(e.target.value)} style={{ ...inputStyle, flex: 1 }} placeholder="Describe what to improve..." />
                    <button onClick={() => void runHelper()} style={btnPrimary}>Get Suggestions</button>
                  </div>
                  {helperOut ? (
                    <div style={{ marginTop: 8, border: "1px solid #334155", borderRadius: 8, padding: 10 }}>
                      <p style={{ marginTop: 0, fontWeight: 700 }}>{helperOut.title}</p>
                      {helperOut.suggestions.map((item) => <p key={item} style={{ margin: "4px 0", color: "#cbd5e1" }}>- {item}</p>)}
                      <p style={{ marginBottom: 0, fontSize: 12, color: "#94a3b8" }}>{helperOut.disclaimer}</p>
                    </div>
                  ) : null}
                </div>
              ) : null}
              {tab === "artifacts" ? (
                <div>
                  <h2 style={{ marginTop: 0 }}>Artifacts Upload</h2>
                  <label style={{ ...btnGhost, cursor: "pointer" }}>
                    Upload OpenAPI/JSON
                    <input type="file" multiple style={{ display: "none" }} onChange={onUploadFile} accept=".yaml,.yml,.json,.txt" />
                  </label>
                  <div style={{ marginTop: 8 }}>
                    {uploadedFiles.length === 0 ? <p style={{ margin: 0, color: "#94a3b8" }}>No files selected.</p> : null}
                    {uploadedFiles.map((name) => <p key={name} style={{ margin: "3px 0", color: "#cbd5e1" }}>{name}</p>)}
                  </div>
                </div>
              ) : null}
              {tab === "audit" ? (
                <div>
                  <h2 style={{ marginTop: 0 }}>Audit</h2>
                  {audit.length === 0 ? <p style={{ color: "#94a3b8" }}>No audit records</p> : null}
                  {audit.map((item) => (
                    <div key={item.id} style={{ borderBottom: "1px solid #1e293b", padding: "8px 0" }}>
                      <p style={{ margin: 0, fontWeight: 600 }}>{item.action}</p>
                      <p style={{ margin: "2px 0 0", color: "#94a3b8", fontSize: 12 }}>{item.created_at}</p>
                    </div>
                  ))}
                </div>
              ) : null}
            </section>

            {canQuote ? (
              <section style={{ marginTop: 12, border: "1px solid #334155", borderRadius: 14, padding: 14, background: "rgba(15,23,42,0.72)" }}>
                <h2 style={{ marginTop: 0 }}>Submit Quote</h2>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <input value={quoteAmount} onChange={(e) => setQuoteAmount(e.target.value)} placeholder="Amount (USD)" style={inputStyle} />
                  <input value={quoteDays} onChange={(e) => setQuoteDays(e.target.value)} placeholder="Timeline days" style={inputStyle} />
                </div>
                <textarea value={quoteTerms} onChange={(e) => setQuoteTerms(e.target.value)} style={{ ...inputStyle, marginTop: 8, minHeight: 80 }} />
                <button onClick={() => action("quote")} disabled={busy} style={{ ...btnPrimary, marginTop: 8 }}>Submit Quote</button>
              </section>
            ) : null}
          </>
        ) : null}
      </div>
      {confirmAction ? (
        <div style={dialogBackdrop}>
          <div style={dialogCard}>
            <h3 style={{ marginTop: 0 }}>Confirm action</h3>
            <p style={{ color: "#cbd5e1" }}>Do you want to run <b>{confirmAction}</b> for this request?</p>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button style={btnGhost} onClick={() => setConfirmAction(null)}>Cancel</button>
              <button
                style={btnPrimary}
                onClick={() => {
                  const actionType = confirmAction;
                  setConfirmAction(null);
                  void action(actionType);
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
const btnGhost: CSSProperties = {
  height: 36,
  padding: "0 12px",
  borderRadius: 8,
  border: "1px solid #475569",
  background: "transparent",
  color: "#cbd5e1",
  cursor: "pointer"
};
const inputStyle: CSSProperties = {
  borderRadius: 8,
  border: "1px solid #475569",
  background: "#020617",
  color: "#f8fafc",
  padding: "8px 10px"
};
const selectStyle: CSSProperties = {
  height: 36,
  borderRadius: 8,
  border: "1px solid #475569",
  background: "#020617",
  color: "#f8fafc",
  padding: "0 8px"
};
const dialogBackdrop: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(2,6,23,0.6)",
  display: "grid",
  placeItems: "center",
  zIndex: 50,
};
const dialogCard: CSSProperties = {
  width: "min(460px, calc(100vw - 32px))",
  border: "1px solid #334155",
  borderRadius: 12,
  background: "#020617",
  padding: 14,
};
