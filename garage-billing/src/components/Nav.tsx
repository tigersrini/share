"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const links = [
  { href: "/", label: "Dashboard", icon: IconHome },
  { href: "/inventory", label: "Inventory", icon: IconBox },
  { href: "/customers", label: "Customers", icon: IconUsers },
  { href: "/jobcards", label: "Job Cards", icon: IconClipboard },
];

const desktopExtraLinks = [{ href: "/reports", label: "Reports" }];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Nav({ userName, isAdmin }: { userName?: string; isAdmin?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/95 backdrop-blur dark:border-zinc-800 dark:bg-black/95">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5 sm:py-3">
          <Link href="/" className="flex min-w-0 items-center gap-2">
            <span className="relative h-8 w-20 shrink-0 overflow-hidden rounded-md bg-black sm:h-9 sm:w-24">
              <Image
                src="/sparks-logo.png"
                alt="Sparks Racing and Garage logo"
                fill
                sizes="96px"
                className="object-contain"
                priority
              />
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                Sparks Racing &amp; Garage
              </span>
              <span className="hidden text-xs text-zinc-500 lg:block dark:text-zinc-400">
                Inventory &amp; Billing
              </span>
            </span>
          </Link>

          {/* Desktop / tablet nav */}
          <nav className="hidden shrink-0 items-center gap-0.5 overflow-x-auto sm:flex md:gap-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`shrink-0 whitespace-nowrap rounded-md px-2 py-2 text-sm font-medium md:px-3 ${
                  isActive(pathname, l.href)
                    ? "bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
                    : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-900"
                }`}
              >
                {l.label}
              </Link>
            ))}
            {desktopExtraLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`shrink-0 whitespace-nowrap rounded-md px-2 py-2 text-sm font-medium md:px-3 ${
                  isActive(pathname, l.href)
                    ? "bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
                    : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-900"
                }`}
              >
                {l.label}
              </Link>
            ))}
            <Link
              href="/jobcards/new"
              className="ml-1 shrink-0 whitespace-nowrap rounded-md bg-orange-600 px-2 py-2 text-sm font-semibold text-white hover:bg-orange-700 md:px-3"
            >
              + New Job Card
            </Link>
            {userName && (
              <>
                {isAdmin && (
                  <Link
                    href="/staff"
                    className="ml-1 hidden shrink-0 whitespace-nowrap rounded-md px-2 py-2 text-sm font-medium text-zinc-500 hover:bg-zinc-100 md:ml-2 md:block md:px-3 dark:text-zinc-400 dark:hover:bg-zinc-900"
                  >
                    Staff
                  </Link>
                )}
                <Link
                  href="/account"
                  className="hidden shrink-0 whitespace-nowrap rounded-md px-2 py-2 text-sm font-medium text-zinc-500 hover:bg-zinc-100 md:block md:px-3 dark:text-zinc-400 dark:hover:bg-zinc-900"
                >
                  Account
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="shrink-0 whitespace-nowrap rounded-md px-2 py-2 text-sm font-medium text-zinc-500 hover:bg-zinc-100 md:px-3 dark:text-zinc-400 dark:hover:bg-zinc-900"
                  title={`Signed in as ${userName}`}
                >
                  Log out
                </button>
              </>
            )}
          </nav>

          {/* Mobile: menu toggle */}
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-md text-zinc-700 hover:bg-zinc-100 sm:hidden dark:text-zinc-200 dark:hover:bg-zinc-900"
            aria-label="Menu"
          >
            {userName ? (
              <span className="grid h-8 w-8 place-items-center rounded-full bg-orange-100 text-sm font-semibold text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">
                {userName.charAt(0).toUpperCase()}
              </span>
            ) : (
              <IconMenu className="h-6 w-6" />
            )}
          </button>
        </div>

        {/* Mobile dropdown menu (user info + logout only; primary nav is the bottom tab bar) */}
        {menuOpen && (
          <div className="space-y-1 border-t border-zinc-200 bg-white px-4 py-3 sm:hidden dark:border-zinc-800 dark:bg-black">
            {userName && (
              <p className="mb-2 text-sm text-zinc-500 dark:text-zinc-400">Signed in as {userName}</p>
            )}
            <Link
              href="/reports"
              onClick={() => setMenuOpen(false)}
              className="block w-full rounded-md px-3 py-2.5 text-left text-sm font-medium text-zinc-800 hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-900"
            >
              Reports
            </Link>
            <Link
              href="/account"
              onClick={() => setMenuOpen(false)}
              className="block w-full rounded-md px-3 py-2.5 text-left text-sm font-medium text-zinc-800 hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-900"
            >
              My account
            </Link>
            {isAdmin && (
              <Link
                href="/staff"
                onClick={() => setMenuOpen(false)}
                className="block w-full rounded-md px-3 py-2.5 text-left text-sm font-medium text-zinc-800 hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-900"
              >
                Staff accounts
              </Link>
            )}
            <button
              type="button"
              onClick={handleLogout}
              className="w-full rounded-md bg-zinc-100 px-3 py-2.5 text-left text-sm font-medium text-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
            >
              Log out
            </button>
          </div>
        )}
      </header>

      {/* Mobile bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-zinc-200 bg-white/95 backdrop-blur pb-[env(safe-area-inset-bottom)] sm:hidden dark:border-zinc-800 dark:bg-black/95">
        <div className="grid grid-cols-5">
          {links.map((l) => {
            const Icon = l.icon;
            const active = isActive(pathname, l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${
                  active ? "text-orange-600 dark:text-orange-400" : "text-zinc-500 dark:text-zinc-400"
                }`}
              >
                <Icon className="h-5 w-5" />
                {l.label}
              </Link>
            );
          })}
          <Link href="/jobcards/new" className="flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-orange-600 dark:text-orange-400">
            <IconPlusCircle className="h-5 w-5" />
            New
          </Link>
        </div>
      </nav>
    </>
  );
}

type IconProps = { className?: string };

function IconHome({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M3 11.5 12 4l9 7.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 10v9a1 1 0 0 0 1 1h4v-5h4v5h4a1 1 0 0 0 1-1v-9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconBox({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M21 8 12 3 3 8l9 5 9-5Z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 8v8l9 5 9-5V8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 13v8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconUsers({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M2.8 19.5c0-3.2 2.7-5.6 6.2-5.6s6.2 2.4 6.2 5.6" strokeLinecap="round" />
      <circle cx="17" cy="8.5" r="2.6" />
      <path d="M15.7 14.2c2.6.4 4.5 2.4 4.5 5.3" strokeLinecap="round" />
    </svg>
  );
}

function IconClipboard({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <rect x="9" y="2.5" width="6" height="3.5" rx="1" />
      <path d="M8.5 12h7M8.5 16h5" strokeLinecap="round" />
    </svg>
  );
}

function IconPlusCircle({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v8M8 12h8" strokeLinecap="round" />
    </svg>
  );
}

function IconMenu({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
    </svg>
  );
}
