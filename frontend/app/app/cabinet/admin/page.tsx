"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { Card } from "@/components/ui/card";
import { apiClient } from "@/lib/api";

export default function AdminCabinetPage() {
  const requests = useQuery({ queryKey: ["admin-cabinet-requests"], queryFn: () => apiClient.requests("?page=1&page_size=10") });
  const deals = useQuery({ queryKey: ["admin-cabinet-deals"], queryFn: () => apiClient.deals("?page=1&page_size=10") });
  const audit = useQuery({ queryKey: ["admin-cabinet-audit"], queryFn: () => apiClient.audit("?page=1&page_size=10") });

  if (requests.isLoading || deals.isLoading || audit.isLoading) return <Card>Loading admin cabinet...</Card>;
  if (requests.isError || deals.isError || audit.isError) return <Card>Could not load admin cabinet.</Card>;

  return (
    <div className="space-y-4">
      <Card>
        <h1 className="text-xl font-semibold">Admin / Owner Cabinet</h1>
        <p className="mt-1 text-sm text-slate-300">Govern performance, policy compliance, and platform activity across requests, deals, and audits.</p>
      </Card>
      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-sm text-slate-300">Requests</p>
          <p className="mt-2 text-3xl font-semibold">{requests.data.total}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-300">Deals</p>
          <p className="mt-2 text-3xl font-semibold">{deals.data.total}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-300">Audit Events</p>
          <p className="mt-2 text-3xl font-semibold">{audit.data.total}</p>
        </Card>
      </section>
      <Card>
        <p className="text-sm text-slate-300">Control Center</p>
        <div className="mt-2 flex gap-3 text-sm">
          <Link className="text-primary" href="/app/audit">
            Open Audit
          </Link>
          <Link className="text-primary" href="/app/settings">
            Org Settings
          </Link>
        </div>
      </Card>
    </div>
  );
}
