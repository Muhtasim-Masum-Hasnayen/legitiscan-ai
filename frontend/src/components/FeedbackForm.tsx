"use client";

import { Star } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api, ApiError } from "@/lib/api";
import type { FeedbackCategory } from "@/lib/types";
import { Alert, Button, Card, Field, inputClass } from "./ui";

const CATEGORIES: { id: FeedbackCategory; label: string }[] = [
  { id: "general", label: "General feedback" },
  { id: "wrong_result", label: "A result looked wrong" },
  { id: "bug", label: "Something is broken" },
  { id: "feature", label: "Feature request" },
];

export function FeedbackForm() {
  const params = useSearchParams();
  const scanId = params.get("scan") ?? undefined;
  const [category, setCategory] = useState<FeedbackCategory>(scanId ? "wrong_result" : "general");
  const [rating, setRating] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (message.trim().length < 10) {
      setError("Please write at least 10 characters so we can understand your feedback.");
      return;
    }
    setBusy(true);
    try {
      await api.sendFeedback({ category, rating, message: message.trim(), email: email.trim() || undefined, scan_id: scanId });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not send feedback. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (done) return <Alert tone="success" title="Thank you!">Your feedback was sent. It helps us improve LegitiScan AI.</Alert>;

  return (
    <Card>
      <form onSubmit={onSubmit} className="space-y-5">
        {scanId && <Alert tone="info">This feedback will be linked to your scan so we can review the result.</Alert>}
        <Field label="Type of feedback" htmlFor="category">
          <select id="category" className={inputClass} value={category} onChange={(e) => setCategory(e.target.value as FeedbackCategory)}>
            {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </Field>

        <fieldset>
          <legend className="mb-1.5 text-sm font-medium">Overall experience (optional)</legend>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" aria-label={`${n} star${n > 1 ? "s" : ""}`} aria-pressed={rating === n}
                onClick={() => setRating(rating === n ? null : n)} className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-amber-50">
                <Star className={`h-6 w-6 ${rating !== null && n <= rating ? "fill-amber-400 text-amber-500" : "text-zinc-300"}`} aria-hidden />
              </button>
            ))}
          </div>
        </fieldset>

        <Field label="Your message" htmlFor="message" hint={`${message.length}/2000`}>
          <textarea id="message" required rows={5} maxLength={2000} className={inputClass} value={message} onChange={(e) => setMessage(e.target.value)} />
        </Field>
        <Field label="Email (optional, if you want a reply)" htmlFor="fb-email">
          <input id="fb-email" type="email" className={inputClass} value={email} autoComplete="email" onChange={(e) => setEmail(e.target.value)} />
        </Field>

        <div aria-live="polite">{error && <Alert tone="error">{error}</Alert>}</div>
        <Button type="submit" loading={busy}>Send feedback</Button>
      </form>
    </Card>
  );
}
