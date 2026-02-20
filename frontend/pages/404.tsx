import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#030712", color: "#f8fafc", padding: 20 }}>
      <section style={{ border: "1px solid #334155", borderRadius: 16, padding: 24, width: "min(520px, 100%)", textAlign: "center", background: "rgba(2,6,23,0.8)" }}>
        <p style={{ fontSize: 56, margin: 0 }}>👻</p>
        <h1 style={{ margin: "8px 0 0" }}>404 - Page not found</h1>
        <p style={{ color: "#94a3b8" }}>This route does not exist. Open marketplace workspace instead.</p>
        <Link href="/marketplace/requests" style={{ display: "inline-flex", height: 38, alignItems: "center", textDecoration: "none", border: "1px solid #475569", borderRadius: 9, color: "#cbd5e1", padding: "0 12px" }}>
          Go to Requests
        </Link>
      </section>
    </main>
  );
}
