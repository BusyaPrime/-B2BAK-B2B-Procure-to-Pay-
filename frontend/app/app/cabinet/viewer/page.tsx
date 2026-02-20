"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { Card } from "@/components/ui/card";
import { apiClient } from "@/lib/api";

export default function ViewerCabinetPage() {
  const requests = useQuery({ queryKey: ["viewer-cabinet-requests"], queryFn: () => apiClient.requests("?page=1&page_size=5") });
  const deals = useQuery({ queryKey: ["viewer-cabinet-deals"], queryFn: () => apiClient.deals("?page=1&page_size=5") });
  const audit = useQuery({ queryKey: ["viewer-cabinet-audit"], queryFn: () => apiClient.audit("?page=1&page_size=5") });

  if (requests.isLoading || deals.isLoading || audit.isLoading) return <Card>Loading viewer cabinet...</Card>;
  if (requests.isError || deals.isError || audit.isError) return <Card>Could not load viewer cabinet.</Card>;

  return (
    <div className="space-y-4">
      <Card>
        <h1 className="text-xl font-semibold">Viewer Cabinet</h1>
        <p className="mt-1 text-sm text-slate-300">Read-only oversight view for business stakeholders and external observers.</p>
      </Card>
      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-sm text-slate-300">Requests (read)</p>
          <p className="mt-2 text-3xl font-semibold">{requests.data.total}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-300">Deals (read)</p>
          <p className="mt-2 text-3xl font-semibold">{deals.data.total}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-300">Audit Rows</p>
          <p className="mt-2 text-3xl font-semibold">{audit.data.total}</p>
        </Card>
      </section>
      <Card>
        <div className="mt-1 flex gap-3 text-sm">
          <Link className="text-primary" href="/app/deals">
            Review Deals
          </Link>
          <Link className="text-primary" href="/app/audit">
            Review Audit
          </Link>
        </div>
      </Card>
    </div>
  );
}
