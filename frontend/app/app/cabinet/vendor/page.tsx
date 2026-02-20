"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { Card } from "@/components/ui/card";
import { apiClient } from "@/lib/api";

export default function VendorCabinetPage() {
  const quotes = useQuery({ queryKey: ["vendor-cabinet-quotes"], queryFn: () => apiClient.quotes("?page=1&page_size=10") });
  const deals = useQuery({ queryKey: ["vendor-cabinet-deals"], queryFn: () => apiClient.deals("?page=1&page_size=10") });

  if (quotes.isLoading || deals.isLoading) return <Card>Loading vendor cabinet...</Card>;
  if (quotes.isError || deals.isError) return <Card>Could not load vendor cabinet.</Card>;

  return (
    <div className="space-y-4">
      <Card>
        <h1 className="text-xl font-semibold">Vendor Cabinet</h1>
        <p className="mt-1 text-sm text-slate-300">Track quote pipeline, watch accepted bids, and deliver active deals.</p>
      </Card>
      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-sm text-slate-300">Submitted Quotes</p>
          <p className="mt-2 text-3xl font-semibold">{quotes.data.total}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-300">Deals In Progress</p>
          <p className="mt-2 text-3xl font-semibold">{deals.data.total}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-300">Quick Actions</p>
          <div className="mt-2 flex gap-2 text-sm">
            <Link className="text-primary" href="/app/quotes">
              Submit Quote
            </Link>
            <Link className="text-primary" href="/app/deals">
              Open Deals
            </Link>
          </div>
        </Card>
      </section>
    </div>
  );
}
