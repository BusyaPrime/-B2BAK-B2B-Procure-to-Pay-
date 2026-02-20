"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { Card } from "@/components/ui/card";
import { apiClient } from "@/lib/api";

export default function DashboardPage() {
  const requests = useQuery({ queryKey: ["requests"], queryFn: () => apiClient.requests("?page=1&page_size=5") });
  const deals = useQuery({ queryKey: ["deals"], queryFn: () => apiClient.deals("?page=1&page_size=5") });

  if (requests.isLoading || deals.isLoading) return <Card>Loading dashboard...</Card>;
  if (requests.isError || deals.isError) return <Card>Failed to load dashboard data.</Card>;

  return (
    <div className="space-y-4">
      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-sm text-slate-300">Total Requests</p>
          <p className="mt-2 text-3xl font-semibold">{requests.data.total}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-300">Active Deals</p>
          <p className="mt-2 text-3xl font-semibold">{deals.data.total}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-300">Conversion</p>
          <p className="mt-2 text-3xl font-semibold">{requests.data.total ? Math.round((deals.data.total / requests.data.total) * 100) : 0}%</p>
        </Card>
      </section>
      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Recent Requests</h2>
            <Link href="/app/requests" className="text-sm text-primary">
              View all
            </Link>
          </div>
          <ul className="space-y-2">
            {requests.data.items.length === 0 && <li className="text-sm text-slate-300">No requests yet.</li>}
            {requests.data.items.map((r) => (
              <li key={r.id} className="rounded-xl border border-border p-3">
                <p className="font-medium">{r.title}</p>
                <p className="text-xs text-slate-300">{r.status}</p>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Active Deals</h2>
            <Link href="/app/deals" className="text-sm text-primary">
              View all
            </Link>
          </div>
          <ul className="space-y-2">
            {deals.data.items.length === 0 && <li className="text-sm text-slate-300">No deals yet.</li>}
            {deals.data.items.map((d) => (
              <li key={d.id} className="rounded-xl border border-border p-3">
                <p className="font-medium">Deal {d.id.slice(0, 8)}</p>
                <p className="text-xs text-slate-300">{d.status}</p>
              </li>
            ))}
          </ul>
        </Card>
      </section>
    </div>
  );
}
