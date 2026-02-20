import { FormEvent, useState } from "react";
import { useRouter } from "next/router";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
type AuthMode = "login" | "register";
type RegisterRole = "BUYER" | "VENDOR" | "VIEWER";
const LOGO_LOOP_ITEMS = ["B2BAK", "Procurement", "Quotes", "Deals", "Invoices", "B2B", "Secure", "Fast"];

export default function ClassicLoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupPasswordRepeat, setSignupPasswordRepeat] = useState("");
  const [signupOrgName, setSignupOrgName] = useState("");
  const [signupRole, setSignupRole] = useState<RegisterRole>("VENDOR");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const redirectByRole = (role: string) => {
    if (role === "BUYER") {
      router.push("/cabinet/buyer");
      return;
    }
    if (role === "VENDOR") {
      router.push("/cabinet/vendor");
      return;
    }
    if (role === "ADMIN" || role === "ORG_OWNER") {
      router.push("/cabinet/admin");
      return;
    }
    if (role === "VIEWER") {
      router.push("/cabinet/viewer");
      return;
    }
    router.push("/dashboard");
  };

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;
    setError("");
    if (!email.includes("@")) {
      setError("Enter a valid email");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password })
      });
      if (!response.ok) {
        let message = "Login failed";
        try {
          const problem = (await response.json()) as { detail?: string; title?: string };
          message = problem.detail ?? problem.title ?? message;
        } catch {}
        throw new Error(message);
      }
      const meRes = await fetch(`${API_BASE}/auth/me`, { credentials: "include" });
      if (meRes.ok) {
        const me = (await meRes.json()) as { user: { role: string } };
        redirectByRole(me.user.role);
        return;
      }
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSubmitRegister = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;
    setError("");
    if (!signupEmail.includes("@")) {
      setError("Enter a valid email");
      return;
    }
    if (signupOrgName.trim().length < 2) {
      setError("Enter a valid workspace/company name");
      return;
    }
    if (signupPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (signupPassword !== signupPasswordRepeat) {
      setError("Passwords do not match");
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: signupEmail,
          password: signupPassword,
          org_name: signupOrgName,
          role: signupRole
        })
      });
      if (!response.ok) {
        let message = "Registration failed";
        try {
          const problem = (await response.json()) as { detail?: string; title?: string };
          message = problem.detail ?? problem.title ?? message;
        } catch {}
        throw new Error(message);
      }
      const user = (await response.json()) as { role: string };
      redirectByRole(user.role);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const startOAuth = async (provider: "google" | "github") => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE}/auth/oauth/${provider}/start?intent=${mode}`, {
        credentials: "include"
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { detail?: string; title?: string } | null;
        throw new Error(payload?.detail ?? payload?.title ?? "OAuth init failed");
      }
      const data = (await response.json()) as { authorize_url: string };
      window.location.href = data.authorize_url;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "OAuth init failed");
      setIsSubmitting(false);
    }
  };

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 16, background: "#020617", position: "relative", overflow: "hidden" }}>
      <div className="ray ray-a" />
      <div className="ray ray-b" />
      <div
        style={{
          width: "100%",
          maxWidth: 460,
          border: "1px solid rgba(148,163,184,0.35)",
          borderRadius: 20,
          padding: 24,
          background: "rgba(15,23,42,0.72)",
          backdropFilter: "blur(10px)",
          boxShadow: "0 25px 70px rgba(2,6,23,0.55)"
        }}
      >
        <div style={{ marginBottom: 12, border: "1px solid #334155", borderRadius: 10, background: "rgba(2,6,23,0.5)", overflow: "hidden" }}>
          <div className="logo-loop-track">
            {[...LOGO_LOOP_ITEMS, ...LOGO_LOOP_ITEMS].map((item, idx) => (
              <span key={`${item}-${idx}`} className="logo-loop-chip">
                {item}
              </span>
            ))}
          </div>
        </div>
        <h1 style={{ margin: 0, marginBottom: 6, fontSize: 30, color: "#f8fafc", letterSpacing: "-0.02em" }}>
          {mode === "login" ? "Log In to B2BAK" : "Sign Up to B2BAK"}
        </h1>
        <p style={{ marginTop: 0, marginBottom: 12, color: "#cbd5e1" }}>
          {mode === "login"
            ? "Use Google/GitHub or your work credentials to access your workspace."
            : "Register with Google or GitHub, then choose your role in verification."}
        </p>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError("");
            }}
            style={{
              flex: 1,
              border: "1px solid #334155",
              borderRadius: 10,
              background: mode === "login" ? "rgba(37,99,235,0.28)" : "rgba(2,6,23,0.5)",
              color: "#e2e8f0",
              height: 36,
              cursor: "pointer"
            }}
          >
            Log In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("register");
              setError("");
            }}
            style={{
              flex: 1,
              border: "1px solid #334155",
              borderRadius: 10,
              background: mode === "register" ? "rgba(124,58,237,0.3)" : "rgba(2,6,23,0.5)",
              color: "#e2e8f0",
              height: 36,
              cursor: "pointer"
            }}
          >
            Sign Up
          </button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
          <button
            type="button"
            onClick={() => void startOAuth("google")}
            disabled={isSubmitting}
            style={{
              border: "1px solid #475569",
              borderRadius: 10,
              background: "rgba(2,6,23,0.6)",
              color: "#f8fafc",
              height: 38,
              cursor: "pointer"
            }}
          >
            Continue with Google
          </button>
          <button
            type="button"
            onClick={() => void startOAuth("github")}
            disabled={isSubmitting}
            style={{
              border: "1px solid #475569",
              borderRadius: 10,
              background: "rgba(2,6,23,0.6)",
              color: "#f8fafc",
              height: 38,
              cursor: "pointer"
            }}
          >
            Continue with GitHub
          </button>
        </div>
        {mode === "login" ? (
          <form onSubmit={onSubmit}>
            <label style={{ color: "#e2e8f0", display: "block", marginBottom: 6 }}>Email</label>
            <input
              aria-label="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              style={{ width: "100%", height: 38, marginBottom: 12, borderRadius: 8, border: "1px solid #475569", background: "#020617", color: "#f8fafc", padding: "0 10px" }}
            />
            <label style={{ color: "#e2e8f0", display: "block", marginBottom: 6 }}>Password</label>
            <input
              aria-label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              style={{ width: "100%", height: 38, marginBottom: 12, borderRadius: 8, border: "1px solid #475569", background: "#020617", color: "#f8fafc", padding: "0 10px" }}
            />
            {error ? <p style={{ color: "#f87171", marginTop: 0 }}>{error}</p> : null}
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                width: "100%",
                height: 42,
                borderRadius: 10,
                border: 0,
                background: "linear-gradient(90deg, #7c3aed 0%, #2563eb 100%)",
                color: "#fff",
                cursor: "pointer",
                fontWeight: 600
              }}
            >
              {isSubmitting ? "Signing in..." : "Log In"}
            </button>
          </form>
        ) : (
          <form onSubmit={onSubmitRegister}>
            <label style={{ color: "#e2e8f0", display: "block", marginBottom: 6 }}>Work Email</label>
            <input
              aria-label="Work Email"
              value={signupEmail}
              onChange={(e) => setSignupEmail(e.target.value)}
              placeholder="you@company.com"
              style={{ width: "100%", height: 38, marginBottom: 12, borderRadius: 8, border: "1px solid #475569", background: "#020617", color: "#f8fafc", padding: "0 10px" }}
            />
            <label style={{ color: "#e2e8f0", display: "block", marginBottom: 6 }}>Workspace / Company</label>
            <input
              aria-label="Workspace"
              value={signupOrgName}
              onChange={(e) => setSignupOrgName(e.target.value)}
              placeholder="Acme Procurement"
              style={{ width: "100%", height: 38, marginBottom: 12, borderRadius: 8, border: "1px solid #475569", background: "#020617", color: "#f8fafc", padding: "0 10px" }}
            />
            <p style={{ marginTop: 0, marginBottom: 6, color: "#e2e8f0" }}>Choose your role</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 12 }}>
              {(["VENDOR", "BUYER", "VIEWER"] as RegisterRole[]).map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setSignupRole(role)}
                  style={{
                    height: 36,
                    borderRadius: 8,
                    border: "1px solid #475569",
                    background: signupRole === role ? "rgba(37,99,235,0.25)" : "rgba(2,6,23,0.5)",
                    color: "#e2e8f0",
                    cursor: "pointer"
                  }}
                >
                  {role}
                </button>
              ))}
            </div>
            <label style={{ color: "#e2e8f0", display: "block", marginBottom: 6 }}>Password</label>
            <input
              aria-label="Sign Up Password"
              type="password"
              value={signupPassword}
              onChange={(e) => setSignupPassword(e.target.value)}
              placeholder="Create password"
              style={{ width: "100%", height: 38, marginBottom: 12, borderRadius: 8, border: "1px solid #475569", background: "#020617", color: "#f8fafc", padding: "0 10px" }}
            />
            <label style={{ color: "#e2e8f0", display: "block", marginBottom: 6 }}>Repeat Password</label>
            <input
              aria-label="Repeat Password"
              type="password"
              value={signupPasswordRepeat}
              onChange={(e) => setSignupPasswordRepeat(e.target.value)}
              placeholder="Repeat password"
              style={{ width: "100%", height: 38, marginBottom: 12, borderRadius: 8, border: "1px solid #475569", background: "#020617", color: "#f8fafc", padding: "0 10px" }}
            />
            {error ? <p style={{ color: "#f87171", marginTop: 0 }}>{error}</p> : null}
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                width: "100%",
                height: 42,
                borderRadius: 10,
                border: 0,
                background: "linear-gradient(90deg, #7c3aed 0%, #2563eb 100%)",
                color: "#fff",
                cursor: "pointer",
                fontWeight: 600
              }}
            >
              {isSubmitting ? "Creating account..." : "Create account"}
            </button>
          </form>
        )}
        <p style={{ marginBottom: 0, marginTop: 10, color: "#94a3b8", fontSize: 12 }}>
          OAuth options are available for both Log In and Sign Up.
        </p>
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
        .logo-loop-track {
          display: flex;
          align-items: center;
          gap: 8px;
          width: max-content;
          padding: 10px;
          animation: logoLoop 16s linear infinite;
        }
        .logo-loop-chip {
          display: inline-flex;
          align-items: center;
          padding: 4px 10px;
          border-radius: 9999px;
          border: 1px solid #475569;
          color: #cbd5e1;
          font-size: 12px;
          white-space: nowrap;
          background: rgba(15, 23, 42, 0.7);
        }
        @keyframes logoLoop {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </main>
  );
}
