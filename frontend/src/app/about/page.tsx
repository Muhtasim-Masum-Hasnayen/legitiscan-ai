import type { Metadata } from "next";
import { ButtonLink, Card, PageShell } from "@/components/ui";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <PageShell title="About LegitiScan AI" intro="Counterfeit cosmetics are hard to spot. LegitiScan AI gives shoppers a transparent second opinion from packaging photos." narrow>
      <div className="space-y-6">
        <Card>
          <h2 className="text-xl font-semibold">What it does</h2>
          <p className="mt-2 text-ink-soft">
            You photograph a product. LegitiScan AI checks image quality, classifies the packaging, reads the printed text, and
            compares it with verified reference data. It then reports one of three outcomes with the evidence behind it.
          </p>
        </Card>

        <Card>
          <h2 className="text-xl font-semibold">The three outcomes</h2>
          <dl className="mt-3 space-y-3 text-sm">
            <div><dt className="font-semibold">Likely Authentic</dt><dd className="text-ink-soft">The signals that ran are consistent with authentic reference data and agree with each other.</dd></div>
            <div><dt className="font-semibold">Potentially Counterfeit</dt><dd className="text-ink-soft">The signals suggest the packaging differs from authentic products. This is a warning, not proof.</dd></div>
            <div><dt className="font-semibold">Inconclusive</dt><dd className="text-ink-soft">Photos were unclear, evidence was weak or conflicting, or AI components or reference data were unavailable.</dd></div>
          </dl>
        </Card>

        <Card>
          <h2 className="text-xl font-semibold">The technology</h2>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-ink-soft">
            <li><strong>ResNet50</strong> image classifier for packaging appearance.</li>
            <li><strong>EasyOCR</strong> to read text, batch codes, dates and barcodes.</li>
            <li><strong>Sentence-BERT</strong> to compare printed wording with reference products.</li>
            <li>A transparent rule-based decision layer: thresholds are visible in every report.</li>
          </ul>
        </Card>

        <Card>
          <h2 className="text-xl font-semibold">Limits</h2>
          <p className="mt-2 text-sm text-ink-soft">
            Accuracy depends on the training data, the reference dataset and the photos. Products or counterfeits that the models
            have not seen can be misjudged. Read the <a href="/safety" className="font-medium text-brand-800 underline">safety page</a> before relying on a result.
          </p>
        </Card>
        <ButtonLink href="/scan">Scan a product</ButtonLink>
      </div>
    </PageShell>
  );
}
