"use client";

import { ImageOff } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

/** Loads a scan image (needs auth headers) as a blob and shows it. Revokes the object URL on unmount. */
export function AuthedImage({ scanId, position, alt, className }: { scanId: string; position: number; alt: string; className?: string }) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let url: string | null = null;
    let cancelled = false;
    api
      .scanImageBlob(scanId, position)
      .then((blob) => {
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setSrc(url);
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [scanId, position]);

  if (failed) {
    return (
      <div className={`flex items-center justify-center bg-zinc-100 text-zinc-400 ${className ?? ""}`} role="img" aria-label={`${alt} (unavailable)`}>
        <ImageOff className="h-6 w-6" aria-hidden />
      </div>
    );
  }
  if (!src) return <div className={`animate-pulse bg-zinc-100 ${className ?? ""}`} aria-hidden />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={className} />;
}
