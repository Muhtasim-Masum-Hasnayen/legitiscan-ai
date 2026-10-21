"use client";

import { Alert, Button, PageShell } from "@/components/ui";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <PageShell title="Something went wrong" narrow>
      <Alert tone="error" title="Unexpected error">An unexpected problem occurred. Please try again.</Alert>
      <div className="mt-4"><Button onClick={reset}>Try again</Button></div>
    </PageShell>
  );
}
