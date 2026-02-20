"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiClient } from "@/lib/api";
import { money } from "@/lib/utils";

export default function RequestsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const params = useMemo(() => {
    const q = new URLSearchParams({ page: "1", page_size: "50" });
    if (search) q.set("search", search);
    if (status) q.set("status", status);
    return `?${q.toString()}`;
  }, [search, status]);
  const requests = useQuery({ queryKey: ["requests", params], queryFn: () => apiClient.requests(params) });

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input placeholder="Search requests..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
        <select className="h-10 rounded-xl border border-border bg-black/20 px-3 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {["DRAFT", "QUOTING", "SHORTLIST", "AWARDED", "CLOSED"].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <Link href="/app/requests/new" className="ml-auto rounded-xl bg-primary px-4 py-2 text-sm font-medium">
          New Request
        </Link>
      </div>
      {requests.isLoading && <p className="text-sm text-slate-300">Loading requests...</p>}
      {requests.isError && <p className="text-sm text-red-300">Failed to load requests.</p>}
      {requests.data && requests.data.items.length === 0 && <p className="text-sm text-slate-300">No requests found.</p>}
      {requests.data && requests.data.items.length > 0 && (
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 bg-background">
              <tr className="text-left text-slate-300">
                <th className="p-2">Title</th>
                <th className="p-2">Budget</th>
                <th className="p-2">Status</th>
                <th className="p-2">Deadline</th>
              </tr>
            </thead>
            <tbody>
              {requests.data.items.map((r) => (
                <tr key={r.id} className="border-t border-border hover:bg-muted/20">
                  <td className="p-2">
                    <Link href={`/app/requests/${r.id}`} className="text-primary">
                      {r.title}
                    </Link>
                  </td>
                  <td className="p-2">{money(r.budget_cents, r.currency)}</td>
                  <td className="p-2">{r.status}</td>
                  <td className="p-2">{r.deadline_date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
