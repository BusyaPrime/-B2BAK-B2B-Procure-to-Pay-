"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { Card } from "@/components/ui/card";
import { apiClient } from "@/lib/api";

export default function BuyerCabinetPage() {
  const requests = useQuery({ queryKey: ["buyer-cabinet-requests"], queryFn: () => apiClient.requests("?page=1&page_size=5") });
  const deals = useQuery({ queryKey: ["buyer-cabinet-deals"], queryFn: () => apiClient.deals("?page=1&page_size=5") });

  if (requests.isLoading || deals.isLoading) return <Card>Loading buyer cabinet...</Card>;
  if (requests.isError || deals.isError) return <Card>Could not load buyer cabinet.</Card>;

  return (
    <div className="space-y-4">
      <Card>
        <h1 className="text-xl font-semibold">Buyer Cabinet</h1>
        <p className="mt-1 text-sm text-slate-300">Create procurement requests, shortlist vendor quotes, and move awarded work to deals.</p>
      </Card>
      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-sm text-slate-300">Open Requests</p>
          <p className="mt-2 text-3xl font-semibold">{requests.data.total}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-300">Active Deals</p>
          <p className="mt-2 text-3xl font-semibold">{deals.data.total}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-300">Quick Actions</p>
          <div className="mt-2 flex gap-2 text-sm">
            <Link className="text-primary" href="/app/requests/new">
              New Request
            </Link>
            <Link className="text-primary" href="/app/requests">
              Manage
            </Link>
          </div>
        </Card>
      </section>
    </div>
  );
}
