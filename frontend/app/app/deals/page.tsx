"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { Card } from "@/components/ui/card";
import { apiClient } from "@/lib/api";

export default function DealsPage() {
  const deals = useQuery({ queryKey: ["deals"], queryFn: () => apiClient.deals("?page=1&page_size=50") });

  return (
    <Card>
      <h1 className="mb-4 text-xl font-semibold">Deals</h1>
      {deals.isLoading && <p className="text-sm text-slate-300">Loading deals...</p>}
      {deals.isError && <p className="text-sm text-red-300">Failed to load deals.</p>}
      {deals.data && deals.data.items.length === 0 && <p className="text-sm text-slate-300">No deals found.</p>}
      <div className="space-y-2">
        {deals.data?.items.map((d) => (
          <Link key={d.id} href={`/app/deals/${d.id}`} className="block rounded-xl border border-border p-3 hover:bg-muted/30">
            <p className="font-medium">Deal {d.id.slice(0, 8)}</p>
            <p className="text-xs text-slate-300">{d.status}</p>
          </Link>
        ))}
      </div>
    </Card>
  );
}
