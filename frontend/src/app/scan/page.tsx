"use client";

import { Lightbulb } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ImageUploader } from "@/components/ImageUploader";
import { SystemStatusBanner, useSystemStatus } from "@/components/SystemStatusBanner";
import { Alert, Button, Card, Field, PageShell, inputClass } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { DEFAULT_LIMITS, type UploadLimits } from "@/lib/validation";

const TIPS = [
  "Use bright, even light and avoid glare or flash reflections.",
  "Fill the frame with the label and keep the text sharp.",
  "Add a close-up of the batch / lot code and expiry date.",
  "Include the front, the back label and any seal or hologram.",
];

export default function ScanPage() {
  const router = useRouter();
  const { status, error: statusError } = useSystemStatus();
  const [files, setFiles] = useState<File[]>([]);
  const [brand, setBrand] = useState("");
  const [product, setProduct] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const limits: UploadLimits = status
    ? { maxFiles: status.limits.max_files_per_scan, maxBytes: status.limits.max_upload_mb * 1024 * 1024, allowedTypes: status.limits.allowed_types }
    : DEFAULT_LIMITS;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!files.length) {
      setError("Add at least one photo of the product.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const scan = await api.createScan(files, brand, product);
      router.push(`/report/${scan.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      setBusy(false);
    }
  }

  return (
    <PageShell title="Scan a product" intro="Add photos of the packaging. The more clearly the label and batch code are visible, the more useful the report.">
      <div className="mb-6"><SystemStatusBanner status={status} error={statusError} /></div>

      <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-[1fr_320px]" aria-busy={busy}>
        <div className="space-y-6">
          <ImageUploader files={files} onChange={setFiles} limits={limits} disabled={busy} />

          <Card>
            <h2 className="text-lg font-semibold">Optional details</h2>
            <p className="mt-1 text-sm text-ink-soft">Helps narrow down the reference comparison. Leave blank if unsure.</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Brand" htmlFor="brand">
                <input id="brand" className={inputClass} value={brand} maxLength={120} onChange={(e) => setBrand(e.target.value)} placeholder="e.g. the brand on the box" disabled={busy} />
              </Field>
              <Field label="Product name" htmlFor="product">
                <input id="product" className={inputClass} value={product} maxLength={120} onChange={(e) => setProduct(e.target.value)} placeholder="e.g. the product line" disabled={busy} />
              </Field>
            </div>
          </Card>

          <div aria-live="polite">
            {error && <Alert tone="error" title="Scan could not be completed">{error}</Alert>}
            {busy && <Alert tone="info" title="Analysing your photos">This can take a little while the first time AI models load. Please keep this page open.</Alert>}
          </div>

          <Button type="submit" loading={busy} disabled={!files.length} className="w-full sm:w-auto">
            {busy ? "Analysing…" : "Analyse packaging"}
          </Button>
        </div>

        <aside className="space-y-4" aria-label="Photo tips">
          <Card>
            <h2 className="flex items-center gap-2 text-lg font-semibold"><Lightbulb className="h-5 w-5 text-amber-600" aria-hidden /> Photo tips</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-ink-soft">{TIPS.map((t) => <li key={t}>{t}</li>)}</ul>
          </Card>
          <Card>
            <h2 className="text-lg font-semibold">Privacy</h2>
            <p className="mt-2 text-sm text-ink-soft">Photos are re-encoded without metadata and stored only to show your report. You can delete any scan from your history.</p>
          </Card>
        </aside>
      </form>
    </PageShell>
  );
}
