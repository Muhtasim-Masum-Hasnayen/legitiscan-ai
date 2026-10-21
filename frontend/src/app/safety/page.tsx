import type { Metadata } from "next";
import { Alert, Card, PageShell } from "@/components/ui";

export const metadata: Metadata = { title: "Safety & limits" };

export default function SafetyPage() {
  return (
    <PageShell title="Safety & limits" intro="How to use results responsibly, and how we protect your data." narrow>
      <div className="space-y-6">
        <Alert tone="warning" title="No tool can guarantee authenticity">
          LegitiScan AI never claims 100% accuracy. It can produce false alarms and can miss good counterfeits. Treat results as a prompt to verify, not as a certificate.
        </Alert>

        <Card>
          <h2 className="text-xl font-semibold">Using results safely</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-ink-soft">
            <li>Buy from the brand&apos;s official store or authorised retailers whenever you can.</li>
            <li>Verify batch codes with the brand&apos;s customer support or official checker.</li>
            <li>If a product irritates your skin or eyes, stop using it and seek medical advice. A &ldquo;Likely Authentic&rdquo; result does not make a product safe for you.</li>
            <li>Report suspected counterfeits to the brand and the marketplace you bought from.</li>
          </ul>
        </Card>

        <Card>
          <h2 className="text-xl font-semibold">Why you may see &ldquo;Inconclusive&rdquo;</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-ink-soft">
            <li>Blurry, dark, glary or tiny photos.</li>
            <li>The product is not in our reference data.</li>
            <li>The signals disagree or fall between our thresholds.</li>
            <li>An AI component or dataset is not connected on the server. The report lists exactly what is missing.</li>
          </ul>
        </Card>

        <Card>
          <h2 className="text-xl font-semibold">Your data</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-ink-soft">
            <li>Uploads are validated, stripped of metadata (including GPS) and re-encoded before storage.</li>
            <li>Without an account, your history is tied to an anonymous id stored in this browser only.</li>
            <li>You can delete any scan and its photos from the report page at any time.</li>
            <li>Passwords are stored as salted bcrypt hashes.</li>
          </ul>
        </Card>
      </div>
    </PageShell>
  );
}
