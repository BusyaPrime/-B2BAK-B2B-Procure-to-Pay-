"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { Protected } from "@/components/auth/protected";
import { getRoleCabinetPath } from "@/lib/rbac";
import type { Role } from "@/lib/types";

function RedirectByRole({ role }: { role: Role }) {
  const router = useRouter();
  useEffect(() => {
    router.replace(getRoleCabinetPath(role));
  }, [role, router]);
  return <div className="glass-card p-6 text-sm text-slate-300">Opening your cabinet...</div>;
}

export default function AppIndexPage() {
  return (
    <Protected>
      {(me) => <RedirectByRole role={me.user.role as Role} />}
    </Protected>
  );
}
