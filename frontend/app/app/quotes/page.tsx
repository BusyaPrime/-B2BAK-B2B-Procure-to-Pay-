"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiClient } from "@/lib/api";
import { money } from "@/lib/utils";

export default function QuotesPage() {
  const queryClient = useQueryClient();
  const requests = useQuery({ queryKey: ["requests-open"], queryFn: () => apiClient.requests("?status=QUOTING&page=1&page_size=20") });
  const quotes = useQuery({ queryKey: ["quotes"], queryFn: () => apiClient.quotes("?page=1&page_size=50") });
  const [form, setForm] = useState({ request_id: "", amount_cents: "120000", timeline_days: "14", terms: "Standard implementation support." });

  const submit = useMutation({
    mutationFn: () =>
      apiClient.createQuote({
        request_id: form.request_id,
        amount_cents: Number(form.amount_cents),
        timeline_days: Number(form.timeline_days),
        terms: form.terms
      }),
    onSuccess: async () => {
      toast.success("Quote submitted");
      await queryClient.invalidateQueries({ queryKey: ["quotes"] });
    },
    onError: (err: Error) => toast.error(err.message)
  });

  return (
    <div className="space-y-4">
      <Card>
        <h1 className="mb-4 text-xl font-semibold">Submit quote</h1>
        {requests.data?.items.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            <select
              className="h-10 rounded-xl border border-border bg-black/20 px-3 text-sm"
              value={form.request_id}
              onChange={(e) => setForm((prev) => ({ ...prev, request_id: e.target.value }))}
            >
              <option value="">Select request</option>
              {requests.data.items.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title}
                </option>
              ))}
            </select>
            <Input type="number" value={form.amount_cents} onChange={(e) => setForm((p) => ({ ...p, amount_cents: e.target.value }))} />
            <Input type="number" value={form.timeline_days} onChange={(e) => setForm((p) => ({ ...p, timeline_days: e.target.value }))} />
            <Input value={form.terms} onChange={(e) => setForm((p) => ({ ...p, terms: e.target.value }))} />
            <Button disabled={!form.request_id || submit.isPending} onClick={() => submit.mutate()}>
              {submit.isPending ? "Submitting..." : "Submit quote"}
            </Button>
          </div>
        ) : (
          <p className="text-sm text-slate-300">No open requests for quoting.</p>
        )}
      </Card>
      <Card>
        <h2 className="mb-3 text-lg font-semibold">My quotes</h2>
        {quotes.isLoading && <p className="text-sm text-slate-300">Loading quotes...</p>}
        {quotes.isError && <p className="text-sm text-red-300">Failed to load quotes.</p>}
        <div className="space-y-2">
          {quotes.data?.items.map((q) => (
            <div key={q.id} className="rounded-xl border border-border p-3 text-sm">
              <p className="font-medium">{money(q.amount_cents)}</p>
              <p className="text-slate-300">
                {q.status} • {q.timeline_days} days
              </p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
