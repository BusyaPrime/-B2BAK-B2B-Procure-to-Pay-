"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiClient } from "@/lib/api";

const schema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  budget_cents: z.coerce.number().int().positive(),
  deadline_date: z.string().min(8),
  tags: z.string().default("")
});

export default function NewRequestPage() {
  const router = useRouter();
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      description: "",
      budget_cents: 100000,
      deadline_date: "",
      tags: "saas,security"
    }
  });

  const mutation = useMutation({
    mutationFn: (values: z.infer<typeof schema>) =>
      apiClient.createRequest({
        ...values,
        tags: values.tags.split(",").map((x) => x.trim()).filter(Boolean),
        currency: "USD"
      }),
    onSuccess: (data) => {
      toast.success("Request created");
      router.push(`/app/requests/${data.id}`);
    },
    onError: (err: Error) => toast.error(err.message)
  });

  return (
    <Card>
      <h1 className="mb-4 text-xl font-semibold">Create new request</h1>
      <form className="grid gap-4 md:grid-cols-2" onSubmit={form.handleSubmit((v) => mutation.mutate(v))}>
        <div className="md:col-span-2">
          <label className="mb-1 block text-sm">Title</label>
          <Input aria-label="Title" {...form.register("title")} />
        </div>
        <div className="md:col-span-2">
          <label className="mb-1 block text-sm">Description</label>
          <textarea aria-label="Description" className="min-h-32 w-full rounded-xl border border-border bg-black/20 px-3 py-2 text-sm" {...form.register("description")} />
        </div>
        <div>
          <label className="mb-1 block text-sm">Budget (cents)</label>
          <Input aria-label="Budget (cents)" type="number" {...form.register("budget_cents")} />
        </div>
        <div>
          <label className="mb-1 block text-sm">Deadline</label>
          <Input aria-label="Deadline" type="date" {...form.register("deadline_date")} />
        </div>
        <div className="md:col-span-2">
          <label className="mb-1 block text-sm">Tags (comma-separated)</label>
          <Input {...form.register("tags")} />
        </div>
        <div className="md:col-span-2">
          <Button disabled={mutation.isPending}>{mutation.isPending ? "Creating..." : "Create draft request"}</Button>
        </div>
      </form>
    </Card>
  );
}
