import Link from "next/link";
import { ChangeEvent, useMemo, useState } from "react";
import type { CSSProperties } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

type Locale = "en" | "ru";
type Theme = "dark" | "light";
type Role = "ORG_OWNER" | "ADMIN" | "BUYER" | "VENDOR" | "VIEWER";
type MePayload = {
  user: {
    id: string;
    email: string;
    role: Role;
    display_name?: string | null;
    avatar_url?: string | null;
    theme_preference?: Theme;
    locale?: Locale;
    created_at?: string;
  };
  organization: { name: string };
};

const I18N: Record<Locale, Record<string, string>> = {
  en: {
    title: "Profile & Preferences",
    subtitle: "Manage your account, look and language",
    account: "Account",
    appearance: "Appearance",
    security: "Security",
    email: "Registration email",
    role: "Role",
    org: "Organization",
    created: "Joined",
    displayName: "Display name",
    avatar: "Avatar",
    uploadHint: "Upload JPG/PNG. Image is saved to your profile.",
    locale: "Language",
    theme: "Theme",
    dark: "Dark",
    light: "Light",
    save: "Save profile",
    saving: "Saving...",
    back: "Back to dashboard",
    logout: "Logout",
    ru: "Russian",
    en: "English",
    profileSaved: "Profile saved",
    profileError: "Failed to save profile",
    loadError: "Failed to load profile"
  },
  ru: {
    title: "Профиль и настройки",
    subtitle: "Управление аккаунтом, темой и языком",
    account: "Аккаунт",
    appearance: "Оформление",
    security: "Безопасность",
    email: "Почта регистрации",
    role: "Роль",
    org: "Организация",
    created: "Дата регистрации",
    displayName: "Отображаемое имя",
    avatar: "Аватар",
    uploadHint: "Загрузите JPG/PNG. Картинка сохранится в профиле.",
    locale: "Язык",
    theme: "Тема",
    dark: "Темная",
    light: "Светлая",
    save: "Сохранить профиль",
    saving: "Сохранение...",
    back: "Назад в дашборд",
    logout: "Выйти",
    ru: "Русский",
    en: "English",
    profileSaved: "Профиль сохранен",
    profileError: "Не удалось сохранить профиль",
    loadError: "Не удалось загрузить профиль"
  }
};

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [profile, setProfile] = useState<MePayload | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [theme, setTheme] = useState<Theme>("dark");
  const [locale, setLocale] = useState<Locale>("en");

  useMemo(() => {
    if (!loading) return;
    let active = true;
    (async () => {
      try {
        const meRes = await fetch(`${API_BASE}/auth/me`, { credentials: "include" });
        if (!meRes.ok) {
          window.location.replace("/login");
          return;
        }
        const me = (await meRes.json()) as MePayload;
        if (!active) return;
        setProfile(me);
        setDisplayName(me.user.display_name ?? "");
        setAvatarUrl(me.user.avatar_url ?? null);
        setTheme(me.user.theme_preference ?? "dark");
        setLocale(me.user.locale ?? "en");
      } catch {
        if (!active) return;
        setError("Failed to load profile");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [loading]);

  const t = I18N[locale];

  const onAvatarChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : null;
      setAvatarUrl(result);
    };
    reader.readAsDataURL(file);
  };

  const saveProfile = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch(`${API_BASE}/auth/profile`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: displayName,
          avatar_url: avatarUrl,
          theme_preference: theme,
          locale
        })
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { detail?: string; title?: string } | null;
        throw new Error(payload?.detail ?? payload?.title ?? t.profileError);
      }
      const savedUser = (await response.json()) as MePayload["user"];
      window.localStorage.setItem("b2bak_theme", savedUser.theme_preference ?? theme);
      window.dispatchEvent(
        new CustomEvent("b2bak:theme-changed", {
          detail: { theme: (savedUser.theme_preference ?? theme) as Theme }
        })
      );
      setSuccess(t.profileSaved);
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              user: {
                ...prev.user,
                ...savedUser
              }
            }
          : prev
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t.profileError);
    } finally {
      setSaving(false);
    }
  };

  const logout = async () => {
    try {
      await fetch(`${API_BASE}/auth/logout`, { method: "POST", credentials: "include" });
    } finally {
      window.location.replace("/login");
    }
  };

  if (loading) {
    return (
      <main style={mainStyle}>
        <div style={{ ...panelStyle, maxWidth: 920, margin: "0 auto" }}>Loading profile...</div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main style={mainStyle}>
        <div style={{ ...panelStyle, maxWidth: 920, margin: "0 auto", color: "#f87171" }}>{t.loadError}</div>
      </main>
    );
  }

  return (
    <main style={mainStyle}>
      <div style={{ margin: "0 auto", maxWidth: 980 }}>
        <div style={{ ...panelStyle, marginBottom: 14 }}>
          <h1 style={{ margin: 0, fontSize: 30 }}>{t.title}</h1>
          <p style={{ margin: "6px 0 0", color: "#94a3b8" }}>{t.subtitle}</p>
          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            <Link href="/dashboard" style={ghostBtn}>
              {t.back}
            </Link>
            <button type="button" style={dangerBtn} onClick={logout}>
              {t.logout}
            </button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 12 }}>
          <section style={panelStyle}>
            <h2 style={{ marginTop: 0 }}>{t.account}</h2>
            <div style={{ display: "grid", gap: 8, marginBottom: 10 }}>
              <label style={labelStyle}>{t.displayName}</label>
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              <label style={labelStyle}>{t.avatar}</label>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <div
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: "50%",
                    border: "1px solid #334155",
                    background: avatarUrl ? `url(${avatarUrl}) center/cover no-repeat` : "linear-gradient(120deg,#7c3aed,#2563eb)"
                  }}
                />
                <div>
                  <input type="file" accept="image/*" onChange={onAvatarChange} />
                  <p style={{ margin: "6px 0 0", color: "#94a3b8", fontSize: 12 }}>{t.uploadHint}</p>
                </div>
              </div>
            </div>
            <div style={{ marginTop: 16, borderTop: "1px solid #334155", paddingTop: 12 }}>
              <p style={{ margin: "0 0 8px", color: "#cbd5e1", fontWeight: 700 }}>{t.security}</p>
              <InfoRow label={t.email} value={profile.user.email} />
              <InfoRow label={t.role} value={profile.user.role} />
              <InfoRow label={t.org} value={profile.organization.name} />
              <InfoRow label={t.created} value={profile.user.created_at ? new Date(profile.user.created_at).toLocaleString() : "-"} />
            </div>
          </section>

          <section style={panelStyle}>
            <h2 style={{ marginTop: 0 }}>{t.appearance}</h2>
            <div style={{ marginBottom: 12 }}>
              <p style={labelStyle}>{t.theme}</p>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" style={theme === "dark" ? activeChip : chip} onClick={() => setTheme("dark")}>
                  {t.dark}
                </button>
                <button type="button" style={theme === "light" ? activeChip : chip} onClick={() => setTheme("light")}>
                  {t.light}
                </button>
              </div>
            </div>
            <div style={{ marginBottom: 18 }}>
              <p style={labelStyle}>{t.locale}</p>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" style={locale === "en" ? activeChip : chip} onClick={() => setLocale("en")}>
                  {t.en}
                </button>
                <button type="button" style={locale === "ru" ? activeChip : chip} onClick={() => setLocale("ru")}>
                  {t.ru}
                </button>
              </div>
            </div>
            {error ? <p style={{ color: "#f87171" }}>{error}</p> : null}
            {success ? <p style={{ color: "#22c55e" }}>{success}</p> : null}
            <button type="button" style={primaryBtn} onClick={saveProfile} disabled={saving}>
              {saving ? t.saving : t.save}
            </button>
          </section>
        </div>
      </div>
    </main>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
      <span style={{ color: "#94a3b8", fontSize: 13 }}>{label}</span>
      <span style={{ color: "#e2e8f0", fontSize: 13, textAlign: "right" }}>{value}</span>
    </div>
  );
}

