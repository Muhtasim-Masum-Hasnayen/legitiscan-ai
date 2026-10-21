import type { Metadata } from "next";
import { Suspense } from "react";
import { FeedbackForm } from "@/components/FeedbackForm";
import { PageShell, Spinner } from "@/components/ui";

export const metadata: Metadata = { title: "Feedback" };

export default function FeedbackPage() {
  return (
    <PageShell title="Feedback" intro="Tell us what worked, what did not, and especially any result that looked wrong. It helps us improve." narrow>
      <Suspense fallback={<Spinner />}><FeedbackForm /></Suspense>
    </PageShell>
  );
}
