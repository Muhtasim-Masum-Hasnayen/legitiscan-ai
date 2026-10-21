import type { Verdict } from "./types";

export interface VerdictMeta {
  label: string;
  short: string;
  badge: string; // classes for the pill
  panel: string; // classes for the report banner
}

export const VERDICTS: Record<Verdict, VerdictMeta> = {
  likely_authentic: {
    label: "Likely Authentic",
    short: "Evidence is consistent with authentic reference data.",
    badge: "bg-emerald-100 text-emerald-900 ring-emerald-300",
    panel: "border-emerald-300 bg-emerald-50 text-emerald-950",
  },
  potentially_counterfeit: {
    label: "Potentially Counterfeit",
    short: "Evidence differs from what an authentic product would show.",
    badge: "bg-rose-100 text-rose-900 ring-rose-300",
    panel: "border-rose-300 bg-rose-50 text-rose-950",
  },
  inconclusive: {
    label: "Inconclusive",
    short: "Not enough reliable evidence to call it either way.",
    badge: "bg-amber-100 text-amber-900 ring-amber-300",
    panel: "border-amber-300 bg-amber-50 text-amber-950",
  },
};

/** Unknown / missing verdicts are always shown as Inconclusive, never as a guess. */
export const verdictMeta = (v: Verdict | null | undefined): VerdictMeta => VERDICTS[v ?? "inconclusive"] ?? VERDICTS.inconclusive;

export const formatScore = (x: number | null | undefined): string => (x === null || x === undefined ? "\u2014" : x.toFixed(2));

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
