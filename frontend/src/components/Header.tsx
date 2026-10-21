"use client";

import clsx from "clsx";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { Logo } from "./Logo";

const NAV = [
  { href: "/scan", label: "Scan" },
  { href: "/history", label: "History" },
  { href: "/about", label: "About" },
  { href: "/safety", label: "Safety" },
  { href: "/feedback", label: "Feedback" },
];

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { user, logout, loading } = useAuth();

  useEffect(() => setOpen(false), [pathname]);

  const link = (href: string, label: string) => {
    const active = pathname === href || pathname.startsWith(href + "/");
    return (
      <Link
        key={href}
        href={href}
        aria-current={active ? "page" : undefined}
        className={clsx(
          "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          active ? "bg-brand-100 text-brand-900" : "text-ink-soft hover:bg-brand-50 hover:text-ink",
        )}
      >
        {label}
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" aria-label="LegitiScan AI home"><Logo className="text-lg" /></Link>

        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {NAV.map((n) => link(n.href, n.label))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {!loading && (user ? (
            <>
              <span className="max-w-[160px] truncate text-sm text-ink-soft" title={user.email}>{user.name || user.email}</span>
              <button onClick={logout} className="rounded-lg px-3 py-2 text-sm font-medium text-ink-soft hover:bg-brand-50">Sign out</button>
            </>
          ) : (
            <>
              <Link href="/login" className="rounded-lg px-3 py-2 text-sm font-medium text-ink-soft hover:bg-brand-50">Sign in</Link>
              <Link href="/register" className="rounded-xl bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800">Create account</Link>
            </>
          ))}
        </div>

        <button
          className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-brand-50 md:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X className="h-6 w-6" aria-hidden /> : <Menu className="h-6 w-6" aria-hidden />}
        </button>
      </div>

      {open && (
        <nav id="mobile-menu" aria-label="Mobile" className="border-t border-zinc-200 bg-white px-4 pb-4 pt-2 md:hidden">
          <div className="flex flex-col gap-1">{NAV.map((n) => link(n.href, n.label))}</div>
          <div className="mt-3 flex flex-col gap-2 border-t border-zinc-100 pt-3">
            {user ? (
              <button onClick={logout} className="rounded-lg px-3 py-2 text-left text-sm font-medium text-ink-soft hover:bg-brand-50">
                Sign out ({user.name || user.email})
              </button>
            ) : (
              <>
                <Link href="/login" className="rounded-lg px-3 py-2 text-sm font-medium text-ink-soft hover:bg-brand-50">Sign in</Link>
                <Link href="/register" className="rounded-xl bg-brand-700 px-4 py-2.5 text-center text-sm font-semibold text-white">Create account</Link>
              </>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
