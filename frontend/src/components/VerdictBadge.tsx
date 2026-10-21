import clsx from "clsx";
import { CheckCircle2, HelpCircle, ShieldAlert } from "lucide-react";
import type { Verdict } from "@/lib/types";
import { verdictMeta } from "@/lib/verdict";

const ICONS = { likely_authentic: CheckCircle2, potentially_counterfeit: ShieldAlert, inconclusive: HelpCircle };

export function VerdictBadge({ verdict, className }: { verdict: Verdict | null | undefined; className?: string }) {
  const meta = verdictMeta(verdict);
  const Icon = ICONS[verdict ?? "inconclusive"];
  return (
    <span className={clsx("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ring-1 ring-inset", meta.badge, className)}>
      <Icon className="h-4 w-4" aria-hidden />
      {meta.label}
    </span>
  );
}
