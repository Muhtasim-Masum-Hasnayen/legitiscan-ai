"use client";

import clsx from "clsx";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AuthedImage } from "@/components/AuthedImage";
import { VerdictBadge } from "@/components/VerdictBadge";
import { Alert, Button, ButtonLink, Card, PageShell, Spinner } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { ScanList, Verdict } from "@/lib/types";
import { formatDate, formatScore, VERDICTS } from "@/lib/verdict";

const PAGE_SIZE = 10;
type Filter = Verdict | "all";

export default function HistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const [filter, setFilter] = useState<Filter>("all");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ScanList | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    setData(null);
    setError(null);
    api.listScans(page, PAGE_SIZE, filter === "all" ? undefined : filter)
      .then((d) => !cancelled && setData(d))
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => { cancelled = true; };
  }, [page, filter, authLoading, user]);

  const pages = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1;
  const filters: { id: Filter; label: string }[] = [
    { id: "all", label: "All" },
    ...(Object.keys(VERDICTS) as Verdict[]).map((v) => ({ id: v, label: VERDICTS[v].label })),
  ];

  return (
    <PageShell title="Scan history" intro={user ? "Your saved scans." : "Scans from this browser. Create an account to keep them across devices."}>
      <div role="group" aria-label="Filter by result" className="mb-6 flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.id}
            aria-pressed={filter === f.id}
            onClick={() => { setFilter(f.id); setPage(1); }}
            className={clsx("min-h-[40px] rounded-full px-4 text-sm font-medium ring-1 ring-inset transition-colors",
              filter === f.id ? "bg-brand-700 text-white ring-brand-700" : "bg-white text-ink-soft ring-zinc-300 hover:bg-brand-50")}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && <Alert tone="error" title="Could not load history">{error}</Alert>}
      {!data && !error && <Spinner label="Loading history" />}

      {data && data.items.length === 0 && (
        <Card className="text-center">
          <p className="font-semibold">{filter === "all" ? "No scans yet" : "No scans with this result"}</p>
          <p className="mt-1 text-sm text-ink-soft">Your analysed products will appear here.</p>
          <div className="mt-4"><ButtonLink href="/scan">Scan a product</ButtonLink></div>
        </Card>
      )}

      {data && data.items.length > 0 && (
        <>
          <ul className="space-y-3">
            {data.items.map((s) => (
              <li key={s.id}>
                <Link href={`/report/${s.id}`} className="flex items-center gap-4 rounded-2xl border border-zinc-200 bg-white p-3 shadow-card transition-colors hover:border-brand-300 sm:p-4">
                  {s.image_count > 0 && s.status === "completed" ? (
                    <AuthedImage scanId={s.id} position={0} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover sm:h-20 sm:w-20" />
                  ) : <div className="h-16 w-16 shrink-0 rounded-xl bg-zinc-100 sm:h-20 sm:w-20" aria-hidden />}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <VerdictBadge verdict={s.verdict} />
                      <span className="text-xs text-ink-mute">Score {formatScore(s.authenticity_score)}</span>
                    </div>
                    <p className="mt-1 truncate text-sm font-medium">{[s.brand_hint, s.product_hint].filter(Boolean).join(" · ") || "Untitled scan"}</p>
                    <p className="text-xs text-ink-mute">{formatDate(s.created_at)} · {s.image_count} photo(s)</p>
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-zinc-400" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>

          {pages > 1 && (
            <nav aria-label="Pagination" className="mt-6 flex items-center justify-between">
              <Button variant="secondary" onClick={() => setPage((p) => p - 1)} disabled={page <= 1}>Previous</Button>
              <span className="text-sm text-ink-soft">Page {page} of {pages}</span>
              <Button variant="secondary" onClick={() => setPage((p) => p + 1)} disabled={page >= pages}>Next</Button>
            </nav>
          )}
        </>
      )}
    </PageShell>
  );
}
