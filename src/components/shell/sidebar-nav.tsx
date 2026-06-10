"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ScrollText,
  BookMarked,
  ShieldAlert,
  Map,
  History,
  Network,
  Users,
  ListChecks,
  CalendarClock,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_GROUPS = [
  {
    label: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/delegations/mine", label: "My delegations", icon: CheckCircle2 },
      { href: "/policies/mine", label: "My policies", icon: ListChecks },
    ],
  },
  {
    label: "Governance",
    items: [
      { href: "/delegations", label: "Delegations", icon: ScrollText },
      { href: "/delegations/register", label: "Register", icon: ListChecks },
      { href: "/policies", label: "Policies", icon: BookMarked },
      { href: "/reviews", label: "Reviews", icon: CalendarClock },
    ],
  },
  {
    label: "Risk",
    items: [{ href: "/risk", label: "Risk registers", icon: ShieldAlert }],
  },
  {
    label: "Planning",
    items: [{ href: "/planning", label: "IP&R planning", icon: Map }],
  },
  {
    label: "Administration",
    items: [
      { href: "/settings/organisation", label: "Organisation", icon: Network },
      { href: "/settings/members", label: "Members", icon: Users },
      { href: "/audit", label: "Audit log", icon: History },
    ],
  },
];

const ALL_HREFS = NAV_GROUPS.flatMap((group) => group.items.map((item) => item.href));

// Longest-prefix wins so /delegations/register lights up Register, not Delegations
function isActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  if (!pathname.startsWith(`${href}/`)) return false;
  return !ALL_HREFS.some(
    (other) =>
      other !== href &&
      other.length > href.length &&
      (pathname === other || pathname.startsWith(`${other}/`))
  );
}

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
      {NAV_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="px-3 pb-1 text-[11px] font-medium uppercase tracking-wider text-sidebar-foreground/60">
            {group.label}
          </p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm transition-colors",
                      active
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                    )}
                  >
                    <item.icon className="size-4 shrink-0" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
