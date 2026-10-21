"use client";

import clsx from "clsx";
import { Camera, ImagePlus, Trash2, UploadCloud } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { DEFAULT_LIMITS, validateFiles, type UploadLimits } from "@/lib/validation";
import { formatBytes } from "@/lib/verdict";
import { CameraCapture, cameraSupported } from "./CameraCapture";
import { Alert, Button } from "./ui";

const SLOT_HINTS = ["Front of the pack", "Back / ingredients label", "Batch code area"];

export function ImageUploader({ files, onChange, limits = DEFAULT_LIMITS, disabled }: {
  files: File[]; onChange: (files: File[]) => void; limits?: UploadLimits; disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const captureRef = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);

  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);

  const add = useCallback(
    (incoming: File[]) => {
      const { accepted, errors: errs } = validateFiles(files, incoming, limits);
      setErrors(errs);
      if (accepted.length) onChange([...files, ...accepted]);
    },
    [files, limits, onChange],
  );

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (!disabled) add(Array.from(e.dataTransfer.files));
  };

  const full = files.length >= limits.maxFiles;
  const mb = Math.round(limits.maxBytes / 1024 / 1024);

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={clsx(
          "rounded-2xl border-2 border-dashed p-6 text-center transition-colors sm:p-10",
          dragging ? "border-brand-500 bg-brand-50" : "border-zinc-300 bg-white",
          disabled && "opacity-60",
        )}
      >
        <UploadCloud className="mx-auto h-10 w-10 text-brand-600" aria-hidden />
        <p className="mt-3 font-semibold">Add photos of the product packaging</p>
        <p className="mt-1 text-sm text-ink-soft">
          Drag &amp; drop, choose files, or take a photo. JPEG, PNG or WebP, up to {mb} MB each, max {limits.maxFiles} photos.
        </p>

        <div className="mt-5 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
          <Button variant="secondary" onClick={() => inputRef.current?.click()} disabled={disabled || full}>
            <ImagePlus className="h-4 w-4" aria-hidden /> Choose photos
          </Button>
          <Button
            variant="secondary"
            disabled={disabled || full}
            onClick={() => (cameraSupported() ? setCameraOpen(true) : captureRef.current?.click())}
          >
            <Camera className="h-4 w-4" aria-hidden /> Take a photo
          </Button>
        </div>

        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" tabIndex={-1}
          aria-label="Choose photos from your device"
          onChange={(e) => { add(Array.from(e.target.files ?? [])); e.target.value = ""; }} />
        {/* Fallback for phones/browsers without live capture: opens the native camera app */}
        <input ref={captureRef} type="file" accept="image/*" capture="environment" className="sr-only" tabIndex={-1}
          aria-label="Take a photo with your camera"
          onChange={(e) => { add(Array.from(e.target.files ?? [])); e.target.value = ""; }} />
      </div>

      {errors.length > 0 && (
        <Alert tone="error" title="Some files were not added">
          <ul className="list-disc pl-5">{errors.map((e) => <li key={e}>{e}</li>)}</ul>
        </Alert>
      )}

      {files.length > 0 && (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3" aria-label="Selected photos">
          {files.map((f, i) => (
            <li key={`${f.name}-${f.size}-${f.lastModified}`} className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previews[i]} alt={`Preview of ${f.name}`} className="aspect-[4/3] w-full object-cover" />
              <div className="flex items-center justify-between gap-2 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium" title={f.name}>{f.name}</p>
                  <p className="text-xs text-ink-mute">{SLOT_HINTS[i] ?? "Extra photo"} · {formatBytes(f.size)}</p>
                </div>
                <button
                  onClick={() => onChange(files.filter((_, j) => j !== i))}
                  disabled={disabled}
                  aria-label={`Remove ${f.name}`}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {cameraOpen && <CameraCapture onClose={() => setCameraOpen(false)} onCapture={(file) => add([file])} />}
    </div>
  );
}
