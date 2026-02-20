"use client";

import { useQuery } from "@tanstack/react-query";

import { Card } from "@/components/ui/card";
import { apiClient } from "@/lib/api";

export default function SettingsPage() {
  const me = useQuery({ queryKey: ["me"], queryFn: apiClient.me });

  if (me.isLoading) return <Card>Loading settings...</Card>;
  if (me.isError || !me.data) return <Card>Failed to load settings.</Card>;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <h1 className="mb-3 text-xl font-semibold">Organization settings</h1>
        <p className="text-sm text-slate-300">Org name</p>
        <p className="font-medium">{me.data.organization.name}</p>
      </Card>
      <Card>
        <h2 className="mb-3 text-xl font-semibold">Profile</h2>
        <p className="text-sm text-slate-300">Email</p>
        <p>{me.data.user.email}</p>
        <p className="mt-2 text-sm text-slate-300">Role</p>
        <p>{me.data.user.role}</p>
      </Card>
    </div>
  );
}
