import { ScanLine } from "lucide-react";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-bold tracking-tight ${className}`}>
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-700 text-white">
        <ScanLine className="h-5 w-5" aria-hidden />
      </span>
      <span>LegitiScan <span className="text-brand-700">AI</span></span>
    </span>
  );
}
