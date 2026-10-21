"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { SystemStatus } from "@/lib/types";
import { Alert } from "./ui";

export function useSystemStatus() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    api.systemStatus().then((s) => !cancelled && setStatus(s)).catch((e: Error) => !cancelled && setError(e.message));
    return () => { cancelled = true; };
  }, []);
  return { status, error };
}

/** Tells the user, plainly, which AI components are connected. Never hides missing assets. */
export function SystemStatusBanner({ status, error }: { status: SystemStatus | null; error: string | null }) {
  if (error) return <Alert tone="error" title="Server unreachable">{error}</Alert>;
  if (!status || status.ready) return null;
  const missing = status.components.filter((c) => !c.available);
  return (
    <Alert tone="warning" title="Some AI components are not connected yet">
      <p>
        Scans still run, but the verdict is based only on what is available. With nothing connected, every result will be
        <strong> Inconclusive</strong>. No predictions are invented.
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        {missing.map((c) => (
          <li key={c.key}><strong>{c.name}</strong>: {c.missing.length ? c.missing.join("; ") : c.detail}</li>
        ))}
      </ul>
    </Alert>
  );
}
