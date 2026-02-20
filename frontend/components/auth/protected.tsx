"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { apiClient } from "@/lib/api";

const AUTH_BLOCK_UNTIL_KEY = "b2bak_auth_block_until";
const AUTH_BLOCK_MS = 5000;
const AUTH_FAILSAFE_MS = 12000;

export function Protected({
  children,
  fallback
}: {
  children: (me: Awaited<ReturnType<typeof apiClient.me>>) => React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const router = useRouter();
  const startedRef = useRef(false);
  const redirectedRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<Awaited<ReturnType<typeof apiClient.me>> | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    const redirectToLogin = () => {
      if (redirectedRef.current) return;
      redirectedRef.current = true;
      if (typeof window !== "undefined") {
        window.location.replace("/login");
        return;
      }
      router.replace("/login");
    };

    if (typeof window !== "undefined") {
      const blockedUntilRaw = window.sessionStorage.getItem(AUTH_BLOCK_UNTIL_KEY);
      const blockedUntil = blockedUntilRaw ? Number(blockedUntilRaw) : 0;
      if (Number.isFinite(blockedUntil) && blockedUntil > Date.now()) {
        setFailed(true);
        setLoading(false);
        redirectToLogin();
        return;
      }
    }

    let active = true;
    const failsafe = setTimeout(() => {
      if (!active) return;
      setFailed(true);
      setLoading(false);
      redirectToLogin();
    }, AUTH_FAILSAFE_MS);

    apiClient
      .me()
      .then((data) => {
        if (!active) return;
        clearTimeout(failsafe);
        setMe(data);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        clearTimeout(failsafe);
        setFailed(true);
        setLoading(false);
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem(AUTH_BLOCK_UNTIL_KEY, String(Date.now() + AUTH_BLOCK_MS));
        }
        redirectToLogin();
      });
    return () => {
      active = false;
      clearTimeout(failsafe);
    };
  }, [router]);

  if (loading) {
    return <div className="glass-card p-8 text-sm text-muted-foreground">Loading workspace...</div>;
  }
  if (failed || !me) {
    return (
      fallback ?? (
        <div className="glass-card p-8 text-sm text-muted-foreground">
          Session check failed. Redirecting to login...
        </div>
      )
    );
  }
  return <>{children(me)}</>;
}
