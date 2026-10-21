import clsx from "clsx";
import { AlertTriangle, CheckCircle2, Info, Loader2, XCircle } from "lucide-react";
import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const variants: Record<Variant, string> = {
  primary: "bg-brand-700 text-white hover:bg-brand-800 disabled:bg-brand-300",
  secondary: "bg-white text-ink ring-1 ring-inset ring-zinc-300 hover:bg-zinc-50 disabled:text-zinc-400",
  ghost: "text-brand-800 hover:bg-brand-50 disabled:text-zinc-400",
  danger: "bg-rose-700 text-white hover:bg-rose-800 disabled:bg-rose-300",
};

const base =
  "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed";

export function Button({
  variant = "primary", loading, className, children, disabled, ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean }) {
  return (
    <button type="button" className={clsx(base, variants[variant], className)} disabled={disabled || loading} {...rest}>
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export function ButtonLink({ href, variant = "primary", className, children }: {
  href: string; variant?: Variant; className?: string; children: ReactNode;
}) {
  return (
    <Link href={href} className={clsx(base, variants[variant], className)}>
      {children}
    </Link>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={clsx("rounded-2xl border border-zinc-200 bg-white p-5 shadow-card sm:p-6", className)}>{children}</div>;
}

const alertStyles = {
  info: { box: "border-sky-200 bg-sky-50 text-sky-950", Icon: Info },
  success: { box: "border-emerald-200 bg-emerald-50 text-emerald-950", Icon: CheckCircle2 },
  warning: { box: "border-amber-300 bg-amber-50 text-amber-950", Icon: AlertTriangle },
  error: { box: "border-rose-300 bg-rose-50 text-rose-950", Icon: XCircle },
};

export function Alert({ tone = "info", title, children, className }: {
  tone?: keyof typeof alertStyles; title?: string; children?: ReactNode; className?: string;
}) {
  const { box, Icon } = alertStyles[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={clsx("flex gap-3 rounded-xl border p-4 text-sm", box, className)}>
      <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
      <div className="min-w-0 space-y-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className="leading-relaxed">{children}</div>}
      </div>
    </div>
  );
}

export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-3 py-12 text-ink-soft">
      <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
      <span>{label}…</span>
    </div>
  );
}

export function PageShell({ title, intro, children, narrow }: {
  title: string; intro?: string; children: ReactNode; narrow?: boolean;
}) {
  return (
    <div className={clsx("mx-auto w-full px-4 py-10 sm:px-6 sm:py-14", narrow ? "max-w-3xl" : "max-w-6xl")}>
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
      {intro && <p className="mt-3 max-w-2xl text-lg text-ink-soft">{intro}</p>}
      <div className="mt-8">{children}</div>
    </div>
  );
}

export const inputClass =
  "block w-full min-h-[44px] rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-base text-ink placeholder:text-zinc-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-300";

export function Field({ label, htmlFor, hint, children }: { label: string; htmlFor: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-ink-mute">{hint}</p>}
    </div>
  );
}
