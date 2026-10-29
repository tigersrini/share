import Link from "next/link";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import type { Tone } from "@/lib/labels";

export function Card({ children, className = "", pad = true }: { children: ReactNode; className?: string; pad?: boolean }) {
  return <div className={`rounded-xl border border-line bg-surface shadow-sm ${pad ? "p-4 sm:p-5" : ""} ${className}`}>{children}</div>;
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-sm font-semibold text-ink">{children}</h2>
      {action}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Label({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <span className="mb-1 flex items-baseline justify-between text-xs font-medium text-muted">
      <span>{children}</span>
      {hint && <span className="font-normal opacity-80">{hint}</span>}
    </span>
  );
}

const fieldBase =
  "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none transition placeholder:text-muted/60 focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:opacity-60";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className = "", ...rest } = props;
  return <input {...rest} className={`${fieldBase} ${className}`} />;
}
export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className = "", ...rest } = props;
  return <textarea {...rest} className={`${fieldBase} ${className}`} />;
}
export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  const { className = "", ...rest } = props;
  return <select {...rest} className={`${fieldBase} ${className}`} />;
}

/** Label + control wrapper. */
export function Field({ label, hint, children, className = "" }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <Label hint={hint}>{label}</Label>
      {children}
    </label>
  );
}

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost" | "sun";
const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-brand text-white hover:bg-brand-strong disabled:opacity-50",
  sun: "bg-sun text-white hover:brightness-95 disabled:opacity-50",
  secondary: "border border-line bg-surface text-ink hover:bg-surface-2",
  danger: "bg-danger text-white hover:brightness-95",
  ghost: "text-ink hover:bg-surface-2",
};
const buttonBase =
  "inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed whitespace-nowrap";

export function Button(props: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  const { className = "", variant = "primary", ...rest } = props;
  return <button {...rest} className={`${buttonBase} ${buttonVariants[variant]} ${className}`} />;
}

export function LinkButton({
  href,
  children,
  variant = "secondary",
  className = "",
  ...rest
}: {
  href: string;
  children: ReactNode;
  variant?: ButtonVariant;
  className?: string;
  target?: string;
  download?: boolean | string;
}) {
  const cls = `${buttonBase} ${buttonVariants[variant]} ${className}`;
  // API routes (PDF/CSV) must be real navigations, not client-side transitions.
  if (href.startsWith("/api/")) {
    return (
      <a href={href} className={cls} {...rest}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={cls} {...rest}>
      {children}
    </Link>
  );
}

const toneClass: Record<Tone, string> = {
  zinc: "bg-surface-2 text-muted",
  green: "bg-brand-soft text-brand-strong",
  orange: "bg-sun-soft text-sun",
  red: "bg-danger-soft text-danger",
  blue: "bg-info-soft text-info",
  violet: "bg-violet-soft text-violet",
  amber: "bg-amber-soft text-amber",
};

export function Badge({ children, tone = "zinc" }: { children: ReactNode; tone?: Tone }) {
  return <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${toneClass[tone]}`}>{children}</span>;
}

export function StatCard({
  label,
  value,
  sub,
  tone,
  href,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: "green" | "orange" | "red" | "blue";
  href?: string;
}) {
  const accent = tone === "green" ? "text-brand-strong" : tone === "orange" ? "text-sun" : tone === "red" ? "text-danger" : tone === "blue" ? "text-info" : "text-ink";
  const body = (
    <Card className={href ? "h-full transition hover:border-brand/50 hover:shadow" : "h-full"}>
      <div className="text-xs font-medium text-muted">{label}</div>
      <div className={`mt-1 text-2xl font-semibold tracking-tight tabular-nums ${accent}`}>{value}</div>
      {sub && <div className="mt-1 text-xs text-muted">{sub}</div>}
    </Card>
  );
  return href ? (
    <Link href={href} className="block h-full">
      {body}
    </Link>
  ) : (
    body
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="px-4 py-10 text-center text-sm text-muted">{children}</div>;
}

/** Wrapper that lets a wide table scroll horizontally on phones. */
export function TableWrap({ children }: { children: ReactNode }) {
  return <div className="overflow-x-auto">{children}</div>;
}

export function Dl({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="space-y-2 text-sm">
      {items.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-4">
          <dt className="text-muted">{k}</dt>
          <dd className="text-right font-medium">{v || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ProgressBar({ value, tone = "green" }: { value: number; tone?: "green" | "orange" }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
      <div className={`h-full rounded-full ${tone === "green" ? "bg-brand" : "bg-sun"}`} style={{ width: `${pct}%` }} />
    </div>
  );
}
