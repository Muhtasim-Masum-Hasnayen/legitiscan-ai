import { Camera, FileSearch, ScanLine, ShieldCheck, Sparkles, Type } from "lucide-react";
import { ButtonLink, Card } from "@/components/ui";

const STEPS = [
  { icon: Camera, title: "1. Photograph", text: "Take or upload clear photos of the front, back label and batch-code area." },
  { icon: Sparkles, title: "2. Analyse", text: "AI inspects the packaging, reads the printed text and compares it with reference data." },
  { icon: FileSearch, title: "3. Review the evidence", text: "Get a transparent report showing every signal, what ran, and what could not." },
];

const SIGNALS = [
  { icon: ScanLine, title: "Packaging image analysis", text: "A ResNet50 model trained on authentic and counterfeit packaging looks at colour, print and layout cues." },
  { icon: Type, title: "Text & batch-code reading", text: "EasyOCR extracts printed text, batch/lot codes, dates and barcodes, and checks barcode check digits." },
  { icon: ShieldCheck, title: "Reference comparison", text: "Sentence-BERT compares the printed wording with verified reference data for genuine products." },
];

export default function HomePage() {
  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-900 via-brand-800 to-brand-600 text-white">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-2">
          <div>
            <p className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider">AI cosmetic authenticity checks</p>
            <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
              Scan Smart.<br />Shop Confidently.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-white/90">
              Photograph a cosmetic product and get an evidence-based report in seconds: <strong>Likely Authentic</strong>,{" "}
              <strong>Potentially Counterfeit</strong> or <strong>Inconclusive</strong>. Honest results, never a 100% claim.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/scan" variant="secondary" className="!bg-white !text-brand-900 hover:!bg-brand-50">Scan a product</ButtonLink>
              <ButtonLink href="/safety" variant="ghost" className="!text-white ring-1 ring-inset ring-white/40 hover:!bg-white/10">How we keep results honest</ButtonLink>
            </div>
          </div>

          <div aria-hidden className="mx-auto w-full max-w-sm">
            <div className="rounded-3xl bg-white/10 p-5 ring-1 ring-white/25 backdrop-blur">
              <div className="flex aspect-[4/5] items-center justify-center rounded-2xl bg-white/90">
                <div className="relative flex h-40 w-24 items-center justify-center rounded-2xl bg-gradient-to-b from-brand-200 to-brand-400 shadow-lg">
                  <span className="rotate-[-90deg] whitespace-nowrap text-xs font-bold tracking-widest text-brand-900">SERUM</span>
                  <span className="absolute inset-x-[-16px] top-1/2 h-0.5 bg-emerald-500 shadow-[0_0_12px_#10b981]" />
                </div>
              </div>
              <p className="mt-3 text-center text-sm font-medium text-white/90">Scanning packaging&hellip;</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6" aria-labelledby="how">
        <h2 id="how" className="text-2xl font-bold sm:text-3xl">How it works</h2>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, text }) => (
            <Card key={title}>
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-100 text-brand-800"><Icon className="h-6 w-6" aria-hidden /></span>
              <h3 className="mt-4 text-lg font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-ink-soft">{text}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="bg-white py-16" aria-labelledby="signals">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 id="signals" className="text-2xl font-bold sm:text-3xl">Three independent signals</h2>
          <p className="mt-2 max-w-2xl text-ink-soft">Each signal is shown separately in your report, so you can see exactly what the verdict is based on.</p>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {SIGNALS.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-2xl border border-zinc-200 p-5">
                <Icon className="h-7 w-7 text-brand-700" aria-hidden />
                <h3 className="mt-3 font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-ink-soft">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6" aria-labelledby="honest">
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 sm:p-10">
          <h2 id="honest" className="text-2xl font-bold">Built to be honest</h2>
          <ul className="mt-4 grid gap-3 text-sm text-amber-950 sm:grid-cols-2">
            <li>• If the evidence is weak, blurry or conflicting, we say <strong>Inconclusive</strong> instead of guessing.</li>
            <li>• If an AI component or reference dataset is missing, the report says so clearly.</li>
            <li>• We never claim 100% accuracy. Results are estimates, not certificates.</li>
            <li>• For health or safety worries, contact the brand and a medical professional.</li>
          </ul>
          <div className="mt-6"><ButtonLink href="/scan">Try a scan</ButtonLink></div>
        </div>
      </section>
    </>
  );
}
