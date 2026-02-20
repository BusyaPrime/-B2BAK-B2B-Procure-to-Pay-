"use client";

import { useEffect, useState } from "react";
import Script from "next/script";

declare global {
  interface Window {
    UnicornStudio?: { isInitialized?: boolean; init: () => void };
  }
}

export function UnicornAuraBackground() {
  const [canRender, setCanRender] = useState(false);

  useEffect(() => {
    const lowPower =
      (typeof navigator !== "undefined" && navigator.hardwareConcurrency <= 4) ||
      (typeof window !== "undefined" && "matchMedia" in window && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    if (lowPower) return;

    let cancelled = false;
    const schedule = () => {
      if (cancelled) return;
      setCanRender(true);
    };

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      const id = (window as Window & { requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => number }).requestIdleCallback(
        schedule,
        { timeout: 1200 }
      );
      return () => {
        cancelled = true;
        if ("cancelIdleCallback" in window) {
          (window as Window & { cancelIdleCallback: (handle: number) => void }).cancelIdleCallback(id);
        }
      };
    }

    const t = window.setTimeout(schedule, 600);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, []);

  if (!canRender) return null;

  return (
    <div className="aura-background-component absolute top-0 -z-10 h-full w-full">
      <div data-us-project="yWZ2Tbe094Fsjgy9NRnD" className="absolute left-0 top-0 -z-10 h-full w-full" />
      <Script
        id="unicorn-studio"
        strategy="afterInteractive"
        src="https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v1.4.29/dist/unicornStudio.umd.js"
        onLoad={() => {
          if (typeof window === "undefined") return;
          if (!window.UnicornStudio?.isInitialized && window.UnicornStudio?.init) {
            window.UnicornStudio.init();
            window.UnicornStudio.isInitialized = true;
          }
        }}
      />
    </div>
  );
}
