import type { Metadata } from "next";

import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "B2BAK Marketplace",
  description: "Requests → Quotes → Deals → Invoices → Paid"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">{children}</body>
    </html>
  );
}
