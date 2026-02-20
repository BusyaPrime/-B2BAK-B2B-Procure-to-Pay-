import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";

type Me = { user: { role: string; email: string }; organization: { name: string } };

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export default function NewBuyerRequestPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [me, setMe] = useState<Me | null>(null);

  const [title, setTitle] = useState("");
  const [task, setTask] = useState("");
  const [technicalSpec, setTechnicalSpec] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("15000");
  const [currency, setCurrency] = useState("USD");
  const [deadlineDate, setDeadlineDate] = useState("");
  const [tags, setTags] = useState("procurement,b2b");

  useEffect(() => {
    (async () => {
      try {
        const meRes = await fetch(`${API_BASE}/auth/me`, { credentials: "include" });
        if (!meRes.ok) {
          window.location.replace("/login");
          return;
        }
        const meData = (await meRes.json()) as Me;
        if (meData.user.role !== "BUYER" && meData.user.role !== "ADMIN" && meData.user.role !== "ORG_OWNER") {
          window.location.replace("/login");
          return;
        }
        setMe(meData);
      } catch {
        window.location.replace("/login");
      } finally {
        setChecking(false);
      }
    })();
  }, []);

  const budgetCents = useMemo(() => {
    const parsed = Number(amount.replace(",", "."));
    if (!Number.isFinite(parsed) || parsed <= 0) return 0;
    return Math.round(parsed * 100);
  }, [amount]);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;
    setError("");
    if (title.trim().length < 3) return setError("Title must be at least 3 characters");
    if (task.trim().length < 5) return setError("Task must be at least 5 characters");
    if (technicalSpec.trim().length < 10) return setError("Technical specification is too short");
    if (description.trim().length < 10) return setError("Description is too short");
    if (!deadlineDate) return setError("Pick a deadline date");
    if (budgetCents <= 0) return setError("Enter exact budget amount");

    setSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        description: [
          `Task: ${task.trim()}`,
          "",
          "Technical Specification:",
          technicalSpec.trim(),
          "",
          "Business Description:",
          description.trim()
        ].join("\n"),
        budget_cents: budgetCents,
        currency: currency.trim().toUpperCase(),
        deadline_date: deadlineDate,
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      };

      const response = await fetch(`${API_BASE}/requests`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        let message = "Failed to create request";
        try {
          const problem = (await response.json()) as { detail?: string; title?: string };
          message = problem.detail ?? problem.title ?? message;
        } catch {}
        throw new Error(message);
      }
      const created = (await response.json()) as { id: string };
      router.push(`/marketplace/requests/${created.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Create request failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (checking) {
    return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#030712", color: "#f8fafc" }}>Checking access...</main>;
  }

  return (
    <main style={{ minHeight: "100vh", padding: 20, background: "#030712", color: "#f8fafc" }}>
      <div style={{ margin: "0 auto", maxWidth: 980 }}>
        <header style={{ border: "1px solid #334155", borderRadius: 16, padding: 18, background: "linear-gradient(120deg, rgba(124,58,237,0.22), rgba(2,6,23,0.45))" }}>
          <h1 style={{ margin: 0, fontSize: 30 }}>Create Buyer Request</h1>
          <p style={{ margin: "8px 0 0", color: "#cbd5e1" }}>
            {me ? `${me.user.email} - ${me.organization.name}` : "Buyer workspace"}.
            Fill exact amount, task, technical specification, and description.
          </p>
          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            <Link href="/cabinet/buyer" style={btnGhost}>Back to Buyer Cabinet</Link>
            <Link href="/marketplace/requests" style={btnGhost}>All Requests</Link>
          </div>
        </header>

        <form onSubmit={onSubmit} style={{ marginTop: 14, border: "1px solid #334155", borderRadius: 14, padding: 16, background: "rgba(15,23,42,0.72)" }}>
          <GridLabel label="Request Title">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Example: Website redesign for B2B marketplace" style={inputStyle} />
          </GridLabel>

          <GridLabel label="Task (what should be done)">
            <textarea value={task} onChange={(e) => setTask(e.target.value)} placeholder="Example: Build responsive frontend with role-based cabinets." style={textareaStyle} />
          </GridLabel>

          <GridLabel label="Technical Specification (ТЗ)">
            <textarea value={technicalSpec} onChange={(e) => setTechnicalSpec(e.target.value)} placeholder="Detailed requirements, stack, integrations, acceptance criteria..." style={textareaStyle} />
          </GridLabel>

          <GridLabel label="Business Description">
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Context, goals, expected outcomes, constraints..." style={textareaStyle} />
          </GridLabel>

          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 10 }}>
            <GridLabel label="Exact Budget Amount">
              <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="15000" style={inputStyle} />
            </GridLabel>
            <GridLabel label="Currency">
              <input value={currency} onChange={(e) => setCurrency(e.target.value)} placeholder="USD" style={inputStyle} />
            </GridLabel>
            <GridLabel label="Deadline">
              <input type="date" value={deadlineDate} onChange={(e) => setDeadlineDate(e.target.value)} style={inputStyle} />
            </GridLabel>
          </div>

          <GridLabel label="Tags (comma separated)">
            <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="procurement,frontend,urgent" style={inputStyle} />
          </GridLabel>

          <p style={{ margin: "8px 0", color: "#93c5fd", fontSize: 13 }}>
            Budget in API format: <strong>{budgetCents.toLocaleString()}</strong> cents
          </p>
          {error ? <p style={{ margin: "8px 0", color: "#f87171" }}>{error}</p> : null}
          <button type="submit" disabled={submitting} style={btnPrimary}>
            {submitting ? "Creating request..." : "Create Precise Request"}
          </button>
        </form>
      </div>
    </main>
  );
}

function GridLabel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "grid", gap: 6, marginBottom: 10 }}>
      <span style={{ fontSize: 13, color: "#cbd5e1" }}>{label}</span>
      {children}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  height: 38,
  borderRadius: 9,
  border: "1px solid #475569",
  background: "#020617",
  color: "#f8fafc",
  padding: "0 10px"
};

const textareaStyle: React.CSSProperties = {
  minHeight: 86,
  borderRadius: 9,
  border: "1px solid #475569",
  background: "#020617",
  color: "#f8fafc",
  padding: "8px 10px",
  resize: "vertical"
};

const btnPrimary: React.CSSProperties = {
  height: 42,
  padding: "0 14px",
  borderRadius: 10,
  border: 0,
  background: "linear-gradient(90deg, #7c3aed, #2563eb)",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer"
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
