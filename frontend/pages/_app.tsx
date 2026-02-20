import type { AppProps } from "next/app";
import { useEffect } from "react";
import { Toaster } from "sonner";

import "@/styles/globals.css";

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    const applyTheme = (theme: "dark" | "light") => {
      document.documentElement.setAttribute("data-theme", theme);
      document.body.setAttribute("data-theme", theme);
    };
    const savedTheme = window.localStorage.getItem("b2bak_theme");
    const initialTheme = savedTheme === "light" ? "light" : "dark";
    applyTheme(initialTheme);
    const onThemeChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ theme?: "dark" | "light" }>).detail;
      if (!detail?.theme) return;
      applyTheme(detail.theme);
      window.localStorage.setItem("b2bak_theme", detail.theme);
    };
    window.addEventListener("b2bak:theme-changed", onThemeChanged as EventListener);
    return () => {
      window.removeEventListener("b2bak:theme-changed", onThemeChanged as EventListener);
    };
  }, []);

  return (
    <main>
      <Component {...pageProps} />
      <Toaster richColors position="top-right" />
    </main>
  );
}
