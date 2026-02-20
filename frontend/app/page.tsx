import Link from "next/link";

import { LightRaysBackdrop } from "@/components/effects/light-rays-backdrop";
import { UnicornAuraBackground } from "@/components/effects/unicorn-aura-background";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function LandingPage() {
  return (
    <main className="relative min-h-screen overflow-hidden p-6">
      <LightRaysBackdrop />
      <UnicornAuraBackground />
      <div className="mx-auto max-w-6xl">
        <header className="mb-10 flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">B2BAK</h1>
          <Link href="/login">
            <Button>Sign in</Button>
          </Link>
        </header>
        <section className="glass-card relative overflow-hidden px-8 py-16">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(500px 220px at 15% 10%, rgba(124,58,237,0.22), transparent 70%), radial-gradient(500px 220px at 85% 90%, rgba(14,165,233,0.20), transparent 70%)"
            }}
          />
          <h2 className="mb-4 max-w-3xl text-5xl font-semibold tracking-tight">
            Production-grade B2B workflow for Requests, Quotes, Deals, and Payments.
          </h2>
          <p className="mb-8 max-w-2xl text-base text-slate-300">
            Premium multi-tenant platform for procurement teams and vendors with auditable actions, role-based access, and clean handoffs from sourcing to payment.
          </p>
          <p className="mb-6 text-3xl text-violet-200" style={{ fontFamily: "cursive" }}>
            Start with a request. Finish with paid delivery.
          </p>
          <div className="flex gap-3">
            <Link href="/login">
              <Button className="px-8 py-5">Try Demo</Button>
            </Link>
            <Button variant="outline" className="px-8 py-5">
              Security Overview
            </Button>
          </div>
        </section>
        <section className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            ["Workflow", "Request lifecycle with enforced status machine and audit entries."],
            ["Governance", "RBAC + tenant isolation baked into every backend query and action."],
            ["Operations", "Dockerized local stack with seeded demo accounts and end-to-end flow."]
          ].map(([title, copy]) => (
            <Card key={title}>
              <h3 className="mb-2 text-lg font-semibold">{title}</h3>
              <p className="text-sm text-slate-300">{copy}</p>
            </Card>
          ))}
        </section>
      </div>
    </main>
  );
}
