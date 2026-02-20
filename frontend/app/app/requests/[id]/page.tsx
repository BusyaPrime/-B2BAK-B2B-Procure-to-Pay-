"use client";

import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { apiClient } from "@/lib/api";
import { money } from "@/lib/utils";

export default function RequestDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const requestId = params.id;

  const request = useQuery({ queryKey: ["request", requestId], queryFn: () => apiClient.request(requestId) });
  const quotes = useQuery({ queryKey: ["quotes-by-request", requestId], queryFn: () => apiClient.quotes(`?request_id=${requestId}&page=1&page_size=50`) });

  const refetchAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["request", requestId] }),
      queryClient.invalidateQueries({ queryKey: ["quotes-by-request", requestId] }),
      queryClient.invalidateQueries({ queryKey: ["requests"] })
    ]);
  };

  const publish = useMutation({
    mutationFn: () => apiClient.publishRequest(requestId),
    onSuccess: async () => {
      toast.success("Request published");
      await refetchAll();
    },
    onError: (e: Error) => toast.error(e.message)
  });

  const shortlist = useMutation({
    mutationFn: () => apiClient.shortlistRequest(requestId),
    onSuccess: async () => {
      toast.success("Request shortlisted");
      await refetchAll();
    },
    onError: (e: Error) => toast.error(e.message)
  });

  const award = useMutation({
    mutationFn: (quoteId: string) => apiClient.awardRequest(requestId, quoteId),
    onSuccess: async (data) => {
      toast.success("Quote awarded");
      await refetchAll();
      router.push(`/app/deals/${data.deal_id}`);
    },
    onError: (e: Error) => toast.error(e.message)
  });

  if (request.isLoading) return <Card>Loading request...</Card>;
  if (request.isError || !request.data) return <Card>Request could not be loaded.</Card>;

  return (
    <div className="space-y-4">
      <Card>
        <h1 className="mb-2 text-2xl font-semibold">{request.data.title}</h1>
        <p className="mb-4 text-sm text-slate-300">{request.data.description}</p>
        <div className="flex flex-wrap gap-2 text-sm text-slate-300">
          <span>Status: {request.data.status}</span>
          <span>Budget: {money(request.data.budget_cents, request.data.currency)}</span>
          <span>Deadline: {request.data.deadline_date}</span>
        </div>
        <div className="mt-4 flex gap-2">
          <Button disabled={publish.isPending || request.data.status !== "DRAFT"} onClick={() => publish.mutate()}>
            Publish
          </Button>
          <Button variant="outline" disabled={shortlist.isPending || request.data.status !== "QUOTING"} onClick={() => shortlist.mutate()}>
            Shortlist
          </Button>
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 text-lg font-semibold">Quotes</h2>
        {quotes.isLoading && <p className="text-sm text-slate-300">Loading quotes...</p>}
        {quotes.isError && <p className="text-sm text-red-300">Failed to load quotes.</p>}
        {quotes.data && quotes.data.items.length === 0 && <p className="text-sm text-slate-300">No quotes submitted yet.</p>}
        <div className="space-y-2">
          {quotes.data?.items.map((q) => (
            <div key={q.id} className="rounded-xl border border-border p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{money(q.amount_cents)}</p>
                  <p className="text-xs text-slate-300">
                    {q.timeline_days} days • {q.status}
                  </p>
                </div>
                <ConfirmDialog
                  title="Award quote"
                  description="This action accepts this quote and rejects other quotes for the request."
                  confirmLabel="Award"
                  disabled={request.data.status !== "SHORTLIST"}
                  onConfirm={() => award.mutate(q.id)}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