const mainStyle: CSSProperties = {
  minHeight: "100vh",
  padding: 20,
  background: "hsl(var(--background))",
  color: "hsl(var(--foreground))"
};

const panelStyle: CSSProperties = {
  border: "1px solid #334155",
  borderRadius: 16,
  padding: 16,
  background: "rgba(15,23,42,0.7)"
};

const inputStyle: CSSProperties = {
  width: "100%",
  height: 38,
  borderRadius: 8,
  border: "1px solid #475569",
  background: "#020617",
  color: "#f8fafc",
  padding: "0 10px"
};

const labelStyle: CSSProperties = { margin: 0, color: "#cbd5e1", fontSize: 13 };

const chip: CSSProperties = {
  padding: "7px 12px",
  borderRadius: 999,
  border: "1px solid #475569",
  background: "rgba(2,6,23,0.5)",
  color: "#e2e8f0",
  cursor: "pointer"
};

const activeChip: CSSProperties = {
  ...chip,
  border: "1px solid #60a5fa",
  background: "rgba(37,99,235,0.25)"
};

const primaryBtn: CSSProperties = {
  width: "100%",
  height: 40,
  borderRadius: 10,
  border: 0,
  background: "linear-gradient(90deg,#7c3aed,#2563eb)",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer"
};

const ghostBtn: CSSProperties = {
  height: 36,
  padding: "0 12px",
  borderRadius: 9,
  border: "1px solid #475569",
  color: "#cbd5e1",
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center"
};

const dangerBtn: CSSProperties = {
  height: 36,
  padding: "0 12px",
  borderRadius: 9,
  border: "1px solid #7f1d1d",
  background: "rgba(127,29,29,0.35)",
  color: "#fecaca",
  cursor: "pointer"
};
