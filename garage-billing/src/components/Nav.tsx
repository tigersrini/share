import Image from "next/image";
import Link from "next/link";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/inventory", label: "Inventory" },
  { href: "/customers", label: "Customers" },
  { href: "/jobcards", label: "Job Cards" },
];

export default function Nav() {
  return (
    <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-black">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="relative grid h-10 w-10 place-items-center overflow-hidden rounded-md bg-black">
            <Image
              src="/sparks-logo.jpg"
              alt="Sparks Racing and Garage logo"
              fill
              sizes="40px"
              className="object-cover"
              priority
            />
          </span>
          <span className="leading-tight">
            <span className="block text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Sparks Racing &amp; Garage
            </span>
            <span className="block text-xs text-zinc-500 dark:text-zinc-400">
              Inventory &amp; Billing
            </span>
          </span>
        </Link>
        <nav className="flex flex-wrap items-center gap-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-900"
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/jobcards/new"
            className="ml-1 rounded-md bg-orange-600 px-3 py-2 text-sm font-semibold text-white hover:bg-orange-700"
          >
            + New Job Card
          </Link>
        </nav>
      </div>
    </header>
  );
}
