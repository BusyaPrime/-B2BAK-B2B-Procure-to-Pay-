"use client";

import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { apiClient } from "@/lib/api";
import { money } from "@/lib/utils";

export default function DealDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const [message, setMessage] = useState("");
  const [invoiceAmountCents, setInvoiceAmountCents] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const deal = useQuery({ queryKey: ["deal", id], queryFn: () => apiClient.deal(id) });
  const messages = useQuery({ queryKey: ["deal-messages", id], queryFn: () => apiClient.messages(id) });
  const invoice = useMutation({
    mutationFn: () => apiClient.createInvoice(id),
    onSuccess: (data) => {
      setInvoiceAmountCents(data.amount_cents);
      toast.success("Invoice created");
    },
    onError: (e: Error) => toast.error(e.message)
  });
  const markPaid = useMutation({
    mutationFn: () => apiClient.markPaid(id),
    onSuccess: async () => {
      toast.success("Deal marked paid");
      await queryClient.invalidateQueries({ queryKey: ["deal", id] });
    },
    onError: (e: Error) => toast.error(e.message)
  });
  const sendMessage = useMutation({
    mutationFn: () => apiClient.postMessage(id, message),
    onSuccess: async () => {
      setMessage("");
      await queryClient.invalidateQueries({ queryKey: ["deal-messages", id] });
    },
    onError: (e: Error) => toast.error(e.message)
  });

  if (deal.isLoading) return <Card>Loading deal...</Card>;
  if (deal.isError || !deal.data) return <Card>Failed to load deal.</Card>;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <h1 className="mb-2 text-xl font-semibold">Deal Timeline</h1>
        <p className="text-sm text-slate-300">Status: {deal.data.status}</p>
        <div className="mt-4 flex gap-2">
          <Button variant="outline" disabled={invoice.isPending} onClick={() => invoice.mutate()}>
            {invoice.isPending ? "Creating..." : "Create Invoice"}
          </Button>
          <ConfirmDialog
            title="Mark deal as paid"
            description="This demo action updates invoice and deal statuses to PAID."
            confirmLabel={markPaid.isPending ? "Updating..." : "Mark Paid"}
            disabled={markPaid.isPending}
            onConfirm={() => markPaid.mutate()}
          />
        </div>
      </Card>
      <Card>
        <h2 className="mb-2 font-semibold">Invoice panel</h2>
        <p className="text-sm text-slate-300">Invoice amount is sourced from winning quote.</p>
        <p className="mt-2 text-sm">{invoiceAmountCents !== null ? money(invoiceAmountCents) : "Create invoice to view amount"}</p>
      </Card>
      <Card className="lg:col-span-3">
        <h2 className="mb-3 text-lg font-semibold">Messages</h2>
        <div className="mb-3 max-h-72 space-y-2 overflow-auto">
          {messages.isLoading && <p className="text-sm text-slate-300">Loading messages...</p>}
          {messages.isError && <p className="text-sm text-red-300">Failed to load messages.</p>}
          {messages.data?.map((m) => (
            <div key={m.id} className="rounded-xl border border-border p-3">
              <p className="text-sm">{m.body}</p>
              <p className="text-xs text-slate-300">{new Date(m.created_at).toLocaleString()}</p>
            </div>
          ))}
          {messages.data?.length === 0 && <p className="text-sm text-slate-300">No messages yet.</p>}
        </div>
        <div className="flex gap-2">
          <Input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Send message..." />
          <Button disabled={!message || sendMessage.isPending} onClick={() => sendMessage.mutate()}>
            Send
          </Button>
        </div>
      </Card>
    </div>
  );
}
