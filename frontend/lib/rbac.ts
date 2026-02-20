import type { Role } from "@/lib/types";

type NavItem = {
  href: string;
  label: string;
  icon: "cabinet" | "dashboard" | "requests" | "quotes" | "deals" | "audit" | "settings";
};

export function getRoleCabinetPath(role: Role): string {
  switch (role) {
    case "BUYER":
      return "/cabinet/buyer";
    case "VENDOR":
      return "/cabinet/vendor";
    case "ORG_OWNER":
    case "ADMIN":
      return "/cabinet/admin";
    case "VIEWER":
      return "/cabinet/viewer";
    default:
      return "/dashboard";
  }
}

const base: NavItem[] = [{ href: "/dashboard", label: "Dashboard", icon: "dashboard" }];

const full: NavItem[] = [
  ...base,
  { href: "/marketplace/requests", label: "Requests", icon: "requests" },
  { href: "/marketplace/deals", label: "Deals", icon: "deals" }
];

export function getRoleNav(role: Role): NavItem[] {
  const cabinet = { href: getRoleCabinetPath(role), label: "My Cabinet", icon: "cabinet" as const };

  if (role === "VIEWER") {
    return [cabinet, ...base, { href: "/marketplace/deals", label: "Deals", icon: "deals" }, { href: "/marketplace/requests", label: "Requests", icon: "requests" }];
  }
  if (role === "VENDOR") {
    return [cabinet, ...base, { href: "/marketplace/requests", label: "Requests", icon: "requests" }, { href: "/marketplace/deals", label: "Deals", icon: "deals" }];
  }
  if (role === "BUYER") {
    return [cabinet, ...base, { href: "/marketplace/requests", label: "Requests", icon: "requests" }, { href: "/marketplace/deals", label: "Deals", icon: "deals" }];
  }
  return [cabinet, ...full];
}

export function hasAnyRole(role: Role, allowed: Role[]): boolean {
  return allowed.includes(role);
}
