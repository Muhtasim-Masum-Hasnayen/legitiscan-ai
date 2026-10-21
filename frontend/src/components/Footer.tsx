import Link from "next/link";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-zinc-200 bg-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-3">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-sm text-ink-soft">Scan Smart. Shop Confidently.</p>
        </div>
        <nav aria-label="Footer" className="grid grid-cols-2 gap-2 text-sm">
          <Link href="/scan" className="text-ink-soft hover:text-brand-800">Scan a product</Link>
          <Link href="/history" className="text-ink-soft hover:text-brand-800">Scan history</Link>
          <Link href="/about" className="text-ink-soft hover:text-brand-800">About</Link>
          <Link href="/safety" className="text-ink-soft hover:text-brand-800">Safety &amp; limits</Link>
          <Link href="/feedback" className="text-ink-soft hover:text-brand-800">Feedback</Link>
        </nav>
        <p className="text-xs leading-relaxed text-ink-mute">
          LegitiScan AI gives evidence-based estimates from packaging photos. It can be wrong and is never a guarantee of
          authenticity. Confirm with the brand or an authorised retailer.
        </p>
      </div>
    </footer>
  );
}
