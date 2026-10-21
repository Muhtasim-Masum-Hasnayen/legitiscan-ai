"use client";

import { Printer, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ReportView } from "@/components/ReportView";
import { Alert, Button, ButtonLink, PageShell, Spinner } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import type { ScanDetail } from "@/lib/types";

export default function ReportPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [scan, setScan] = useState<ScanDetail | null>(null);
  const [error, setError] = useState<{ message: string; status: number } | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.getScan(id)
      .then((s) => !cancelled && setScan(s))
      .catch((e: unknown) => !cancelled && setError(e instanceof ApiError ? { message: e.message, status: e.status } : { message: "Could not load the report.", status: 0 }));
    return () => { cancelled = true; };
  }, [id]);

  async function remove() {
    if (!window.confirm("Delete this scan and its photos permanently?")) return;
    setDeleting(true);
    try {
      await api.deleteScan(id);
      router.push("/history");
    } catch (e) {
      setError({ message: e instanceof ApiError ? e.message : "Could not delete the scan.", status: 0 });
      setDeleting(false);
    }
  }

  return (
    <PageShell title="Analysis report" narrow>
      {error && !scan && (
        <div className="space-y-4">
          <Alert tone="error" title={error.status === 404 ? "Report not found" : "Could not load report"}>
            {error.status === 404 ? "This report does not exist, or it belongs to a different browser or account." : error.message}
          </Alert>
          <ButtonLink href="/scan">Start a new scan</ButtonLink>
        </div>
      )}
      {!scan && !error && <Spinner label="Loading report" />}
      {scan && (
        <>
          <ReportView scan={scan} />
          {error && <Alert tone="error" className="mt-6">{error.message}</Alert>}
          <div className="no-print mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/scan">Scan another product</ButtonLink>
            <Button variant="secondary" onClick={() => window.print()}><Printer className="h-4 w-4" aria-hidden /> Print / save PDF</Button>
            <Button variant="danger" onClick={remove} loading={deleting}><Trash2 className="h-4 w-4" aria-hidden /> Delete scan</Button>
            <Link href={`/feedback?scan=${scan.id}`} className="inline-flex min-h-[44px] items-center px-2 text-sm font-medium text-brand-800 underline">Report a problem with this result</Link>
          </div>
        </>
      )}
    </PageShell>
  );
}
