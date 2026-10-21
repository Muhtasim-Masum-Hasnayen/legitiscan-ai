"use client";

import clsx from "clsx";
import { AlertTriangle, CheckCircle2, CircleSlash, Info, XCircle } from "lucide-react";
import type { Evidence, ScanDetail, Signal } from "@/lib/types";
import { formatBytes, formatDate, formatScore, verdictMeta } from "@/lib/verdict";
import { AuthedImage } from "./AuthedImage";
import { VerdictBadge } from "./VerdictBadge";
import { Alert, Card } from "./ui";

const SEV = {
  positive: { Icon: CheckCircle2, cls: "text-emerald-700", label: "Positive" },
  warning: { Icon: AlertTriangle, cls: "text-amber-700", label: "Caution" },
  negative: { Icon: XCircle, cls: "text-rose-700", label: "Concern" },
  info: { Icon: Info, cls: "text-sky-700", label: "Note" },
} as const;

function SignalRow({ s }: { s: Signal }) {
  const pct = s.authenticity === null ? 0 : Math.round(s.authenticity * 100);
  return (
    <li className="rounded-xl border border-zinc-200 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium">{s.label}</p>
        {s.status === "scored" ? (
          <span className="text-sm font-semibold tabular-nums">{formatScore(s.authenticity)} <span className="font-normal text-ink-mute">/ 1.00</span></span>
        ) : (
          <span className="inline-flex items-center gap-1 text-sm text-ink-mute"><CircleSlash className="h-4 w-4" aria-hidden /> Not available</span>
        )}
      </div>
      {s.status === "scored" && (
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-100" role="img" aria-label={`${s.label} signal ${pct} out of 100`}>
          <div className="h-full rounded-full bg-brand-600" style={{ width: `${pct}%` }} />
        </div>
      )}
      <p className="mt-2 text-sm text-ink-soft">{s.detail}</p>
    </li>
  );
}

function EvidenceItem({ e }: { e: Evidence }) {
  const { Icon, cls, label } = SEV[e.severity];
  return (
    <li className="flex gap-3 py-3">
      <Icon className={clsx("mt-0.5 h-5 w-5 shrink-0", cls)} aria-hidden />
      <div className="min-w-0">
        <p className="text-sm font-medium"><span className="sr-only">{label}: </span>{e.title}</p>
        <p className="text-sm text-ink-soft">{e.detail}</p>
      </div>
    </li>
  );
}

