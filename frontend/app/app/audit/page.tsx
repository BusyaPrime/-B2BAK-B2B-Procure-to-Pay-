"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiClient } from "@/lib/api";

export default function AuditPage() {
  const [entity, setEntity] = useState("");
  const [action, setAction] = useState("");
  const params = useMemo(() => {
    const q = new URLSearchParams({ page: "1", page_size: "100" });
    if (entity) q.set("entity", entity);
    if (action) q.set("action", action);
    return `?${q.toString()}`;
  }, [entity, action]);
  const audit = useQuery({ queryKey: ["audit", params], queryFn: () => apiClient.audit(params) });

  return (
    <Card>
      <h1 className="mb-4 text-xl font-semibold">Audit log</h1>
      <div className="mb-4 flex gap-3">
        <Input placeholder="Filter entity" value={entity} onChange={(e) => setEntity(e.target.value)} />
        <Input placeholder="Filter action" value={action} onChange={(e) => setAction(e.target.value)} />
      </div>
      {audit.isLoading && <p className="text-sm text-slate-300">Loading audit entries...</p>}
      {audit.isError && <p className="text-sm text-red-300">Failed to load audit log.</p>}
      <div className="overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 bg-background">
            <tr className="text-left text-slate-300">
              <th className="p-2">Action</th>
              <th className="p-2">Entity</th>
              <th className="p-2">Entity ID</th>
              <th className="p-2">At</th>
            </tr>
          </thead>
          <tbody>
            {audit.data?.items.map((a) => (
              <tr key={a.id} className="border-t border-border">
                <td className="p-2">{a.action}</td>
                <td className="p-2">{a.entity}</td>
                <td className="p-2">{a.entity_id.slice(0, 8)}</td>
                <td className="p-2">{new Date(a.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
