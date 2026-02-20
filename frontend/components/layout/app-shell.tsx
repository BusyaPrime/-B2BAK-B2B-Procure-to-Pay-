"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Building2, Briefcase, FileText, Gavel, Home, LogOut, MessageSquare, ScrollText, Settings } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api";
import { getRoleNav } from "@/lib/rbac";
import type { Role } from "@/lib/types";
import { cn } from "@/lib/utils";

const icons = {
  cabinet: Briefcase,
  dashboard: Home,
  requests: FileText,
  quotes: MessageSquare,
  deals: Gavel,
  audit: ScrollText,
  settings: Settings
};

export function AppShell({
  children,
  user
}: {
  children: React.ReactNode;
  user: { email: string; role: Role; organizationName: string };
}) {
  const pathname = usePathname();
  const router = useRouter();
  const nav = getRoleNav(user.role);

  const handleLogout = async () => {
    try {
      await apiClient.logout();
      toast.success("Logged out");
    } catch {
      toast.error("Logout failed, but local session is cleared");
    } finally {
      if (typeof window !== "undefined") {
        window.location.replace("/login");
        return;
      }
      router.replace("/login");
    }
  };

  return (
    <div className="min-h-screen">
      <div className="mx-auto flex max-w-[1400px] gap-5 p-4">
        <aside className="glass-card sticky top-4 h-[calc(100vh-2rem)] w-64 p-4">
          <div className="mb-6 flex items-center gap-2">
            <div className="rounded-xl bg-primary/25 p-2">
              <Building2 className="size-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Platform</p>
              <p className="font-semibold">B2BAK</p>
            </div>
          </div>
          <nav className="space-y-1">
            {nav.map((item) => {
              const Icon = icons[item.icon];
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors duration-150 hover:bg-muted/40",
                    pathname.startsWith(item.href) && "bg-primary/20 text-white"
                  )}
                >
                  <Icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <main className="flex-1">
          <header className="glass-card mb-4 flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Organization</p>
              <select aria-label="Organization switch" className="rounded-lg border border-border bg-black/20 px-2 py-1 text-sm">
                <option>{user.organizationName}</option>
              </select>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right text-sm">
                <p>{user.email}</p>
                <p className="text-xs text-muted-foreground">{user.role}</p>
              </div>
              <Button
                variant="outline"
                onClick={handleLogout}
              >
                <LogOut className="mr-1 size-4" /> Logout
              </Button>
            </div>
          </header>
          {children}
        </main>
      </div>
    </div>
  );
}
