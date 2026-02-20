import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
type RegisterRole = "BUYER" | "VENDOR" | "VIEWER";

function redirectByRole(role: string) {
  if (role === "BUYER") {
    window.location.replace("/cabinet/buyer");
    return;
  }
  if (role === "VENDOR") {
    window.location.replace("/cabinet/vendor");
    return;
  }
  if (role === "ADMIN" || role === "ORG_OWNER") {
    window.location.replace("/cabinet/admin");
    return;
  }
  if (role === "VIEWER") {
    window.location.replace("/cabinet/viewer");
    return;
  }
  window.location.replace("/dashboard");
}

export default function OAuthCallbackPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [verifyToken, setVerifyToken] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<RegisterRole>("VENDOR");
  const provider = useMemo(() => {
    const value = router.query.provider;
    if (typeof value !== "string") return "";
    const normalized = value.toLowerCase();
    if (normalized === "google" || normalized === "github") return normalized;
    return "";
  }, [router.query.provider]);

  useEffect(() => {
    if (!router.isReady || !provider) return;
    const code = router.query.code;
    const state = router.query.state;
    if (typeof code !== "string" || typeof state !== "string") {
      setError("OAuth callback parameters are missing.");
      setLoading(false);
      return;
    }
    let active = true;
    const run = async () => {
      try {
        const response = await fetch(`${API_BASE}/auth/oauth/${provider}/exchange`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ code, state })
        });
        const payload = (await response.json().catch(() => null)) as
          | {
              status?: "authenticated" | "needs_verification";
              verify_token?: string;
              email?: string;
              user?: { role?: string };
              detail?: string;
              title?: string;
            }
          | null;
        if (!response.ok) {
          throw new Error(payload?.detail ?? payload?.title ?? "OAuth verification failed");
        }
        if (payload?.status === "authenticated" && payload.user?.role) {
          redirectByRole(payload.user.role);
          return;
        }
        if (payload?.status === "needs_verification" && payload.verify_token && payload.email) {
          if (!active) return;
          setVerifyToken(payload.verify_token);
          setEmail(payload.email);
          setLoading(false);
          return;
        }
        throw new Error("Unexpected OAuth response.");
      } catch (err: unknown) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "OAuth verification failed");
        setLoading(false);
      }
    };
    void run();
    return () => {
      active = false;
    };
  }, [provider, router.isReady, router.query.code, router.query.state]);

  const completeRegistration = async () => {
    if (!verifyToken) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE}/auth/oauth/complete-registration`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ verify_token: verifyToken, role })
      });
      const payload = (await response.json().catch(() => null)) as
        | { role?: string; detail?: string; title?: string }
        | null;
      if (!response.ok) {
        throw new Error(payload?.detail ?? payload?.title ?? "Registration failed");
      }
      redirectByRole(payload?.role ?? role);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed");
      setLoading(false);
    }
  };

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 16, background: "#020617", position: "relative", overflow: "hidden" }}>
      <div className="ray ray-a" />
      <div className="ray ray-b" />
      <div style={{ width: "100%", maxWidth: 520, border: "1px solid rgba(148,163,184,0.35)", borderRadius: 20, padding: 24, background: "rgba(15,23,42,0.72)", backdropFilter: "blur(10px)" }}>
        <h1 style={{ marginTop: 0, marginBottom: 6, fontSize: 30, color: "#f8fafc", letterSpacing: "-0.02em" }}>
          Account Verification
        </h1>
        <p style={{ marginTop: 0, marginBottom: 14, color: "#cbd5e1" }}>
          {loading && !verifyToken
            ? "Checking provider response..."
            : "Choose the role for your new account."}
        </p>

        {email ? (
          <div style={{ marginBottom: 12, border: "1px solid #334155", borderRadius: 10, padding: "9px 10px", color: "#cbd5e1", background: "rgba(2,6,23,0.5)" }}>
            Registering: <strong style={{ color: "#f8fafc" }}>{email}</strong>
          </div>
        ) : null}

        {verifyToken ? (
          <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
            {(["VENDOR", "BUYER", "VIEWER"] as RegisterRole[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setRole(item)}
                style={{
                  textAlign: "left",
                  border: "1px solid #475569",
                  borderRadius: 12,
                  background: role === item ? "rgba(37,99,235,0.25)" : "rgba(2,6,23,0.5)",
                  color: "#e2e8f0",
                  padding: "10px 12px",
                  cursor: "pointer"
                }}
              >
                <strong>{item}</strong>
              </button>
            ))}
          </div>
        ) : null}

        {error ? <p style={{ marginTop: 0, color: "#f87171" }}>{error}</p> : null}

        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={() => router.replace("/login")}
            style={{ flex: 1, height: 40, borderRadius: 10, border: "1px solid #475569", background: "transparent", color: "#cbd5e1", cursor: "pointer" }}
          >
            Back
          </button>
          <button
            type="button"
            onClick={() => void completeRegistration()}
            disabled={loading || !verifyToken}
            style={{ flex: 1, height: 40, borderRadius: 10, border: 0, background: "linear-gradient(90deg, #7c3aed 0%, #2563eb 100%)", color: "#fff", cursor: "pointer", fontWeight: 600 }}
          >
            {loading ? "Please wait..." : "Complete registration"}
          </button>
        </div>
      </div>
      <style jsx>{`
        .ray {
          position: absolute;
          border-radius: 9999px;
          filter: blur(70px);
          pointer-events: none;
          will-change: transform;
        }
        .ray-a {
          width: 32rem;
          height: 32rem;
          left: -8rem;
          top: -7rem;
          background: radial-gradient(circle, rgba(124, 58, 237, 0.35), rgba(124, 58, 237, 0));
          animation: floatA 15s ease-in-out infinite;
        }
        .ray-b {
          width: 28rem;
          height: 28rem;
          right: -7rem;
          bottom: -6rem;
          background: radial-gradient(circle, rgba(14, 165, 233, 0.3), rgba(14, 165, 233, 0));
          animation: floatB 13s ease-in-out infinite;
        }
        @keyframes floatA {
          0%,
          100% {
            transform: translate3d(0, 0, 0);
          }
          50% {
            transform: translate3d(30px, 18px, 0);
          }
        }
        @keyframes floatB {
          0%,
          100% {
            transform: translate3d(0, 0, 0);
          }
          50% {
            transform: translate3d(-28px, -16px, 0);
          }
        }
      `}</style>
    </main>
  );
}