export function ReportView({ scan }: { scan: ScanDetail }) {
  const r = scan.result;

  if (scan.status !== "completed" || !r) {
    return <Alert tone="error" title="This scan has no report">{scan.error ?? "The analysis did not complete."}</Alert>;
  }
  const meta = verdictMeta(r.verdict);
  const f = r.ocr.fields;

  return (
    <div className="space-y-6">
      <section aria-labelledby="verdict-heading" className={clsx("rounded-2xl border-2 p-6 sm:p-8", meta.panel)}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Result</p>
            <h2 id="verdict-heading" className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">{r.headline}</h2>
          </div>
          <VerdictBadge verdict={r.verdict} />
        </div>
        <p className="mt-3 max-w-2xl text-base leading-relaxed">{r.summary}</p>

        <dl className="mt-5 grid gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-xs font-medium text-ink-soft">Evidence score</dt>
            <dd className="text-2xl font-bold tabular-nums">{formatScore(r.evidence_score)}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs font-medium text-ink-soft">What this number means</dt>
            <dd className="text-sm text-ink-soft">{r.evidence_score_note}</dd>
          </div>
        </dl>
        <p className="mt-4 text-xs text-ink-soft">Scanned {formatDate(scan.created_at)} · {scan.image_count} photo(s)
          {r.hints.brand ? ` · Brand hint: ${r.hints.brand}` : ""}{r.hints.product_name ? ` · Product: ${r.hints.product_name}` : ""}</p>
      </section>

      {r.missing_assets.length > 0 && (
        <Alert tone="warning" title="Analysis was limited: some AI assets are missing">
          <ul className="list-disc space-y-1 pl-5">
            {r.missing_assets.map((m) => (
              <li key={m.component}><strong>{m.component}</strong>: {m.missing.join("; ")}</li>
            ))}
          </ul>
          <p className="mt-2">The verdict above uses only the components that actually ran.</p>
        </Alert>
      )}

      <Card>
        <h3 className="text-lg font-semibold">Your photos</h3>
        <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {scan.images.map((img) => (
            <li key={img.position}>
              <AuthedImage scanId={scan.id} position={img.position} alt={`Scanned photo ${img.position + 1}`} className="aspect-[4/3] w-full rounded-xl border border-zinc-200 object-cover" />
              <p className="mt-1 truncate text-xs text-ink-mute">{img.original_name} · {img.width}×{img.height} · {formatBytes(img.size_bytes)}</p>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <h3 className="text-lg font-semibold">Analysis signals</h3>
        <p className="mt-1 text-sm text-ink-soft">Each signal runs independently. 0 = looks counterfeit, 1 = looks authentic.</p>
        <ul className="mt-4 space-y-3">{r.signals.map((s) => <SignalRow key={s.key} s={s} />)}</ul>
        <p className="mt-4 text-xs text-ink-mute">
          Decision thresholds: Likely Authentic ≥ {r.thresholds.authentic.toFixed(2)}, Potentially Counterfeit ≤ {r.thresholds.counterfeit.toFixed(2)};
          signals that disagree by {r.thresholds.disagreement.toFixed(2)} or more are reported as Inconclusive.
        </p>
      </Card>

      <Card>
        <h3 className="text-lg font-semibold">Evidence</h3>
        <ul className="mt-2 divide-y divide-zinc-100">{r.evidence.map((e, i) => <EvidenceItem key={i} e={e} />)}</ul>
      </Card>

      <Card>
        <h3 className="text-lg font-semibold">Text read from the packaging</h3>
        {!r.ocr.ran ? (
          <p className="mt-2 text-sm text-ink-soft">Text recognition did not run (see missing assets above).</p>
        ) : r.ocr.text.trim() === "" ? (
          <p className="mt-2 text-sm text-ink-soft">No readable text was found.</p>
        ) : (
          <>
            <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
              <div><dt className="font-medium">Batch / lot codes</dt><dd className="text-ink-soft">{f.batch_codes.join(", ") || "None found"}</dd></div>
              <div><dt className="font-medium">Dates</dt><dd className="text-ink-soft">{f.dates.map((d) => `${d.label} ${d.value}`).join(", ") || "None found"}</dd></div>
              <div><dt className="font-medium">Barcodes</dt><dd className="text-ink-soft">{f.barcodes.map((b) => `${b.value} (${b.valid_check_digit ? "check digit OK" : "check digit invalid"})`).join(", ") || "None found"}</dd></div>
            </dl>
            <details className="mt-4 rounded-xl bg-zinc-50 p-3">
              <summary className="cursor-pointer text-sm font-medium">Show full extracted text{r.ocr.mean_confidence !== null ? ` (mean OCR confidence ${r.ocr.mean_confidence.toFixed(2)})` : ""}</summary>
              <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words text-xs text-ink-soft">{r.ocr.text}</pre>
            </details>
          </>
        )}
      </Card>

      {r.reference_match && (
        <Card>
          <h3 className="text-lg font-semibold">Closest reference products</h3>
          {r.reference_match.brand_filter_applied && <p className="mt-1 text-sm text-ink-soft">Filtered by the brand you entered.</p>}
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[420px] text-left text-sm">
              <thead><tr className="border-b text-ink-soft"><th className="py-2 pr-3 font-medium">Brand</th><th className="py-2 pr-3 font-medium">Product</th><th className="py-2 text-right font-medium">Text similarity</th></tr></thead>
              <tbody>
                {r.reference_match.candidates.map((c) => (
                  <tr key={c.id} className="border-b border-zinc-100"><td className="py-2 pr-3">{c.brand}</td><td className="py-2 pr-3">{c.product_name}</td><td className="py-2 text-right tabular-nums">{c.score.toFixed(2)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Card>
        <h3 className="text-lg font-semibold">What to do next</h3>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-ink-soft">{r.recommendations.map((x) => <li key={x}>{x}</li>)}</ul>
      </Card>

      <Alert tone="info" title="Important">{r.disclaimer}</Alert>
    </div>
  );
}
