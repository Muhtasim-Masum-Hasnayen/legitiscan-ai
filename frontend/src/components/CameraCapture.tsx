"use client";

import { Camera, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Alert, Button } from "./ui";

export function cameraSupported(): boolean {
  return typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia && typeof window !== "undefined" && window.isSecureContext;
}

/** Live camera capture dialog using getUserMedia. Always stops the stream on close/unmount. */
export function CameraCapture({ onCapture, onClose }: { onCapture: (file: File) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const v = videoRef.current;
        if (v) {
          v.srcObject = stream;
          v.onloadedmetadata = () => setReady(true);
          void v.play().catch(() => undefined);
        }
      })
      .catch((e: unknown) => {
        const name = e instanceof DOMException ? e.name : "";
        setError(
          name === "NotAllowedError"
            ? "Camera permission was denied. Allow camera access in your browser settings, or choose a photo instead."
            : name === "NotFoundError"
              ? "No camera was found on this device. Choose a photo instead."
              : "The camera could not be started. Choose a photo instead.",
        );
      });
    const onKey = (ev: KeyboardEvent) => ev.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      cancelled = true;
      window.removeEventListener("keydown", onKey);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [onClose]);

  const snap = () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    canvas.getContext("2d")?.drawImage(v, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setError("Could not capture the photo. Please try again.");
          return;
        }
        onCapture(new File([blob], `camera-${Date.now()}.jpg`, { type: "image/jpeg", lastModified: Date.now() }));
        onClose();
      },
      "image/jpeg",
      0.92,
    );
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Take a photo" className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="font-semibold">Take a photo</h2>
          <button onClick={onClose} aria-label="Close camera" className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-zinc-100">
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <div className="space-y-3 p-4">
          {error ? (
            <Alert tone="error">{error}</Alert>
          ) : (
            <video ref={videoRef} playsInline muted className="aspect-[4/3] w-full rounded-xl bg-black object-cover" aria-label="Camera preview" />
          )}
          <p className="text-xs text-ink-mute">Fill the frame with the label, keep it sharp, and avoid glare.</p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            {!error && (
              <Button onClick={snap} disabled={!ready}>
                <Camera className="h-4 w-4" aria-hidden /> Capture
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
