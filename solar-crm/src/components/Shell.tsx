"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import Icon from "./Icon";

interface NavItem {
  href: string;
  label: string;
  icon: string;
  adminOnly?: boolean;
}
const OFFICE_GROUPS: { title: string; items: NavItem[] }[] = [
  { title: "", items: [{ href: "/", label: "Dashboard", icon: "home" }] },
  {
    title: "Sales",
    items: [
      { href: "/customers", label: "Leads & Customers", icon: "users" },
      { href: "/pipeline", label: "Pipeline", icon: "funnel" },
      { href: "/calculator", label: "Solar Calculator", icon: "calc" },
      { href: "/quotes", label: "Quotations", icon: "file" },
    ],
  },
  {
    title: "Field team",
    items: [
      { href: "/sites", label: "Sites", icon: "pin" },
      { href: "/schedule", label: "Schedule", icon: "calendar" },
      { href: "/team", label: "Team", icon: "crew" },
    ],
  },
  {
    title: "Operations",
    items: [
      { href: "/projects", label: "Projects", icon: "hammer" },
      { href: "/inventory", label: "Inventory", icon: "box" },
    ],
  },
  {
    title: "Finance",
    items: [
      { href: "/invoices", label: "Invoices", icon: "invoice" },
      { href: "/expenses", label: "Expenses", icon: "wallet" },
      { href: "/finance", label: "Cost & Profit", icon: "chart" },
    ],
  },
  { title: "Admin", items: [{ href: "/settings", label: "Settings", icon: "cog" }] },
];

const FIELD_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "",
    items: [
      { href: "/my", label: "My jobs", icon: "briefcase" },
      { href: "/sites", label: "Sites", icon: "pin" },
      { href: "/schedule", label: "Schedule", icon: "calendar" },
      { href: "/account", label: "My account", icon: "cog" },
    ],
  },
];

/** The four shortcuts pinned to the bottom of a phone screen (a fifth button opens the full menu). */
const OFFICE_TABS: NavItem[] = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/sites", label: "Sites", icon: "pin" },
  { href: "/schedule", label: "Schedule", icon: "calendar" },
  { href: "/customers", label: "Leads", icon: "users" },
];
const FIELD_TABS: NavItem[] = [
  { href: "/my", label: "My jobs", icon: "briefcase" },
  { href: "/sites", label: "Sites", icon: "pin" },
  { href: "/schedule", label: "Schedule", icon: "calendar" },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export default function Shell({ userName, role, children }: { userName: string; role: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const field = role === "FIELD";
  const GROUPS = field ? FIELD_GROUPS : OFFICE_GROUPS;
  const tabs = field ? FIELD_TABS : OFFICE_TABS;

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const nav = (
    <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
      {GROUPS.map((g) => (
        <div key={g.title || "top"}>
          {g.title && <div className="mb-1.5 px-3 text-[0.68rem] font-semibold uppercase tracking-wider text-muted">{g.title}</div>}
          <ul className="space-y-0.5">
            {g.items.map((it) => {
              const active = isActive(pathname, it.href);
              return (
                <li key={it.href}>
                  <Link
                    href={it.href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                      active ? "bg-brand-soft text-brand-strong" : "text-ink/80 hover:bg-surface-2"
                    }`}
                  >
                    <Icon name={it.icon} className="h-[1.15rem] w-[1.15rem] shrink-0" />
                    {it.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  const account = (
    <div className="border-t border-line p-3">
      <div className="flex items-center justify-between gap-2 px-2">
        <Link href="/account" onClick={() => setOpen(false)} className="min-w-0">
          <div className="truncate text-sm font-medium">{userName}</div>
          <div className="text-xs text-muted">{role === "ADMIN" ? "Admin" : role === "FIELD" ? "Field crew" : "Staff"}</div>
        </Link>
        <button onClick={logout} title="Sign out" className="rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-ink">
          <Icon name="logout" className="h-4 w-4" />
        </button>
      </div>
    </div>
  );

  const brand = (
    <Link href={field ? "/my" : "/"} className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
      <Image src="/logo.png" alt="" width={40} height={33} className="h-8 w-auto" />
      <span className="leading-tight">
        <span className="block text-sm font-bold text-brand-strong">SANACARA</span>
        <span className="block text-[0.7rem] font-medium uppercase tracking-wide text-muted">Solar CRM</span>
      </span>
    </Link>
  );

  return (
    <div className="min-h-dvh lg:pl-60">
      {/* Desktop sidebar */}
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-line bg-surface lg:flex">
        <div className="px-5 pt-5">{brand}</div>
        {nav}
        {account}
      </aside>

      {/* Mobile top bar */}
      <header className="no-print sticky top-0 z-30 flex items-center justify-between border-b border-line bg-surface/95 px-4 py-2.5 backdrop-blur lg:hidden">
        {brand}
        <button onClick={() => setOpen(true)} aria-label="Open menu" className="rounded-lg p-2 hover:bg-surface-2">
          <Icon name="menu" />
        </button>
      </header>

      {/* Mobile drawer */}
      {open && (
        <div className="no-print fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col bg-surface shadow-xl">
            <div className="flex items-center justify-between px-5 pt-4">
              {brand}
              <button onClick={() => setOpen(false)} aria-label="Close menu" className="rounded-lg p-2 hover:bg-surface-2">
                <Icon name="x" />
              </button>
            </div>
            {nav}
            {account}
          </aside>
        </div>
      )}

      <main className="mx-auto w-full max-w-7xl px-4 pb-28 pt-5 sm:px-6 sm:py-7 lg:pb-7">{children}</main>

      {/* Phone: bottom tab bar */}
      <nav className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden" aria-label="Main">
        <ul className="mx-auto flex max-w-lg">
          {tabs.map((t) => {
            const active = isActive(pathname, t.href);
            return (
              <li key={t.href} className="flex-1">
                <Link href={t.href} className={`flex flex-col items-center gap-0.5 py-2 text-[0.68rem] font-medium ${active ? "text-brand-strong" : "text-muted"}`}>
                  <span className={`rounded-full px-4 py-1 ${active ? "bg-brand-soft" : ""}`}><Icon name={t.icon} className="h-5 w-5" /></span>
                  {t.label}
                </Link>
              </li>
            );
          })}
          <li className="flex-1">
            <button onClick={() => setOpen(true)} className="flex w-full flex-col items-center gap-0.5 py-2 text-[0.68rem] font-medium text-muted">
              <span className="px-4 py-1"><Icon name="menu" className="h-5 w-5" /></span>
              Menu
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
}
